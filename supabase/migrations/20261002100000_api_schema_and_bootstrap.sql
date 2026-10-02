create schema api;

revoke all on schema api from public, anon, authenticated, service_role;
grant usage on schema api to service_role;

alter default privileges for role postgres in schema api
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema api
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema api
  revoke execute on functions from public, anon, authenticated, service_role;

create or replace function api.bootstrap_initial_admin(
  p_user_id uuid,
  p_display_name text,
  p_request_id uuid
)
returns table (
  result text,
  membership_id uuid,
  role_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth_email text;
  v_email_confirmed_at timestamptz;
  v_app_metadata jsonb;
  v_company_id uuid;
  v_admin_role_id uuid;
  v_admin_assignable boolean;
  v_active_admin_count bigint;
  v_existing_membership_id uuid;
  v_membership_id uuid;
  v_user_role_id uuid;
  v_display_name text;
begin
  if p_user_id is null then
    raise exception 'bootstrap user id is required' using errcode = '22004';
  end if;

  if p_request_id is null then
    raise exception 'bootstrap request id is required' using errcode = '22004';
  end if;

  v_display_name := btrim(p_display_name);
  if v_display_name is null or char_length(v_display_name) not between 1 and 120 then
    raise exception 'bootstrap display name is invalid' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('calamina.erp.v2.bootstrap_initial_admin', 0)
  );

  select
    auth_user.email,
    auth_user.email_confirmed_at,
    auth_user.raw_app_meta_data
  into
    v_auth_email,
    v_email_confirmed_at,
    v_app_metadata
  from auth.users as auth_user
  where auth_user.id = p_user_id;

  if not found then
    raise exception 'bootstrap Auth user does not exist' using errcode = '22023';
  end if;

  if v_auth_email is null or v_email_confirmed_at is null then
    raise exception 'bootstrap Auth user email is not confirmed' using errcode = '22023';
  end if;

  if coalesce(v_app_metadata -> 'calamina_bootstrap_admin_v2', 'false'::jsonb) <> 'true'::jsonb then
    raise exception 'bootstrap Auth user is not marked for local bootstrap' using errcode = '42501';
  end if;

  select company.id
  into v_company_id
  from public.companies as company
  where company.is_active is true;

  if not found then
    raise exception 'bootstrap requires exactly one active company' using errcode = '55000';
  end if;

  select role_record.id, role_record.is_assignable
  into v_admin_role_id, v_admin_assignable
  from iam.roles as role_record
  where role_record.key = 'admin';

  if not found or v_admin_assignable is not false then
    raise exception 'bootstrap admin role is unavailable or assignable' using errcode = '55000';
  end if;

  select count(*)
  into v_active_admin_count
  from iam.user_roles as user_role
  join public.company_memberships as membership
    on membership.id = user_role.membership_id
  where user_role.role_id = v_admin_role_id
    and membership.status = 'active';

  if v_active_admin_count > 0 then
    select membership.id
    into v_existing_membership_id
    from iam.user_roles as user_role
    join public.company_memberships as membership
      on membership.id = user_role.membership_id
    where user_role.role_id = v_admin_role_id
      and membership.status = 'active'
      and membership.user_id = p_user_id;

    if v_active_admin_count = 1 and found then
      return query
      select
        'already_bootstrapped'::text,
        v_existing_membership_id,
        v_admin_role_id;
      return;
    end if;

    raise exception 'an active bootstrap admin already exists' using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.company_memberships as membership
    where membership.user_id = p_user_id
  ) then
    raise exception 'bootstrap user already has a membership' using errcode = '55000';
  end if;

  insert into public.profiles (user_id, display_name)
  values (p_user_id, v_display_name)
  on conflict (user_id) do update
  set display_name = excluded.display_name;

  insert into public.company_memberships (
    company_id,
    user_id,
    personal_id,
    status,
    suspended_at
  )
  values (
    v_company_id,
    p_user_id,
    null,
    'active',
    null
  )
  returning id into v_membership_id;

  insert into iam.user_roles (
    membership_id,
    role_id,
    assigned_by
  )
  values (
    v_membership_id,
    v_admin_role_id,
    null
  )
  returning id into v_user_role_id;

  perform private.write_audit(
    'system',
    'auth.bootstrap_admin',
    'auth.user',
    p_user_id,
    null,
    pg_catalog.jsonb_build_object('bootstrap', 'local_v2'),
    p_request_id,
    '{}'::jsonb,
    null
  );

  perform private.write_audit(
    'system',
    'membership.created',
    'company_membership',
    v_membership_id,
    null,
    pg_catalog.jsonb_build_object(
      'company_id', v_company_id,
      'user_id', p_user_id,
      'status', 'active'
    ),
    p_request_id,
    '{}'::jsonb,
    null
  );

  perform private.write_audit(
    'system',
    'role.assigned',
    'user_role',
    v_user_role_id,
    null,
    pg_catalog.jsonb_build_object(
      'membership_id', v_membership_id,
      'role_key', 'admin'
    ),
    p_request_id,
    '{}'::jsonb,
    null
  );

  return query
  select 'created'::text, v_membership_id, v_admin_role_id;
end;
$$;

alter function api.bootstrap_initial_admin(uuid, text, uuid) owner to postgres;

revoke execute on function api.bootstrap_initial_admin(uuid, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function api.bootstrap_initial_admin(uuid, text, uuid)
  to service_role;

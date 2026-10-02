-- CALAMINA ERP v2 - practical Personal and Users management.
-- Browser clients keep read-only table grants; all mutations are narrow RPCs.

create or replace function api.current_user_roles()
returns table (role_key text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.key
  from public.company_memberships as cm
  join iam.user_roles as ur on ur.membership_id = cm.id
  join iam.roles as r on r.id = ur.role_id
  where cm.user_id = (select auth.uid())
    and cm.status = 'active'
  order by r.key;
$$;

alter function api.current_user_roles() owner to postgres;
revoke all on function api.current_user_roles() from public, anon, authenticated, service_role;
grant execute on function api.current_user_roles() to authenticated;

create or replace function api.list_personal()
returns table (
  id uuid,
  internal_code text,
  first_name text,
  last_name text,
  work_email text,
  job_title text,
  status text,
  has_user boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
begin
  if (select auth.uid()) is null or not private.has_permission('personal.view') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select cm.company_id into v_company_id
  from public.company_memberships as cm
  where cm.user_id = (select auth.uid()) and cm.status = 'active';

  return query
  select
    p.id,
    p.internal_code::text,
    p.first_name,
    p.last_name,
    p.work_email::text,
    p.job_title,
    p.status,
    exists (
      select 1 from public.company_memberships as linked where linked.personal_id = p.id
    ),
    p.created_at,
    p.updated_at
  from public.personal as p
  where p.company_id = v_company_id
  order by p.last_name, p.first_name, p.internal_code;
end;
$$;

alter function api.list_personal() owner to postgres;
revoke all on function api.list_personal() from public, anon, authenticated, service_role;
grant execute on function api.list_personal() to authenticated;

create or replace function api.create_personal(
  p_internal_code text,
  p_first_name text,
  p_last_name text,
  p_work_email text default null,
  p_job_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_company_id uuid;
  v_id uuid;
  v_internal_code text := btrim(coalesce(p_internal_code, ''));
  v_first_name text := btrim(coalesce(p_first_name, ''));
  v_last_name text := btrim(coalesce(p_last_name, ''));
  v_work_email text := nullif(lower(btrim(coalesce(p_work_email, ''))), '');
  v_job_title text := nullif(btrim(coalesce(p_job_title, '')), '');
  v_request_id uuid := extensions.gen_random_uuid();
begin
  if v_actor is null or not private.has_permission('personal.manage') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select cm.company_id into v_company_id
  from public.company_memberships as cm
  where cm.user_id = v_actor and cm.status = 'active';

  if v_company_id is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  insert into public.personal (
    company_id, internal_code, first_name, last_name, work_email, job_title
  )
  values (
    v_company_id,
    v_internal_code,
    v_first_name,
    v_last_name,
    v_work_email::extensions.citext,
    v_job_title
  )
  returning personal.id into v_id;

  perform private.write_audit(
    actor_kind => 'user',
    action => 'personal.created',
    entity_type => 'personal',
    entity_id => v_id,
    before_data => null,
    after_data => jsonb_build_object(
      'internal_code', v_internal_code,
      'first_name', v_first_name,
      'last_name', v_last_name,
      'work_email', v_work_email,
      'job_title', v_job_title,
      'status', 'active'
    ),
    request_id => v_request_id,
    metadata => jsonb_build_object('source', 'api.create_personal'),
    actor_user_id => v_actor
  );

  return v_id;
end;
$$;

alter function api.create_personal(text, text, text, text, text) owner to postgres;
revoke all on function api.create_personal(text, text, text, text, text) from public, anon, authenticated, service_role;
grant execute on function api.create_personal(text, text, text, text, text) to authenticated;

create or replace function api.update_personal(
  p_personal_id uuid,
  p_internal_code text,
  p_first_name text,
  p_last_name text,
  p_work_email text default null,
  p_job_title text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_company_id uuid;
  v_before public.personal%rowtype;
  v_internal_code text := btrim(coalesce(p_internal_code, ''));
  v_first_name text := btrim(coalesce(p_first_name, ''));
  v_last_name text := btrim(coalesce(p_last_name, ''));
  v_work_email text := nullif(lower(btrim(coalesce(p_work_email, ''))), '');
  v_job_title text := nullif(btrim(coalesce(p_job_title, '')), '');
  v_request_id uuid := extensions.gen_random_uuid();
begin
  if v_actor is null or not private.has_permission('personal.manage') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select cm.company_id into v_company_id
  from public.company_memberships as cm
  where cm.user_id = v_actor and cm.status = 'active';

  select p.* into v_before
  from public.personal as p
  where p.id = p_personal_id and p.company_id = v_company_id
  for update;

  if not found then
    raise exception 'personal record not found' using errcode = 'P0002';
  end if;

  if v_before.internal_code::text = v_internal_code
     and v_before.first_name = v_first_name
     and v_before.last_name = v_last_name
     and v_before.work_email::text is not distinct from v_work_email
     and v_before.job_title is not distinct from v_job_title then
    return false;
  end if;

  update public.personal as p
  set internal_code = v_internal_code::extensions.citext,
      first_name = v_first_name,
      last_name = v_last_name,
      work_email = v_work_email::extensions.citext,
      job_title = v_job_title
  where p.id = p_personal_id;

  perform private.write_audit(
    actor_kind => 'user',
    action => 'personal.updated',
    entity_type => 'personal',
    entity_id => p_personal_id,
    before_data => jsonb_build_object(
      'internal_code', v_before.internal_code::text,
      'first_name', v_before.first_name,
      'last_name', v_before.last_name,
      'work_email', v_before.work_email::text,
      'job_title', v_before.job_title
    ),
    after_data => jsonb_build_object(
      'internal_code', v_internal_code,
      'first_name', v_first_name,
      'last_name', v_last_name,
      'work_email', v_work_email,
      'job_title', v_job_title
    ),
    request_id => v_request_id,
    metadata => jsonb_build_object('source', 'api.update_personal'),
    actor_user_id => v_actor
  );

  return true;
end;
$$;

alter function api.update_personal(uuid, text, text, text, text, text) owner to postgres;
revoke all on function api.update_personal(uuid, text, text, text, text, text) from public, anon, authenticated, service_role;
grant execute on function api.update_personal(uuid, text, text, text, text, text) to authenticated;

create or replace function api.set_personal_status(
  p_personal_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_company_id uuid;
  v_before_status text;
  v_request_id uuid := extensions.gen_random_uuid();
begin
  if v_actor is null or not private.has_permission('personal.manage') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_status not in ('active', 'inactive') then
    raise exception 'invalid personal status' using errcode = '22023';
  end if;

  select cm.company_id into v_company_id
  from public.company_memberships as cm
  where cm.user_id = v_actor and cm.status = 'active';

  select p.status into v_before_status
  from public.personal as p
  where p.id = p_personal_id and p.company_id = v_company_id
  for update;

  if not found then
    raise exception 'personal record not found' using errcode = 'P0002';
  end if;
  if v_before_status = p_status then
    return false;
  end if;
  if p_status = 'inactive' and exists (
    select 1 from public.company_memberships as cm
    where cm.personal_id = p_personal_id and cm.status = 'active'
  ) then
    raise exception 'suspend the linked membership before deactivating personal' using errcode = '23514';
  end if;

  update public.personal set status = p_status where personal.id = p_personal_id;

  perform private.write_audit(
    actor_kind => 'user',
    action => 'personal.status_changed',
    entity_type => 'personal',
    entity_id => p_personal_id,
    before_data => jsonb_build_object('status', v_before_status),
    after_data => jsonb_build_object('status', p_status),
    request_id => v_request_id,
    metadata => jsonb_build_object('source', 'api.set_personal_status'),
    actor_user_id => v_actor
  );

  return true;
end;
$$;

alter function api.set_personal_status(uuid, text) owner to postgres;
revoke all on function api.set_personal_status(uuid, text) from public, anon, authenticated, service_role;
grant execute on function api.set_personal_status(uuid, text) to authenticated;

create or replace function api.list_users()
returns table (
  membership_id uuid,
  user_id uuid,
  display_name text,
  email text,
  membership_status text,
  suspended_at timestamptz,
  personal_id uuid,
  personal_name text,
  role_keys text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
begin
  if (select auth.uid()) is null or not private.has_permission('users.view') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select cm.company_id into v_company_id
  from public.company_memberships as cm
  where cm.user_id = (select auth.uid()) and cm.status = 'active';

  return query
  select
    cm.id,
    cm.user_id,
    p.display_name,
    u.email::text,
    cm.status,
    cm.suspended_at,
    cm.personal_id,
    case when person.id is null then null else concat_ws(' ', person.first_name, person.last_name) end,
    coalesce(
      array_agg(distinct r.key order by r.key) filter (where r.key is not null),
      array[]::text[]
    )
  from public.company_memberships as cm
  join auth.users as u on u.id = cm.user_id
  left join public.profiles as p on p.user_id = cm.user_id
  left join public.personal as person on person.id = cm.personal_id
  left join iam.user_roles as ur on ur.membership_id = cm.id
  left join iam.roles as r on r.id = ur.role_id
  where cm.company_id = v_company_id
  group by cm.id, cm.user_id, p.display_name, u.email, cm.status, cm.suspended_at,
           cm.personal_id, person.id, person.first_name, person.last_name
  order by p.display_name nulls last, u.email;
end;
$$;

alter function api.list_users() owner to postgres;
revoke all on function api.list_users() from public, anon, authenticated, service_role;
grant execute on function api.list_users() to authenticated;

create or replace function api.list_invitable_personal()
returns table (
  id uuid,
  internal_code text,
  first_name text,
  last_name text,
  work_email text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
begin
  if (select auth.uid()) is null or not private.has_permission('users.invite') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select cm.company_id into v_company_id
  from public.company_memberships as cm
  where cm.user_id = (select auth.uid()) and cm.status = 'active';

  return query
  select p.id, p.internal_code::text, p.first_name, p.last_name, p.work_email::text
  from public.personal as p
  where p.company_id = v_company_id
    and p.status = 'active'
    and not exists (
      select 1 from public.company_memberships as cm where cm.personal_id = p.id
    )
  order by p.last_name, p.first_name;
end;
$$;

alter function api.list_invitable_personal() owner to postgres;
revoke all on function api.list_invitable_personal() from public, anon, authenticated, service_role;
grant execute on function api.list_invitable_personal() to authenticated;

create or replace function api.set_membership_status(
  p_membership_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_company_id uuid;
  v_target public.company_memberships%rowtype;
  v_request_id uuid := extensions.gen_random_uuid();
  v_action text;
begin
  if v_actor is null or not private.has_permission('users.manage_roles') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_status not in ('active', 'suspended') then
    raise exception 'invalid membership status' using errcode = '22023';
  end if;

  select cm.company_id into v_company_id
  from public.company_memberships as cm
  where cm.user_id = v_actor and cm.status = 'active';

  select cm.* into v_target
  from public.company_memberships as cm
  where cm.id = p_membership_id and cm.company_id = v_company_id
  for update;

  if not found then
    raise exception 'membership not found' using errcode = 'P0002';
  end if;
  if v_target.user_id = v_actor then
    raise exception 'cannot modify own membership' using errcode = '42501';
  end if;
  if exists (
    select 1 from iam.user_roles as ur
    join iam.roles as r on r.id = ur.role_id
    where ur.membership_id = v_target.id and r.key = 'admin'
  ) then
    raise exception 'admin membership is protected' using errcode = '42501';
  end if;
  if v_target.status = p_status then
    return false;
  end if;

  update public.company_memberships as cm
  set status = p_status,
      suspended_at = case when p_status = 'suspended' then now() else null end
  where cm.id = p_membership_id;

  v_action := case when p_status = 'suspended' then 'membership.suspended' else 'membership.reactivated' end;
  perform private.write_audit(
    actor_kind => 'user',
    action => v_action,
    entity_type => 'company_membership',
    entity_id => p_membership_id,
    before_data => jsonb_build_object('status', v_target.status),
    after_data => jsonb_build_object('status', p_status),
    request_id => v_request_id,
    metadata => jsonb_build_object('source', 'api.set_membership_status'),
    actor_user_id => v_actor
  );

  return true;
end;
$$;

alter function api.set_membership_status(uuid, text) owner to postgres;
revoke all on function api.set_membership_status(uuid, text) from public, anon, authenticated, service_role;
grant execute on function api.set_membership_status(uuid, text) to authenticated;

create or replace function api.assign_user_role(
  p_membership_id uuid,
  p_role_key text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_company_id uuid;
  v_target_user_id uuid;
  v_role iam.roles%rowtype;
  v_user_role_id uuid;
  v_request_id uuid := extensions.gen_random_uuid();
begin
  if v_actor is null or not private.has_permission('users.manage_roles') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select cm.company_id into v_company_id
  from public.company_memberships as cm
  where cm.user_id = v_actor and cm.status = 'active';

  select cm.user_id into v_target_user_id
  from public.company_memberships as cm
  where cm.id = p_membership_id and cm.company_id = v_company_id
  for update;

  if not found then
    raise exception 'membership not found' using errcode = 'P0002';
  end if;
  if v_target_user_id = v_actor then
    raise exception 'cannot modify own roles' using errcode = '42501';
  end if;
  if exists (
    select 1 from iam.user_roles as ur join iam.roles as r on r.id = ur.role_id
    where ur.membership_id = p_membership_id and r.key = 'admin'
  ) then
    raise exception 'admin membership is protected' using errcode = '42501';
  end if;

  select r.* into v_role from iam.roles as r where r.key = p_role_key;
  if not found or not v_role.is_assignable or v_role.key = 'admin' then
    raise exception 'role is not assignable' using errcode = '22023';
  end if;
  if exists (
    select 1 from iam.user_roles as ur
    where ur.membership_id = p_membership_id and ur.role_id = v_role.id
  ) then
    return false;
  end if;

  insert into iam.user_roles (membership_id, role_id, assigned_by)
  values (p_membership_id, v_role.id, v_actor)
  returning id into v_user_role_id;

  perform private.write_audit(
    actor_kind => 'user',
    action => 'role.assigned',
    entity_type => 'user_role',
    entity_id => v_user_role_id,
    before_data => null,
    after_data => jsonb_build_object('membership_id', p_membership_id, 'role_key', v_role.key),
    request_id => v_request_id,
    metadata => jsonb_build_object('source', 'api.assign_user_role'),
    actor_user_id => v_actor
  );

  return true;
end;
$$;

alter function api.assign_user_role(uuid, text) owner to postgres;
revoke all on function api.assign_user_role(uuid, text) from public, anon, authenticated, service_role;
grant execute on function api.assign_user_role(uuid, text) to authenticated;

create or replace function api.remove_user_role(
  p_membership_id uuid,
  p_role_key text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_company_id uuid;
  v_target_user_id uuid;
  v_role iam.roles%rowtype;
  v_user_role_id uuid;
  v_request_id uuid := extensions.gen_random_uuid();
begin
  if v_actor is null or not private.has_permission('users.manage_roles') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select cm.company_id into v_company_id
  from public.company_memberships as cm
  where cm.user_id = v_actor and cm.status = 'active';

  select cm.user_id into v_target_user_id
  from public.company_memberships as cm
  where cm.id = p_membership_id and cm.company_id = v_company_id
  for update;

  if not found then
    raise exception 'membership not found' using errcode = 'P0002';
  end if;
  if v_target_user_id = v_actor then
    raise exception 'cannot modify own roles' using errcode = '42501';
  end if;
  if exists (
    select 1 from iam.user_roles as ur join iam.roles as r on r.id = ur.role_id
    where ur.membership_id = p_membership_id and r.key = 'admin'
  ) then
    raise exception 'admin membership is protected' using errcode = '42501';
  end if;

  select r.* into v_role from iam.roles as r where r.key = p_role_key;
  if not found or not v_role.is_assignable or v_role.key = 'admin' then
    raise exception 'role is protected' using errcode = '22023';
  end if;

  select ur.id into v_user_role_id
  from iam.user_roles as ur
  where ur.membership_id = p_membership_id and ur.role_id = v_role.id
  for update;

  if not found then
    return false;
  end if;

  delete from iam.user_roles where user_roles.id = v_user_role_id;

  perform private.write_audit(
    actor_kind => 'user',
    action => 'role.removed',
    entity_type => 'user_role',
    entity_id => v_user_role_id,
    before_data => jsonb_build_object('membership_id', p_membership_id, 'role_key', v_role.key),
    after_data => null,
    request_id => v_request_id,
    metadata => jsonb_build_object('source', 'api.remove_user_role'),
    actor_user_id => v_actor
  );

  return true;
end;
$$;

alter function api.remove_user_role(uuid, text) owner to postgres;
revoke all on function api.remove_user_role(uuid, text) from public, anon, authenticated, service_role;
grant execute on function api.remove_user_role(uuid, text) to authenticated;

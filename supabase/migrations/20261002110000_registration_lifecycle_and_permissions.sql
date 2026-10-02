-- CALAMINA ERP v2 - local invitation lifecycle and effective permissions.
-- This migration intentionally exposes only narrowly scoped RPCs through api.

grant usage on schema api to authenticated;

create or replace function api.current_user_permissions()
returns table (permission_key text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct p.key
  from public.company_memberships as cm
  join iam.user_roles as ur on ur.membership_id = cm.id
  join iam.role_permissions as rp on rp.role_id = ur.role_id
  join iam.permissions as p on p.id = rp.permission_id
  where cm.user_id = (select auth.uid())
    and cm.status = 'active'
  order by p.key;
$$;

alter function api.current_user_permissions() owner to postgres;
revoke all on function api.current_user_permissions() from public, anon, authenticated, service_role;
grant execute on function api.current_user_permissions() to authenticated;

create or replace function api.assignable_roles()
returns table (
  role_key text,
  role_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
     or not private.has_permission('users.invite') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select r.key, r.name
  from iam.roles as r
  where r.is_assignable
    and r.key <> 'admin'
  order by r.name;
end;
$$;

alter function api.assignable_roles() owner to postgres;
revoke all on function api.assignable_roles() from public, anon, authenticated, service_role;
grant execute on function api.assignable_roles() to authenticated;

create or replace function api.list_registration_invitations()
returns table (
  invitation_id uuid,
  email text,
  role_key text,
  personal_id uuid,
  state text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
     or not private.has_permission('users.invite') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select i.id, i.email::text, r.key, i.personal_id, i.state, i.expires_at, i.created_at
  from iam.registration_invitations as i
  join iam.roles as r on r.id = i.role_id
  where i.state in ('pending', 'reserved')
  order by i.created_at desc;
end;
$$;

alter function api.list_registration_invitations() owner to postgres;
revoke all on function api.list_registration_invitations() from public, anon, authenticated, service_role;
grant execute on function api.list_registration_invitations() to authenticated;

create or replace function api.create_registration_invitation(
  p_email text,
  p_role_key text,
  p_personal_id uuid default null,
  p_token_hash bytea default null
)
returns table (
  invitation_id uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_actor_company_id uuid;
  v_email extensions.citext;
  v_role iam.roles%rowtype;
  v_personal public.personal%rowtype;
  v_invitation_id uuid;
  v_expires_at timestamptz := now() + interval '72 hours';
  v_request_id uuid := extensions.gen_random_uuid();
begin
  if v_actor is null or not private.has_permission('users.invite') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select cm.company_id
  into v_actor_company_id
  from public.company_memberships as cm
  where cm.user_id = v_actor
    and cm.status = 'active';

  if v_actor_company_id is null then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  v_email := lower(btrim(coalesce(p_email, '')))::extensions.citext;

  if v_email::text = ''
     or v_email::text !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;

  if p_token_hash is null or octet_length(p_token_hash) <> 32 then
    raise exception 'invalid invitation token hash' using errcode = '22023';
  end if;

  select r.*
  into v_role
  from iam.roles as r
  where r.key = p_role_key;

  if not found or not v_role.is_assignable or v_role.key = 'admin' then
    raise exception 'role is not assignable' using errcode = '22023';
  end if;

  if exists (
    select 1
    from auth.users as u
    where lower(u.email) = lower(v_email::text)
  ) then
    raise exception 'email is already registered' using errcode = '23505';
  end if;

  update iam.registration_invitations as i
  set state = 'expired',
      reservation_id = null,
      reserved_at = null,
      reservation_expires_at = null
  where i.state in ('pending', 'reserved')
    and i.expires_at <= now()
    and (i.email = v_email or (p_personal_id is not null and i.personal_id = p_personal_id));

  if p_personal_id is not null then
    select p.*
    into v_personal
    from public.personal as p
    where p.id = p_personal_id
    for update;

    if not found
       or v_personal.company_id <> v_actor_company_id
       or v_personal.status <> 'active'
       or v_personal.work_email is null
       or v_personal.work_email <> v_email then
      raise exception 'personal record is not eligible for this invitation' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.company_memberships as cm
      where cm.personal_id = p_personal_id
    ) then
      raise exception 'personal record is already linked' using errcode = '23505';
    end if;
  end if;

  insert into iam.registration_invitations (
    email,
    token_hash,
    role_id,
    personal_id,
    expires_at,
    created_by
  )
  values (
    v_email,
    p_token_hash,
    v_role.id,
    p_personal_id,
    v_expires_at,
    v_actor
  )
  returning id into v_invitation_id;

  perform private.write_audit(
    actor_kind => 'user',
    action => 'invitation.created',
    entity_type => 'registration_invitation',
    entity_id => v_invitation_id,
    before_data => null,
    after_data => jsonb_build_object(
      'email', v_email::text,
      'role_key', v_role.key,
      'personal_id', p_personal_id,
      'expires_at', v_expires_at
    ),
    request_id => v_request_id,
    metadata => jsonb_build_object('source', 'api.create_registration_invitation'),
    actor_user_id => v_actor
  );

  return query select v_invitation_id, v_expires_at;
end;
$$;

alter function api.create_registration_invitation(text, text, uuid, bytea) owner to postgres;
revoke all on function api.create_registration_invitation(text, text, uuid, bytea) from public, anon, authenticated, service_role;
grant execute on function api.create_registration_invitation(text, text, uuid, bytea) to authenticated;

create or replace function api.reserve_registration_invitation(p_token_hash bytea)
returns table (
  invitation_id uuid,
  reservation_id uuid,
  email text,
  role_key text,
  personal_id uuid,
  reservation_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation iam.registration_invitations%rowtype;
  v_role iam.roles%rowtype;
  v_reservation_id uuid;
  v_reservation_expires_at timestamptz;
begin
  if p_token_hash is null or octet_length(p_token_hash) <> 32 then
    return;
  end if;

  select i.*
  into v_invitation
  from iam.registration_invitations as i
  where i.token_hash = p_token_hash
  for update;

  if not found then
    return;
  end if;

  if v_invitation.expires_at <= now() then
    if v_invitation.state in ('pending', 'reserved') then
      update iam.registration_invitations as i
      set state = 'expired',
          reservation_id = null,
          reserved_at = null,
          reservation_expires_at = null
      where i.id = v_invitation.id;
    end if;
    return;
  end if;

  if v_invitation.state = 'reserved'
     and v_invitation.reservation_expires_at <= now() then
    update iam.registration_invitations as i
    set state = 'pending',
        reservation_id = null,
        reserved_at = null,
        reservation_expires_at = null
    where i.id = v_invitation.id;
    v_invitation.state := 'pending';
  end if;

  if v_invitation.state <> 'pending' then
    return;
  end if;

  select r.*
  into v_role
  from iam.roles as r
  where r.id = v_invitation.role_id;

  if not found or not v_role.is_assignable or v_role.key = 'admin' then
    return;
  end if;

  if v_invitation.personal_id is not null and not exists (
    select 1
    from public.personal as p
    where p.id = v_invitation.personal_id
      and p.status = 'active'
      and p.work_email = v_invitation.email
      and not exists (
        select 1
        from public.company_memberships as cm
        where cm.personal_id = p.id
      )
  ) then
    return;
  end if;

  v_reservation_id := extensions.gen_random_uuid();
  v_reservation_expires_at := least(v_invitation.expires_at, now() + interval '5 minutes');

  update iam.registration_invitations as i
  set state = 'reserved',
      reservation_id = v_reservation_id,
      reserved_at = now(),
      reservation_expires_at = v_reservation_expires_at
  where i.id = v_invitation.id;

  return query
  select
    v_invitation.id,
    v_reservation_id,
    v_invitation.email::text,
    v_role.key,
    v_invitation.personal_id,
    v_reservation_expires_at;
end;
$$;

alter function api.reserve_registration_invitation(bytea) owner to postgres;
revoke all on function api.reserve_registration_invitation(bytea) from public, anon, authenticated, service_role;
grant execute on function api.reserve_registration_invitation(bytea) to service_role;

create or replace function api.release_registration_reservation(
  p_invitation_id uuid,
  p_reservation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expires_at timestamptz;
begin
  select i.expires_at
  into v_expires_at
  from iam.registration_invitations as i
  where i.id = p_invitation_id
    and i.state = 'reserved'
    and i.reservation_id = p_reservation_id
  for update;

  if not found then
    return false;
  end if;

  update iam.registration_invitations as i
  set state = case when v_expires_at <= now() then 'expired' else 'pending' end,
      reservation_id = null,
      reserved_at = null,
      reservation_expires_at = null
  where i.id = p_invitation_id;

  return true;
end;
$$;

alter function api.release_registration_reservation(uuid, uuid) owner to postgres;
revoke all on function api.release_registration_reservation(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function api.release_registration_reservation(uuid, uuid) to service_role;

create or replace function api.finalize_registration_invitation(
  p_invitation_id uuid,
  p_reservation_id uuid,
  p_auth_user_id uuid,
  p_display_name text
)
returns table (
  membership_id uuid,
  role_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation iam.registration_invitations%rowtype;
  v_role iam.roles%rowtype;
  v_auth_user auth.users%rowtype;
  v_company_id uuid;
  v_membership_id uuid := extensions.gen_random_uuid();
  v_display_name text := btrim(coalesce(p_display_name, ''));
  v_request_id uuid := extensions.gen_random_uuid();
begin
  if char_length(v_display_name) < 1 or char_length(v_display_name) > 120 then
    raise exception 'invalid display name' using errcode = '22023';
  end if;

  select i.*
  into v_invitation
  from iam.registration_invitations as i
  where i.id = p_invitation_id
  for update;

  if not found
     or v_invitation.state <> 'reserved'
     or v_invitation.reservation_id <> p_reservation_id
     or v_invitation.reservation_expires_at <= now()
     or v_invitation.expires_at <= now() then
    raise exception 'invitation is not available' using errcode = '22023';
  end if;

  select u.*
  into v_auth_user
  from auth.users as u
  where u.id = p_auth_user_id;

  if not found
     or v_auth_user.email_confirmed_at is null
     or lower(v_auth_user.email) <> lower(v_invitation.email::text) then
    raise exception 'auth user does not match invitation' using errcode = '22023';
  end if;

  select r.*
  into v_role
  from iam.roles as r
  where r.id = v_invitation.role_id;

  if not found or not v_role.is_assignable or v_role.key = 'admin' then
    raise exception 'role is not assignable' using errcode = '22023';
  end if;

  select c.id
  into v_company_id
  from public.companies as c
  where c.singleton_guard
    and c.is_active
  for update;

  if v_company_id is null then
    raise exception 'active company is not configured' using errcode = '55000';
  end if;

  if v_invitation.personal_id is not null and not exists (
    select 1
    from public.personal as p
    where p.id = v_invitation.personal_id
      and p.company_id = v_company_id
      and p.status = 'active'
      and p.work_email = v_invitation.email
      and not exists (
        select 1
        from public.company_memberships as cm
        where cm.personal_id = p.id
      )
    for update
  ) then
    raise exception 'personal record is not eligible for this invitation' using errcode = '22023';
  end if;

  insert into public.profiles (user_id, display_name)
  values (p_auth_user_id, v_display_name)
  on conflict (user_id) do update
  set display_name = excluded.display_name;

  insert into public.company_memberships (
    id,
    company_id,
    user_id,
    personal_id,
    status
  )
  values (
    v_membership_id,
    v_company_id,
    p_auth_user_id,
    v_invitation.personal_id,
    'active'
  );

  insert into iam.user_roles (membership_id, role_id, assigned_by)
  values (v_membership_id, v_role.id, v_invitation.created_by);

  update iam.registration_invitations as i
  set state = 'accepted',
      accepted_at = now(),
      accepted_by = p_auth_user_id,
      reservation_id = null,
      reserved_at = null,
      reservation_expires_at = null
  where i.id = v_invitation.id;

  perform private.write_audit(
    actor_kind => 'user',
    action => 'invitation.accepted',
    entity_type => 'registration_invitation',
    entity_id => v_invitation.id,
    before_data => jsonb_build_object('state', 'reserved'),
    after_data => jsonb_build_object('state', 'accepted'),
    request_id => v_request_id,
    metadata => jsonb_build_object('source', 'api.finalize_registration_invitation'),
    actor_user_id => p_auth_user_id
  );

  perform private.write_audit(
    actor_kind => 'user',
    action => 'membership.created',
    entity_type => 'company_membership',
    entity_id => v_membership_id,
    before_data => null,
    after_data => jsonb_build_object(
      'company_id', v_company_id,
      'user_id', p_auth_user_id,
      'personal_id', v_invitation.personal_id,
      'status', 'active'
    ),
    request_id => v_request_id,
    metadata => jsonb_build_object('source', 'api.finalize_registration_invitation'),
    actor_user_id => p_auth_user_id
  );

  perform private.write_audit(
    actor_kind => 'user',
    action => 'role.assigned',
    entity_type => 'user_role',
    entity_id => null,
    before_data => null,
    after_data => jsonb_build_object(
      'membership_id', v_membership_id,
      'role_id', v_role.id,
      'role_key', v_role.key
    ),
    request_id => v_request_id,
    metadata => jsonb_build_object('source', 'api.finalize_registration_invitation'),
    actor_user_id => p_auth_user_id
  );

  return query select v_membership_id, v_role.id;
end;
$$;

alter function api.finalize_registration_invitation(uuid, uuid, uuid, text) owner to postgres;
revoke all on function api.finalize_registration_invitation(uuid, uuid, uuid, text) from public, anon, authenticated, service_role;
grant execute on function api.finalize_registration_invitation(uuid, uuid, uuid, text) to service_role;

create or replace function api.revoke_registration_invitation(p_invitation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_invitation iam.registration_invitations%rowtype;
  v_request_id uuid := extensions.gen_random_uuid();
begin
  if v_actor is null or not private.has_permission('users.invite') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select i.*
  into v_invitation
  from iam.registration_invitations as i
  where i.id = p_invitation_id
  for update;

  if not found or v_invitation.state <> 'pending' then
    raise exception 'invitation cannot be revoked' using errcode = '22023';
  end if;

  if v_invitation.expires_at <= now() then
    update iam.registration_invitations as i
    set state = 'expired'
    where i.id = v_invitation.id;
    return false;
  end if;

  update iam.registration_invitations as i
  set state = 'revoked',
      revoked_at = now(),
      revoked_by = v_actor
  where i.id = v_invitation.id;

  perform private.write_audit(
    actor_kind => 'user',
    action => 'invitation.revoked',
    entity_type => 'registration_invitation',
    entity_id => v_invitation.id,
    before_data => jsonb_build_object('state', 'pending'),
    after_data => jsonb_build_object('state', 'revoked'),
    request_id => v_request_id,
    metadata => jsonb_build_object('source', 'api.revoke_registration_invitation'),
    actor_user_id => v_actor
  );

  return true;
end;
$$;

alter function api.revoke_registration_invitation(uuid) owner to postgres;
revoke all on function api.revoke_registration_invitation(uuid) from public, anon, authenticated, service_role;
grant execute on function api.revoke_registration_invitation(uuid) to authenticated;

-- Only service-role RPCs can deliberately release a reservation early. IAM tables
-- remain inaccessible directly, so permitting this transition does not expose a
-- browser-side state mutation.
create or replace function private.enforce_invitation_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.state <> 'pending' then
      raise exception 'new invitations must start pending' using errcode = '23514';
    end if;
    return new;
  end if;

  if new.email is distinct from old.email
     or new.token_hash is distinct from old.token_hash
     or new.role_id is distinct from old.role_id
     or new.personal_id is distinct from old.personal_id
     or new.expires_at is distinct from old.expires_at
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'invitation identity fields are immutable' using errcode = '55000';
  end if;

  if old.state in ('accepted', 'revoked', 'expired') then
    raise exception 'terminal invitations are immutable' using errcode = '55000';
  end if;

  if old.state = 'pending' and new.state not in ('reserved', 'revoked', 'expired') then
    raise exception 'invalid pending invitation transition' using errcode = '23514';
  end if;

  if old.state = 'reserved' and new.state not in ('pending', 'accepted', 'revoked', 'expired') then
    raise exception 'invalid reserved invitation transition' using errcode = '23514';
  end if;

  if new.state = 'expired' and old.expires_at > now() then
    raise exception 'invitation has not expired' using errcode = '23514';
  end if;

  return new;
end;
$$;

alter function private.enforce_invitation_transition() owner to postgres;
revoke all on function private.enforce_invitation_transition() from public, anon, authenticated, service_role;

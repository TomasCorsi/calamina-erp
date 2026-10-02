create table audit.audit_log (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_user_id uuid,
  actor_kind text not null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  request_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_log_actor_kind_check check (
    actor_kind in ('user', 'service', 'system')
  ),
  constraint audit_log_user_actor_check check (
    actor_kind <> 'user' or actor_user_id is not null
  ),
  constraint audit_log_action_check check (
    action ~ '^[a-z][a-z0-9_.-]*$'
  ),
  constraint audit_log_entity_type_check check (
    entity_type ~ '^[a-z][a-z0-9_.-]*$'
  ),
  constraint audit_log_before_data_check check (
    before_data is null or jsonb_typeof(before_data) = 'object'
  ),
  constraint audit_log_after_data_check check (
    after_data is null or jsonb_typeof(after_data) = 'object'
  ),
  constraint audit_log_metadata_check check (
    jsonb_typeof(metadata) = 'object'
  )
);

create index audit_log_created_at_idx on audit.audit_log (created_at desc);
create index audit_log_request_id_idx on audit.audit_log (request_id);
create index audit_log_actor_created_idx
  on audit.audit_log (actor_user_id, created_at desc);
create index audit_log_entity_created_idx
  on audit.audit_log (entity_type, entity_id, created_at desc);

alter table audit.audit_log enable row level security;
revoke all on table audit.audit_log from public, anon, authenticated, service_role;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.has_active_membership()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
  );
$$;

create or replace function private.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select membership.company_id
  from public.company_memberships as membership
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
  limit 1;
$$;

create or replace function private.current_personal_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select membership.personal_id
  from public.company_memberships as membership
  where membership.user_id = (select auth.uid())
    and membership.status = 'active'
  limit 1;
$$;

create or replace function private.has_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_memberships as membership
    join iam.user_roles as user_role
      on user_role.membership_id = membership.id
    join iam.role_permissions as role_permission
      on role_permission.role_id = user_role.role_id
    join iam.permissions as permission
      on permission.id = role_permission.permission_id
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and permission.key = permission_key
  );
$$;

create or replace function private.write_audit(
  actor_kind text,
  action text,
  entity_type text,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  request_id uuid,
  metadata jsonb,
  actor_user_id uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  audit_id uuid;
begin
  insert into audit.audit_log (
    actor_user_id,
    actor_kind,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    request_id,
    metadata
  )
  values (
    actor_user_id,
    actor_kind,
    action,
    entity_type,
    entity_id,
    before_data,
    after_data,
    request_id,
    metadata
  )
  returning id into audit_id;

  return audit_id;
end;
$$;

create or replace function private.prevent_audit_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'audit log is append-only' using errcode = '55000';
end;
$$;

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
    or new.created_at is distinct from old.created_at
  then
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

  if old.state = 'reserved'
    and new.state = 'pending'
    and old.reservation_expires_at > now()
  then
    raise exception 'invitation reservation is still active' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke execute on function private.set_updated_at() from public, anon, authenticated, service_role;
revoke execute on function private.has_active_membership() from public, anon, authenticated, service_role;
revoke execute on function private.current_company_id() from public, anon, authenticated, service_role;
revoke execute on function private.current_personal_id() from public, anon, authenticated, service_role;
revoke execute on function private.has_permission(text) from public, anon, authenticated, service_role;
revoke execute on function private.write_audit(text, text, text, uuid, jsonb, jsonb, uuid, jsonb, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function private.prevent_audit_mutation() from public, anon, authenticated, service_role;
revoke execute on function private.enforce_invitation_transition() from public, anon, authenticated, service_role;

create trigger companies_set_updated_at
before update on public.companies
for each row execute function private.set_updated_at();

create trigger company_settings_set_updated_at
before update on public.company_settings
for each row execute function private.set_updated_at();

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger personal_set_updated_at
before update on public.personal
for each row execute function private.set_updated_at();

create trigger company_memberships_set_updated_at
before update on public.company_memberships
for each row execute function private.set_updated_at();

create trigger roles_set_updated_at
before update on iam.roles
for each row execute function private.set_updated_at();

create trigger registration_invitations_enforce_transition
before insert or update on iam.registration_invitations
for each row execute function private.enforce_invitation_transition();

create trigger registration_invitations_set_updated_at
before update on iam.registration_invitations
for each row execute function private.set_updated_at();

create trigger audit_log_prevent_update_delete
before update or delete on audit.audit_log
for each row execute function private.prevent_audit_mutation();

create trigger audit_log_prevent_truncate
before truncate on audit.audit_log
for each statement execute function private.prevent_audit_mutation();

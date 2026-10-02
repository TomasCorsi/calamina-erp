create table iam.roles (
  id uuid primary key default extensions.gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null,
  is_system boolean not null default true,
  is_assignable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_key_check check (key ~ '^[a-z][a-z0-9_]*$'),
  constraint roles_name_check check (
    name = btrim(name) and char_length(name) between 1 and 120
  ),
  constraint roles_description_check check (
    description = btrim(description) and char_length(description) between 1 and 500
  ),
  constraint roles_admin_not_assignable_check check (
    key <> 'admin' or is_assignable is false
  )
);

alter table iam.roles enable row level security;
revoke all on table iam.roles from public, anon, authenticated, service_role;

create table iam.permissions (
  id uuid primary key default extensions.gen_random_uuid(),
  key text not null unique,
  description text not null,
  created_at timestamptz not null default now(),
  constraint permissions_key_check check (
    key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$'
  ),
  constraint permissions_description_check check (
    description = btrim(description) and char_length(description) between 1 and 500
  )
);

alter table iam.permissions enable row level security;
revoke all on table iam.permissions from public, anon, authenticated, service_role;

create table iam.role_permissions (
  role_id uuid not null
    references iam.roles (id) on delete restrict,
  permission_id uuid not null
    references iam.permissions (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create index role_permissions_permission_id_idx
  on iam.role_permissions (permission_id);

alter table iam.role_permissions enable row level security;
revoke all on table iam.role_permissions from public, anon, authenticated, service_role;

create table iam.user_roles (
  id uuid primary key default extensions.gen_random_uuid(),
  membership_id uuid not null
    references public.company_memberships (id) on delete restrict,
  role_id uuid not null
    references iam.roles (id) on delete restrict,
  assigned_by uuid
    references auth.users (id) on delete set null,
  assigned_at timestamptz not null default now(),
  constraint user_roles_membership_role_key unique (membership_id, role_id)
);

create index user_roles_role_id_idx on iam.user_roles (role_id);
create index user_roles_assigned_by_idx on iam.user_roles (assigned_by);

alter table iam.user_roles enable row level security;
revoke all on table iam.user_roles from public, anon, authenticated, service_role;

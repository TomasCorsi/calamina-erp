create table public.personal (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null
    references public.companies (id) on delete restrict,
  internal_code extensions.citext not null,
  first_name text not null,
  last_name text not null,
  work_email extensions.citext,
  job_title text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_company_id_id_key unique (company_id, id),
  constraint personal_internal_code_check check (
    internal_code::text = btrim(internal_code::text)
    and char_length(internal_code::text) between 1 and 64
  ),
  constraint personal_first_name_check check (
    first_name = btrim(first_name)
    and char_length(first_name) between 1 and 120
  ),
  constraint personal_last_name_check check (
    last_name = btrim(last_name)
    and char_length(last_name) between 1 and 120
  ),
  constraint personal_work_email_check check (
    work_email is null
    or (
      work_email::text = btrim(work_email::text)
      and work_email::text ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  ),
  constraint personal_job_title_check check (
    job_title is null
    or (job_title = btrim(job_title) and char_length(job_title) between 1 and 120)
  ),
  constraint personal_status_check check (status in ('active', 'inactive')),
  constraint personal_internal_code_key unique (company_id, internal_code)
);

create unique index personal_work_email_key
  on public.personal (company_id, work_email)
  where work_email is not null;

create index personal_company_status_idx
  on public.personal (company_id, status);

alter table public.personal enable row level security;
revoke all on table public.personal from public, anon, authenticated, service_role;

create table public.company_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null
    references public.companies (id) on delete restrict,
  user_id uuid not null
    references auth.users (id) on delete restrict,
  personal_id uuid,
  status text not null default 'active',
  suspended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_memberships_user_id_key unique (user_id),
  constraint company_memberships_personal_company_fkey
    foreign key (company_id, personal_id)
    references public.personal (company_id, id)
    on delete restrict,
  constraint company_memberships_status_check check (status in ('active', 'suspended')),
  constraint company_memberships_suspension_check check (
    (status = 'active' and suspended_at is null)
    or (status = 'suspended' and suspended_at is not null)
  )
);

create unique index company_memberships_personal_id_key
  on public.company_memberships (personal_id)
  where personal_id is not null;

create index company_memberships_company_status_idx
  on public.company_memberships (company_id, status);

alter table public.company_memberships enable row level security;
revoke all on table public.company_memberships from public, anon, authenticated, service_role;

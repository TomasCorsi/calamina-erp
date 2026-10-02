create table public.companies (
  id uuid primary key default extensions.gen_random_uuid(),
  singleton_guard boolean not null default true,
  legal_name text not null,
  display_name text not null,
  tax_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_singleton_guard_check check (singleton_guard is true),
  constraint companies_singleton_guard_key unique (singleton_guard),
  constraint companies_legal_name_check check (
    legal_name = btrim(legal_name)
    and char_length(legal_name) between 1 and 160
  ),
  constraint companies_display_name_check check (
    display_name = btrim(display_name)
    and char_length(display_name) between 1 and 160
  ),
  constraint companies_tax_id_check check (
    tax_id is null
    or (tax_id = btrim(tax_id) and char_length(tax_id) between 1 and 64)
  )
);

create unique index companies_tax_id_key
  on public.companies (lower(tax_id))
  where tax_id is not null;

alter table public.companies enable row level security;
revoke all on table public.companies from public, anon, authenticated, service_role;

create table public.company_settings (
  company_id uuid primary key
    references public.companies (id) on delete restrict,
  business_timezone text not null default 'America/Argentina/Buenos_Aires',
  functional_currency char(3) not null default 'ARS',
  locale text not null default 'es-AR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_settings_timezone_check check (
    business_timezone = btrim(business_timezone)
    and char_length(business_timezone) between 1 and 64
  ),
  constraint company_settings_currency_check check (
    functional_currency::text ~ '^[A-Z]{3}$'
  ),
  constraint company_settings_locale_check check (
    locale = btrim(locale)
    and char_length(locale) between 2 and 16
  )
);

alter table public.company_settings enable row level security;
revoke all on table public.company_settings from public, anon, authenticated, service_role;

create table public.profiles (
  user_id uuid primary key
    references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_check check (
    display_name = btrim(display_name)
    and char_length(display_name) between 1 and 120
  )
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon, authenticated, service_role;

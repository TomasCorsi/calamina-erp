begin;
set local search_path = public, extensions;
select no_plan();

select is(
  (select count(*) from public.companies),
  1::bigint,
  'seed should create exactly one company'
);

select throws_like(
  $$
    insert into public.companies (legal_name, display_name)
    values ('Second Company', 'Second Company')
  $$,
  '%duplicate key value violates unique constraint "companies_singleton_guard_key"%',
  'singleton constraint should reject a second company'
);

select is(
  (select business_timezone from public.company_settings),
  'America/Argentina/Buenos_Aires'::text,
  'business timezone should use the selected default'
);

select is(
  (select functional_currency::text from public.company_settings),
  'ARS'::text,
  'functional currency should be ARS'
);

select throws_like(
  $$
    insert into public.company_settings (company_id)
    values ('00000000-0000-4000-8000-000000000001')
  $$,
  '%duplicate key value violates unique constraint "company_settings_pkey"%',
  'company settings should be unique per company'
);

select throws_like(
  $$
    update public.company_settings set functional_currency = 'ars'
  $$,
  '%violates check constraint "company_settings_currency_check"%',
  'currency should be uppercase ISO format'
);

select * from finish();
rollback;

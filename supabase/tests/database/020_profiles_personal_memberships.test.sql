begin;
set local search_path = public, extensions;
select no_plan();

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'membership-one@example.invalid', '',
    '{}'::jsonb, '{"display_name":"Membership One"}'::jsonb, now(), now()
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'membership-two@example.invalid', '',
    '{}'::jsonb, '{"display_name":"Membership Two"}'::jsonb, now(), now()
  );

select is(
  (select count(*) from public.profiles where user_id::text like '30000000-%'),
  2::bigint,
  'Auth trigger should create one profile per user'
);

insert into public.company_memberships (
  id, company_id, user_id, personal_id
)
values (
  '31000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8001-000000000001'
);

select throws_like(
  $$
    insert into public.company_memberships (company_id, user_id, personal_id)
    values (
      '00000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8001-000000000002'
    )
  $$,
  '%duplicate key value violates unique constraint "company_memberships_user_id_key"%',
  'one user should have only one membership'
);

select throws_like(
  $$
    insert into public.company_memberships (company_id, user_id, personal_id)
    values (
      '00000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000002',
      '00000000-0000-4000-8001-000000000001'
    )
  $$,
  '%duplicate key value violates unique constraint "company_memberships_personal_id_key"%',
  'one personal record should link to only one user'
);

select throws_like(
  $$
    insert into public.personal (
      company_id, internal_code, first_name, last_name, work_email
    )
    values (
      '00000000-0000-4000-8000-000000000001',
      'emp-demo-001', 'Duplicate', 'Code', 'different@example.invalid'
    )
  $$,
  '%duplicate key value violates unique constraint "personal_internal_code_key"%',
  'internal codes should be case-insensitively unique'
);

select throws_like(
  $$
    insert into public.personal (
      company_id, internal_code, first_name, last_name, status
    )
    values (
      '00000000-0000-4000-8000-000000000001',
      'EMP-INVALID', 'Invalid', 'Status', 'admin'
    )
  $$,
  '%violates check constraint "personal_status_check"%',
  'personal status should reject authorization-like values'
);

select ok(
  exists (
    select 1
    from pg_catalog.pg_constraint as constraint_definition
    join pg_catalog.pg_class as relation
      on relation.oid = constraint_definition.conrelid
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'company_memberships'
      and constraint_definition.conname = 'company_memberships_personal_company_fkey'
      and constraint_definition.contype = 'f'
  ),
  'membership should enforce the personal company with a composite FK'
);

select throws_like(
  $$delete from auth.users where id = '30000000-0000-4000-8000-000000000001'$$,
  '%violates foreign key constraint "company_memberships_user_id_fkey"%',
  'Auth user deletion should be restricted while a membership exists'
);

select * from finish();
rollback;

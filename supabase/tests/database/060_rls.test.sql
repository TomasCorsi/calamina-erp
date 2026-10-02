begin;
set local search_path = public, extensions;
select no_plan();

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '35000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'viewer@example.invalid', '',
    '{}'::jsonb, '{"display_name":"Viewer User"}'::jsonb, now(), now()
  ),
  (
    '35000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'self@example.invalid', '',
    '{}'::jsonb, '{"display_name":"Self User"}'::jsonb, now(), now()
  ),
  (
    '35000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'nomembership@example.invalid', '',
    '{}'::jsonb, '{"display_name":"No Membership"}'::jsonb, now(), now()
  );

insert into public.company_memberships (id, company_id, user_id, personal_id)
values
  (
    '35100000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '35000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8001-000000000001'
  ),
  (
    '35100000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    '35000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8001-000000000002'
  );

insert into iam.user_roles (membership_id, role_id)
values (
  '35100000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000004'
);

select set_config('request.jwt.claim.sub', '35000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is(
  (
    select count(*)
    from public.profiles
    where user_id in (
      '35000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000002',
      '35000000-0000-4000-8000-000000000003'
    )
  ),
  3::bigint,
  'viewer should read every test profile'
);
select is((select count(*) from public.personal), 3::bigint, 'viewer should read every personal row');
select is(
  (
    select count(*)
    from public.company_memberships
    where id in (
      '35100000-0000-4000-8000-000000000001',
      '35100000-0000-4000-8000-000000000002'
    )
  ),
  2::bigint,
  'viewer should read every test membership'
);
reset role;

select set_config('request.jwt.claim.sub', '35000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is((select count(*) from public.profiles), 1::bigint, 'active user should read only own profile');
select is((select count(*) from public.personal), 1::bigint, 'active user should read only linked personal');
select is((select count(*) from public.company_memberships), 1::bigint, 'active user should read only own membership');
select is((select count(*) from public.companies), 1::bigint, 'active user should read singleton company');
select is((select count(*) from public.company_settings), 1::bigint, 'active user should read company settings');

select lives_ok(
  $$update public.profiles set display_name = 'Updated Self' where user_id = '35000000-0000-4000-8000-000000000002'$$,
  'active user should update own display_name'
);

select lives_ok(
  $$update public.profiles set display_name = 'Forbidden Change' where user_id = '35000000-0000-4000-8000-000000000001'$$,
  'RLS should silently filter updates to another profile'
);

select throws_like(
  $$update public.profiles set updated_at = now() where user_id = '35000000-0000-4000-8000-000000000002'$$,
  '%permission denied%',
  'authenticated users should not update protected profile columns'
);

select throws_like(
  $$
    insert into public.personal (company_id, internal_code, first_name, last_name)
    values ('00000000-0000-4000-8000-000000000001', 'RLS-DENIED', 'Denied', 'Insert')
  $$,
  '%permission denied%',
  'authenticated users should not write personal directly'
);
reset role;

select is(
  (select display_name from public.profiles where user_id = '35000000-0000-4000-8000-000000000002'),
  'Updated Self'::text,
  'own profile update should persist inside the test transaction'
);
select is(
  (select display_name from public.profiles where user_id = '35000000-0000-4000-8000-000000000001'),
  'Viewer User'::text,
  'another profile should remain unchanged'
);

select set_config('request.jwt.claim.sub', '35000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select is((select count(*) from public.profiles), 0::bigint, 'user without membership should not read own profile');
select is((select count(*) from public.personal), 0::bigint, 'user without membership should not read personal');
select is((select count(*) from public.companies), 0::bigint, 'user without membership should not read company');
reset role;

set local role anon;
select throws_like(
  $$select * from public.companies$$,
  '%permission denied%',
  'anon should have no table access'
);
reset role;

select * from finish();
rollback;

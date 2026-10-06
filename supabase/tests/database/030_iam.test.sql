begin;
set local search_path = public, extensions;
select no_plan();

select is((select count(*) from iam.roles), 5::bigint, 'five initial roles should exist');
select is((select count(*) from iam.permissions), 33::bigint, 'thirty-three permissions should exist after enabling the commercial block');

select is(
  (select count(*) from iam.role_permissions where role_id = '10000000-0000-4000-8000-000000000001'),
  33::bigint,
  'admin should receive every current permission'
);
select is(
  (select count(*) from iam.role_permissions where role_id = '10000000-0000-4000-8000-000000000002'),
  3::bigint,
  'user_manager should receive three user permissions'
);
select is(
  (select count(*) from iam.role_permissions where role_id = '10000000-0000-4000-8000-000000000003'),
  2::bigint,
  'personal_manager should receive two personal permissions'
);
select is(
  (select count(*) from iam.role_permissions where role_id = '10000000-0000-4000-8000-000000000004'),
  3::bigint,
  'viewer should receive the three view permissions'
);

select is(
  (select count(*) from iam.role_permissions where role_id = '10000000-0000-4000-8000-000000000005'),
  3::bigint,
  'parte diario operator should receive obras view and both parte diario permissions'
);

select ok(
  (select is_assignable from iam.roles where key = 'parte_diario_operator'),
  'parte diario operator should be assignable'
);

select is(
  (select is_assignable from iam.roles where key = 'admin'),
  false,
  'admin should not be assignable by normal flows'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '32000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'iam-one@example.invalid', '',
    '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '32000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'iam-two@example.invalid', '',
    '{}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into public.company_memberships (id, company_id, user_id, personal_id)
values
  (
    '32100000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '32000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8001-000000000002'
  ),
  (
    '32100000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    '32000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8001-000000000003'
  );

insert into iam.user_roles (membership_id, role_id)
values
  ('32100000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'),
  ('32100000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004');

select set_config('request.jwt.claim.sub', '32000000-0000-4000-8000-000000000001', true);
set local role authenticated;

select ok(private.has_permission('users.invite'), 'additive roles should include user_manager permissions');
select ok(private.has_permission('personal.view'), 'additive roles should include viewer permissions');
select ok(not private.has_permission('personal.manage'), 'unassigned permissions should remain denied');

select throws_like(
  $$insert into iam.user_roles (membership_id, role_id) values ('32100000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001')$$,
  '%permission denied%',
  'authenticated users should not write IAM directly'
);

reset role;
update public.company_memberships
set status = 'suspended', suspended_at = now()
where id = '32100000-0000-4000-8000-000000000001';

set local role authenticated;
select ok(not private.has_permission('users.invite'), 'suspension should remove all effective permissions');
reset role;

update public.personal
set job_title = 'admin'
where id = '00000000-0000-4000-8001-000000000003';

select set_config('request.jwt.claim.sub', '32000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select ok(not private.has_permission('users.manage_roles'), 'job_title must never grant authorization');
reset role;

select * from finish();
rollback;

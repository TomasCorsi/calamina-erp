begin;
set local search_path = public, extensions;
select no_plan();

select has_function('api', 'list_personal', array[]::text[], 'personal list RPC should exist');
select has_function('api', 'current_user_roles', array[]::text[], 'current user roles RPC should exist');
select has_function('api', 'create_personal', array['text', 'text', 'text', 'text', 'text'], 'personal creation RPC should exist');
select has_function('api', 'update_personal', array['uuid', 'text', 'text', 'text', 'text', 'text'], 'personal update RPC should exist');
select has_function('api', 'set_personal_status', array['uuid', 'text'], 'personal status RPC should exist');
select has_function('api', 'list_users', array[]::text[], 'user list RPC should exist');
select has_function('api', 'set_membership_status', array['uuid', 'text'], 'membership status RPC should exist');
select has_function('api', 'assign_user_role', array['uuid', 'text'], 'role assignment RPC should exist');
select has_function('api', 'remove_user_role', array['uuid', 'text'], 'role removal RPC should exist');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('3a000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'users-manager@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('3a000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'personal-manager@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('3a000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'read-only@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('3a000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'managed-user@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('3a000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'duplicate-link@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.personal (id, company_id, internal_code, first_name, last_name, work_email, job_title)
values (
  '3a200000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'TEST-LINK', 'Persona', 'Vinculada', 'managed-user@example.invalid', 'Pruebas'
);

insert into public.company_memberships (id, company_id, user_id, personal_id, status)
values
  ('3a100000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '3a000000-0000-4000-8000-000000000001', null, 'active'),
  ('3a100000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '3a000000-0000-4000-8000-000000000002', null, 'active'),
  ('3a100000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '3a000000-0000-4000-8000-000000000003', null, 'active'),
  ('3a100000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', '3a000000-0000-4000-8000-000000000004', '3a200000-0000-4000-8000-000000000001', 'active');

insert into iam.user_roles (membership_id, role_id)
values
  ('3a100000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'),
  ('3a100000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003'),
  ('3a100000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004'),
  ('3a100000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004');

select set_config('request.jwt.claim.sub', '3a000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select throws_like(
  $$select * from api.list_personal()$$,
  '%not authorized%',
  'a user without personal.view should not list personal'
);
select cmp_ok(
  (select count(*) from api.list_users()),
  '>=',
  4::bigint,
  'a user_manager should list company users, including an optional bootstrapped local admin'
);
reset role;

select set_config('request.jwt.claim.sub', '3a000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select lives_ok(
  $$select api.create_personal('RPC-1', 'Ada', 'Prueba', 'ada.prueba@example.invalid', 'Administrativa')$$,
  'a personal_manager should create personal'
);
select lives_ok(
  $$select api.update_personal(
    (select id from public.personal where internal_code = 'RPC-1'),
    'RPC-1', 'Ada', 'Actualizada', 'ada.prueba@example.invalid', 'Administrativa'
  )$$,
  'a personal_manager should update personal'
);
reset role;

select is(
  (select last_name from public.personal where internal_code = 'RPC-1'),
  'Actualizada'::text,
  'the personal update should persist through the RPC'
);
select is(
  (select count(*) from audit.audit_log where action in ('personal.created', 'personal.updated') and after_data ->> 'internal_code' = 'RPC-1'),
  2::bigint,
  'personal creation and update should be audited'
);

select set_config('request.jwt.claim.sub', '3a000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select ok((select count(*) from api.list_personal()) >= 1, 'a viewer should have read-only personal access');
select results_eq(
  $$select role_key from api.current_user_roles()$$,
  $$values ('viewer'::text)$$,
  'current user roles should return only the authenticated active membership roles'
);
select throws_like(
  $$select api.create_personal('DENIED', 'Solo', 'Lectura', null, null)$$,
  '%not authorized%',
  'a viewer should not create personal'
);
select throws_like(
  $$insert into public.personal (company_id, internal_code, first_name, last_name)
    values ('00000000-0000-4000-8000-000000000001', 'DIRECT', 'Directo', 'Denegado')$$,
  '%permission denied%',
  'RLS and grants should prevent direct personal writes'
);
reset role;

update public.company_memberships
set status = 'suspended', suspended_at = now()
where id = '3a100000-0000-4000-8000-000000000002';

select set_config('request.jwt.claim.sub', '3a000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select throws_like(
  $$select api.create_personal('SUSPENDED', 'Sin', 'Acceso', null, null)$$,
  '%not authorized%',
  'a suspended membership should not operate'
);
reset role;

select set_config('request.jwt.claim.sub', '3a000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select lives_ok(
  $$select api.assign_user_role('3a100000-0000-4000-8000-000000000004', 'personal_manager')$$,
  'a user_manager should assign an assignable role'
);
select throws_like(
  $$select api.assign_user_role('3a100000-0000-4000-8000-000000000004', 'admin')$$,
  '%role is not assignable%',
  'admin should not be assignable'
);
select throws_like(
  $$select api.assign_user_role('3a100000-0000-4000-8000-000000000001', 'viewer')$$,
  '%cannot modify own roles%',
  'a user should not modify their own roles'
);
select lives_ok(
  $$select api.remove_user_role('3a100000-0000-4000-8000-000000000004', 'personal_manager')$$,
  'a user_manager should remove an assignable role'
);
select is(
  api.set_membership_status('3a100000-0000-4000-8000-000000000004', 'suspended'),
  true,
  'a user_manager should suspend another membership'
);
select is(
  api.set_membership_status('3a100000-0000-4000-8000-000000000004', 'active'),
  true,
  'a user_manager should reactivate another membership'
);
reset role;

select is(
  (select count(*) from audit.audit_log where action in ('role.assigned', 'role.removed', 'membership.suspended', 'membership.reactivated') and actor_user_id = '3a000000-0000-4000-8000-000000000001'),
  4::bigint,
  'user management changes should write only their critical audit events'
);

select throws_like(
  $$insert into public.company_memberships (company_id, user_id, personal_id, status)
    values (
      '00000000-0000-4000-8000-000000000001',
      '3a000000-0000-4000-8000-000000000005',
      '3a200000-0000-4000-8000-000000000001',
      'active'
    )$$,
  '%duplicate key value violates unique constraint "company_memberships_personal_id_key"%',
  'a personal record should not link to two memberships'
);

select * from finish();
rollback;

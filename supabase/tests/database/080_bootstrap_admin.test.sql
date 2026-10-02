begin;
set local search_path = public, extensions;
select no_plan();

select has_schema('api', 'api schema should exist');
select has_function(
  'api',
  'bootstrap_initial_admin',
  array['uuid', 'text', 'uuid'],
  'bootstrap RPC should expose only user, display name, and request id inputs'
);

select ok(
  pg_catalog.has_schema_privilege('service_role', 'api', 'USAGE'),
  'service_role should have api schema usage'
);
select ok(
  pg_catalog.has_function_privilege(
    'service_role',
    'api.bootstrap_initial_admin(uuid,text,uuid)',
    'EXECUTE'
  ),
  'service_role should execute bootstrap RPC'
);
select ok(
  not pg_catalog.has_function_privilege(
    'authenticated',
    'api.bootstrap_initial_admin(uuid,text,uuid)',
    'EXECUTE'
  ),
  'authenticated should not execute bootstrap RPC'
);
select ok(
  not pg_catalog.has_function_privilege(
    'anon',
    'api.bootstrap_initial_admin(uuid,text,uuid)',
    'EXECUTE'
  ),
  'anon should not execute bootstrap RPC'
);

select is(
  (
    select procedure_record.pronargs::integer
    from pg_catalog.pg_proc as procedure_record
    join pg_catalog.pg_namespace as namespace_record
      on namespace_record.oid = procedure_record.pronamespace
    where namespace_record.nspname = 'api'
      and procedure_record.proname = 'bootstrap_initial_admin'
  ),
  3,
  'bootstrap RPC should not accept company, role, email, permissions, or personal parameters'
);

-- Keep this test isolated when a developer has already bootstrapped a local admin.
-- The surrounding transaction restores the existing assignment on rollback.
delete from iam.user_roles
where role_id = (
  select role_record.id
  from iam.roles as role_record
  where role_record.key = 'admin'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values
  (
    '38000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'unmarked@example.invalid', '', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '38000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'first-admin@example.invalid', '', now(),
    '{"calamina_bootstrap_admin_v2":true}'::jsonb,
    '{"display_name":"Metadata Name","role":"admin"}'::jsonb,
    now(), now()
  ),
  (
    '38000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'second-admin@example.invalid', '', now(),
    '{"calamina_bootstrap_admin_v2":true}'::jsonb,
    '{}'::jsonb, now(), now()
  ),
  (
    '38000000-0000-4000-8000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'fake-metadata@example.invalid', '', now(),
    '{"role":"admin","permissions":["users.manage_roles"]}'::jsonb,
    '{}'::jsonb, now(), now()
  ),
  (
    '38000000-0000-4000-8000-000000000005',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'unconfirmed@example.invalid', '', null,
    '{"calamina_bootstrap_admin_v2":true}'::jsonb,
    '{}'::jsonb, now(), now()
  );

set local role authenticated;
select throws_like(
  $$select * from api.bootstrap_initial_admin(
    '38000000-0000-4000-8000-000000000002',
    'Admin Local',
    '38100000-0000-4000-8000-000000000001'
  )$$,
  '%permission denied%',
  'authenticated calls should be rejected'
);
reset role;

set local role anon;
select throws_like(
  $$select * from api.bootstrap_initial_admin(
    '38000000-0000-4000-8000-000000000002',
    'Admin Local',
    '38100000-0000-4000-8000-000000000001'
  )$$,
  '%permission denied%',
  'anonymous calls should be rejected'
);
reset role;

set local role service_role;
select throws_like(
  $$select * from api.bootstrap_initial_admin(
    '38000000-0000-4000-8000-000000000001',
    'Unmarked User',
    '38100000-0000-4000-8000-000000000002'
  )$$,
  '%not marked for local bootstrap%',
  'unmarked Auth users should be rejected'
);

select throws_like(
  $$select * from api.bootstrap_initial_admin(
    '38000000-0000-4000-8000-000000000004',
    'Fake Metadata',
    '38100000-0000-4000-8000-000000000003'
  )$$,
  '%not marked for local bootstrap%',
  'unrelated metadata must not grant bootstrap access'
);

select throws_like(
  $$select * from api.bootstrap_initial_admin(
    '38000000-0000-4000-8000-000000000005',
    'Unconfirmed User',
    '38100000-0000-4000-8000-000000000004'
  )$$,
  '%email is not confirmed%',
  'unconfirmed Auth users should be rejected'
);

create temporary table bootstrap_first_result on commit drop as
select * from api.bootstrap_initial_admin(
  '38000000-0000-4000-8000-000000000002',
  'Admin Local',
  '38100000-0000-4000-8000-000000000005'
);
reset role;

select is(
  (select result from bootstrap_first_result),
  'created'::text,
  'the first marked user should create the bootstrap admin'
);
select is(
  (
    select count(*)
    from public.company_memberships
    where user_id = '38000000-0000-4000-8000-000000000002'
      and status = 'active'
  ),
  1::bigint,
  'bootstrap should create exactly one active membership'
);
select is(
  (
    select count(*)
    from iam.user_roles as user_role
    join public.company_memberships as membership
      on membership.id = user_role.membership_id
    join iam.roles as role_record
      on role_record.id = user_role.role_id
    where membership.user_id = '38000000-0000-4000-8000-000000000002'
      and role_record.key = 'admin'
  ),
  1::bigint,
  'bootstrap should assign exactly one admin role'
);
select is(
  (select is_assignable from iam.roles where key = 'admin'),
  false,
  'the admin role should remain non-assignable'
);
select is(
  (
    select display_name
    from public.profiles
    where user_id = '38000000-0000-4000-8000-000000000002'
  ),
  'Admin Local'::text,
  'bootstrap should update the generated profile display name'
);
select is(
  (
    select count(*)
    from audit.audit_log
    where request_id = '38100000-0000-4000-8000-000000000005'
      and action in ('auth.bootstrap_admin', 'membership.created', 'role.assigned')
  ),
  3::bigint,
  'bootstrap should write the three required audit events'
);

set local role service_role;
create temporary table bootstrap_retry_result on commit drop as
select * from api.bootstrap_initial_admin(
  '38000000-0000-4000-8000-000000000002',
  'Different Retry Name',
  '38100000-0000-4000-8000-000000000006'
);
reset role;

select is(
  (select result from bootstrap_retry_result),
  'already_bootstrapped'::text,
  'retrying the same admin should be idempotent'
);
select is(
  (
    select count(*)
    from public.company_memberships
    where user_id = '38000000-0000-4000-8000-000000000002'
  ),
  1::bigint,
  'retry should not duplicate the membership'
);
select is(
  (
    select count(*)
    from iam.user_roles as user_role
    join public.company_memberships as membership
      on membership.id = user_role.membership_id
    where membership.user_id = '38000000-0000-4000-8000-000000000002'
  ),
  1::bigint,
  'retry should not duplicate the admin role'
);
select is(
  (
    select count(*)
    from audit.audit_log
    where action in ('auth.bootstrap_admin', 'membership.created', 'role.assigned')
      and entity_id in (
        '38000000-0000-4000-8000-000000000002',
        (select membership_id from bootstrap_first_result),
        (
          select user_role.id
          from iam.user_roles as user_role
          where user_role.membership_id = (select membership_id from bootstrap_first_result)
        )
      )
  ),
  3::bigint,
  'retry should not duplicate bootstrap audit events'
);
select is(
  (
    select display_name
    from public.profiles
    where user_id = '38000000-0000-4000-8000-000000000002'
  ),
  'Admin Local'::text,
  'idempotent retry should not mutate the existing profile'
);

set local role service_role;
select throws_like(
  $$select * from api.bootstrap_initial_admin(
    '38000000-0000-4000-8000-000000000003',
    'Second Admin',
    '38100000-0000-4000-8000-000000000007'
  )$$,
  '%active bootstrap admin already exists%',
  'a second bootstrap admin should be rejected'
);
reset role;

select is(
  (
    select count(*)
    from public.company_memberships
    where user_id = '38000000-0000-4000-8000-000000000003'
  ),
  0::bigint,
  'rejected second admin should receive no membership'
);

select * from finish();
rollback;

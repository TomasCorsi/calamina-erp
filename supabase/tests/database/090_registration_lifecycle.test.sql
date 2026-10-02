begin;
set local search_path = public, extensions;
select no_plan();

select has_function('api', 'current_user_permissions', array[]::text[], 'effective permission RPC should exist');
select has_function('api', 'create_registration_invitation', array['text', 'text', 'uuid', 'bytea'], 'invitation creation RPC should exist');
select has_function('api', 'reserve_registration_invitation', array['bytea'], 'invitation reservation RPC should exist');
select has_function('api', 'finalize_registration_invitation', array['uuid', 'uuid', 'uuid', 'text'], 'invitation finalization RPC should exist');
select has_function('api', 'revoke_registration_invitation', array['uuid'], 'invitation revocation RPC should exist');

select ok(
  pg_catalog.has_function_privilege('authenticated', 'api.current_user_permissions()', 'EXECUTE'),
  'authenticated users should read only their effective permission keys'
);
select ok(
  not pg_catalog.has_function_privilege('authenticated', 'api.reserve_registration_invitation(bytea)', 'EXECUTE'),
  'authenticated users should not reserve invitations directly'
);
select ok(
  pg_catalog.has_function_privilege('service_role', 'api.finalize_registration_invitation(uuid,uuid,uuid,text)', 'EXECUTE'),
  'service_role should finalize through the narrow RPC'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '39000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'invitation-manager@example.invalid', '', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '39000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'invitation-viewer@example.invalid', '', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into public.company_memberships (id, company_id, user_id, status)
values
  (
    '39100000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '39000000-0000-4000-8000-000000000001',
    'active'
  ),
  (
    '39100000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    '39000000-0000-4000-8000-000000000002',
    'active'
  );

insert into iam.user_roles (membership_id, role_id)
values
  ('39100000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'),
  ('39100000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004');

select set_config('request.jwt.claim.sub', '39000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select throws_like(
  $$select * from api.create_registration_invitation(
    'denied@example.invalid', 'viewer', null, decode(repeat('a1', 32), 'hex')
  )$$,
  '%not authorized%',
  'a user without users.invite should not create invitations'
);
reset role;

select set_config('request.jwt.claim.sub', '39000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select lives_ok(
  $$select * from api.create_registration_invitation(
    'new-member@example.invalid', 'viewer', null, decode(repeat('b1', 32), 'hex')
  )$$,
  'a user with users.invite should create an invitation'
);
select throws_like(
  $$select * from api.create_registration_invitation(
    'admin-attempt@example.invalid', 'admin', null, decode(repeat('b2', 32), 'hex')
  )$$,
  '%role is not assignable%',
  'the admin role should never be assignable by invitation'
);
reset role;

select is(
  (select count(*) from iam.registration_invitations where email = 'new-member@example.invalid'),
  1::bigint,
  'creation should persist exactly one hashed invitation'
);
select is(
  (select octet_length(token_hash) from iam.registration_invitations where email = 'new-member@example.invalid'),
  32,
  'only a 32-byte SHA-256 token hash should be stored'
);
select is(
  (select count(*) from audit.audit_log where action = 'invitation.created' and after_data ->> 'email' = 'new-member@example.invalid'),
  1::bigint,
  'invitation creation should be audited once'
);

set local role service_role;
select is_empty(
  $$select * from api.reserve_registration_invitation(decode(repeat('cc', 32), 'hex'))$$,
  'an invalid token hash should disclose no invitation data'
);
reset role;

insert into iam.registration_invitations (email, token_hash, role_id, expires_at, created_at)
values (
  'expired-lifecycle@example.invalid',
  decode(repeat('d1', 32), 'hex'),
  '10000000-0000-4000-8000-000000000004',
  now() - interval '1 hour',
  now() - interval '4 days'
);

set local role service_role;
select is_empty(
  $$select * from api.reserve_registration_invitation(decode(repeat('d1', 32), 'hex'))$$,
  'an expired token should not be reservable'
);
reset role;
select is(
  (select state from iam.registration_invitations where email = 'expired-lifecycle@example.invalid'),
  'expired'::text,
  'an expired invitation should be transitioned to expired'
);

create temporary table invitation_reservation on commit drop as
select * from api.reserve_registration_invitation(decode(repeat('b1', 32), 'hex'));

select is((select count(*) from invitation_reservation), 1::bigint, 'a valid pending token should be reserved once');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '39000000-0000-4000-8000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'new-member@example.invalid', '', now(),
  '{}'::jsonb, '{}'::jsonb, now(), now()
);

select lives_ok(
  format(
    'select * from api.finalize_registration_invitation(%L, %L, %L, %L)',
    (select invitation_id from invitation_reservation),
    (select reservation_id from invitation_reservation),
    '39000000-0000-4000-8000-000000000003',
    'Nuevo Miembro'
  ),
  'a matching confirmed Auth user should finalize the invitation'
);

select is(
  (select count(*) from public.company_memberships where user_id = '39000000-0000-4000-8000-000000000003'),
  1::bigint,
  'finalization should create exactly one membership'
);
select is(
  (
    select count(*)
    from iam.user_roles as ur
    join public.company_memberships as cm on cm.id = ur.membership_id
    where cm.user_id = '39000000-0000-4000-8000-000000000003'
      and ur.role_id = '10000000-0000-4000-8000-000000000004'
  ),
  1::bigint,
  'finalization should assign exactly the invited role'
);
select is(
  (select state from iam.registration_invitations where email = 'new-member@example.invalid'),
  'accepted'::text,
  'finalization should consume the invitation'
);

set local role service_role;
select is_empty(
  $$select * from api.reserve_registration_invitation(decode(repeat('b1', 32), 'hex'))$$,
  'an accepted token should not be reusable'
);
reset role;

select set_config('request.jwt.claim.sub', '39000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select results_eq(
  $$select permission_key from api.current_user_permissions() order by permission_key$$,
  $$values ('personal.view'::text), ('users.view'::text)$$,
  'the accepted viewer should receive only the viewer permission union'
);
select throws_like(
  $$insert into iam.user_roles (membership_id, role_id) values (
    '39100000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000003'
  )$$,
  '%permission denied%',
  'browser roles should not write user_roles directly'
);
reset role;

select set_config('request.jwt.claim.sub', '39000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select lives_ok(
  $$select * from api.create_registration_invitation(
    'revoke-me@example.invalid', 'viewer', null, decode(repeat('e1', 32), 'hex')
  )$$,
  'an authorized user should create a second pending invitation'
);
select is(
  api.revoke_registration_invitation(
    (select invitation_id from api.list_registration_invitations() where email = 'revoke-me@example.invalid')
  ),
  true,
  'an authorized user should revoke a pending invitation'
);
reset role;

select is(
  (select state from iam.registration_invitations where email = 'revoke-me@example.invalid'),
  'revoked'::text,
  'revocation should move the invitation to its terminal state'
);
select is(
  (select count(*) from audit.audit_log where action = 'invitation.revoked' and entity_id = (select id from iam.registration_invitations where email = 'revoke-me@example.invalid')),
  1::bigint,
  'revocation should be audited once'
);

select * from finish();
rollback;

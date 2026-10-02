begin;
set local search_path = public, extensions;
select no_plan();

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '33000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'inviter@example.invalid', '',
    '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '33000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'accepted@example.invalid', '',
    '{}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into iam.registration_invitations (
  id, email, token_hash, role_id, personal_id, expires_at, created_by
)
values (
  '33100000-0000-4000-8000-000000000001',
  'invitee@example.invalid',
  decode(repeat('11', 32), 'hex'),
  '10000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8001-000000000001',
  now() + interval '1 day',
  '33000000-0000-4000-8000-000000000001'
);

select throws_like(
  $$
    insert into iam.registration_invitations (
      email, token_hash, role_id, expires_at, created_by
    ) values (
      'INVITEE@example.invalid',
      decode(repeat('22', 32), 'hex'),
      '10000000-0000-4000-8000-000000000004',
      now() + interval '1 day',
      '33000000-0000-4000-8000-000000000001'
    )
  $$,
  '%duplicate key value violates unique constraint "registration_invitations_active_email_key"%',
  'only one active invitation should exist per case-insensitive email'
);

select throws_like(
  $$
    insert into iam.registration_invitations (
      email, token_hash, role_id, personal_id, expires_at, created_by
    ) values (
      'other@example.invalid',
      decode(repeat('33', 32), 'hex'),
      '10000000-0000-4000-8000-000000000004',
      '00000000-0000-4000-8001-000000000001',
      now() + interval '1 day',
      '33000000-0000-4000-8000-000000000001'
    )
  $$,
  '%duplicate key value violates unique constraint "registration_invitations_active_personal_key"%',
  'only one active invitation should exist per personal record'
);

select throws_like(
  $$
    insert into iam.registration_invitations (
      email, token_hash, role_id, expires_at, created_by
    ) values (
      'short-hash@example.invalid',
      decode('aabb', 'hex'),
      '10000000-0000-4000-8000-000000000004',
      now() + interval '1 day',
      '33000000-0000-4000-8000-000000000001'
    )
  $$,
  '%violates check constraint "registration_invitations_token_hash_length_check"%',
  'token hashes should contain exactly 32 bytes'
);

select throws_like(
  $$
    insert into iam.registration_invitations (
      email, token_hash, role_id, state, expires_at, accepted_at, accepted_by, created_by
    ) values (
      'invalid-state@example.invalid',
      decode(repeat('44', 32), 'hex'),
      '10000000-0000-4000-8000-000000000004',
      'accepted',
      now() + interval '1 day',
      now(),
      '33000000-0000-4000-8000-000000000002',
      '33000000-0000-4000-8000-000000000001'
    )
  $$,
  '%new invitations must start pending%',
  'new invitations should always start pending'
);

update iam.registration_invitations
set state = 'reserved',
    reservation_id = '33200000-0000-4000-8000-000000000001',
    reserved_at = now(),
    reservation_expires_at = now() + interval '5 minutes'
where id = '33100000-0000-4000-8000-000000000001';

update iam.registration_invitations
set state = 'accepted',
    reservation_id = null,
    reserved_at = null,
    reservation_expires_at = null,
    accepted_at = now(),
    accepted_by = '33000000-0000-4000-8000-000000000002'
where id = '33100000-0000-4000-8000-000000000001';

select is(
  (select state from iam.registration_invitations where id = '33100000-0000-4000-8000-000000000001'),
  'accepted'::text,
  'reserved invitations should transition to accepted'
);

select throws_like(
  $$
    update iam.registration_invitations
    set state = 'revoked', accepted_at = null, revoked_at = now()
    where id = '33100000-0000-4000-8000-000000000001'
  $$,
  '%terminal invitations are immutable%',
  'accepted invitations should be immutable'
);

insert into iam.registration_invitations (
  id, email, token_hash, role_id, expires_at, created_by
)
values (
  '33100000-0000-4000-8000-000000000002',
  'not-expired@example.invalid',
  decode(repeat('55', 32), 'hex'),
  '10000000-0000-4000-8000-000000000004',
  now() + interval '1 day',
  '33000000-0000-4000-8000-000000000001'
);

select throws_like(
  $$
    update iam.registration_invitations
    set state = 'expired'
    where id = '33100000-0000-4000-8000-000000000002'
  $$,
  '%invitation has not expired%',
  'an invitation should not expire before expires_at'
);

select * from finish();
rollback;

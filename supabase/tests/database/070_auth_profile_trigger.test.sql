begin;
set local search_path = public, extensions;
select no_plan();

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '36000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'metadata-role@example.invalid',
  '',
  '{}'::jsonb,
  '{"display_name":"Metadata User","role":"admin","permissions":["users.manage_roles"]}'::jsonb,
  now(),
  now()
);

select is(
  (select display_name from public.profiles where user_id = '36000000-0000-4000-8000-000000000001'),
  'Metadata User'::text,
  'trigger should copy only the display name'
);

select is(
  (select count(*) from public.company_memberships where user_id = '36000000-0000-4000-8000-000000000001'),
  0::bigint,
  'trigger should not create a membership'
);

select is(
  (
    select count(*)
    from iam.user_roles as user_role
    join public.company_memberships as membership on membership.id = user_role.membership_id
    where membership.user_id = '36000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'Auth metadata should never create role assignments'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '36000000-0000-4000-8000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'fallback@example.invalid', '',
  '{}'::jsonb, '{}'::jsonb, now(), now()
);

select is(
  (select display_name from public.profiles where user_id = '36000000-0000-4000-8000-000000000002'),
  'Usuario'::text,
  'trigger should use a safe fallback display name'
);

delete from auth.users where id = '36000000-0000-4000-8000-000000000002';

select is(
  (select count(*) from public.profiles where user_id = '36000000-0000-4000-8000-000000000002'),
  0::bigint,
  'deleting an unlinked Auth user should cascade to profile'
);

select * from finish();
rollback;

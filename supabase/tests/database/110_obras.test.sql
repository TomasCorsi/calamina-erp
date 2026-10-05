begin;
set local search_path = public, extensions;
select no_plan();

select has_table('public', 'obras', 'the v2 obras table should exist');
select has_table('public', 'clientes', 'the minimal client catalog should exist');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('3b000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'obras-no-view@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('3b000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'obras-viewer@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('3b000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'obras-manager@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('3b000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'obras-suspended@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.company_memberships (id, company_id, user_id, status, suspended_at)
values
  ('3b100000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '3b000000-0000-4000-8000-000000000001', 'active', null),
  ('3b100000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '3b000000-0000-4000-8000-000000000002', 'active', null),
  ('3b100000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '3b000000-0000-4000-8000-000000000003', 'active', null),
  ('3b100000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', '3b000000-0000-4000-8000-000000000004', 'suspended', now());

insert into iam.user_roles (membership_id, role_id)
values
  ('3b100000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'),
  ('3b100000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004'),
  ('3b100000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001'),
  ('3b100000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001');

select set_config('request.jwt.claim.sub', '3b000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is(
  (select count(*) from public.obras),
  0::bigint,
  'a user without obras.view should not list works'
);
reset role;

select set_config('request.jwt.claim.sub', '3b000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select ok(
  (select count(*) from public.obras) >= 2,
  'a user with obras.view should read company works'
);
select throws_like(
  $$insert into public.obras (company_id, nombre, numero)
    values ('00000000-0000-4000-8000-000000000001', 'Obra denegada', 'OB-DENIED')$$,
  '%row-level security%',
  'a user without obras.manage should not create works'
);
select is_empty(
  $$update public.obras set ubicacion = 'Cambio denegado'
    where id = '00000000-0000-4000-8003-000000000001'
    returning id$$,
  'a user without obras.manage should not update works'
);
reset role;

select set_config('request.jwt.claim.sub', '3b000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select lives_ok(
  $$insert into public.obras (
      id, company_id, nombre, numero, estado, cliente_id
    ) values (
      '3b200000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'Obra creada por prueba',
      'OB-TEST-001',
      'pendiente',
      '00000000-0000-4000-8002-000000000001'
    )$$,
  'a user with obras.manage should create works'
);
select lives_ok(
  $$update public.obras
    set nombre = 'Obra editada por prueba', estado = 'activa'
    where id = '3b200000-0000-4000-8000-000000000001'$$,
  'a user with obras.manage should update works'
);
select is(
  (select nombre from public.obras where id = '3b200000-0000-4000-8000-000000000001'),
  'Obra editada por prueba'::text,
  'the authorized update should persist'
);
reset role;

select is(
  (select count(*) from audit.audit_log
   where entity_id = '3b200000-0000-4000-8000-000000000001'
     and action in ('obra.created', 'obra.updated')),
  2::bigint,
  'authorized obra writes should be audited on the server'
);

select set_config('request.jwt.claim.sub', '3b000000-0000-4000-8000-000000000004', true);
set local role authenticated;
select is(
  (select count(*) from public.obras),
  0::bigint,
  'a suspended membership should not list works'
);
select throws_like(
  $$insert into public.obras (company_id, nombre, numero)
    values ('00000000-0000-4000-8000-000000000001', 'Obra suspendida', 'OB-SUSPENDED')$$,
  '%row-level security%',
  'a suspended membership should not create works'
);
reset role;

select * from finish();
rollback;

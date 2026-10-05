begin;
set local search_path = public, extensions;
select no_plan();

select has_table('public', 'remitos', 'the v2 remitos table should exist');
select has_table('public', 'remito_items', 'the v2 remito items table should exist');
select has_function('api', 'replace_remito_items', array['uuid', 'jsonb'], 'the atomic item replacement RPC should exist');

insert into iam.roles (id, key, name, description, is_system, is_assignable)
values (
  '3d000000-0000-4000-8000-000000000001',
  'remitos_test_viewer',
  'Remitos test viewer',
  'Transaction-local role used to verify read-only RLS.',
  false,
  true
);

insert into iam.role_permissions (role_id, permission_id)
values (
  '3d000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000010'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('3d100000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'remitos-viewer@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('3d100000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'remitos-readonly@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('3d100000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'remitos-admin@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('3d100000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'remitos-suspended@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.company_memberships (id, company_id, user_id, status, suspended_at)
values
  ('3d200000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '3d100000-0000-4000-8000-000000000001', 'active', null),
  ('3d200000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '3d100000-0000-4000-8000-000000000002', 'active', null),
  ('3d200000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '3d100000-0000-4000-8000-000000000003', 'active', null),
  ('3d200000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', '3d100000-0000-4000-8000-000000000004', 'suspended', now());

insert into iam.user_roles (membership_id, role_id)
values
  ('3d200000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004'),
  ('3d200000-0000-4000-8000-000000000002', '3d000000-0000-4000-8000-000000000001'),
  ('3d200000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001'),
  ('3d200000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001');

select set_config('request.jwt.claim.sub', '3d100000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is((select count(*) from public.remitos), 0::bigint, 'a user without remitos.view should not list remitos');
select is((select count(*) from public.remito_items), 0::bigint, 'viewer should not read remito items');
reset role;

select set_config('request.jwt.claim.sub', '3d100000-0000-4000-8000-000000000002', true);
set local role authenticated;
select ok((select count(*) from public.remitos) >= 2, 'a user with remitos.view should list company remitos');
select ok((select count(*) from public.remito_items) >= 1, 'a user with remitos.view should list company remito items');
select throws_like(
  $$insert into public.remitos (company_id, numero, fecha)
    values ('00000000-0000-4000-8000-000000000001', 'REM-DENIED', current_date)$$,
  '%row-level security%',
  'a user without remitos.manage should not create remitos'
);
select is_empty(
  $$update public.remitos set observaciones = 'Cambio denegado'
    where id = '00000000-0000-4000-8006-000000000001'
    returning id$$,
  'a user without remitos.manage should not update remitos'
);
select throws_like(
  $$select api.replace_remito_items('00000000-0000-4000-8006-000000000001', '[]'::jsonb)$$,
  '%not authorized%',
  'a user without remitos.manage should not replace items'
);
reset role;

select set_config('request.jwt.claim.sub', '3d100000-0000-4000-8000-000000000003', true);
set local role authenticated;
select lives_ok(
  $$insert into public.remitos (
      id, company_id, numero, fecha, obra_id, maquinaria_id, material, cantidad,
      unidad, recibido_por, remito_local, desde, hasta, cantidad_viajes
    ) values (
      '3d300000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'REM-TEST-001', current_date,
      '00000000-0000-4000-8003-000000000001',
      '00000000-0000-4000-8004-000000000001',
      'Material de prueba', 10, 'M3', '-', 'REM-TEST-001',
      'Cantera de prueba', 'Obra Demo Parque Industrial', 1
    )$$,
  'a user with remitos.manage should create a remito'
);
select lives_ok(
  $$update public.remitos
    set observaciones = 'Edicion autorizada', cantidad = 12
    where id = '3d300000-0000-4000-8000-000000000001'$$,
  'a user with remitos.manage should edit a remito'
);
select is(
  api.replace_remito_items(
    '3d300000-0000-4000-8000-000000000001',
    '[{"concepto":"Hora de equipo","cantidad":2,"unidad":"HS","precio_unitario":100,"precio_total":200}]'::jsonb
  ),
  1,
  'the RPC should replace remito items atomically'
);
select is(
  (select count(*) from public.remito_items where remito_id = '3d300000-0000-4000-8000-000000000001'),
  1::bigint,
  'the new item should be visible after replacement'
);
select throws_like(
  $$insert into public.remitos (company_id, numero, fecha)
    values ('00000000-0000-4000-8000-000000000001', 'rem-test-001', current_date)$$,
  '%duplicate key%',
  'remito numbers should be unique per company ignoring case'
);
select throws_like(
  $$insert into public.remitos (company_id, numero, fecha, obra_id)
    values ('00000000-0000-4000-8000-000000000001', 'REM-BAD-REL', current_date, 'ffffffff-ffff-4fff-8fff-ffffffffffff')$$,
  '%foreign key constraint%',
  'invalid company relationships should be rejected'
);
select throws_like(
  $$insert into public.remitos (company_id, numero, fecha, cantidad)
    values ('00000000-0000-4000-8000-000000000001', 'REM-NEGATIVE', current_date, -1)$$,
  '%check constraint%',
  'negative remito quantities should be rejected'
);
reset role;

select is(
  (select count(*) from audit.audit_log
   where entity_id = '3d300000-0000-4000-8000-000000000001'
     and action in ('remito.created', 'remito.updated', 'remito.items_replaced')),
  3::bigint,
  'critical remito creation, editing and item replacement should be audited'
);

select set_config('request.jwt.claim.sub', '3d100000-0000-4000-8000-000000000004', true);
set local role authenticated;
select is((select count(*) from public.remitos), 0::bigint, 'a suspended membership should not list remitos');
select throws_like(
  $$insert into public.remitos (company_id, numero, fecha)
    values ('00000000-0000-4000-8000-000000000001', 'REM-SUSPENDED', current_date)$$,
  '%row-level security%',
  'a suspended membership should not create remitos'
);
reset role;

select set_config('request.jwt.claim.sub', '3d100000-0000-4000-8000-000000000003', true);
set local role authenticated;
select lives_ok(
  $$delete from public.remitos where id = '3d300000-0000-4000-8000-000000000001'$$,
  'a user with remitos.manage should delete a remito'
);
reset role;

select is(
  (select count(*) from audit.audit_log
   where entity_id = '3d300000-0000-4000-8000-000000000001'
     and action = 'remito.deleted'),
  1::bigint,
  'critical remito deletion should be audited'
);

select * from finish();
rollback;

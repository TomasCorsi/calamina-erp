begin;
set local search_path = public, extensions;
select no_plan();

select has_table('public', 'maquinarias', 'the shared v2 machinery master should exist');
select has_column('public', 'maquinarias', 'marca', 'machinery should expose the legacy brand field');
select has_column('public', 'maquinarias', 'anio', 'machinery should expose the legacy year field');
select has_column('public', 'maquinarias', 'horas_acumuladas', 'machinery should expose accumulated hours');
select has_column('public', 'maquinarias', 'km_acumulados', 'vehicles should expose accumulated kilometres');
select has_column('public', 'maquinarias', 'operador_asignado_id', 'machinery should support an operator assignment');
select has_column('public', 'maquinarias', 'obra_id', 'machinery should support a work assignment');

insert into iam.roles (id, key, name, description, is_system, is_assignable)
values (
  '3e000000-0000-4000-8000-000000000001',
  'maquinarias_test_viewer',
  'Maquinarias test viewer',
  'Transaction-local role used to verify read-only machinery access.',
  false,
  true
);

insert into iam.role_permissions (role_id, permission_id)
values (
  '3e000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000012'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('3e100000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'machinery-none@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('3e100000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'machinery-readonly@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('3e100000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'machinery-admin@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('3e100000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'machinery-suspended@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

insert into public.company_memberships (id, company_id, user_id, status, suspended_at)
values
  ('3e200000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', '3e100000-0000-4000-8000-000000000001', 'active', null),
  ('3e200000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', '3e100000-0000-4000-8000-000000000002', 'active', null),
  ('3e200000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', '3e100000-0000-4000-8000-000000000003', 'active', null),
  ('3e200000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000001', '3e100000-0000-4000-8000-000000000004', 'suspended', now());

insert into iam.user_roles (membership_id, role_id)
values
  ('3e200000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000004'),
  ('3e200000-0000-4000-8000-000000000002', '3e000000-0000-4000-8000-000000000001'),
  ('3e200000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001'),
  ('3e200000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001');

select set_config('request.jwt.claim.sub', '3e100000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is((select count(*) from public.maquinarias), 0::bigint, 'a user without maquinarias.view should not list machinery');
reset role;

select set_config('request.jwt.claim.sub', '3e100000-0000-4000-8000-000000000002', true);
set local role authenticated;
select ok((select count(*) from public.maquinarias) >= 2, 'a user with maquinarias.view should list company machinery');
select throws_like(
  $$insert into public.maquinarias (company_id, codigo, nombre, tipo)
    values ('00000000-0000-4000-8000-000000000001', 'MAQ-DENIED', 'Denied machine', 'cargadora')$$,
  '%row-level security%',
  'a user without maquinarias.manage should not create machinery'
);
select is_empty(
  $$update public.maquinarias set nombre = 'Denied update'
    where id = '00000000-0000-4000-8004-000000000001' returning id$$,
  'a user without maquinarias.manage should not edit machinery'
);
reset role;

select set_config('request.jwt.claim.sub', '3e100000-0000-4000-8000-000000000003', true);
set local role authenticated;
select lives_ok(
  $$insert into public.maquinarias (
      id, company_id, codigo, nombre, tipo, marca, anio, patente,
      estado, horas_acumuladas, km_acumulados, operador_asignado_id, obra_id
    ) values (
      '3e300000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000001',
      'MAQ-TEST-001', 'Camion de prueba', 'camion', 'Marca Demo', 2024, 'ZZ999ZZ',
      'operativa', 0, 100,
      '00000000-0000-4000-8001-000000000002',
      '00000000-0000-4000-8003-000000000001'
    )$$,
  'a user with maquinarias.manage should create machinery'
);
select lives_ok(
  $$update public.maquinarias
    set marca = 'Marca Editada', km_acumulados = 125
    where id = '3e300000-0000-4000-8000-000000000001'$$,
  'a user with maquinarias.manage should edit machinery'
);
select lives_ok(
  $$update public.maquinarias
    set estado = 'inactiva'
    where id = '3e300000-0000-4000-8000-000000000001'$$,
  'a user with maquinarias.manage should inactivate machinery'
);
select throws_like(
  $$insert into public.maquinarias (company_id, codigo, nombre, tipo)
    values ('00000000-0000-4000-8000-000000000001', 'maq-test-001', 'Duplicate code', 'cargadora')$$,
  '%duplicate key%',
  'machinery codes should be unique per company ignoring case'
);
select throws_like(
  $$insert into public.maquinarias (company_id, codigo, nombre, tipo, patente)
    values ('00000000-0000-4000-8000-000000000001', 'MAQ-TEST-002', 'Duplicate plate', 'camion', 'ZZ999ZZ')$$,
  '%duplicate key%',
  'vehicle plates should be unique per company'
);
select throws_like(
  $$insert into public.maquinarias (company_id, codigo, nombre, tipo, obra_id)
    values ('00000000-0000-4000-8000-000000000001', 'MAQ-BAD-REL', 'Invalid relation', 'cargadora', 'ffffffff-ffff-4fff-8fff-ffffffffffff')$$,
  '%foreign key constraint%',
  'invalid work relationships should be rejected'
);
select throws_like(
  $$delete from public.maquinarias where id = '3e300000-0000-4000-8000-000000000001'$$,
  '%permission denied%',
  'machinery should be retired through status rather than deleted directly'
);
reset role;

select is(
  (select count(*) from audit.audit_log
   where entity_id = '3e300000-0000-4000-8000-000000000001'
     and action in ('maquinaria.created', 'maquinaria.updated', 'maquinaria.status_changed')),
  3::bigint,
  'creation, editing and status changes should be audited'
);

select set_config('request.jwt.claim.sub', '3e100000-0000-4000-8000-000000000004', true);
set local role authenticated;
select is((select count(*) from public.maquinarias), 0::bigint, 'a suspended membership should not list machinery');
select throws_like(
  $$insert into public.maquinarias (company_id, codigo, nombre, tipo)
    values ('00000000-0000-4000-8000-000000000001', 'MAQ-SUSPENDED', 'Suspended machine', 'cargadora')$$,
  '%row-level security%',
  'a suspended membership should not create machinery'
);
reset role;

select ok(
  exists (
    select 1 from public.partes_diarios as parte
    join public.maquinarias as maquinaria
      on maquinaria.company_id = parte.company_id and maquinaria.id = parte.maquinaria_id
  ),
  'Parte Diario should continue referencing valid machinery'
);
select ok(
  exists (
    select 1 from public.remitos as remito
    join public.maquinarias as maquinaria
      on maquinaria.company_id = remito.company_id and maquinaria.id = remito.maquinaria_id
  ),
  'Remitos should continue referencing valid machinery'
);

select * from finish();
rollback;

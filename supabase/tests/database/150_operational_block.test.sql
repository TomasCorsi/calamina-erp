begin;
set local search_path = public, extensions;
select no_plan();

select has_table('public', 'otros_gastos', 'gastos should have a v2 table');
select has_table('public', 'cargas_combustible_repartidor', 'fuel should have a v2 table');
select has_table('public', 'mantenimientos', 'maintenance should have a v2 table');
select has_table('public', 'stock_items', 'stock should have a v2 item table');
select has_table('public', 'movimientos_stock', 'stock should have an immutable movement table');
select has_table('public', 'registros_hh', 'attendance should have a v2 table');

insert into iam.roles (id, key, name, description, is_system, is_assignable)
values ('3f000000-0000-4000-8000-000000000001', 'operational_test_viewer', 'Operational test viewer', 'Read-only test role.', false, true);

insert into iam.role_permissions (role_id, permission_id)
select '3f000000-0000-4000-8000-000000000001', id
from iam.permissions where key in ('gastos.view','combustible.view','mantenimiento.view','stock.view','presentismo.view');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('3f100000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','operations-none@example.invalid','',now(),'{}','{}',now(),now()),
  ('3f100000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','operations-view@example.invalid','',now(),'{}','{}',now(),now()),
  ('3f100000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','operations-admin@example.invalid','',now(),'{}','{}',now(),now()),
  ('3f100000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','operations-suspended@example.invalid','',now(),'{}','{}',now(),now());

insert into public.company_memberships (id, company_id, user_id, status, suspended_at)
values
  ('3f200000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','3f100000-0000-4000-8000-000000000001','active',null),
  ('3f200000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','3f100000-0000-4000-8000-000000000002','active',null),
  ('3f200000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','3f100000-0000-4000-8000-000000000003','active',null),
  ('3f200000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','3f100000-0000-4000-8000-000000000004','suspended',now());

insert into iam.user_roles (membership_id, role_id)
values
  ('3f200000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000004'),
  ('3f200000-0000-4000-8000-000000000002','3f000000-0000-4000-8000-000000000001'),
  ('3f200000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001'),
  ('3f200000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001');

select set_config('request.jwt.claim.sub','3f100000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is((select count(*) from otros_gastos),0::bigint,'unauthorized user cannot read gastos');
select is((select count(*) from cargas_combustible_repartidor),0::bigint,'unauthorized user cannot read fuel');
select is((select count(*) from mantenimientos),0::bigint,'unauthorized user cannot read maintenance');
select is((select count(*) from stock_items),0::bigint,'unauthorized user cannot read stock');
select is((select count(*) from registros_hh),0::bigint,'unauthorized user cannot read attendance');
reset role;

select set_config('request.jwt.claim.sub','3f100000-0000-4000-8000-000000000002',true);
set local role authenticated;
select ok((select count(*) from otros_gastos)>0,'authorized viewer reads gastos');
select ok((select count(*) from cargas_combustible_repartidor)>0,'authorized viewer reads fuel');
select ok((select count(*) from mantenimientos)>0,'authorized viewer reads maintenance');
select ok((select count(*) from stock_items)>0,'authorized viewer reads stock');
select ok((select count(*) from registros_hh)>0,'authorized viewer reads attendance');
select throws_like($$insert into otros_gastos(company_id,fecha,categoria,descripcion,monto) values('00000000-0000-4000-8000-000000000001',current_date,'varios','Denied',1)$$,'%row-level security%','viewer cannot write gastos');
select throws_like($$insert into cargas_combustible_repartidor(company_id,fecha,litros) values('00000000-0000-4000-8000-000000000001',current_date,1)$$,'%row-level security%','viewer cannot write fuel');
select throws_like($$insert into mantenimientos(company_id,fecha,maquinaria_id,tipo,descripcion,tecnico) values('00000000-0000-4000-8000-000000000001',current_date,'00000000-0000-4000-8004-000000000001','preventivo','Denied','Denied')$$,'%row-level security%','viewer cannot write maintenance');
select throws_like($$insert into stock_items(company_id,codigo,nombre,categoria,unidad,ubicacion) values('00000000-0000-4000-8000-000000000001','DENIED','Denied','material','u','d')$$,'%row-level security%','viewer cannot write stock');
select throws_like($$insert into registros_hh(company_id,fecha,persona_id,obra_id,capataz_id,hora_entrada,hora_salida,tarea) values('00000000-0000-4000-8000-000000000001',current_date,'00000000-0000-4000-8001-000000000001','00000000-0000-4000-8003-000000000001','00000000-0000-4000-8001-000000000001','08:00','09:00','Denied')$$,'%row-level security%','viewer cannot write attendance');
reset role;

select set_config('request.jwt.claim.sub','3f100000-0000-4000-8000-000000000003',true);
set local role authenticated;
select lives_ok($$insert into otros_gastos(id,company_id,fecha,obra_id,categoria,descripcion,monto) values('3f300000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001',current_date,'00000000-0000-4000-8003-000000000001','varios','Gasto test',100)$$,'admin writes gastos');
select lives_ok($$insert into cargas_combustible_repartidor(id,company_id,fecha,litros,maquinaria_id,tipo_movimiento) values('3f300000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001',current_date,10,'00000000-0000-4000-8004-000000000001','egreso')$$,'admin writes fuel');
select lives_ok($$insert into mantenimientos(id,company_id,fecha,maquinaria_id,tipo,descripcion,tecnico) values('3f300000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001',current_date,'00000000-0000-4000-8004-000000000001','correctivo','Maintenance test','Test tech')$$,'admin writes maintenance');
select lives_ok($$insert into stock_items(id,company_id,codigo,nombre,categoria,unidad,stock_actual,ubicacion) values('3f300000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','ST-TEST','Stock test','material','u',5,'Test')$$,'admin creates stock item');
select lives_ok($$select api.create_stock_movement(current_date,'3f300000-0000-4000-8000-000000000004','salida',2,null,'Uso test','00000000-0000-4000-8001-000000000001')$$,'admin records an atomic stock movement');
select is((select stock_actual from stock_items where id='3f300000-0000-4000-8000-000000000004'),3::numeric,'stock RPC updates the balance');
select lives_ok($$insert into registros_hh(id,company_id,fecha,persona_id,obra_id,capataz_id,hora_entrada,hora_salida,horas_normales,horas_extra,horas_totales,tarea) values('3f300000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000001','2026-10-06','00000000-0000-4000-8001-000000000002','00000000-0000-4000-8003-000000000001','00000000-0000-4000-8001-000000000001','07:00','16:00',8,0,8,'Attendance test')$$,'admin writes attendance');

select throws_like($$insert into otros_gastos(company_id,fecha,obra_id,categoria,descripcion,monto) values('00000000-0000-4000-8000-000000000001',current_date,'ffffffff-ffff-4fff-8fff-ffffffffffff','varios','Bad relation',1)$$,'%foreign key constraint%','gastos reject invalid relations');
select throws_like($$insert into cargas_combustible_repartidor(company_id,fecha,litros) values('00000000-0000-4000-8000-000000000001',current_date,-1)$$,'%check constraint%','fuel rejects invalid amounts');
select throws_like($$insert into mantenimientos(company_id,fecha,maquinaria_id,tipo,descripcion,tecnico) values('00000000-0000-4000-8000-000000000001',current_date,'ffffffff-ffff-4fff-8fff-ffffffffffff','preventivo','Bad relation','Tech')$$,'%foreign key constraint%','maintenance rejects invalid machinery');
select throws_like($$select api.create_stock_movement(current_date,'3f300000-0000-4000-8000-000000000004','salida',10,null,'Too much','00000000-0000-4000-8001-000000000001')$$,'%insufficient stock%','stock rejects negative balances');
select throws_like($$insert into registros_hh(company_id,fecha,persona_id,obra_id,capataz_id,hora_entrada,hora_salida,tarea) values('00000000-0000-4000-8000-000000000001','2026-10-06','00000000-0000-4000-8001-000000000002','00000000-0000-4000-8003-000000000001','00000000-0000-4000-8001-000000000001','08:00','09:00','Duplicate')$$,'%duplicate key%','attendance rejects duplicate person and date');
reset role;

select ok((select count(*) from audit.audit_log where entity_id in ('3f300000-0000-4000-8000-000000000001','3f300000-0000-4000-8000-000000000002','3f300000-0000-4000-8000-000000000003','3f300000-0000-4000-8000-000000000004','3f300000-0000-4000-8000-000000000005')) >= 6,'critical operational writes are audited');

select set_config('request.jwt.claim.sub','3f100000-0000-4000-8000-000000000004',true);
set local role authenticated;
select is((select count(*) from otros_gastos)+(select count(*) from cargas_combustible_repartidor)+(select count(*) from mantenimientos)+(select count(*) from stock_items)+(select count(*) from registros_hh),0::bigint,'suspended membership cannot read any operational module');
select throws_like($$insert into otros_gastos(company_id,fecha,categoria,descripcion,monto) values('00000000-0000-4000-8000-000000000001',current_date,'varios','Suspended',1)$$,'%row-level security%','suspended membership cannot write');
reset role;

select * from finish();
rollback;

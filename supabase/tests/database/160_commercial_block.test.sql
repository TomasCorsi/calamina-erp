begin;
set local search_path = public, extensions;
select no_plan();

select has_table('public', 'proveedores', 'providers have a v2 table');
select has_table('public', 'ordenes_compra', 'purchase orders have a v2 table');
select has_table('public', 'cotizaciones', 'quotes have a v2 table');
select has_table('public', 'certificados', 'certificates have a v2 table');

insert into iam.roles (id, key, name, description, is_system, is_assignable)
values ('4f000000-0000-4000-8000-000000000001', 'commercial_test_viewer', 'Commercial test viewer', 'Read-only test role.', false, true);

insert into iam.role_permissions (role_id, permission_id)
select '4f000000-0000-4000-8000-000000000001', id
from iam.permissions
where key in ('clientes.view','proveedores.view','compras.view','cotizaciones.view','certificados.view');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('4f100000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','commercial-none@example.invalid','',now(),'{}','{}',now(),now()),
  ('4f100000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','commercial-view@example.invalid','',now(),'{}','{}',now(),now()),
  ('4f100000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','commercial-admin@example.invalid','',now(),'{}','{}',now(),now()),
  ('4f100000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','commercial-suspended@example.invalid','',now(),'{}','{}',now(),now());

insert into public.company_memberships (id, company_id, user_id, status, suspended_at)
values
  ('4f200000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','4f100000-0000-4000-8000-000000000001','active',null),
  ('4f200000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','4f100000-0000-4000-8000-000000000002','active',null),
  ('4f200000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','4f100000-0000-4000-8000-000000000003','active',null),
  ('4f200000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','4f100000-0000-4000-8000-000000000004','suspended',now());

insert into iam.user_roles (membership_id, role_id)
values
  ('4f200000-0000-4000-8000-000000000002','4f000000-0000-4000-8000-000000000001'),
  ('4f200000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001'),
  ('4f200000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001');

select set_config('request.jwt.claim.sub','4f100000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is((select count(*) from clientes),0::bigint,'unauthorized user cannot read clients');
select is((select count(*) from proveedores),0::bigint,'unauthorized user cannot read providers');
select is((select count(*) from ordenes_compra),0::bigint,'unauthorized user cannot read purchases');
select is((select count(*) from cotizaciones),0::bigint,'unauthorized user cannot read quotes');
select is((select count(*) from certificados),0::bigint,'unauthorized user cannot read certificates');
reset role;

select set_config('request.jwt.claim.sub','4f100000-0000-4000-8000-000000000002',true);
set local role authenticated;
select ok((select count(*) from clientes)>0,'authorized viewer reads clients');
select ok((select count(*) from proveedores)>0,'authorized viewer reads providers');
select ok((select count(*) from ordenes_compra)>0,'authorized viewer reads purchases');
select ok((select count(*) from cotizaciones)>0,'authorized viewer reads quotes');
select ok((select count(*) from certificados)>0,'authorized viewer reads certificates');
select throws_like($$insert into clientes(company_id,nombre) values('00000000-0000-4000-8000-000000000001','Denied client')$$,'%row-level security%','viewer cannot create clients');
select throws_like($$insert into proveedores(company_id,nombre) values('00000000-0000-4000-8000-000000000001','Denied provider')$$,'%row-level security%','viewer cannot create providers');
select throws_like($$select api.save_purchase_order('{"fecha":"2026-10-06","proveedor_id":"00000000-0000-4000-8015-000000000001"}'::jsonb,'[]'::jsonb,null)$$,'%not authorized%','viewer cannot save purchases');
select throws_like($$select api.save_quote('{"numero":"DENIED","descripcion":"Denied","fecha_creacion":"2026-10-06","fecha_vencimiento":"2026-11-06","responsable":"Denied"}'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,null)$$,'%not authorized%','viewer cannot save quotes');
select throws_like($$select api.save_certificate('{"obra_id":"00000000-0000-4000-8003-000000000001","numero":"DENIED","periodo":"2026-10"}'::jsonb,'[]'::jsonb,null)$$,'%not authorized%','viewer cannot save certificates');
reset role;

select set_config('request.jwt.claim.sub','4f100000-0000-4000-8000-000000000003',true);
set local role authenticated;
select lives_ok($$insert into clientes(id,company_id,nombre,contacto) values('4f300000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Client test','Contact test')$$,'admin creates clients');
select lives_ok($$insert into proveedores(id,company_id,nombre,cuit) values('4f300000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','Provider test','30-99999999-1')$$,'admin creates providers');
select lives_ok($$select api.save_purchase_order('{"numero":"OC-TEST-001","fecha":"2026-10-06","proveedor_id":"4f300000-0000-4000-8000-000000000002","obra_id":"00000000-0000-4000-8003-000000000001"}'::jsonb,'[{"descripcion":"Purchase item","unidad":"un","cantidad":2,"precio_unitario":50,"orden":0}]'::jsonb,null)$$,'admin atomically creates a purchase with items');
select lives_ok($$select api.save_quote('{"numero":"COT-TEST-001","obra_id":"00000000-0000-4000-8003-000000000001","descripcion":"Quote test","estado":"borrador","fecha_creacion":"2026-10-06","fecha_vencimiento":"2026-11-06","responsable":"Test","iva":21}'::jsonb,'[{"numero":1,"nombre":"Category","orden":0}]'::jsonb,'[{"categoria_index":0,"numero":"1","descripcion":"Quote item","unidad":"un","cantidad":1,"cantidad_m2":0,"altura_promedio":0,"cantidad_m3":0,"precio_unitario":100,"subtotal":100,"total":100}]'::jsonb,'[]'::jsonb,null)$$,'admin atomically creates a quote with items');
select lives_ok($$insert into certificado_conceptos(id,company_id,obra_id,nombre,unidad,precio_unitario) values('4f300000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8003-000000000001','Certificate concept','un',100)$$,'admin creates certificate concepts');
select lives_ok($$select api.save_certificate('{"obra_id":"00000000-0000-4000-8003-000000000001","numero":"CERT-TEST-001","periodo":"2026-10","tipo":"obra"}'::jsonb,'[{"concepto_id":"4f300000-0000-4000-8000-000000000003","descripcion":"Certificate item","unidad":"un","cantidad":1,"precio_unitario":100,"subtotal":100}]'::jsonb,null)$$,'admin atomically creates a certificate with items');

select throws_like($$select api.save_purchase_order('{"numero":"OC-BAD","fecha":"2026-10-06","proveedor_id":"ffffffff-ffff-4fff-8fff-ffffffffffff"}'::jsonb,'[]'::jsonb,null)$$,'%foreign key constraint%','purchases reject invalid providers');
select throws_like($$select api.save_quote('{"numero":"COT-BAD","obra_id":"ffffffff-ffff-4fff-8fff-ffffffffffff","descripcion":"Bad relation","fecha_creacion":"2026-10-06","fecha_vencimiento":"2026-11-06","responsable":"Test"}'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,null)$$,'%foreign key constraint%','quotes reject invalid works');
select throws_like($$select api.save_certificate('{"obra_id":"ffffffff-ffff-4fff-8fff-ffffffffffff","numero":"CERT-BAD","periodo":"2026-10"}'::jsonb,'[]'::jsonb,null)$$,'%foreign key constraint%','certificates reject invalid works');
reset role;

select ok((select count(*) from audit.audit_log where entity_id in ('4f300000-0000-4000-8000-000000000001','4f300000-0000-4000-8000-000000000002','4f300000-0000-4000-8000-000000000003')) >= 3,'critical commercial writes are audited');

select set_config('request.jwt.claim.sub','4f100000-0000-4000-8000-000000000004',true);
set local role authenticated;
select is((select count(*) from clientes)+(select count(*) from proveedores)+(select count(*) from ordenes_compra)+(select count(*) from cotizaciones)+(select count(*) from certificados),0::bigint,'suspended membership cannot read commercial modules');
select throws_like($$select api.save_quote('{"numero":"SUSPENDED","descripcion":"Suspended","fecha_creacion":"2026-10-06","fecha_vencimiento":"2026-11-06","responsable":"Suspended"}'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,null)$$,'%not authorized%','suspended membership cannot write');
reset role;

select * from finish();
rollback;

begin;
set local search_path = public, extensions;
select no_plan();

select has_table('public', 'vacaciones', 'vacations have a v2 table');
select has_table('public', 'entregas_epp', 'EPP deliveries have a v2 table');
select has_table('public', 'liquidaciones', 'payroll has a v2 table');
select has_table('public', 'empleado_documentos', 'employee documents have a v2 table');
select ok(not (select public from storage.buckets where id='empleado-documentos'), 'employee documents bucket is private');

insert into iam.roles (id, key, name, description, is_system, is_assignable)
values ('5f000000-0000-4000-8000-000000000001', 'rrhh_test_viewer', 'RRHH test viewer', 'Read-only HR test role.', false, true);
insert into iam.role_permissions (role_id, permission_id)
select '5f000000-0000-4000-8000-000000000001', id from iam.permissions where key='rrhh.view';

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('5f100000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rrhh-none@example.invalid','',now(),'{}','{}',now(),now()),
  ('5f100000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rrhh-owner@example.invalid','',now(),'{}','{}',now(),now()),
  ('5f100000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rrhh-view@example.invalid','',now(),'{}','{}',now(),now()),
  ('5f100000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rrhh-admin@example.invalid','',now(),'{}','{}',now(),now()),
  ('5f100000-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rrhh-suspended@example.invalid','',now(),'{}','{}',now(),now());

insert into public.company_memberships (id, company_id, user_id, personal_id, status, suspended_at)
values
  ('5f200000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','5f100000-0000-4000-8000-000000000001',null,'active',null),
  ('5f200000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','5f100000-0000-4000-8000-000000000002','00000000-0000-4000-8001-000000000001','active',null),
  ('5f200000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','5f100000-0000-4000-8000-000000000003','00000000-0000-4000-8001-000000000002','active',null),
  ('5f200000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','5f100000-0000-4000-8000-000000000004',null,'active',null),
  ('5f200000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000001','5f100000-0000-4000-8000-000000000005','00000000-0000-4000-8001-000000000003','suspended',now());

insert into iam.user_roles (membership_id, role_id) values
  ('5f200000-0000-4000-8000-000000000003','5f000000-0000-4000-8000-000000000001'),
  ('5f200000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001'),
  ('5f200000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001');

insert into public.empleado_documentos(id,company_id,personal_id,tipo,titulo,storage_path)
values('5f300000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8001-000000000001','recibo_sueldo','Recibo demo','00000000-0000-4000-8000-000000000001/00000000-0000-4000-8001-000000000001/recibo_sueldo/demo.pdf');

select set_config('request.jwt.claim.sub','5f100000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is((select count(*) from vacaciones)+(select count(*) from entregas_epp)+(select count(*) from empleado_documentos),0::bigint,'user without HR permission or linked personal reads no HR records');
select is((select count(*) from liquidaciones)+(select count(*) from liquidacion_config_personal),0::bigint,'user without payroll permission reads no salary data');
select throws_like($$insert into vacaciones(company_id,personal_id,fecha_inicio,fecha_fin,dias_totales,approved_at) values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8001-000000000001','2026-12-01','2026-12-01',1,now())$$,'%row-level security%','unauthorized user cannot write vacations');
reset role;

select set_config('request.jwt.claim.sub','5f100000-0000-4000-8000-000000000002',true);
set local role authenticated;
select is((select count(*) from vacaciones where personal_id='00000000-0000-4000-8001-000000000001'),1::bigint,'employee reads own vacation');
select is((select count(*) from empleado_documentos where personal_id='00000000-0000-4000-8001-000000000001'),1::bigint,'employee reads own document metadata');
select is((select count(*) from liquidacion_config_personal),0::bigint,'employee cannot read salary configuration');
select ok((api.current_employee_profile()->>'banco')='Banco Demo','employee profile exposes only own linked bank data');
select lives_ok($$select api.mark_own_document_seen('5f300000-0000-4000-8000-000000000001')$$,'employee marks an own document as seen through the protected RPC');
select lives_ok($$select api.sign_own_receipt('5f300000-0000-4000-8000-000000000001','data:image/png;base64,dGVzdA==')$$,'employee signs an own receipt through the protected RPC');
select throws_like($$update empleado_documentos set firmado_at=null where id='5f300000-0000-4000-8000-000000000001'$$,'%permission denied%','employee cannot bypass the document RPC with direct updates');
reset role;

select set_config('request.jwt.claim.sub','5f100000-0000-4000-8000-000000000003',true);
set local role authenticated;
select ok((select count(*) from vacaciones)>0,'RRHH viewer reads vacations');
select ok((select count(*) from entregas_epp)>0,'RRHH viewer reads EPP');
select is((select count(*) from liquidaciones)+(select count(*) from liquidacion_config_personal),0::bigint,'RRHH viewer cannot read payroll data');
select throws_like($$select api.create_epp_delivery('00000000-0000-4000-8001-000000000002',current_date,'[{"producto":"Denied"}]'::jsonb)$$,'%not authorized%','RRHH viewer cannot create EPP deliveries');
reset role;

select set_config('request.jwt.claim.sub','5f100000-0000-4000-8000-000000000004',true);
set local role authenticated;
select lives_ok($$select api.update_personal_work_data('00000000-0000-4000-8001-000000000002','99000022','1100000022','2024-02-01',null,null,'registrado')$$,'admin updates labor data through the protected RPC');
select lives_ok($$insert into vacaciones(id,company_id,personal_id,fecha_inicio,fecha_fin,dias_totales,estado,approved_at) values('5f300000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8001-000000000002','2026-12-01','2026-12-02',2,'aprobada',now())$$,'admin creates vacations');
select lives_ok($$select api.create_epp_delivery('00000000-0000-4000-8001-000000000002',current_date,'[{"producto":"Guantes","cantidad":2}]'::jsonb)$$,'admin atomically creates an EPP delivery');
select lives_ok($$select api.create_payroll('mes',10,2026)$$,'admin atomically creates payroll');
select lives_ok($$insert into adelantos_personal(id,company_id,personal_id,fecha,monto,motivo) values('5f300000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8001-000000000001',current_date,1000,'Test')$$,'admin creates an advance');
select lives_ok($$select api.create_personal_loan('00000000-0000-4000-8001-000000000001',current_date,3000,3,'Test')$$,'admin creates a loan and installments atomically');
select throws_like($$insert into vacaciones(company_id,personal_id,fecha_inicio,fecha_fin,dias_totales,approved_at) values('00000000-0000-4000-8000-000000000001','ffffffff-ffff-4fff-8fff-ffffffffffff','2026-12-10','2026-12-10',1,now())$$,'%foreign key constraint%','vacations reject invalid personnel relations');
reset role;

select ok((select count(*) from audit.audit_log where entity_type in ('vacaciones','entrega_epp','liquidacion','adelanto','prestamo','empleado_documento')) >= 6,'critical HR writes are audited');

select set_config('request.jwt.claim.sub','5f100000-0000-4000-8000-000000000005',true);
set local role authenticated;
select is((select count(*) from vacaciones)+(select count(*) from entregas_epp)+(select count(*) from liquidaciones)+(select count(*) from empleado_documentos),0::bigint,'suspended membership cannot read HR data');
select throws_like($$select api.create_payroll('mes',11,2026)$$,'%not authorized%','suspended membership cannot create payroll');
reset role;

select * from finish();
rollback;

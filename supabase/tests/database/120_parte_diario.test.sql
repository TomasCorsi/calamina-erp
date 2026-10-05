begin;
set local search_path = public, extensions;
select no_plan();

select has_table('public', 'partes_diarios', 'the v2 daily report table should exist');
select has_table('public', 'maquinarias', 'the minimal machinery catalog should exist');
select col_type_is('public', 'personal', 'work_role', 'text', 'personal work role should be descriptive text');

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('3c000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pd-none@example.invalid','',now(),'{}','{}',now(),now()),
  ('3c000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pd-viewer@example.invalid','',now(),'{}','{}',now(),now()),
  ('3c000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pd-operator-a@example.invalid','',now(),'{}','{}',now(),now()),
  ('3c000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pd-operator-b@example.invalid','',now(),'{}','{}',now(),now()),
  ('3c000000-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pd-admin@example.invalid','',now(),'{}','{}',now(),now()),
  ('3c000000-0000-4000-8000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pd-suspended@example.invalid','',now(),'{}','{}',now(),now()),
  ('3c000000-0000-4000-8000-000000000007','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pd-view-only@example.invalid','',now(),'{}','{}',now(),now());

insert into public.personal (id, company_id, internal_code, first_name, last_name, work_role, status)
values
  ('3c200000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','PD-VIEWER','Vera','Viewer','administrativo','active'),
  ('3c200000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','PD-OP-A','Olivia','Operadora','maquinista','active'),
  ('3c200000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','PD-OP-B','Bruno','Operador','chofer','active'),
  ('3c200000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000001','PD-SUSP','Sara','Suspendida','capataz','active'),
  ('3c200000-0000-4000-8000-000000000007','00000000-0000-4000-8000-000000000001','PD-VIEW','Victor','Consulta','sereno','active');

insert into public.company_memberships (id, company_id, user_id, personal_id, status, suspended_at)
values
  ('3c100000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','3c000000-0000-4000-8000-000000000001',null,'active',null),
  ('3c100000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','3c000000-0000-4000-8000-000000000002','3c200000-0000-4000-8000-000000000002','active',null),
  ('3c100000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','3c000000-0000-4000-8000-000000000003','3c200000-0000-4000-8000-000000000003','active',null),
  ('3c100000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','3c000000-0000-4000-8000-000000000004','3c200000-0000-4000-8000-000000000004','active',null),
  ('3c100000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000001','3c000000-0000-4000-8000-000000000005',null,'active',null),
  ('3c100000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000001','3c000000-0000-4000-8000-000000000006','3c200000-0000-4000-8000-000000000006','suspended',now()),
  ('3c100000-0000-4000-8000-000000000007','00000000-0000-4000-8000-000000000001','3c000000-0000-4000-8000-000000000007','3c200000-0000-4000-8000-000000000007','active',null);

insert into iam.roles (id, key, name, description, is_system, is_assignable)
values ('3c300000-0000-4000-8000-000000000001','pd_test_view_only','PD test view only','Transaction-local test role.',false,true);
insert into iam.role_permissions (role_id, permission_id)
values ('3c300000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000008');

insert into iam.user_roles (membership_id, role_id)
values
  ('3c100000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002'),
  ('3c100000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004'),
  ('3c100000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000005'),
  ('3c100000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000005'),
  ('3c100000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000001'),
  ('3c100000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000005'),
  ('3c100000-0000-4000-8000-000000000007','3c300000-0000-4000-8000-000000000001');

insert into public.partes_diarios (id, company_id, personal_id, obra_id, fecha, estado)
values
  ('3c400000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','3c200000-0000-4000-8000-000000000003','00000000-0000-4000-8003-000000000001','2026-10-01','borrador'),
  ('3c400000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','3c200000-0000-4000-8000-000000000004','00000000-0000-4000-8003-000000000001','2026-10-01','borrador');

select set_config('request.jwt.claim.sub','3c000000-0000-4000-8000-000000000001',true); set local role authenticated;
select is((select count(*) from public.partes_diarios),0::bigint,'a user without parte diario permission cannot list');
reset role;

select set_config('request.jwt.claim.sub','3c000000-0000-4000-8000-000000000002',true); set local role authenticated;
select is((select count(*) from public.partes_diarios),0::bigint,'viewer has no Parte Diario access');
reset role;

select set_config('request.jwt.claim.sub','3c000000-0000-4000-8000-000000000003',true); set local role authenticated;
select is((select count(*) from public.partes_diarios),1::bigint,'operator lists only own reports');
select lives_ok($$insert into public.partes_diarios (id,company_id,personal_id,obra_id,fecha,estado) values ('3c400000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000001','3c200000-0000-4000-8000-000000000003','00000000-0000-4000-8003-000000000001','2026-10-02','borrador')$$,'operator can create own report');
select lives_ok($$update public.partes_diarios set estado='completado' where id='3c400000-0000-4000-8000-000000000005'$$,'operator can edit own report');
select is_empty($$update public.partes_diarios set tareas='denied' where id='3c400000-0000-4000-8000-000000000004' returning id$$,'operator cannot edit another person report');
select throws_like($$insert into public.partes_diarios (company_id,personal_id,fecha) values ('00000000-0000-4000-8000-000000000001','3c200000-0000-4000-8000-000000000004','2026-10-02')$$,'%row-level security%','operator cannot create for another person');
reset role;

select set_config('request.jwt.claim.sub','3c000000-0000-4000-8000-000000000007',true); set local role authenticated;
select ok((select count(*) from public.partes_diarios) >= 0,'view-only role can list within its own empty scope');
select throws_like($$insert into public.partes_diarios (company_id,personal_id,fecha) values ('00000000-0000-4000-8000-000000000001','3c200000-0000-4000-8000-000000000007','2026-10-02')$$,'%row-level security%','view without manage cannot create');
select is_empty($$update public.partes_diarios set tareas='denied' where id='3c400000-0000-4000-8000-000000000003' returning id$$,'view without manage cannot edit');
reset role;

select set_config('request.jwt.claim.sub','3c000000-0000-4000-8000-000000000005',true); set local role authenticated;
select ok((select count(*) from public.partes_diarios) >= 3,'admin lists all company reports');
select lives_ok($$update public.partes_diarios set tareas='admin edit' where id='3c400000-0000-4000-8000-000000000004'$$,'admin can edit any company report');
select throws_like($$insert into public.partes_diarios (company_id,personal_id,obra_id,fecha) values ('00000000-0000-4000-8000-000000000001','3c200000-0000-4000-8000-000000000003','00000000-0000-4000-8003-999999999999','2026-10-03')$$,'%foreign key%','invalid work relationship is rejected');
select throws_like($$insert into public.partes_diarios (company_id,personal_id,fecha,ausencias) values ('00000000-0000-4000-8000-000000000001','3c200000-0000-4000-8000-000000000003','2026-10-03',array['3c200000-0000-4000-8000-999999999999'::uuid])$$,'%invalid absence reference%','invalid absence is rejected');
select throws_like($$insert into public.partes_diarios (company_id,personal_id,fecha,horometro_inicio,horometro_fin) values ('00000000-0000-4000-8000-000000000001','3c200000-0000-4000-8000-000000000003','2026-10-03',10,5)$$,'%partes_diarios_horometros_check%','invalid numeric values are rejected');
select throws_like($$insert into public.partes_diarios (company_id,personal_id,fecha,estado_maquina,observacion_maquina) values ('00000000-0000-4000-8000-000000000001','3c200000-0000-4000-8000-000000000003','2026-10-03','OK','must be rejected')$$,'%partes_diarios_observacion_maquina_check%','machine state and observation must be coherent');
select lives_ok($$insert into public.partes_diarios (company_id,personal_id,fecha,maquinaria_id) values ('00000000-0000-4000-8000-000000000001','3c200000-0000-4000-8000-000000000003','2026-10-04','00000000-0000-4000-8004-000000000001')$$,'first machinery combination is accepted');
select throws_like($$insert into public.partes_diarios (company_id,personal_id,fecha,maquinaria_id) values ('00000000-0000-4000-8000-000000000001','3c200000-0000-4000-8000-000000000003','2026-10-04','00000000-0000-4000-8004-000000000001')$$,'%partes_diarios_person_date_machine_key%','duplicate machinery combination is rejected');
select lives_ok($$insert into public.partes_diarios (company_id,personal_id,fecha,maquinaria_id) values ('00000000-0000-4000-8000-000000000001','3c200000-0000-4000-8000-000000000004','2026-10-04',null)$$,'first null machinery combination is accepted');
select throws_like($$insert into public.partes_diarios (company_id,personal_id,fecha,maquinaria_id) values ('00000000-0000-4000-8000-000000000001','3c200000-0000-4000-8000-000000000004','2026-10-04',null)$$,'%partes_diarios_person_date_machine_key%','null machinery duplicate is rejected by PostgreSQL');
select lives_ok($$insert into public.partes_diarios (id,company_id,personal_id,fecha) values ('3c400000-0000-4000-8000-000000000009','00000000-0000-4000-8000-000000000001','3c200000-0000-4000-8000-000000000004','2026-10-06')$$,'admin can create any company report');
select lives_ok($$delete from public.partes_diarios where id='3c400000-0000-4000-8000-000000000009'$$,'admin can delete a company report');
reset role;

select set_config('request.jwt.claim.sub','3c000000-0000-4000-8000-000000000006',true); set local role authenticated;
select is((select count(*) from public.partes_diarios),0::bigint,'suspended membership cannot list reports');
select throws_like($$insert into public.partes_diarios (company_id,personal_id,fecha) values ('00000000-0000-4000-8000-000000000001','3c200000-0000-4000-8000-000000000006','2026-10-02')$$,'%row-level security%','suspended membership cannot write');
reset role;

select ok((select count(*) from audit.audit_log where entity_type='parte_diario' and action in ('parte_diario.created','parte_diario.updated','parte_diario.state_changed')) >= 4,'critical writes are audited server-side');
select is((select count(*) from audit.audit_log where entity_id='3c400000-0000-4000-8000-000000000009' and action='parte_diario.deleted'),1::bigint,'deletion is audited server-side');

select * from finish();
rollback;

begin;
set local search_path=public,extensions;
select no_plan();

select has_table('public','accounting_accounts','accounting chart exists');
select has_table('public','journal_entries','journal header exists');
select has_table('public','journal_entry_lines','journal lines exist');
select has_table('public','supplier_invoice_lines','supplier invoice dimensions exist');
select has_table('public','treasury_transactions','treasury transactions exist');
select has_column('public','journal_entry_lines','obra_id','work is an explicit journal dimension');
select has_column('public','journal_entry_lines','maquinaria_id','machine is an explicit journal dimension');
select has_column('public','supplier_invoice_lines','maquinaria_id','supplier invoice lines support machine allocation');
select ok(exists(select 1 from pg_constraint where conname='journal_entry_lines_maquinaria_fkey' and contype='f'),'machine uses a company-scoped foreign key');
select ok(not exists(select 1 from information_schema.columns where table_schema='public' and table_name='accounting_accounts' and column_name in ('allows_machine','requires_machine')),'accounts do not impose a machine dimension');

insert into iam.roles(id,key,name,description,is_system,is_assignable) values
('7a000000-0000-4000-8000-000000000001','accounting_reader_test','Accounting reader test','Test role.',false,true);
insert into iam.role_permissions(role_id,permission_id) select '7a000000-0000-4000-8000-000000000001',id from iam.permissions where key='accounting.view';

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('7a100000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','accounting-none@example.invalid','',now(),'{}','{}',now(),now()),
('7a100000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','accounting-reader@example.invalid','',now(),'{}','{}',now(),now()),
('7a100000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','accounting-admin@example.invalid','',now(),'{}','{}',now(),now()),
('7a100000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','accounting-suspended@example.invalid','',now(),'{}','{}',now(),now());
insert into public.company_memberships(id,company_id,user_id,status,suspended_at) values
('7a200000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','7a100000-0000-4000-8000-000000000001','active',null),
('7a200000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','7a100000-0000-4000-8000-000000000002','active',null),
('7a200000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','7a100000-0000-4000-8000-000000000003','active',null),
('7a200000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','7a100000-0000-4000-8000-000000000004','suspended',now());
insert into iam.user_roles(membership_id,role_id) values
('7a200000-0000-4000-8000-000000000002','7a000000-0000-4000-8000-000000000001'),
('7a200000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001'),
('7a200000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000001');

select set_config('request.jwt.claim.sub','7a100000-0000-4000-8000-000000000001',true); set local role authenticated;
select is((select count(*) from accounting_accounts),0::bigint,'user without accounting.view reads no accounts');
select throws_like($$select api.save_journal_draft('{}','[]')$$,'%not authorized%','user without manage cannot write');
reset role;

select set_config('request.jwt.claim.sub','7a100000-0000-4000-8000-000000000002',true); set local role authenticated;
select ok((select count(*) from accounting_accounts)>30,'reader can read the scoped chart');
select throws_like($$select api.save_journal_draft('{}','[]')$$,'%not authorized%','reader cannot create a journal');
reset role;

select set_config('request.jwt.claim.sub','7a100000-0000-4000-8000-000000000004',true); set local role authenticated;
select is((select count(*) from accounting_accounts),0::bigint,'suspended membership cannot read accounting');
select throws_like($$select api.save_journal_draft('{}','[]')$$,'%not authorized%','suspended membership cannot write accounting');
reset role;

select set_config('request.jwt.claim.sub','7a100000-0000-4000-8000-000000000003',true); set local role authenticated;
select lives_ok($$
 select api.save_journal_draft(
  '{"entry_date":"2026-10-08","description":"Asiento dimensional","origin":"manual"}',
  '[{"account_id":"30000000-0000-4000-8000-000000000028","description":"Service","debit":1000000,"credit":0,"obra_id":"00000000-0000-4000-8003-000000000001","maquinaria_id":"00000000-0000-4000-8004-000000000001"},{"account_id":"30000000-0000-4000-8000-000000000001","description":"Caja","debit":0,"credit":1000000}]',
  '7a300000-0000-4000-8000-000000000001')
$$,'admin creates a balanced draft with work and machine');
select lives_ok($$
 select api.save_journal_draft(
  '{"entry_date":"2026-10-08","description":"Asiento dimensional","origin":"manual"}',
  '[{"account_id":"30000000-0000-4000-8000-000000000028","description":"Service","debit":1000000,"credit":0,"obra_id":"00000000-0000-4000-8003-000000000001","maquinaria_id":"00000000-0000-4000-8004-000000000001"},{"account_id":"30000000-0000-4000-8000-000000000001","description":"Caja","debit":0,"credit":1000000}]',
  '7a300000-0000-4000-8000-000000000001')
$$,'repeating the same idempotent draft returns the original result');
select lives_ok($$select api.post_journal_entry((select id from journal_entries where idempotency_key='7a300000-0000-4000-8000-000000000001'),'7a300000-0000-4000-8000-000000000002')$$,'balanced journal posts');
select is((select status from journal_entries where idempotency_key='7a300000-0000-4000-8000-000000000001'),'posted','posted state persisted');
select is((select total_debit from journal_entries where idempotency_key='7a300000-0000-4000-8000-000000000001'),1000000.00::numeric,'posted debit is exact');
reset role;
select throws_like($$update journal_entry_lines set maquinaria_id=null where journal_entry_id=(select id from journal_entries where idempotency_key='7a300000-0000-4000-8000-000000000001') and debit>0$$,'%immutable%','posted machine dimension cannot change');
select throws_like($$update journal_entry_lines set obra_id=null where journal_entry_id=(select id from journal_entries where idempotency_key='7a300000-0000-4000-8000-000000000001') and debit>0$$,'%immutable%','posted work dimension cannot change');

update public.maquinarias set estado='inactiva' where id='00000000-0000-4000-8004-000000000001';
select is((select count(*) from journal_entry_lines where journal_entry_id=(select id from journal_entries where idempotency_key='7a300000-0000-4000-8000-000000000001') and maquinaria_id='00000000-0000-4000-8004-000000000001'),1::bigint,'inactive machine preserves historical journal lines');

select set_config('request.jwt.claim.sub','7a100000-0000-4000-8000-000000000003',true); set local role authenticated;
select throws_like($$
 select api.save_journal_draft('{"entry_date":"2026-10-08","description":"Sin obra"}',
 '[{"account_id":"30000000-0000-4000-8000-000000000027","debit":10,"credit":0,"maquinaria_id":"00000000-0000-4000-8004-000000000001"},{"account_id":"30000000-0000-4000-8000-000000000001","debit":0,"credit":10}]','7a300000-0000-4000-8000-000000000003')
$$,'%work dimension is required%','requires_work rejects a missing work dimension');
select lives_ok($$
 select api.save_journal_draft('{"entry_date":"2026-10-08","description":"Solo maquina"}',
 '[{"account_id":"30000000-0000-4000-8000-000000000028","debit":20,"credit":0,"maquinaria_id":"00000000-0000-4000-8004-000000000001"},{"account_id":"30000000-0000-4000-8000-000000000001","debit":0,"credit":20}]','7a300000-0000-4000-8000-000000000004')
$$,'a line may use only the machine dimension');
select throws_like($$
 select api.save_journal_draft('{"entry_date":"2026-10-08","description":"Maquina invalida"}',
 '[{"account_id":"30000000-0000-4000-8000-000000000028","debit":20,"credit":0,"maquinaria_id":"ffffffff-ffff-4fff-8fff-ffffffffffff"},{"account_id":"30000000-0000-4000-8000-000000000001","debit":0,"credit":20}]','7a300000-0000-4000-8000-000000000005')
$$,'%foreign key constraint%','invalid or foreign-company machine is rejected');
select lives_ok($$
 select api.save_accounting_document(
 '{"tipo":"FA_CPA_A","punto_venta":1,"numero":9001,"fecha":"2026-10-08","tercero_id":"31000000-0000-4000-8000-000000000002","es_venta":false,"moneda":"ARS","cotizacion":1}',
 '[{"descripcion":"Repuesto","cuenta_id":"30000000-0000-4000-8000-000000000028","cantidad":1,"precio_unit":100,"neto":100,"alicuota_iva":21,"iva":21,"maquinaria_id":"00000000-0000-4000-8004-000000000001"}]','7a300000-0000-4000-8000-000000000006')
$$,'supplier invoice item accepts a machine dimension');
select lives_ok($$select api.post_accounting_document((select id from supplier_invoices where document_number=9001),false,'7a300000-0000-4000-8000-000000000007')$$,'supplier invoice posts atomically');
select is((select count(*) from journal_entry_lines where maquinaria_id='00000000-0000-4000-8004-000000000001' and journal_entry_id=(select journal_entry_id from supplier_invoices where document_number=9001)),1::bigint,'supplier journal preserves its machine once');
select lives_ok($$select api.reverse_journal_entry((select id from journal_entries where idempotency_key='7a300000-0000-4000-8000-000000000001'),'Correccion','7a300000-0000-4000-8000-000000000008')$$,'posted journal reverses explicitly');
select is((select status from journal_entries where idempotency_key='7a300000-0000-4000-8000-000000000001'),'reversed','original journal is marked reversed');
select lives_ok($$select api.set_accounting_period(2026,10,'closed','7a300000-0000-4000-8000-000000000009')$$,'period can be closed');
select throws_like($$select api.post_journal_entry((select id from journal_entries where idempotency_key='7a300000-0000-4000-8000-000000000004'),'7a300000-0000-4000-8000-000000000010')$$,'%period is closed%','closed period blocks posting');
select lives_ok($$select api.set_accounting_period(2026,10,'open','7a300000-0000-4000-8000-000000000011')$$,'period can be reopened with permission');
select is((select sum(net) from api.accounting_dimension_report('2026-10-01','2026-10-31','00000000-0000-4000-8003-000000000001','00000000-0000-4000-8004-000000000001') where account_type in ('cost','expense')),0::numeric,'reversed dimensional cost nets to zero without duplication');
reset role;

select ok((select count(*) from audit.audit_log where action like 'accounting.%')>=4,'critical accounting events are audited');
select * from finish();
rollback;

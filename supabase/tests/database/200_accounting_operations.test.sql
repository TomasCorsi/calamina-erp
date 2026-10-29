begin;
set local search_path=public,extensions;
select no_plan();

select has_column('public','customer_invoices','document_kind','sales documents have an explicit accounting nature');
select has_column('public','supplier_invoices','document_kind','purchase documents have an explicit accounting nature');
select has_table('public','receivable_credit_allocations','customer credits can be allocated');
select has_table('public','payable_credit_allocations','supplier credits can be allocated');
select has_function('api','record_treasury_settlement',array['jsonb','jsonb','uuid'],'multi-document treasury RPC exists');
select has_function('api','accounting_summary',array['date','date','date'],'summary RPC exists');

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('7b100000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','accounting-operations@example.invalid','',now(),'{}','{}',now(),now());
insert into public.company_memberships(id,company_id,user_id,status,suspended_at) values
('7b200000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','7b100000-0000-4000-8000-000000000001','active',null);
insert into iam.user_roles(membership_id,role_id) values('7b200000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001');

select set_config('request.jwt.claim.sub','7b100000-0000-4000-8000-000000000001',true); set local role authenticated;

select lives_ok($$
 select api.save_accounting_document(
  '{"tipo":"FA_B","punto_venta":1,"numero":7101,"fecha":"2026-10-09","fecha_vto":"2026-10-20","cliente_id":"00000000-0000-4000-8002-000000000001","es_venta":true,"obra_id":"00000000-0000-4000-8003-000000000001"}',
  '[{"descripcion":"Venta de obra","cuenta_id":"30000000-0000-4000-8000-000000000023","cantidad":1,"precio_unit":100,"neto":100,"alicuota_iva":21,"iva":21,"obra_id":"00000000-0000-4000-8003-000000000001"}]',
  '7b300000-0000-4000-8000-000000000001')
$$,'invoice draft accepts the canonical client master');
select is((select document_kind from customer_invoices where document_number=7101),'invoice','invoice nature is derived server-side');
select lives_ok($$select api.post_accounting_document((select id from customer_invoices where document_number=7101),true,'7b300000-0000-4000-8000-000000000002')$$,'sales invoice posts');
select is((select balance_kind from receivable_documents where source_id=(select id from customer_invoices where document_number=7101)),'charge','invoice creates a receivable charge');

select lives_ok($$
 select api.save_accounting_document(
  '{"tipo":"NC_B","punto_venta":1,"numero":7102,"fecha":"2026-10-09","cliente_id":"00000000-0000-4000-8002-000000000001","es_venta":true,"obra_id":"00000000-0000-4000-8003-000000000001"}',
  '[{"descripcion":"Credito de obra","cuenta_id":"30000000-0000-4000-8000-000000000023","cantidad":1,"precio_unit":20,"neto":20,"alicuota_iva":21,"iva":4.2,"obra_id":"00000000-0000-4000-8003-000000000001"}]',
  '7b300000-0000-4000-8000-000000000003')
$$,'credit note draft is accepted');
select lives_ok($$select api.post_accounting_document((select id from customer_invoices where document_number=7102),true,'7b300000-0000-4000-8000-000000000004')$$,'credit note posts with reverse signs');
select is((select balance_kind from receivable_documents where source_id=(select id from customer_invoices where document_number=7102)),'credit','credit note creates a receivable credit');
select is((select credit from journal_entry_lines where journal_entry_id=(select journal_entry_id from customer_invoices where document_number=7102) and account_id='30000000-0000-4000-8000-000000000003'),24.20::numeric,'credit note credits accounts receivable');
select lives_ok($$select api.apply_accounting_credit(
  (select id from receivable_documents where source_id=(select id from customer_invoices where document_number=7102)),true,
  jsonb_build_array(jsonb_build_object('document_id',(select id from receivable_documents where source_id=(select id from customer_invoices where document_number=7101)),'amount',24.20)),
  '7b300000-0000-4000-8000-000000000005')$$,'credit note applies to an invoice');
select is((select balance from api.accounting_open_items('receivable',null,'2026-10-09') where source_id=(select id from customer_invoices where document_number=7101)),96.80::numeric,'credit application reduces the invoice balance');

update public.certificados set estado='emitido',fecha_emision='2026-10-09' where id='00000000-0000-4000-8018-000000000002';
select lives_ok($$select api.create_customer_invoice_from_certificate('00000000-0000-4000-8018-000000000002','7b300000-0000-4000-8000-000000000006')$$,'certificate creates an invoice draft');
select lives_ok($$select api.create_customer_invoice_from_certificate('00000000-0000-4000-8018-000000000002','7b300000-0000-4000-8000-000000000007')$$,'certificate invoice creation is idempotent');
select is((select count(*) from customer_invoices where certificate_id='00000000-0000-4000-8018-000000000002'),1::bigint,'certificate has one active invoice');
select is((select count(*) from receivable_documents where source_id=(select id from customer_invoices where certificate_id='00000000-0000-4000-8018-000000000002')),0::bigint,'certificate draft creates no debt before posting');

select lives_ok($$select api.record_treasury_settlement(
 '{"es_cobro":true,"fecha":"2026-10-09","tercero_id":"31000000-0000-4000-8000-000000000001","monto":50,"treasury_account_id":"32000000-0000-4000-8000-000000000001","referencia":"COBRO-DEMO"}',
 jsonb_build_array(jsonb_build_object('document_id',(select id from receivable_documents where source_id=(select id from customer_invoices where document_number=7101)),'amount',50)),
 '7b300000-0000-4000-8000-000000000008')$$,'treasury records a partial collection');
select is((select count(*) from treasury_transactions where idempotency_key='7b300000-0000-4000-8000-000000000008'),1::bigint,'collection creates one treasury transaction');
select is((select count(*) from journal_entries where idempotency_key='7b300000-0000-4000-8000-000000000008'),1::bigint,'collection creates one journal entry');
select is((select balance from api.accounting_open_items('receivable',null,'2026-10-09') where source_id=(select id from customer_invoices where document_number=7101)),46.80::numeric,'partial collection updates outstanding balance');
select lives_ok($$select api.reverse_treasury_transaction((select id from treasury_transactions where idempotency_key='7b300000-0000-4000-8000-000000000008'),'Prueba de reversión','7b300000-0000-4000-8000-000000000009')$$,'treasury transaction reverses explicitly');
select is((select balance from api.accounting_open_items('receivable',null,'2026-10-09') where source_id=(select id from customer_invoices where document_number=7101)),96.80::numeric,'treasury reversal restores the outstanding balance');

select api.save_accounting_document(
  '{"tipo":"FA_B","punto_venta":1,"numero":7103,"fecha":"2026-10-09","cliente_id":"00000000-0000-4000-8002-000000000001","es_venta":true,"obra_id":"00000000-0000-4000-8003-000000000001"}',
  '[{"descripcion":"Segunda venta","cuenta_id":"30000000-0000-4000-8000-000000000023","cantidad":1,"precio_unit":60,"neto":60,"alicuota_iva":0,"iva":0,"obra_id":"00000000-0000-4000-8003-000000000001"}]','7b300000-0000-4000-8000-000000000010');
select api.post_accounting_document((select id from customer_invoices where document_number=7103),true,'7b300000-0000-4000-8000-000000000011');
select lives_ok($$select api.record_treasury_settlement(
 '{"es_cobro":true,"fecha":"2026-10-09","tercero_id":"31000000-0000-4000-8000-000000000001","monto":70,"treasury_account_id":"32000000-0000-4000-8000-000000000001"}',
 jsonb_build_array(
  jsonb_build_object('document_id',(select id from receivable_documents where source_id=(select id from customer_invoices where document_number=7101)),'amount',30),
  jsonb_build_object('document_id',(select id from receivable_documents where source_id=(select id from customer_invoices where document_number=7103)),'amount',40)),
 '7b300000-0000-4000-8000-000000000012')$$,'one collection applies to multiple documents');
select is((select count(*) from settlement_allocations where treasury_transaction_id=(select id from treasury_transactions where idempotency_key='7b300000-0000-4000-8000-000000000012')),2::bigint,'multi-document collection stores two applications');
select is((select count(*) from journal_entries where idempotency_key='7b300000-0000-4000-8000-000000000012'),1::bigint,'multi-document collection still creates one journal entry');

select is(((select api.accounting_summary('2026-10-01','2026-10-31','2026-10-09'))->>'receivables')::numeric,86.80::numeric,'summary reconciles multi-document receivables');
select ok(((select api.accounting_vat_position(2026,10))->>'vat_debit')::numeric=16.80,'VAT position preserves invoice and credit note signs');
select ok((select count(*) from api.accounting_trial_balance('2026-10-01','2026-10-31'))>0,'trial balance returns posted activity');
reset role;

select * from finish();
rollback;

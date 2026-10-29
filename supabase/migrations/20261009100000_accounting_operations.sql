-- CALAMINA ERP v2 - operational accounting semantics and treasury settlements.

alter table public.customer_invoices add column document_kind text;
alter table public.supplier_invoices add column document_kind text;

update public.customer_invoices
set document_kind=case when document_type like 'NC_%' then 'credit_note' when document_type like 'ND_%' then 'debit_note' else 'invoice' end;
update public.supplier_invoices
set document_kind=case when document_type like 'NC_%' then 'credit_note' when document_type like 'ND_%' then 'debit_note' else 'invoice' end;

alter table public.customer_invoices alter column document_kind set not null;
alter table public.customer_invoices alter column document_kind set default 'invoice';
alter table public.customer_invoices add constraint customer_invoices_kind_check check(document_kind in ('invoice','credit_note','debit_note'));
alter table public.supplier_invoices alter column document_kind set not null;
alter table public.supplier_invoices alter column document_kind set default 'invoice';
alter table public.supplier_invoices add constraint supplier_invoices_kind_check check(document_kind in ('invoice','credit_note','debit_note'));

create unique index customer_invoices_active_certificate_key
  on public.customer_invoices(company_id,certificate_id)
  where certificate_id is not null and document_kind='invoice' and status<>'reversed';

alter table public.payable_documents add column balance_kind text not null default 'charge';
alter table public.receivable_documents add column balance_kind text not null default 'charge';
alter table public.payable_documents add constraint payable_documents_balance_kind_check check(balance_kind in ('charge','credit'));
alter table public.receivable_documents add constraint receivable_documents_balance_kind_check check(balance_kind in ('charge','credit'));

create table public.payable_credit_allocations (
  id uuid primary key default extensions.gen_random_uuid(), company_id uuid not null,
  credit_document_id uuid not null, charge_document_id uuid not null,
  amount numeric(18,2) not null, reversed_at timestamptz, created_at timestamptz not null default now(),
  constraint payable_credit_allocations_credit_fkey foreign key(company_id,credit_document_id) references public.payable_documents(company_id,id) on delete restrict,
  constraint payable_credit_allocations_charge_fkey foreign key(company_id,charge_document_id) references public.payable_documents(company_id,id) on delete restrict,
  constraint payable_credit_allocations_amount_check check(amount>0),
  constraint payable_credit_allocations_distinct_check check(credit_document_id<>charge_document_id),
  constraint payable_credit_allocations_key unique(credit_document_id,charge_document_id)
);

create table public.receivable_credit_allocations (
  id uuid primary key default extensions.gen_random_uuid(), company_id uuid not null,
  credit_document_id uuid not null, charge_document_id uuid not null,
  amount numeric(18,2) not null, reversed_at timestamptz, created_at timestamptz not null default now(),
  constraint receivable_credit_allocations_credit_fkey foreign key(company_id,credit_document_id) references public.receivable_documents(company_id,id) on delete restrict,
  constraint receivable_credit_allocations_charge_fkey foreign key(company_id,charge_document_id) references public.receivable_documents(company_id,id) on delete restrict,
  constraint receivable_credit_allocations_amount_check check(amount>0),
  constraint receivable_credit_allocations_distinct_check check(credit_document_id<>charge_document_id),
  constraint receivable_credit_allocations_key unique(credit_document_id,charge_document_id)
);

do $$ declare t text; begin
  foreach t in array array['payable_credit_allocations','receivable_credit_allocations'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy %I on public.%I for select to authenticated using (company_id=(select private.current_company_id()) and (select private.has_permission(''accounting.view'')))',t||'_read',t);
  end loop;
end $$;

create or replace function private.ensure_accounting_party(p_company uuid,p_type text,p_target uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if p_type='customer' then
    select id into v_id from public.accounting_parties where company_id=p_company and client_id=p_target;
    if v_id is null then
      insert into public.accounting_parties(company_id,party_type,client_id,tax_condition)
      select p_company,'customer',id,'RI' from public.clientes where company_id=p_company and id=p_target
      returning id into v_id;
    end if;
  elsif p_type='supplier' then
    select id into v_id from public.accounting_parties where company_id=p_company and supplier_id=p_target;
    if v_id is null then
      insert into public.accounting_parties(company_id,party_type,supplier_id,tax_condition)
      select p_company,'supplier',id,'RI' from public.proveedores where company_id=p_company and id=p_target
      returning id into v_id;
    end if;
  else raise exception 'invalid accounting party type' using errcode='22023'; end if;
  if v_id is null then raise exception 'master record not found' using errcode='23503'; end if;
  return v_id;
end $$;

create or replace function private.refresh_open_document(p_sale boolean,p_document uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_kind text; v_amount numeric; v_applied numeric;
begin
  if p_sale then
    select balance_kind,functional_amount into v_kind,v_amount from public.receivable_documents where id=p_document;
    if v_kind='charge' then
      select coalesce((select sum(amount) from public.settlement_allocations where receivable_document_id=p_document and reversed_at is null),0)
           + coalesce((select sum(amount) from public.receivable_credit_allocations where charge_document_id=p_document and reversed_at is null),0) into v_applied;
    else
      select coalesce(sum(amount),0) into v_applied from public.receivable_credit_allocations where credit_document_id=p_document and reversed_at is null;
    end if;
    update public.receivable_documents set status=case when v_applied=0 then 'open' when v_applied>=v_amount then 'paid' else 'partial' end where id=p_document and status<>'reversed';
  else
    select balance_kind,functional_amount into v_kind,v_amount from public.payable_documents where id=p_document;
    if v_kind='charge' then
      select coalesce((select sum(amount) from public.settlement_allocations where payable_document_id=p_document and reversed_at is null),0)
           + coalesce((select sum(amount) from public.payable_credit_allocations where charge_document_id=p_document and reversed_at is null),0) into v_applied;
    else
      select coalesce(sum(amount),0) into v_applied from public.payable_credit_allocations where credit_document_id=p_document and reversed_at is null;
    end if;
    update public.payable_documents set status=case when v_applied=0 then 'open' when v_applied>=v_amount then 'paid' else 'partial' end where id=p_document and status<>'reversed';
  end if;
end $$;

create or replace function api.save_accounting_document(p_document jsonb,p_lines jsonb,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.manage'); v_sale boolean:=coalesce((p_document->>'es_venta')::boolean,false); v_id uuid:=nullif(p_document->>'id','')::uuid; v_party public.accounting_parties%rowtype; v_party_id uuid; v_target uuid; v_line jsonb; v_n integer:=0; v_net numeric:=0; v_tax numeric:=0; v_other numeric:=coalesce(nullif(p_document->>'perc_iva','')::numeric,0)+coalesce(nullif(p_document->>'perc_iibb','')::numeric,0)+coalesce(nullif(p_document->>'perc_otras','')::numeric,0); v_account uuid; v_type text:=p_document->>'tipo'; v_kind text;
begin
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then raise exception 'document lines are required' using errcode='23514'; end if;
  v_kind:=case when v_type like 'NC_%' then 'credit_note' when v_type like 'ND_%' then 'debit_note' else 'invoice' end;
  v_party_id:=nullif(p_document->>'tercero_id','')::uuid;
  select * into v_party from public.accounting_parties where id=v_party_id and company_id=v_company and is_active;
  if not found then
    v_target:=case when v_sale then nullif(p_document->>'cliente_id','')::uuid else nullif(p_document->>'proveedor_id','')::uuid end;
    v_party_id:=private.ensure_accounting_party(v_company,case when v_sale then 'customer' else 'supplier' end,v_target);
    select * into v_party from public.accounting_parties where id=v_party_id;
  end if;
  if (v_sale and v_party.party_type<>'customer') or (not v_sale and v_party.party_type<>'supplier') then raise exception 'invalid accounting party' using errcode='23503'; end if;
  for v_line in select value from jsonb_array_elements(p_lines) loop v_net:=v_net+coalesce((v_line->>'neto')::numeric,0); v_tax:=v_tax+coalesce((v_line->>'iva')::numeric,0); end loop;
  if round(v_net+v_tax+v_other,2)<=0 then raise exception 'document total must be positive' using errcode='23514'; end if;
  if v_sale then
    if v_id is null then
      insert into public.customer_invoices(company_id,client_id,certificate_id,document_kind,document_type,document_letter,point_of_sale,document_number,issue_date,due_date,currency,exchange_rate,obra_id,maquinaria_id,net_amount,tax_amount,other_tax_amount,total_amount,notes,created_by)
      values(v_company,v_party.client_id,nullif(p_document->>'certificate_id','')::uuid,v_kind,v_type,nullif(p_document->>'letra',''),coalesce((p_document->>'punto_venta')::int,1),coalesce((p_document->>'numero')::bigint,0),(p_document->>'fecha')::date,nullif(p_document->>'fecha_vto','')::date,coalesce(nullif(p_document->>'moneda',''),'ARS'),coalesce(nullif(p_document->>'cotizacion','')::numeric,1),nullif(p_document->>'obra_id','')::uuid,nullif(p_document->>'maquinaria_id','')::uuid,v_net,v_tax,v_other,round(v_net+v_tax+v_other,2),nullif(btrim(p_document->>'observaciones'),''),(select auth.uid())) returning id into v_id;
    else
      update public.customer_invoices set document_kind=v_kind,document_type=v_type,document_letter=nullif(p_document->>'letra',''),point_of_sale=(p_document->>'punto_venta')::int,document_number=(p_document->>'numero')::bigint,issue_date=(p_document->>'fecha')::date,due_date=nullif(p_document->>'fecha_vto','')::date,certificate_id=nullif(p_document->>'certificate_id','')::uuid,obra_id=nullif(p_document->>'obra_id','')::uuid,maquinaria_id=nullif(p_document->>'maquinaria_id','')::uuid,net_amount=v_net,tax_amount=v_tax,other_tax_amount=v_other,total_amount=round(v_net+v_tax+v_other,2),notes=nullif(btrim(p_document->>'observaciones'),'') where id=v_id and company_id=v_company and status='draft';
      if not found then raise exception 'document not found or immutable' using errcode='55000'; end if; delete from public.customer_invoice_lines where customer_invoice_id=v_id; delete from public.customer_invoice_tax_lines where customer_invoice_id=v_id;
    end if;
    for v_line in select value from jsonb_array_elements(p_lines) loop v_n:=v_n+1; v_account:=coalesce(nullif(v_line->>'cuenta_id','')::uuid,(select id from public.accounting_accounts where company_id=v_company and system_key='revenue_works'));
      insert into public.customer_invoice_lines(company_id,customer_invoice_id,line_number,account_id,description,quantity,unit_price,net_amount,tax_rate,tax_amount,obra_id,maquinaria_id) values(v_company,v_id,v_n,v_account,btrim(v_line->>'descripcion'),(v_line->>'cantidad')::numeric,(v_line->>'precio_unit')::numeric,(v_line->>'neto')::numeric,(v_line->>'alicuota_iva')::numeric,(v_line->>'iva')::numeric,coalesce(nullif(v_line->>'obra_id','')::uuid,nullif(p_document->>'obra_id','')::uuid),coalesce(nullif(v_line->>'maquinaria_id','')::uuid,nullif(p_document->>'maquinaria_id','')::uuid));
      if (v_line->>'iva')::numeric>0 then insert into public.customer_invoice_tax_lines(company_id,customer_invoice_id,tax_kind,tax_rate,taxable_amount,amount) values(v_company,v_id,'vat',(v_line->>'alicuota_iva')::numeric,(v_line->>'neto')::numeric,(v_line->>'iva')::numeric); end if;
    end loop;
  else
    if v_id is null then
      insert into public.supplier_invoices(company_id,supplier_id,purchase_order_id,document_kind,document_type,document_letter,point_of_sale,document_number,issue_date,due_date,currency,exchange_rate,obra_id,maquinaria_id,net_amount,tax_amount,other_tax_amount,total_amount,notes,created_by)
      values(v_company,v_party.supplier_id,nullif(p_document->>'purchase_order_id','')::uuid,v_kind,v_type,nullif(p_document->>'letra',''),coalesce((p_document->>'punto_venta')::int,1),coalesce((p_document->>'numero')::bigint,0),(p_document->>'fecha')::date,nullif(p_document->>'fecha_vto','')::date,coalesce(nullif(p_document->>'moneda',''),'ARS'),coalesce(nullif(p_document->>'cotizacion','')::numeric,1),nullif(p_document->>'obra_id','')::uuid,nullif(p_document->>'maquinaria_id','')::uuid,v_net,v_tax,v_other,round(v_net+v_tax+v_other,2),nullif(btrim(p_document->>'observaciones'),''),(select auth.uid())) returning id into v_id;
    else
      update public.supplier_invoices set document_kind=v_kind,document_type=v_type,document_letter=nullif(p_document->>'letra',''),point_of_sale=(p_document->>'punto_venta')::int,document_number=(p_document->>'numero')::bigint,issue_date=(p_document->>'fecha')::date,due_date=nullif(p_document->>'fecha_vto','')::date,purchase_order_id=nullif(p_document->>'purchase_order_id','')::uuid,obra_id=nullif(p_document->>'obra_id','')::uuid,maquinaria_id=nullif(p_document->>'maquinaria_id','')::uuid,net_amount=v_net,tax_amount=v_tax,other_tax_amount=v_other,total_amount=round(v_net+v_tax+v_other,2),notes=nullif(btrim(p_document->>'observaciones'),'') where id=v_id and company_id=v_company and status='draft';
      if not found then raise exception 'document not found or immutable' using errcode='55000'; end if; delete from public.supplier_invoice_lines where supplier_invoice_id=v_id; delete from public.supplier_invoice_tax_lines where supplier_invoice_id=v_id;
    end if;
    for v_line in select value from jsonb_array_elements(p_lines) loop v_n:=v_n+1; v_account:=coalesce(nullif(v_line->>'cuenta_id','')::uuid,(select id from public.accounting_accounts where company_id=v_company and system_key='cost_materials'));
      insert into public.supplier_invoice_lines(company_id,supplier_invoice_id,line_number,account_id,description,quantity,unit_price,net_amount,tax_rate,tax_amount,obra_id,maquinaria_id) values(v_company,v_id,v_n,v_account,btrim(v_line->>'descripcion'),(v_line->>'cantidad')::numeric,(v_line->>'precio_unit')::numeric,(v_line->>'neto')::numeric,(v_line->>'alicuota_iva')::numeric,(v_line->>'iva')::numeric,coalesce(nullif(v_line->>'obra_id','')::uuid,nullif(p_document->>'obra_id','')::uuid),coalesce(nullif(v_line->>'maquinaria_id','')::uuid,nullif(p_document->>'maquinaria_id','')::uuid));
      if (v_line->>'iva')::numeric>0 then insert into public.supplier_invoice_tax_lines(company_id,supplier_invoice_id,tax_kind,tax_rate,taxable_amount,amount) values(v_company,v_id,'vat',(v_line->>'alicuota_iva')::numeric,(v_line->>'neto')::numeric,(v_line->>'iva')::numeric); end if;
    end loop;
  end if;
  perform private.write_audit('user','accounting.document_saved',case when v_sale then 'customer_invoice' else 'supplier_invoice' end,v_id,null,jsonb_build_object('status','draft','kind',v_kind,'total',round(v_net+v_tax+v_other,2)),p_request_id,'{}'::jsonb,(select auth.uid())); return v_id;
end $$;

create or replace function api.post_accounting_document(p_document_id uuid,p_sale boolean,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.post'); v_entry uuid; v_party uuid; v_total numeric; v_date date; v_due date; v_currency text; v_rate numeric; v_desc text; v_line record; v_n integer:=0; v_tax numeric; v_other numeric; v_existing uuid; v_arap uuid; v_tax_account uuid; v_kind text; v_open uuid; v_debit numeric; v_credit numeric;
begin
  if p_sale then
    select journal_entry_id,total_amount,issue_date,due_date,currency,exchange_rate,tax_amount,other_tax_amount,document_kind,'Venta '||document_type||' '||point_of_sale||'-'||document_number into v_existing,v_total,v_date,v_due,v_currency,v_rate,v_tax,v_other,v_kind,v_desc from public.customer_invoices where id=p_document_id and company_id=v_company for update;
    if v_existing is not null then return v_existing; end if;
    select private.ensure_accounting_party(v_company,'customer',d.client_id) into v_party from public.customer_invoices d where d.id=p_document_id;
    select id into v_arap from public.accounting_accounts where company_id=v_company and system_key='accounts_receivable'; select id into v_tax_account from public.accounting_accounts where company_id=v_company and system_key='vat_debit';
  else
    select journal_entry_id,total_amount,issue_date,due_date,currency,exchange_rate,tax_amount,other_tax_amount,document_kind,'Compra '||document_type||' '||point_of_sale||'-'||document_number into v_existing,v_total,v_date,v_due,v_currency,v_rate,v_tax,v_other,v_kind,v_desc from public.supplier_invoices where id=p_document_id and company_id=v_company for update;
    if v_existing is not null then return v_existing; end if;
    select private.ensure_accounting_party(v_company,'supplier',d.supplier_id) into v_party from public.supplier_invoices d where d.id=p_document_id;
    select id into v_arap from public.accounting_accounts where company_id=v_company and system_key='accounts_payable'; select id into v_tax_account from public.accounting_accounts where company_id=v_company and system_key='vat_credit';
  end if;
  if v_total is null then raise exception 'document not found' using errcode='P0002'; end if;
  insert into public.journal_entries(company_id,entry_date,description,origin,reference_type,reference_id,source_event,source_currency,source_amount,exchange_rate,idempotency_key,payload_hash,created_by)
  values(v_company,v_date,v_desc,'automatic',case when p_sale then 'customer_invoice' else 'supplier_invoice' end,p_document_id,'confirmed',v_currency,v_total,v_rate,p_request_id,encode(extensions.digest((p_document_id::text||'confirmed')::bytea,'sha256'),'hex'),(select auth.uid())) returning id into v_entry;
  if p_sale then
    v_n:=1; insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,party_id) values(v_company,v_entry,v_n,v_arap,v_desc,case when v_kind='credit_note' then 0 else v_total end,case when v_kind='credit_note' then v_total else 0 end,v_party);
    for v_line in select * from public.customer_invoice_lines where customer_invoice_id=p_document_id order by line_number loop v_n:=v_n+1; insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,obra_id,maquinaria_id,party_id) values(v_company,v_entry,v_n,v_line.account_id,v_line.description,case when v_kind='credit_note' then v_line.net_amount else 0 end,case when v_kind='credit_note' then 0 else v_line.net_amount end,v_line.obra_id,v_line.maquinaria_id,v_party); end loop;
    if v_tax>0 then v_n:=v_n+1; insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,party_id) values(v_company,v_entry,v_n,v_tax_account,'IVA debito fiscal',case when v_kind='credit_note' then v_tax else 0 end,case when v_kind='credit_note' then 0 else v_tax end,v_party); end if;
  else
    for v_line in select * from public.supplier_invoice_lines where supplier_invoice_id=p_document_id order by line_number loop v_n:=v_n+1; insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,obra_id,maquinaria_id,party_id) values(v_company,v_entry,v_n,v_line.account_id,v_line.description,case when v_kind='credit_note' then 0 else v_line.net_amount end,case when v_kind='credit_note' then v_line.net_amount else 0 end,v_line.obra_id,v_line.maquinaria_id,v_party); end loop;
    if v_tax>0 then v_n:=v_n+1; insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,party_id) values(v_company,v_entry,v_n,v_tax_account,'IVA credito fiscal',case when v_kind='credit_note' then 0 else v_tax end,case when v_kind='credit_note' then v_tax else 0 end,v_party); end if;
    v_n:=v_n+1; insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,party_id) values(v_company,v_entry,v_n,v_arap,v_desc,case when v_kind='credit_note' then v_total else 0 end,case when v_kind='credit_note' then 0 else v_total end,v_party);
  end if;
  perform api.post_journal_entry(v_entry,p_request_id);
  if p_sale then
    update public.customer_invoices set status='posted',journal_entry_id=v_entry,confirmed_at=now(),confirmed_by=(select auth.uid()) where id=p_document_id;
    insert into public.receivable_documents(company_id,party_id,source_type,source_id,issue_date,due_date,currency,original_amount,functional_amount,journal_entry_id,balance_kind) values(v_company,v_party,'customer_invoice',p_document_id,v_date,v_due,v_currency,v_total,round(v_total*v_rate,2),v_entry,case when v_kind='credit_note' then 'credit' else 'charge' end) returning id into v_open;
  else
    update public.supplier_invoices set status='posted',journal_entry_id=v_entry,confirmed_at=now(),confirmed_by=(select auth.uid()) where id=p_document_id;
    insert into public.payable_documents(company_id,party_id,source_type,source_id,issue_date,due_date,currency,original_amount,functional_amount,journal_entry_id,balance_kind) values(v_company,v_party,'supplier_invoice',p_document_id,v_date,v_due,v_currency,v_total,round(v_total*v_rate,2),v_entry,case when v_kind='credit_note' then 'credit' else 'charge' end) returning id into v_open;
  end if;
  perform private.write_audit('user','accounting.document_posted',case when p_sale then 'customer_invoice' else 'supplier_invoice' end,p_document_id,jsonb_build_object('status','draft'),jsonb_build_object('status','posted','kind',v_kind,'journal_entry_id',v_entry),p_request_id,'{}'::jsonb,(select auth.uid())); return v_entry;
end $$;

create or replace function api.apply_accounting_credit(p_credit_document_id uuid,p_sale boolean,p_allocations jsonb,p_request_id uuid default extensions.gen_random_uuid()) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.manage'); v_credit record; v_item jsonb; v_target record; v_amount numeric; v_used numeric; v_target_used numeric;
begin
  if jsonb_typeof(p_allocations)<>'array' then raise exception 'allocations must be an array' using errcode='22023'; end if;
  if p_sale then
    select * into v_credit from public.receivable_documents where id=p_credit_document_id and company_id=v_company and balance_kind='credit' and status in ('open','partial') for update;
    select coalesce(sum(amount),0) into v_used from public.receivable_credit_allocations where credit_document_id=p_credit_document_id and reversed_at is null;
    for v_item in select value from jsonb_array_elements(p_allocations) loop
      v_amount:=(v_item->>'amount')::numeric; select * into v_target from public.receivable_documents where id=(v_item->>'document_id')::uuid and company_id=v_company and party_id=v_credit.party_id and balance_kind='charge' and status in ('open','partial') for update;
      select coalesce((select sum(amount) from public.settlement_allocations where receivable_document_id=v_target.id and reversed_at is null),0)+coalesce((select sum(amount) from public.receivable_credit_allocations where charge_document_id=v_target.id and reversed_at is null),0) into v_target_used;
      if v_amount<=0 or v_used+v_amount>v_credit.functional_amount or v_target.id is null or v_target_used+v_amount>v_target.functional_amount then raise exception 'credit allocation exceeds available balance' using errcode='23514'; end if;
      insert into public.receivable_credit_allocations(company_id,credit_document_id,charge_document_id,amount) values(v_company,v_credit.id,v_target.id,v_amount); v_used:=v_used+v_amount; perform private.refresh_open_document(true,v_target.id);
    end loop; perform private.refresh_open_document(true,v_credit.id);
  else
    select * into v_credit from public.payable_documents where id=p_credit_document_id and company_id=v_company and balance_kind='credit' and status in ('open','partial') for update;
    select coalesce(sum(amount),0) into v_used from public.payable_credit_allocations where credit_document_id=p_credit_document_id and reversed_at is null;
    for v_item in select value from jsonb_array_elements(p_allocations) loop
      v_amount:=(v_item->>'amount')::numeric; select * into v_target from public.payable_documents where id=(v_item->>'document_id')::uuid and company_id=v_company and party_id=v_credit.party_id and balance_kind='charge' and status in ('open','partial') for update;
      select coalesce((select sum(amount) from public.settlement_allocations where payable_document_id=v_target.id and reversed_at is null),0)+coalesce((select sum(amount) from public.payable_credit_allocations where charge_document_id=v_target.id and reversed_at is null),0) into v_target_used;
      if v_amount<=0 or v_used+v_amount>v_credit.functional_amount or v_target.id is null or v_target_used+v_amount>v_target.functional_amount then raise exception 'credit allocation exceeds available balance' using errcode='23514'; end if;
      insert into public.payable_credit_allocations(company_id,credit_document_id,charge_document_id,amount) values(v_company,v_credit.id,v_target.id,v_amount); v_used:=v_used+v_amount; perform private.refresh_open_document(false,v_target.id);
    end loop; perform private.refresh_open_document(false,v_credit.id);
  end if;
  perform private.write_audit('user','accounting.credit_applied','open_document',p_credit_document_id,null,jsonb_build_object('allocations',jsonb_array_length(p_allocations)),p_request_id,'{}'::jsonb,(select auth.uid())); return true;
end $$;

create or replace function api.create_customer_invoice_from_certificate(p_certificate_id uuid,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.manage'); v_cert public.certificados%rowtype; v_client uuid; v_party uuid; v_id uuid; v_revenue uuid; v_item record; v_n int:=0;
begin
  select id into v_id from public.customer_invoices where company_id=v_company and certificate_id=p_certificate_id and document_kind='invoice' and status<>'reversed'; if v_id is not null then return v_id; end if;
  select * into v_cert from public.certificados where id=p_certificate_id and company_id=v_company and estado in ('emitido','cobrado') for update;
  if not found or v_cert.total<=0 then raise exception 'issued certificate not found' using errcode='P0002'; end if;
  select cliente_id into v_client from public.obras where id=v_cert.obra_id and company_id=v_company; if v_client is null then raise exception 'certificate work has no client' using errcode='23503'; end if;
  v_party:=private.ensure_accounting_party(v_company,'customer',v_client); select id into v_revenue from public.accounting_accounts where company_id=v_company and system_key='revenue_works';
  insert into public.customer_invoices(company_id,client_id,certificate_id,document_kind,document_type,point_of_sale,document_number,issue_date,obra_id,net_amount,tax_amount,total_amount,status,notes,created_by)
  values(v_company,v_client,v_cert.id,'invoice','FA_B',1,0,coalesce(v_cert.fecha_emision,v_cert.fecha_certificado),v_cert.obra_id,v_cert.subtotal,v_cert.iva,v_cert.total,'draft','Generada desde certificado '||v_cert.numero,(select auth.uid())) returning id into v_id;
  for v_item in select * from public.certificado_items where certificado_id=v_cert.id order by created_at,id loop
    v_n:=v_n+1; insert into public.customer_invoice_lines(company_id,customer_invoice_id,line_number,account_id,description,quantity,unit_price,net_amount,tax_rate,tax_amount,obra_id)
    values(v_company,v_id,v_n,v_revenue,v_item.descripcion,greatest(v_item.cantidad,0.001),v_item.precio_unitario,v_item.subtotal,case when v_cert.incluir_iva then 21 else 0 end,case when v_cert.incluir_iva then round(v_item.subtotal*0.21,2) else 0 end,v_cert.obra_id);
  end loop;
  if v_n=0 then insert into public.customer_invoice_lines(company_id,customer_invoice_id,line_number,account_id,description,quantity,unit_price,net_amount,tax_rate,tax_amount,obra_id) values(v_company,v_id,1,v_revenue,'Certificado '||v_cert.numero,1,v_cert.subtotal,v_cert.subtotal,case when v_cert.incluir_iva then 21 else 0 end,v_cert.iva,v_cert.obra_id); end if;
  if v_cert.iva>0 then insert into public.customer_invoice_tax_lines(company_id,customer_invoice_id,tax_kind,tax_rate,taxable_amount,amount) values(v_company,v_id,'vat',21,v_cert.subtotal,v_cert.iva); end if;
  perform private.write_audit('user','accounting.invoice_created_from_certificate','customer_invoice',v_id,null,jsonb_build_object('certificate_id',p_certificate_id),p_request_id,'{}'::jsonb,(select auth.uid())); return v_id;
end $$;

create or replace function api.post_certificate_accounting(p_certificate_id uuid,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$ begin return api.create_customer_invoice_from_certificate(p_certificate_id,p_request_id); end $$;

create or replace function api.record_treasury_settlement(p_data jsonb,p_allocations jsonb default '[]'::jsonb,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('treasury.manage'); v_type text:=case when coalesce((p_data->>'es_cobro')::boolean,false) then 'receipt' else 'payment' end; v_party uuid:=(p_data->>'tercero_id')::uuid; v_amount numeric:=(p_data->>'monto')::numeric; v_date date:=(p_data->>'fecha')::date; v_treasury uuid:=nullif(p_data->>'treasury_account_id','')::uuid; v_ledger uuid; v_counter uuid; v_entry uuid; v_tx uuid; v_item jsonb; v_doc record; v_apply numeric; v_applied numeric; v_total_alloc numeric:=0;
begin
  select id into v_tx from public.treasury_transactions where company_id=v_company and idempotency_key=p_request_id; if v_tx is not null then return v_tx; end if;
  if v_amount<=0 or jsonb_typeof(p_allocations)<>'array' then raise exception 'invalid treasury settlement' using errcode='23514'; end if;
  if not exists(select 1 from public.accounting_parties where id=v_party and company_id=v_company and is_active) then raise exception 'invalid party' using errcode='23503'; end if;
  if v_treasury is null then select id into v_treasury from public.treasury_accounts where company_id=v_company and is_active order by case account_type when 'cash' then 0 else 1 end limit 1; end if;
  select ledger_account_id into v_ledger from public.treasury_accounts where id=v_treasury and company_id=v_company and is_active; if v_ledger is null then raise exception 'invalid treasury account' using errcode='23514'; end if;
  select id into v_counter from public.accounting_accounts where company_id=v_company and system_key=case when v_type='receipt' then 'accounts_receivable' else 'accounts_payable' end;
  insert into public.journal_entries(company_id,entry_date,description,origin,reference_type,reference_id,source_event,source_currency,source_amount,idempotency_key,payload_hash,created_by)
  values(v_company,v_date,case when v_type='receipt' then 'Cobranza' else 'Pago' end,'automatic','treasury_transaction',p_request_id,v_type,'ARS',v_amount,p_request_id,encode(extensions.digest((p_data::text||p_allocations::text)::bytea,'sha256'),'hex'),(select auth.uid())) returning id into v_entry;
  if v_type='receipt' then insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,party_id) values(v_company,v_entry,1,v_ledger,'Ingreso de fondos',v_amount,0,v_party),(v_company,v_entry,2,v_counter,'Cancelacion de cuenta por cobrar',0,v_amount,v_party);
  else insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,party_id) values(v_company,v_entry,1,v_counter,'Cancelacion de cuenta por pagar',v_amount,0,v_party),(v_company,v_entry,2,v_ledger,'Egreso de fondos',0,v_amount,v_party); end if;
  perform api.post_journal_entry(v_entry,p_request_id);
  insert into public.treasury_transactions(company_id,transaction_type,transaction_date,treasury_account_id,party_id,amount,reference,notes,journal_entry_id,idempotency_key,created_by) values(v_company,v_type,v_date,v_treasury,v_party,v_amount,nullif(btrim(p_data->>'referencia'),''),nullif(btrim(p_data->>'observaciones'),''),v_entry,p_request_id,(select auth.uid())) returning id into v_tx;
  for v_item in select value from jsonb_array_elements(p_allocations) loop
    v_apply:=(v_item->>'amount')::numeric; v_total_alloc:=v_total_alloc+v_apply;
    if v_type='receipt' then
      select * into v_doc from public.receivable_documents where id=(v_item->>'document_id')::uuid and company_id=v_company and party_id=v_party and balance_kind='charge' and status in ('open','partial') for update;
      select coalesce((select sum(amount) from public.settlement_allocations where receivable_document_id=v_doc.id and reversed_at is null),0)+coalesce((select sum(amount) from public.receivable_credit_allocations where charge_document_id=v_doc.id and reversed_at is null),0) into v_applied;
      if v_doc.id is null or v_apply<=0 or v_applied+v_apply>v_doc.functional_amount then raise exception 'receipt allocation exceeds outstanding balance' using errcode='23514'; end if;
      insert into public.settlement_allocations(company_id,treasury_transaction_id,receivable_document_id,amount) values(v_company,v_tx,v_doc.id,v_apply); perform private.refresh_open_document(true,v_doc.id);
    else
      select * into v_doc from public.payable_documents where id=(v_item->>'document_id')::uuid and company_id=v_company and party_id=v_party and balance_kind='charge' and status in ('open','partial') for update;
      select coalesce((select sum(amount) from public.settlement_allocations where payable_document_id=v_doc.id and reversed_at is null),0)+coalesce((select sum(amount) from public.payable_credit_allocations where charge_document_id=v_doc.id and reversed_at is null),0) into v_applied;
      if v_doc.id is null or v_apply<=0 or v_applied+v_apply>v_doc.functional_amount then raise exception 'payment allocation exceeds outstanding balance' using errcode='23514'; end if;
      insert into public.settlement_allocations(company_id,treasury_transaction_id,payable_document_id,amount) values(v_company,v_tx,v_doc.id,v_apply); perform private.refresh_open_document(false,v_doc.id);
    end if;
  end loop;
  if v_total_alloc>v_amount then raise exception 'allocations exceed settlement amount' using errcode='23514'; end if;
  perform private.write_audit('user','treasury.'||v_type||'_posted','treasury_transaction',v_tx,null,jsonb_build_object('amount',v_amount,'allocated',v_total_alloc,'journal_entry_id',v_entry),p_request_id,'{}'::jsonb,(select auth.uid())); return v_tx;
end $$;

create or replace function api.save_treasury_account(p_data jsonb,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('treasury.manage'); v_id uuid:=nullif(p_data->>'id','')::uuid; v_ledger uuid:=nullif(p_data->>'ledger_account_id','')::uuid;
begin
  if not exists(select 1 from public.accounting_accounts where id=v_ledger and company_id=v_company and account_type='asset' and is_postable) then raise exception 'invalid ledger account' using errcode='23503'; end if;
  if v_id is null then insert into public.treasury_accounts(company_id,ledger_account_id,account_type,name,bank_name,account_number,currency) values(v_company,v_ledger,p_data->>'account_type',btrim(p_data->>'name'),nullif(btrim(p_data->>'bank_name'),''),nullif(btrim(p_data->>'account_number'),''),coalesce(nullif(p_data->>'currency',''),'ARS')) returning id into v_id;
  else update public.treasury_accounts set ledger_account_id=v_ledger,account_type=p_data->>'account_type',name=btrim(p_data->>'name'),bank_name=nullif(btrim(p_data->>'bank_name'),''),account_number=nullif(btrim(p_data->>'account_number'),''),is_active=coalesce((p_data->>'is_active')::boolean,true) where id=v_id and company_id=v_company; if not found then raise exception 'treasury account not found' using errcode='P0002'; end if; end if;
  perform private.write_audit('user','treasury.account_saved','treasury_account',v_id,null,jsonb_build_object('name',p_data->>'name'),p_request_id,'{}'::jsonb,(select auth.uid())); return v_id;
end $$;

-- Accounting may enrich an existing master, but it must never create a second client or supplier master.
create or replace function api.save_accounting_party(p_data jsonb,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.manage'); v_id uuid:=nullif(p_data->>'id','')::uuid; v_target uuid; v_type text;
begin
  if v_id is null then
    if nullif(p_data->>'client_id','') is not null then v_target:=(p_data->>'client_id')::uuid; v_type:='customer';
    elsif nullif(p_data->>'supplier_id','') is not null then v_target:=(p_data->>'supplier_id')::uuid; v_type:='supplier';
    else raise exception 'an existing client_id or supplier_id is required' using errcode='23503'; end if;
    v_id:=private.ensure_accounting_party(v_company,v_type,v_target);
  end if;
  update public.accounting_parties set tax_condition=coalesce(nullif(p_data->>'condicion_iva',''),tax_condition),bank_name=coalesce(nullif(btrim(p_data->>'banco'),''),bank_name),bank_account_number=coalesce(nullif(btrim(p_data->>'numero_cuenta'),''),bank_account_number),cbu=coalesce(nullif(btrim(p_data->>'cbu'),''),cbu),notes=nullif(btrim(p_data->>'notas'),'') where id=v_id and company_id=v_company;
  if not found then raise exception 'accounting party not found' using errcode='P0002'; end if;
  perform private.write_audit('user','accounting.party_saved','accounting_party',v_id,null,jsonb_build_object('master_only',true),p_request_id,'{}'::jsonb,(select auth.uid())); return v_id;
end $$;

create or replace function api.deactivate_treasury_account(p_id uuid,p_request_id uuid default extensions.gen_random_uuid()) returns boolean
language plpgsql security definer set search_path='' as $$ declare v_company uuid:=private.accounting_require('treasury.manage'); begin update public.treasury_accounts set is_active=false where id=p_id and company_id=v_company; if not found then raise exception 'treasury account not found' using errcode='P0002'; end if; perform private.write_audit('user','treasury.account_deactivated','treasury_account',p_id,null,'{"is_active":false}'::jsonb,p_request_id,'{}'::jsonb,(select auth.uid())); return true; end $$;

create or replace function api.reverse_accounting_document(p_document_id uuid,p_sale boolean,p_reason text,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.post'); v_entry uuid; v_reversal uuid; v_open uuid; v_row record;
begin
  if p_sale then select journal_entry_id into v_entry from public.customer_invoices where id=p_document_id and company_id=v_company and status='posted' for update;
  else select journal_entry_id into v_entry from public.supplier_invoices where id=p_document_id and company_id=v_company and status='posted' for update; end if;
  if v_entry is null then raise exception 'posted document not found' using errcode='P0002'; end if;
  if p_sale then
    select id into v_open from public.receivable_documents where source_type='customer_invoice' and source_id=p_document_id for update;
    for v_row in select * from public.receivable_credit_allocations where (credit_document_id=v_open or charge_document_id=v_open) and reversed_at is null loop
      update public.receivable_credit_allocations set reversed_at=now() where id=v_row.id;
      perform private.refresh_open_document(true,case when v_row.credit_document_id=v_open then v_row.charge_document_id else v_row.credit_document_id end);
    end loop;
    update public.settlement_allocations set reversed_at=now() where receivable_document_id=v_open and reversed_at is null;
  else
    select id into v_open from public.payable_documents where source_type='supplier_invoice' and source_id=p_document_id for update;
    for v_row in select * from public.payable_credit_allocations where (credit_document_id=v_open or charge_document_id=v_open) and reversed_at is null loop
      update public.payable_credit_allocations set reversed_at=now() where id=v_row.id;
      perform private.refresh_open_document(false,case when v_row.credit_document_id=v_open then v_row.charge_document_id else v_row.credit_document_id end);
    end loop;
    update public.settlement_allocations set reversed_at=now() where payable_document_id=v_open and reversed_at is null;
  end if;
  v_reversal:=api.reverse_journal_entry(v_entry,p_reason,p_request_id);
  if p_sale then update public.customer_invoices set status='reversed' where id=p_document_id; update public.receivable_documents set status='reversed' where id=v_open;
  else update public.supplier_invoices set status='reversed' where id=p_document_id; update public.payable_documents set status='reversed' where id=v_open; end if;
  return v_reversal;
end $$;

create or replace function api.reverse_treasury_transaction(p_transaction_id uuid,p_reason text,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('treasury.manage'); v_tx public.treasury_transactions%rowtype; v_reversal uuid; v_alloc record;
begin
  select * into v_tx from public.treasury_transactions where id=p_transaction_id and company_id=v_company for update; if v_tx.status<>'posted' then raise exception 'transaction not found or already reversed' using errcode='55000'; end if;
  v_reversal:=api.reverse_journal_entry(v_tx.journal_entry_id,p_reason,p_request_id); update public.treasury_transactions set status='reversed',reversed_at=now(),reversed_by=(select auth.uid()) where id=p_transaction_id;
  for v_alloc in select * from public.settlement_allocations where treasury_transaction_id=p_transaction_id and reversed_at is null loop
    update public.settlement_allocations set reversed_at=now() where id=v_alloc.id;
    if v_alloc.payable_document_id is not null then perform private.refresh_open_document(false,v_alloc.payable_document_id); else perform private.refresh_open_document(true,v_alloc.receivable_document_id); end if;
  end loop;
  perform private.write_audit('user','treasury.transaction_reversed','treasury_transaction',p_transaction_id,null,jsonb_build_object('reversal_entry_id',v_reversal),p_request_id,jsonb_build_object('reason',p_reason),(select auth.uid())); return v_reversal;
end $$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='api' and p.proname in ('save_accounting_party','save_accounting_document','post_accounting_document','apply_accounting_credit','create_customer_invoice_from_certificate','post_certificate_accounting','record_treasury_settlement','save_treasury_account','deactivate_treasury_account','reverse_accounting_document','reverse_treasury_transaction') loop
    execute format('alter function %s owner to postgres',f.signature); execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature); execute format('grant execute on function %s to authenticated',f.signature);
  end loop;
end $$;

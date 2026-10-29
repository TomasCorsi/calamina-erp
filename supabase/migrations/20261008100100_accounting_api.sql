-- Transactional accounting API and read adapters for the preserved legacy UI.

create or replace function private.accounting_require(p_permission text) returns uuid
language plpgsql stable security definer set search_path='' as $$
declare v_company uuid:=private.current_company_id();
begin
  if (select auth.uid()) is null or v_company is null or not private.has_permission(p_permission) then
    raise exception 'not authorized' using errcode='42501';
  end if;
  return v_company;
end $$;

create or replace function api.save_accounting_company(p_data jsonb,p_request_id uuid default extensions.gen_random_uuid()) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.manage');
begin
  update public.companies set
    legal_name=coalesce(nullif(btrim(p_data->>'razon_social'),''),legal_name),
    display_name=coalesce(nullif(btrim(p_data->>'nombre_fantasia'),''),display_name),
    tax_id=nullif(btrim(p_data->>'cuit'),'')
  where id=v_company;
  update public.company_settings set
    fiscal_condition=coalesce(nullif(p_data->>'condicion_iva',''),'RI'),
    gross_income_number=nullif(btrim(p_data->>'iibb'),''), activity_started_on=nullif(p_data->>'inicio_actividades','')::date,
    fiscal_address=nullif(btrim(p_data->>'domicilio_fiscal'),''), city=nullif(btrim(p_data->>'localidad'),''),
    province=nullif(btrim(p_data->>'provincia'),''), postal_code=nullif(btrim(p_data->>'cp'),''),
    phone=nullif(btrim(p_data->>'telefono'),''), email=nullif(btrim(p_data->>'email'),'')::extensions.citext,
    invoice_footer=nullif(btrim(p_data->>'pie_factura'),'') where company_id=v_company;
  perform private.write_audit('user','accounting.company_updated','company',v_company,null,'{}'::jsonb,p_request_id,'{}'::jsonb,(select auth.uid()));
  return true;
end $$;

create or replace function api.save_accounting_account(p_data jsonb,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.manage'); v_id uuid:=nullif(p_data->>'id','')::uuid; v_type text;
begin
  v_type:=case p_data->>'tipo' when 'activo' then 'asset' when 'pasivo' then 'liability' when 'patrimonio' then 'equity' when 'ingreso' then 'revenue' when 'egreso' then 'expense' when 'resultado' then 'cost' else p_data->>'account_type' end;
  if v_type not in ('asset','liability','equity','revenue','cost','expense') then raise exception 'invalid account type' using errcode='22023'; end if;
  if v_id is null then
    insert into public.accounting_accounts(company_id,code,name,account_type,normal_balance,parent_id,is_postable,is_active,requires_work)
    values(v_company,btrim(p_data->>'codigo'),btrim(p_data->>'nombre'),v_type,case when v_type in ('asset','cost','expense') then 'debit' else 'credit' end,nullif(p_data->>'parent_id','')::uuid,coalesce((p_data->>'imputable')::boolean,true),true,coalesce((p_data->>'requires_work')::boolean,false)) returning id into v_id;
  else
    update public.accounting_accounts set code=btrim(p_data->>'codigo'),name=btrim(p_data->>'nombre'),account_type=v_type,
      normal_balance=case when v_type in ('asset','cost','expense') then 'debit' else 'credit' end,
      parent_id=nullif(p_data->>'parent_id','')::uuid,is_postable=coalesce((p_data->>'imputable')::boolean,true),requires_work=coalesce((p_data->>'requires_work')::boolean,false)
    where id=v_id and company_id=v_company and not is_system;
    if not found then raise exception 'account not found or system account' using errcode='P0002'; end if;
  end if;
  perform private.write_audit('user','accounting.account_saved','accounting_account',v_id,null,jsonb_build_object('code',p_data->>'codigo'),p_request_id,'{}'::jsonb,(select auth.uid()));
  return v_id;
end $$;

create or replace function api.deactivate_accounting_account(p_id uuid,p_request_id uuid default extensions.gen_random_uuid()) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.manage');
begin
  update public.accounting_accounts set is_active=false where id=p_id and company_id=v_company and not is_system;
  if not found then raise exception 'account not found or system account' using errcode='P0002'; end if;
  perform private.write_audit('user','accounting.account_deactivated','accounting_account',p_id,null,jsonb_build_object('is_active',false),p_request_id,'{}'::jsonb,(select auth.uid()));
  return true;
end $$;

create or replace function api.save_accounting_party(p_data jsonb,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.manage'); v_id uuid:=nullif(p_data->>'id','')::uuid; v_kind text:=p_data->>'tipo'; v_target uuid; v_party uuid;
begin
  if v_id is not null then
    select coalesce(client_id,supplier_id,personal_id),party_type into v_target,v_kind from public.accounting_parties where id=v_id and company_id=v_company;
    if not found then raise exception 'party not found' using errcode='P0002'; end if;
    if v_kind='customer' then update public.clientes set nombre=btrim(p_data->>'razon_social'),cuit=nullif(btrim(p_data->>'cuit'),''),direccion=nullif(btrim(p_data->>'domicilio'),''),localidad=nullif(btrim(p_data->>'localidad'),''),telefono=nullif(btrim(p_data->>'telefono'),''),email=nullif(btrim(p_data->>'email'),'')::extensions.citext where id=v_target and company_id=v_company;
    elsif v_kind='supplier' then update public.proveedores set nombre=btrim(p_data->>'razon_social'),cuit=nullif(btrim(p_data->>'cuit'),''),direccion=nullif(btrim(p_data->>'domicilio'),''),localidad=nullif(btrim(p_data->>'localidad'),''),telefono=nullif(btrim(p_data->>'telefono'),''),email=nullif(btrim(p_data->>'email'),'')::extensions.citext where id=v_target and company_id=v_company;
    end if;
    update public.accounting_parties set tax_condition=coalesce(nullif(p_data->>'condicion_iva',''),'RI'),bank_name=nullif(btrim(p_data->>'banco'),''),bank_account_number=nullif(btrim(p_data->>'numero_cuenta'),''),cbu=nullif(btrim(p_data->>'cbu'),''),notes=nullif(btrim(p_data->>'notas'),'') where id=v_id;
    v_party:=v_id;
  elsif v_kind in ('cliente','ambos') then
    insert into public.clientes(company_id,nombre,cuit,direccion,localidad,telefono,email) values(v_company,btrim(p_data->>'razon_social'),nullif(btrim(p_data->>'cuit'),''),nullif(btrim(p_data->>'domicilio'),''),nullif(btrim(p_data->>'localidad'),''),nullif(btrim(p_data->>'telefono'),''),nullif(btrim(p_data->>'email'),'')::extensions.citext) returning id into v_target;
    insert into public.accounting_parties(company_id,party_type,client_id,tax_condition,bank_name,bank_account_number,cbu,notes) values(v_company,'customer',v_target,coalesce(nullif(p_data->>'condicion_iva',''),'RI'),nullif(btrim(p_data->>'banco'),''),nullif(btrim(p_data->>'numero_cuenta'),''),nullif(btrim(p_data->>'cbu'),''),nullif(btrim(p_data->>'notas'),'')) returning id into v_party;
  elsif v_kind='proveedor' then
    insert into public.proveedores(company_id,nombre,cuit,direccion,localidad,telefono,email) values(v_company,btrim(p_data->>'razon_social'),nullif(btrim(p_data->>'cuit'),''),nullif(btrim(p_data->>'domicilio'),''),nullif(btrim(p_data->>'localidad'),''),nullif(btrim(p_data->>'telefono'),''),nullif(btrim(p_data->>'email'),'')::extensions.citext) returning id into v_target;
    insert into public.accounting_parties(company_id,party_type,supplier_id,tax_condition,bank_name,bank_account_number,cbu,notes) values(v_company,'supplier',v_target,coalesce(nullif(p_data->>'condicion_iva',''),'RI'),nullif(btrim(p_data->>'banco'),''),nullif(btrim(p_data->>'numero_cuenta'),''),nullif(btrim(p_data->>'cbu'),''),nullif(btrim(p_data->>'notas'),'')) returning id into v_party;
  else raise exception 'invalid party type' using errcode='22023'; end if;
  perform private.write_audit('user','accounting.party_saved','accounting_party',v_party,null,jsonb_build_object('party_type',v_kind),p_request_id,'{}'::jsonb,(select auth.uid()));
  return v_party;
end $$;

create or replace function api.deactivate_accounting_party(p_id uuid,p_request_id uuid default extensions.gen_random_uuid()) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.manage');
begin update public.accounting_parties set is_active=false where id=p_id and company_id=v_company;
  if not found then raise exception 'party not found' using errcode='P0002'; end if;
  perform private.write_audit('user','accounting.party_deactivated','accounting_party',p_id,null,jsonb_build_object('is_active',false),p_request_id,'{}'::jsonb,(select auth.uid())); return true;
end $$;

create or replace function api.save_accounting_document(p_document jsonb,p_lines jsonb,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.manage'); v_sale boolean:=coalesce((p_document->>'es_venta')::boolean,false); v_id uuid:=nullif(p_document->>'id','')::uuid; v_party public.accounting_parties%rowtype; v_line jsonb; v_n integer:=0; v_net numeric:=0; v_tax numeric:=0; v_other numeric:=coalesce(nullif(p_document->>'perc_iva','')::numeric,0)+coalesce(nullif(p_document->>'perc_iibb','')::numeric,0)+coalesce(nullif(p_document->>'perc_otras','')::numeric,0); v_account uuid;
begin
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)=0 then raise exception 'document lines are required' using errcode='23514'; end if;
  select * into v_party from public.accounting_parties where id=(p_document->>'tercero_id')::uuid and company_id=v_company and is_active;
  if not found or (v_sale and v_party.party_type<>'customer') or (not v_sale and v_party.party_type<>'supplier') then raise exception 'invalid accounting party' using errcode='23503'; end if;
  for v_line in select value from jsonb_array_elements(p_lines) loop v_net:=v_net+coalesce((v_line->>'neto')::numeric,0); v_tax:=v_tax+coalesce((v_line->>'iva')::numeric,0); end loop;
  if round(v_net+v_tax+v_other,2)<=0 then raise exception 'document total must be positive' using errcode='23514'; end if;
  if v_sale then
    if v_id is null then insert into public.customer_invoices(company_id,client_id,document_type,document_letter,point_of_sale,document_number,issue_date,due_date,currency,exchange_rate,obra_id,maquinaria_id,net_amount,tax_amount,other_tax_amount,total_amount,notes,created_by)
      values(v_company,v_party.client_id,p_document->>'tipo',nullif(p_document->>'letra',''),coalesce((p_document->>'punto_venta')::int,1),coalesce((p_document->>'numero')::bigint,0),(p_document->>'fecha')::date,nullif(p_document->>'fecha_vto','')::date,coalesce(nullif(p_document->>'moneda',''),'ARS'),coalesce(nullif(p_document->>'cotizacion','')::numeric,1),nullif(p_document->>'obra_id','')::uuid,nullif(p_document->>'maquinaria_id','')::uuid,v_net,v_tax,v_other,round(v_net+v_tax+v_other,2),nullif(btrim(p_document->>'observaciones'),''),(select auth.uid())) returning id into v_id;
    else update public.customer_invoices set document_type=p_document->>'tipo',document_letter=nullif(p_document->>'letra',''),point_of_sale=(p_document->>'punto_venta')::int,document_number=(p_document->>'numero')::bigint,issue_date=(p_document->>'fecha')::date,due_date=nullif(p_document->>'fecha_vto','')::date,obra_id=nullif(p_document->>'obra_id','')::uuid,maquinaria_id=nullif(p_document->>'maquinaria_id','')::uuid,net_amount=v_net,tax_amount=v_tax,other_tax_amount=v_other,total_amount=round(v_net+v_tax+v_other,2),notes=nullif(btrim(p_document->>'observaciones'),'') where id=v_id and company_id=v_company and status='draft';
      if not found then raise exception 'document not found or immutable' using errcode='55000'; end if; delete from public.customer_invoice_lines where customer_invoice_id=v_id; delete from public.customer_invoice_tax_lines where customer_invoice_id=v_id;
    end if;
    for v_line in select value from jsonb_array_elements(p_lines) loop v_n:=v_n+1; v_account:=coalesce(nullif(v_line->>'cuenta_id','')::uuid,(select id from public.accounting_accounts where company_id=v_company and system_key='revenue_works'));
      insert into public.customer_invoice_lines(company_id,customer_invoice_id,line_number,account_id,description,quantity,unit_price,net_amount,tax_rate,tax_amount,obra_id,maquinaria_id) values(v_company,v_id,v_n,v_account,btrim(v_line->>'descripcion'),(v_line->>'cantidad')::numeric,(v_line->>'precio_unit')::numeric,(v_line->>'neto')::numeric,(v_line->>'alicuota_iva')::numeric,(v_line->>'iva')::numeric,coalesce(nullif(v_line->>'obra_id','')::uuid,nullif(p_document->>'obra_id','')::uuid),coalesce(nullif(v_line->>'maquinaria_id','')::uuid,nullif(p_document->>'maquinaria_id','')::uuid));
      if (v_line->>'iva')::numeric>0 then insert into public.customer_invoice_tax_lines(company_id,customer_invoice_id,tax_kind,tax_rate,taxable_amount,amount) values(v_company,v_id,'vat',(v_line->>'alicuota_iva')::numeric,(v_line->>'neto')::numeric,(v_line->>'iva')::numeric); end if;
    end loop;
  else
    if v_id is null then insert into public.supplier_invoices(company_id,supplier_id,document_type,document_letter,point_of_sale,document_number,issue_date,due_date,currency,exchange_rate,obra_id,maquinaria_id,net_amount,tax_amount,other_tax_amount,total_amount,notes,created_by)
      values(v_company,v_party.supplier_id,p_document->>'tipo',nullif(p_document->>'letra',''),coalesce((p_document->>'punto_venta')::int,1),coalesce((p_document->>'numero')::bigint,0),(p_document->>'fecha')::date,nullif(p_document->>'fecha_vto','')::date,coalesce(nullif(p_document->>'moneda',''),'ARS'),coalesce(nullif(p_document->>'cotizacion','')::numeric,1),nullif(p_document->>'obra_id','')::uuid,nullif(p_document->>'maquinaria_id','')::uuid,v_net,v_tax,v_other,round(v_net+v_tax+v_other,2),nullif(btrim(p_document->>'observaciones'),''),(select auth.uid())) returning id into v_id;
    else update public.supplier_invoices set document_type=p_document->>'tipo',document_letter=nullif(p_document->>'letra',''),point_of_sale=(p_document->>'punto_venta')::int,document_number=(p_document->>'numero')::bigint,issue_date=(p_document->>'fecha')::date,due_date=nullif(p_document->>'fecha_vto','')::date,obra_id=nullif(p_document->>'obra_id','')::uuid,maquinaria_id=nullif(p_document->>'maquinaria_id','')::uuid,net_amount=v_net,tax_amount=v_tax,other_tax_amount=v_other,total_amount=round(v_net+v_tax+v_other,2),notes=nullif(btrim(p_document->>'observaciones'),'') where id=v_id and company_id=v_company and status='draft';
      if not found then raise exception 'document not found or immutable' using errcode='55000'; end if; delete from public.supplier_invoice_lines where supplier_invoice_id=v_id; delete from public.supplier_invoice_tax_lines where supplier_invoice_id=v_id;
    end if;
    for v_line in select value from jsonb_array_elements(p_lines) loop v_n:=v_n+1; v_account:=coalesce(nullif(v_line->>'cuenta_id','')::uuid,(select id from public.accounting_accounts where company_id=v_company and system_key='cost_materials'));
      insert into public.supplier_invoice_lines(company_id,supplier_invoice_id,line_number,account_id,description,quantity,unit_price,net_amount,tax_rate,tax_amount,obra_id,maquinaria_id) values(v_company,v_id,v_n,v_account,btrim(v_line->>'descripcion'),(v_line->>'cantidad')::numeric,(v_line->>'precio_unit')::numeric,(v_line->>'neto')::numeric,(v_line->>'alicuota_iva')::numeric,(v_line->>'iva')::numeric,coalesce(nullif(v_line->>'obra_id','')::uuid,nullif(p_document->>'obra_id','')::uuid),coalesce(nullif(v_line->>'maquinaria_id','')::uuid,nullif(p_document->>'maquinaria_id','')::uuid));
      if (v_line->>'iva')::numeric>0 then insert into public.supplier_invoice_tax_lines(company_id,supplier_invoice_id,tax_kind,tax_rate,taxable_amount,amount) values(v_company,v_id,'vat',(v_line->>'alicuota_iva')::numeric,(v_line->>'neto')::numeric,(v_line->>'iva')::numeric); end if;
    end loop;
  end if;
  perform private.write_audit('user','accounting.document_saved',case when v_sale then 'customer_invoice' else 'supplier_invoice' end,v_id,null,jsonb_build_object('status','draft','total',round(v_net+v_tax+v_other,2)),p_request_id,'{}'::jsonb,(select auth.uid())); return v_id;
end $$;

create or replace function api.post_accounting_document(p_document_id uuid,p_sale boolean,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.post'); v_entry uuid; v_party uuid; v_total numeric; v_date date; v_due date; v_currency text; v_rate numeric; v_desc text; v_line record; v_n integer:=0; v_tax numeric; v_other numeric; v_existing uuid; v_arap uuid; v_tax_account uuid;
begin
  if p_sale then
    select journal_entry_id,total_amount,issue_date,due_date,currency,exchange_rate,tax_amount,other_tax_amount,'Venta '||document_type||' '||point_of_sale||'-'||document_number into v_existing,v_total,v_date,v_due,v_currency,v_rate,v_tax,v_other,v_desc from public.customer_invoices where id=p_document_id and company_id=v_company for update;
    if v_existing is not null then return v_existing; end if;
    select ap.id into v_party from public.accounting_parties ap join public.customer_invoices d on d.client_id=ap.client_id and d.company_id=ap.company_id where d.id=p_document_id;
    select id into v_arap from public.accounting_accounts where company_id=v_company and system_key='accounts_receivable'; select id into v_tax_account from public.accounting_accounts where company_id=v_company and system_key='vat_debit';
  else
    select journal_entry_id,total_amount,issue_date,due_date,currency,exchange_rate,tax_amount,other_tax_amount,'Compra '||document_type||' '||point_of_sale||'-'||document_number into v_existing,v_total,v_date,v_due,v_currency,v_rate,v_tax,v_other,v_desc from public.supplier_invoices where id=p_document_id and company_id=v_company for update;
    if v_existing is not null then return v_existing; end if;
    select ap.id into v_party from public.accounting_parties ap join public.supplier_invoices d on d.supplier_id=ap.supplier_id and d.company_id=ap.company_id where d.id=p_document_id;
    select id into v_arap from public.accounting_accounts where company_id=v_company and system_key='accounts_payable'; select id into v_tax_account from public.accounting_accounts where company_id=v_company and system_key='vat_credit';
  end if;
  if v_total is null then raise exception 'document not found' using errcode='P0002'; end if;
  insert into public.journal_entries(company_id,entry_date,description,origin,reference_type,reference_id,source_event,source_currency,source_amount,exchange_rate,idempotency_key,payload_hash,created_by)
  values(v_company,v_date,v_desc,'automatic',case when p_sale then 'customer_invoice' else 'supplier_invoice' end,p_document_id,'confirmed',v_currency,v_total,v_rate,p_request_id,encode(extensions.digest((p_document_id::text||'confirmed')::bytea,'sha256'),'hex'),(select auth.uid())) returning id into v_entry;
  if p_sale then
    v_n:=1; insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,party_id) values(v_company,v_entry,v_n,v_arap,v_desc,v_total,0,v_party);
    for v_line in select * from public.customer_invoice_lines where customer_invoice_id=p_document_id order by line_number loop v_n:=v_n+1; insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,obra_id,maquinaria_id,party_id) values(v_company,v_entry,v_n,v_line.account_id,v_line.description,0,v_line.net_amount,v_line.obra_id,v_line.maquinaria_id,v_party); end loop;
    if v_tax>0 then v_n:=v_n+1; insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,party_id) values(v_company,v_entry,v_n,v_tax_account,'IVA debito fiscal',0,v_tax,v_party); end if;
    if v_other>0 then v_n:=v_n+1; insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,party_id) select v_company,v_entry,v_n,id,'Otros impuestos de venta',0,v_other,v_party from public.accounting_accounts where company_id=v_company and system_key='taxes_payable'; end if;
  else
    for v_line in select * from public.supplier_invoice_lines where supplier_invoice_id=p_document_id order by line_number loop v_n:=v_n+1; insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,obra_id,maquinaria_id,party_id) values(v_company,v_entry,v_n,v_line.account_id,v_line.description,v_line.net_amount,0,v_line.obra_id,v_line.maquinaria_id,v_party); end loop;
    if v_tax>0 then v_n:=v_n+1; insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,party_id) values(v_company,v_entry,v_n,v_tax_account,'IVA credito fiscal',v_tax,0,v_party); end if;
    if v_other>0 then v_n:=v_n+1; insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,party_id) select v_company,v_entry,v_n,id,'Percepciones',v_other,0,v_party from public.accounting_accounts where company_id=v_company and system_key='tax_credits'; end if;
    v_n:=v_n+1; insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,party_id) values(v_company,v_entry,v_n,v_arap,v_desc,0,v_total,v_party);
  end if;
  perform api.post_journal_entry(v_entry,p_request_id);
  if p_sale then update public.customer_invoices set status='posted',journal_entry_id=v_entry,confirmed_at=now(),confirmed_by=(select auth.uid()) where id=p_document_id;
    insert into public.receivable_documents(company_id,party_id,source_type,source_id,issue_date,due_date,currency,original_amount,functional_amount,journal_entry_id) values(v_company,v_party,'customer_invoice',p_document_id,v_date,v_due,v_currency,v_total,round(v_total*v_rate,2),v_entry);
  else update public.supplier_invoices set status='posted',journal_entry_id=v_entry,confirmed_at=now(),confirmed_by=(select auth.uid()) where id=p_document_id;
    insert into public.payable_documents(company_id,party_id,source_type,source_id,issue_date,due_date,currency,original_amount,functional_amount,journal_entry_id) values(v_company,v_party,'supplier_invoice',p_document_id,v_date,v_due,v_currency,v_total,round(v_total*v_rate,2),v_entry);
  end if;
  perform private.write_audit('user','accounting.document_posted',case when p_sale then 'customer_invoice' else 'supplier_invoice' end,p_document_id,jsonb_build_object('status','draft'),jsonb_build_object('status','posted','journal_entry_id',v_entry),p_request_id,'{}'::jsonb,(select auth.uid())); return v_entry;
end $$;

create or replace function api.reverse_accounting_document(p_document_id uuid,p_sale boolean,p_reason text,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.post'); v_entry uuid; v_reversal uuid;
begin
  if p_sale then select journal_entry_id into v_entry from public.customer_invoices where id=p_document_id and company_id=v_company and status='posted' for update; else select journal_entry_id into v_entry from public.supplier_invoices where id=p_document_id and company_id=v_company and status='posted' for update; end if;
  if v_entry is null then raise exception 'posted document not found' using errcode='P0002'; end if;
  v_reversal:=api.reverse_journal_entry(v_entry,p_reason,p_request_id);
  if p_sale then update public.customer_invoices set status='reversed' where id=p_document_id; update public.receivable_documents set status='reversed' where source_type='customer_invoice' and source_id=p_document_id;
  else update public.supplier_invoices set status='reversed' where id=p_document_id; update public.payable_documents set status='reversed' where source_type='supplier_invoice' and source_id=p_document_id; end if;
  return v_reversal;
end $$;

create or replace function api.delete_accounting_draft(p_document_id uuid,p_sale boolean) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.manage');
begin if p_sale then delete from public.customer_invoices where id=p_document_id and company_id=v_company and status='draft'; else delete from public.supplier_invoices where id=p_document_id and company_id=v_company and status='draft'; end if;
  if not found then raise exception 'draft not found' using errcode='P0002'; end if; return true;
end $$;

create or replace function api.record_treasury_transaction(p_data jsonb,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('treasury.manage'); v_type text:=case when coalesce((p_data->>'es_cobro')::boolean,false) then 'receipt' else 'payment' end; v_party uuid:=(p_data->>'tercero_id')::uuid; v_amount numeric:=(p_data->>'monto')::numeric; v_date date:=(p_data->>'fecha')::date; v_ledger uuid:=nullif(p_data->>'cuenta_id','')::uuid; v_treasury uuid; v_counter uuid; v_entry uuid; v_tx uuid; v_doc uuid:=nullif(p_data->>'comprobante_id','')::uuid; v_open uuid; v_applied numeric; v_doc_amount numeric; v_remaining numeric;
begin
  select id into v_tx from public.treasury_transactions where company_id=v_company and idempotency_key=p_request_id;
  if v_tx is not null then return v_tx; end if;
  if v_amount<=0 then raise exception 'amount must be positive' using errcode='23514'; end if;
  if not exists(select 1 from public.accounting_parties where id=v_party and company_id=v_company and is_active) then raise exception 'invalid party' using errcode='23503'; end if;
  if v_ledger is null then select id into v_ledger from public.accounting_accounts where company_id=v_company and system_key='cash'; end if;
  select id into v_treasury from public.treasury_accounts where company_id=v_company and ledger_account_id=v_ledger and is_active;
  if v_treasury is null then raise exception 'selected account is not an active treasury account' using errcode='23514'; end if;
  select id into v_counter from public.accounting_accounts where company_id=v_company and system_key=case when v_type='receipt' then 'accounts_receivable' else 'accounts_payable' end;
  insert into public.journal_entries(company_id,entry_date,description,origin,reference_type,reference_id,source_event,source_currency,source_amount,idempotency_key,payload_hash,created_by)
  values(v_company,v_date,case when v_type='receipt' then 'Cobro' else 'Pago' end,'automatic','treasury_transaction',p_request_id,case when v_type='receipt' then 'receipt' else 'payment' end,'ARS',v_amount,p_request_id,encode(extensions.digest(p_data::text::bytea,'sha256'),'hex'),(select auth.uid())) returning id into v_entry;
  if v_type='receipt' then
    insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,obra_id,maquinaria_id,party_id) values(v_company,v_entry,1,v_ledger,'Ingreso de fondos',v_amount,0,nullif(p_data->>'obra_id','')::uuid,nullif(p_data->>'maquinaria_id','')::uuid,v_party),(v_company,v_entry,2,v_counter,'Cancelacion de cuenta por cobrar',0,v_amount,nullif(p_data->>'obra_id','')::uuid,nullif(p_data->>'maquinaria_id','')::uuid,v_party);
  else
    insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,obra_id,maquinaria_id,party_id) values(v_company,v_entry,1,v_counter,'Cancelacion de cuenta por pagar',v_amount,0,nullif(p_data->>'obra_id','')::uuid,nullif(p_data->>'maquinaria_id','')::uuid,v_party),(v_company,v_entry,2,v_ledger,'Egreso de fondos',0,v_amount,nullif(p_data->>'obra_id','')::uuid,nullif(p_data->>'maquinaria_id','')::uuid,v_party);
  end if;
  perform api.post_journal_entry(v_entry,p_request_id);
  insert into public.treasury_transactions(company_id,transaction_type,transaction_date,treasury_account_id,party_id,amount,reference,notes,journal_entry_id,idempotency_key,created_by)
  values(v_company,v_type,v_date,v_treasury,v_party,v_amount,nullif(btrim(p_data->>'referencia'),''),nullif(btrim(p_data->>'observaciones'),''),v_entry,p_request_id,(select auth.uid())) returning id into v_tx;
  if v_doc is not null then
    if v_type='receipt' then select id,functional_amount into v_open,v_doc_amount from public.receivable_documents where company_id=v_company and source_id=v_doc and status in ('open','partial') for update; select coalesce(sum(amount),0) into v_applied from public.settlement_allocations where receivable_document_id=v_open and reversed_at is null;
    else select id,functional_amount into v_open,v_doc_amount from public.payable_documents where company_id=v_company and source_id=v_doc and status in ('open','partial') for update; select coalesce(sum(amount),0) into v_applied from public.settlement_allocations where payable_document_id=v_open and reversed_at is null; end if;
    if v_open is null or v_amount>v_doc_amount-v_applied then raise exception 'payment exceeds outstanding balance' using errcode='23514'; end if;
    if v_type='receipt' then insert into public.settlement_allocations(company_id,treasury_transaction_id,receivable_document_id,amount) values(v_company,v_tx,v_open,v_amount); update public.receivable_documents set status=case when v_amount=v_doc_amount-v_applied then 'paid' else 'partial' end where id=v_open;
    else insert into public.settlement_allocations(company_id,treasury_transaction_id,payable_document_id,amount) values(v_company,v_tx,v_open,v_amount); update public.payable_documents set status=case when v_amount=v_doc_amount-v_applied then 'paid' else 'partial' end where id=v_open; end if;
  end if;
  perform private.write_audit('user','treasury.'||v_type||'_posted','treasury_transaction',v_tx,null,jsonb_build_object('amount',v_amount,'journal_entry_id',v_entry),p_request_id,'{}'::jsonb,(select auth.uid())); return v_tx;
end $$;

create or replace function api.reverse_treasury_transaction(p_transaction_id uuid,p_reason text,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('treasury.manage'); v_tx public.treasury_transactions%rowtype; v_reversal uuid; v_alloc record; v_total numeric;
begin select * into v_tx from public.treasury_transactions where id=p_transaction_id and company_id=v_company for update; if v_tx.status<>'posted' then raise exception 'transaction not found or already reversed' using errcode='55000'; end if;
  v_reversal:=api.reverse_journal_entry(v_tx.journal_entry_id,p_reason,p_request_id); update public.treasury_transactions set status='reversed',reversed_at=now(),reversed_by=(select auth.uid()) where id=p_transaction_id;
  for v_alloc in select * from public.settlement_allocations where treasury_transaction_id=p_transaction_id and reversed_at is null loop
    update public.settlement_allocations set reversed_at=now() where id=v_alloc.id;
    if v_alloc.payable_document_id is not null then select coalesce(sum(amount),0) into v_total from public.settlement_allocations where payable_document_id=v_alloc.payable_document_id and reversed_at is null; update public.payable_documents set status=case when v_total=0 then 'open' else 'partial' end where id=v_alloc.payable_document_id;
    else select coalesce(sum(amount),0) into v_total from public.settlement_allocations where receivable_document_id=v_alloc.receivable_document_id and reversed_at is null; update public.receivable_documents set status=case when v_total=0 then 'open' else 'partial' end where id=v_alloc.receivable_document_id; end if;
  end loop;
  return v_reversal;
end $$;

-- Legacy UI read adapters. They are security-invoker views over canonical RLS tables.
create view public.contab_empresa with (security_invoker=true) as
select c.id,c.tax_id as cuit,c.legal_name as razon_social,c.display_name as nombre_fantasia,s.fiscal_condition as condicion_iva,s.gross_income_number as iibb,s.activity_started_on as inicio_actividades,s.fiscal_address as domicilio_fiscal,s.city as localidad,s.province as provincia,s.postal_code as cp,s.phone as telefono,s.email,s.invoice_footer as pie_factura,null::text as logo_url,c.is_active as activa
from public.companies c join public.company_settings s on s.company_id=c.id;

create view public.contab_plan_cuentas with (security_invoker=true) as
select id,code as codigo,name as nombre,case account_type when 'asset' then 'activo' when 'liability' then 'pasivo' when 'equity' then 'patrimonio' when 'revenue' then 'ingreso' when 'cost' then 'resultado' else 'egreso' end as tipo,parent_id,is_postable as imputable,is_active as activa,requires_work
from public.accounting_accounts;

create view public.contab_terceros with (security_invoker=true) as
select p.id,case p.party_type when 'customer' then 'cliente' when 'supplier' then 'proveedor' else 'personal' end as tipo,
coalesce(c.cuit,s.cuit,pe.internal_code::text) as cuit,coalesce(c.nombre,s.nombre,pe.first_name||' '||pe.last_name) as razon_social,p.tax_condition as condicion_iva,
coalesce(c.direccion,s.direccion) as domicilio,coalesce(c.localidad,s.localidad) as localidad,null::text as provincia,null::text as cp,coalesce(c.telefono,s.telefono) as telefono,coalesce(c.email::text,s.email::text,pe.work_email::text) as email,p.cbu,p.bank_name as banco,p.bank_account_number as numero_cuenta,p.notes as notas,p.is_active as activo
from public.accounting_parties p left join public.clientes c on c.id=p.client_id left join public.proveedores s on s.id=p.supplier_id left join public.personal pe on pe.id=p.personal_id;

create view public.contab_comprobantes with (security_invoker=true) as
select d.id,d.company_id as empresa_id,d.document_type as tipo,d.document_letter as letra,d.point_of_sale as punto_venta,d.document_number as numero,d.issue_date as fecha,d.due_date as fecha_vto,p.id as tercero_id,
case when d.tax_amount>0 then d.net_amount else 0 end as neto_21,case when d.tax_amount>0 then d.tax_amount else 0 end as iva_21,0::numeric as neto_105,0::numeric as iva_105,0::numeric as neto_27,0::numeric as iva_27,case when d.tax_amount=0 then d.net_amount else 0 end as neto_0,0::numeric as exento,0::numeric as no_gravado,0::numeric as perc_iva,0::numeric as perc_iibb,d.other_tax_amount as perc_otras,d.total_amount as total,d.currency as moneda,d.exchange_rate as cotizacion,d.obra_id,d.maquinaria_id,
case d.status when 'draft' then 'borrador' when 'posted' then 'confirmado' else 'anulado' end as estado,true as es_venta,d.notes as observaciones,d.journal_entry_id as asiento_id,d.confirmed_at,d.created_at,
jsonb_build_object('razon_social',c.nombre,'cuit',c.cuit) as tercero,case when o.id is null then null else jsonb_build_object('nombre',o.nombre) end as obra,case when m.id is null then null else jsonb_build_object('nombre',m.nombre,'codigo',m.codigo) end as maquinaria
from public.customer_invoices d join public.accounting_parties p on p.client_id=d.client_id and p.company_id=d.company_id join public.clientes c on c.id=d.client_id left join public.obras o on o.id=d.obra_id left join public.maquinarias m on m.id=d.maquinaria_id
union all
select d.id,d.company_id,d.document_type,d.document_letter,d.point_of_sale,d.document_number,d.issue_date,d.due_date,p.id,
case when d.tax_amount>0 then d.net_amount else 0 end,case when d.tax_amount>0 then d.tax_amount else 0 end,0::numeric,0::numeric,0::numeric,0::numeric,case when d.tax_amount=0 then d.net_amount else 0 end,0::numeric,0::numeric,0::numeric,0::numeric,d.other_tax_amount,d.total_amount,d.currency,d.exchange_rate,d.obra_id,d.maquinaria_id,
case d.status when 'draft' then 'borrador' when 'posted' then 'confirmado' else 'anulado' end,false,d.notes,d.journal_entry_id,d.confirmed_at,d.created_at,
jsonb_build_object('razon_social',s.nombre,'cuit',s.cuit),case when o.id is null then null else jsonb_build_object('nombre',o.nombre) end,case when m.id is null then null else jsonb_build_object('nombre',m.nombre,'codigo',m.codigo) end
from public.supplier_invoices d join public.accounting_parties p on p.supplier_id=d.supplier_id and p.company_id=d.company_id join public.proveedores s on s.id=d.supplier_id left join public.obras o on o.id=d.obra_id left join public.maquinarias m on m.id=d.maquinaria_id;

create view public.contab_comprobante_items with (security_invoker=true) as
select id,customer_invoice_id as comprobante_id,line_number as orden,description as descripcion,account_id,quantity as cantidad,unit_price as precio_unit,net_amount as neto,tax_rate as alicuota_iva,tax_amount as iva,obra_id,maquinaria_id from public.customer_invoice_lines
union all select id,supplier_invoice_id,line_number,description,account_id,quantity,unit_price,net_amount,tax_rate,tax_amount,obra_id,maquinaria_id from public.supplier_invoice_lines;

create view public.contab_asientos with (security_invoker=true) as select id,number as numero,entry_date as fecha,description as descripcion,origin as origen,total_debit as total_debe,total_credit as total_haber,created_at,status from public.journal_entries where status in ('posted','reversed');
create view public.contab_asiento_lineas with (security_invoker=true) as
select l.id,l.journal_entry_id as asiento_id,l.line_number as orden,l.account_id as cuenta_id,l.description as descripcion,l.debit as debe,l.credit as haber,l.obra_id,l.maquinaria_id,
jsonb_build_object('codigo',a.code,'nombre',a.name) as cuenta,case when o.id is null then null else jsonb_build_object('nombre',o.nombre) end as obra,case when m.id is null then null else jsonb_build_object('nombre',m.nombre,'codigo',m.codigo) end as maquinaria
from public.journal_entry_lines l join public.accounting_accounts a on a.id=l.account_id left join public.obras o on o.id=l.obra_id left join public.maquinarias m on m.id=l.maquinaria_id;

create view public.contab_mayor_lineas with (security_invoker=true) as
select l.id,l.journal_entry_id as asiento_id,l.line_number as orden,l.account_id as cuenta_id,l.description as descripcion,l.debit as debe,l.credit as haber,l.obra_id,l.maquinaria_id,e.entry_date as asiento_fecha,
jsonb_build_object('fecha',e.entry_date,'descripcion',e.description,'numero',e.number) as asiento,
case when o.id is null then null else jsonb_build_object('nombre',o.nombre) end as obra,
case when m.id is null then null else jsonb_build_object('nombre',m.nombre,'codigo',m.codigo) end as maquinaria
from public.journal_entry_lines l join public.journal_entries e on e.id=l.journal_entry_id left join public.obras o on o.id=l.obra_id left join public.maquinarias m on m.id=l.maquinaria_id where e.status in ('posted','reversed');

create view public.contab_pagos with (security_invoker=true) as
select t.id,coalesce(rd.source_id,pd.source_id) as comprobante_id,t.party_id as tercero_id,(t.transaction_type='receipt') as es_cobro,t.transaction_date as fecha,
case when ta.account_type='cash' then 'efectivo' else 'transferencia' end as medio,t.amount as monto,ta.ledger_account_id as cuenta_id,t.reference as referencia,t.notes as observaciones,null::uuid as obra_id,null::uuid as maquinaria_id,t.journal_entry_id as asiento_id,
jsonb_build_object('razon_social',v.razon_social) as tercero,null::jsonb as comprobante
from public.treasury_transactions t join public.treasury_accounts ta on ta.id=t.treasury_account_id join public.contab_terceros v on v.id=t.party_id left join public.settlement_allocations a on a.treasury_transaction_id=t.id left join public.receivable_documents rd on rd.id=a.receivable_document_id left join public.payable_documents pd on pd.id=a.payable_document_id where t.status='posted';

grant select on public.contab_empresa,public.contab_plan_cuentas,public.contab_terceros,public.contab_comprobantes,public.contab_comprobante_items,public.contab_asientos,public.contab_asiento_lineas,public.contab_mayor_lineas,public.contab_pagos to authenticated;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='api' and p.proname in ('save_accounting_company','save_accounting_account','deactivate_accounting_account','save_accounting_party','deactivate_accounting_party','save_accounting_document','post_accounting_document','reverse_accounting_document','delete_accounting_draft','record_treasury_transaction','reverse_treasury_transaction') loop
    execute format('alter function %s owner to postgres',f.signature); execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature); execute format('grant execute on function %s to authenticated',f.signature);
  end loop;
end $$;

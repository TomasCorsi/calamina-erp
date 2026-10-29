-- Controlled integrations. Operational records are never modified by accounting.

create or replace function api.create_expense_accounting_draft(p_expense_id uuid,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.manage'); v_src public.otros_gastos%rowtype; v_expense uuid; v_ap uuid; v_party uuid;
begin
  select * into v_src from public.otros_gastos where id=p_expense_id and company_id=v_company;
  if not found or v_src.monto<=0 then raise exception 'valid expense not found' using errcode='P0002'; end if;
  select id into v_expense from public.accounting_accounts where company_id=v_company and system_key='expense_general';
  select id into v_ap from public.accounting_accounts where company_id=v_company and system_key='accounts_payable';
  return api.save_journal_draft(
    jsonb_build_object('entry_date',v_src.fecha,'description','Gasto: '||v_src.descripcion,'origin','reviewed_integration','reference_type','expense','reference_id',v_src.id,'source_event','approved'),
    jsonb_build_array(
      jsonb_build_object('account_id',v_expense,'description',v_src.descripcion,'debit',v_src.monto,'credit',0,'obra_id',v_src.obra_id,'maquinaria_id',v_src.maquinaria_id),
      jsonb_build_object('account_id',v_ap,'description','Contrapartida pendiente de pago','debit',0,'credit',v_src.monto)
    ),p_request_id);
end $$;

create or replace function api.create_maintenance_accounting_draft(p_maintenance_id uuid,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.manage'); v_src public.mantenimientos%rowtype; v_cost uuid; v_ap uuid;
begin
  select * into v_src from public.mantenimientos where id=p_maintenance_id and company_id=v_company and estado='completado';
  if not found or v_src.costo_total<=0 then raise exception 'completed maintenance with cost not found' using errcode='P0002'; end if;
  select id into v_cost from public.accounting_accounts where company_id=v_company and system_key='cost_maintenance';
  select id into v_ap from public.accounting_accounts where company_id=v_company and system_key='accounts_payable';
  return api.save_journal_draft(jsonb_build_object('entry_date',v_src.fecha,'description','Mantenimiento: '||v_src.descripcion,'origin','reviewed_integration','reference_type','maintenance','reference_id',v_src.id,'source_event','completed'),jsonb_build_array(
    jsonb_build_object('account_id',v_cost,'description',v_src.descripcion,'debit',v_src.costo_total,'credit',0,'maquinaria_id',v_src.maquinaria_id),
    jsonb_build_object('account_id',v_ap,'description','Contrapartida pendiente de pago','debit',0,'credit',v_src.costo_total)
  ),p_request_id);
end $$;

create or replace function api.create_fuel_batch_accounting_draft(p_from date,p_to date,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.manage'); v_entry uuid; v_cost uuid; v_ap uuid; v_row record; v_total numeric:=0; v_lines jsonb:='[]'::jsonb; v_n integer:=0;
begin
  if p_to<p_from then raise exception 'invalid period' using errcode='22023'; end if;
  select id into v_cost from public.accounting_accounts where company_id=v_company and system_key='cost_fuel';
  select id into v_ap from public.accounting_accounts where company_id=v_company and system_key='accounts_payable';
  for v_row in
    select c.obra_id,c.maquinaria_id,c.tipo_producto,date_trunc('month',c.fecha)::date as period,p.precio_unitario,sum(c.litros*p.precio_unitario)::numeric(18,2) amount
    from public.cargas_combustible_repartidor c join public.precios_productos_mes p on p.company_id=c.company_id and p.anio=extract(year from c.fecha)::int and p.mes=extract(month from c.fecha)::int and p.producto=c.tipo_producto
    where c.company_id=v_company and c.fecha between p_from and p_to and c.tipo_movimiento='egreso'
    group by c.obra_id,c.maquinaria_id,c.tipo_producto,date_trunc('month',c.fecha)::date,p.precio_unitario
  loop
    v_total:=v_total+v_row.amount;
    v_lines:=v_lines||jsonb_build_array(jsonb_build_object('account_id',v_cost,'description','Combustible '||v_row.tipo_producto||' '||to_char(v_row.period,'YYYY-MM')||' @ '||v_row.precio_unitario,'debit',v_row.amount,'credit',0,'obra_id',v_row.obra_id,'maquinaria_id',v_row.maquinaria_id));
  end loop;
  if v_total<=0 then raise exception 'fuel batch has no valued rows' using errcode='P0002'; end if;
  v_lines:=v_lines||jsonb_build_array(jsonb_build_object('account_id',v_ap,'description','Combustible pendiente de pago','debit',0,'credit',v_total));
  return api.save_journal_draft(jsonb_build_object('entry_date',p_to,'description','Lote de combustible '||p_from||' a '||p_to,'origin','reviewed_integration','reference_type','fuel_batch','reference_id',p_request_id,'source_event','reviewed'),v_lines,p_request_id);
end $$;

create or replace function api.post_payroll_accounting(p_payroll_id uuid,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.post'); v_src public.liquidaciones%rowtype; v_expense uuid; v_payable uuid; v_entry uuid;
begin
  select * into v_src from public.liquidaciones where id=p_payroll_id and company_id=v_company and estado in ('cerrada','pagada');
  if not found or v_src.total_neto<=0 then raise exception 'closed payroll not found' using errcode='P0002'; end if;
  select id into v_expense from public.accounting_accounts where company_id=v_company and system_key='expense_admin_wages';
  select id into v_payable from public.accounting_accounts where company_id=v_company and system_key='wages_payable';
  v_entry:=api.save_journal_draft(jsonb_build_object('entry_date',coalesce(v_src.fecha_pago,make_date(v_src.anio,v_src.mes,1)+(interval '1 month - 1 day'))::date,'description','Liquidacion salarial agregada '||v_src.periodo||' '||v_src.mes||'/'||v_src.anio,'origin','automatic','reference_type','payroll','reference_id',v_src.id,'source_event','closed'),jsonb_build_array(
    jsonb_build_object('account_id',v_expense,'description','Sueldos agregados','debit',v_src.total_neto,'credit',0),
    jsonb_build_object('account_id',v_payable,'description','Sueldos a pagar','debit',0,'credit',v_src.total_neto)
  ),p_request_id);
  perform api.post_journal_entry(v_entry,p_request_id); return v_entry;
end $$;

create or replace function api.post_certificate_accounting(p_certificate_id uuid,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('accounting.post'); v_src public.certificados%rowtype; v_client uuid; v_party uuid; v_ar uuid; v_revenue uuid; v_vat uuid; v_entry uuid;
begin
  select * into v_src from public.certificados where id=p_certificate_id and company_id=v_company and estado in ('emitido','cobrado');
  if not found or v_src.total<=0 then raise exception 'issued certificate not found' using errcode='P0002'; end if;
  select o.cliente_id into v_client from public.obras o where o.id=v_src.obra_id and o.company_id=v_company;
  select id into v_party from public.accounting_parties where company_id=v_company and client_id=v_client and is_active;
  if v_party is null then raise exception 'certificate client has no accounting party' using errcode='23503'; end if;
  select id into v_ar from public.accounting_accounts where company_id=v_company and system_key='accounts_receivable';
  select id into v_revenue from public.accounting_accounts where company_id=v_company and system_key='revenue_works';
  select id into v_vat from public.accounting_accounts where company_id=v_company and system_key='vat_debit';
  v_entry:=api.save_journal_draft(jsonb_build_object('entry_date',coalesce(v_src.fecha_emision,v_src.fecha_certificado),'description','Certificado '||v_src.numero,'origin','automatic','reference_type','certificate','reference_id',v_src.id,'source_event','issued'),jsonb_build_array(
    jsonb_build_object('account_id',v_ar,'description','Credito por certificado','debit',v_src.total,'credit',0,'party_id',v_party,'obra_id',v_src.obra_id),
    jsonb_build_object('account_id',v_revenue,'description','Ingreso por certificado','debit',0,'credit',v_src.subtotal,'party_id',v_party,'obra_id',v_src.obra_id),
    jsonb_build_object('account_id',v_vat,'description','IVA debito fiscal','debit',0,'credit',v_src.iva,'party_id',v_party,'obra_id',v_src.obra_id)
  ),p_request_id);
  perform api.post_journal_entry(v_entry,p_request_id);
  insert into public.receivable_documents(company_id,party_id,source_type,source_id,issue_date,currency,original_amount,functional_amount,journal_entry_id) values(v_company,v_party,'certificate',v_src.id,coalesce(v_src.fecha_emision,v_src.fecha_certificado),'ARS',v_src.total,v_src.total,v_entry);
  return v_entry;
end $$;

create or replace function api.record_treasury_transfer(p_from_account uuid,p_to_account uuid,p_date date,p_amount numeric,p_reference text default null,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.accounting_require('treasury.manage'); v_from public.treasury_accounts%rowtype; v_to public.treasury_accounts%rowtype; v_entry uuid; v_tx uuid;
begin
  select id into v_tx from public.treasury_transactions where company_id=v_company and idempotency_key=p_request_id;
  if v_tx is not null then return v_tx; end if;
  if p_amount<=0 or p_from_account=p_to_account then raise exception 'invalid transfer' using errcode='23514'; end if;
  select * into v_from from public.treasury_accounts where id=p_from_account and company_id=v_company and is_active; select * into v_to from public.treasury_accounts where id=p_to_account and company_id=v_company and is_active;
  if v_from.id is null or v_to.id is null or v_from.currency<>v_to.currency then raise exception 'invalid treasury accounts' using errcode='23503'; end if;
  v_entry:=api.save_journal_draft(jsonb_build_object('entry_date',p_date,'description','Transferencia '||v_from.name||' a '||v_to.name,'origin','automatic','reference_type','treasury_transfer','reference_id',p_request_id,'source_event','posted'),jsonb_build_array(
    jsonb_build_object('account_id',v_to.ledger_account_id,'description','Cuenta destino','debit',p_amount,'credit',0),jsonb_build_object('account_id',v_from.ledger_account_id,'description','Cuenta origen','debit',0,'credit',p_amount)
  ),p_request_id); perform api.post_journal_entry(v_entry,p_request_id);
  insert into public.treasury_transactions(company_id,transaction_type,transaction_date,treasury_account_id,destination_account_id,amount,currency,reference,journal_entry_id,idempotency_key,created_by) values(v_company,'transfer',p_date,v_from.id,v_to.id,p_amount,v_from.currency,nullif(btrim(p_reference),''),v_entry,p_request_id,(select auth.uid())) returning id into v_tx;
  perform private.write_audit('user','treasury.transfer_posted','treasury_transaction',v_tx,null,jsonb_build_object('amount',p_amount,'journal_entry_id',v_entry),p_request_id,'{}'::jsonb,(select auth.uid())); return v_tx;
end $$;

create or replace function api.accounting_dimension_report(p_from date,p_to date,p_obra_id uuid default null,p_maquinaria_id uuid default null)
returns table(month date,account_code text,account_name text,account_type text,obra_id uuid,obra_name text,maquinaria_id uuid,maquinaria_name text,debit numeric,credit numeric,net numeric)
language sql stable security definer set search_path='' as $$
  select date_trunc('month',e.entry_date)::date,a.code,a.name,a.account_type,l.obra_id,o.nombre,l.maquinaria_id,coalesce(m.codigo,m.nombre),sum(l.debit),sum(l.credit),sum(case when a.normal_balance='debit' then l.debit-l.credit else l.credit-l.debit end)
  from public.journal_entry_lines l join public.journal_entries e on e.id=l.journal_entry_id and e.company_id=l.company_id join public.accounting_accounts a on a.id=l.account_id and a.company_id=l.company_id left join public.obras o on o.id=l.obra_id left join public.maquinarias m on m.id=l.maquinaria_id
  where l.company_id=private.accounting_require('accounting.view') and e.status in ('posted','reversed') and e.entry_date between p_from and p_to and (p_obra_id is null or l.obra_id=p_obra_id) and (p_maquinaria_id is null or l.maquinaria_id=p_maquinaria_id)
  group by 1,a.code,a.name,a.account_type,l.obra_id,o.nombre,l.maquinaria_id,coalesce(m.codigo,m.nombre) order by 1,a.code,o.nombre,coalesce(m.codigo,m.nombre);
$$;

do $$ declare f record; begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='api' and p.proname in ('create_expense_accounting_draft','create_maintenance_accounting_draft','create_fuel_batch_accounting_draft','post_payroll_accounting','post_certificate_accounting','record_treasury_transfer','accounting_dimension_report') loop
  execute format('alter function %s owner to postgres',f.signature); execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature); execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end $$;

-- CALAMINA ERP v2 - scoped accounting summaries, ledgers, current accounts and VAT.

create or replace view public.contab_pagos with (security_invoker=true) as
select t.id,null::uuid as comprobante_id,t.party_id as tercero_id,(t.transaction_type='receipt') as es_cobro,t.transaction_date as fecha,
case when ta.account_type='cash' then 'efectivo' else 'transferencia' end as medio,t.amount as monto,ta.ledger_account_id as cuenta_id,t.reference as referencia,t.notes as observaciones,null::uuid as obra_id,null::uuid as maquinaria_id,t.journal_entry_id as asiento_id,
jsonb_build_object('razon_social',v.razon_social) as tercero,null::jsonb as comprobante
from public.treasury_transactions t join public.treasury_accounts ta on ta.id=t.treasury_account_id join public.contab_terceros v on v.id=t.party_id where t.status='posted';

create or replace view public.contab_asientos with (security_invoker=true) as
select id,number as numero,entry_date as fecha,description as descripcion,origin as origen,total_debit as total_debe,total_credit as total_haber,created_at,status
from public.journal_entries;

create or replace function api.accounting_open_items(p_kind text,p_party_id uuid default null,p_as_of date default current_date)
returns table(document_id uuid,party_id uuid,party_name text,source_type text,source_id uuid,document_kind text,issue_date date,due_date date,original_amount numeric,applied_amount numeric,balance numeric,status text,days_overdue integer)
language sql stable security definer set search_path='' as $$
  with company as (select private.accounting_require('accounting.view') id), docs as (
    select d.id,d.party_id,coalesce(c.nombre,s.nombre,pe.first_name||' '||pe.last_name) party_name,d.source_type,d.source_id,d.balance_kind,d.issue_date,d.due_date,d.functional_amount,d.status,
      coalesce((select sum(a.amount) from public.settlement_allocations a where a.receivable_document_id=d.id and a.reversed_at is null),0)+
      case when d.balance_kind='charge' then coalesce((select sum(a.amount) from public.receivable_credit_allocations a where a.charge_document_id=d.id and a.reversed_at is null),0) else coalesce((select sum(a.amount) from public.receivable_credit_allocations a where a.credit_document_id=d.id and a.reversed_at is null),0) end applied
    from public.receivable_documents d join company co on co.id=d.company_id join public.accounting_parties p on p.id=d.party_id
    left join public.clientes c on c.id=p.client_id left join public.proveedores s on s.id=p.supplier_id left join public.personal pe on pe.id=p.personal_id
    where p_kind='receivable' and d.status<>'reversed' and (p_party_id is null or d.party_id=p_party_id)
    union all
    select d.id,d.party_id,coalesce(c.nombre,s.nombre,pe.first_name||' '||pe.last_name),d.source_type,d.source_id,d.balance_kind,d.issue_date,d.due_date,d.functional_amount,d.status,
      coalesce((select sum(a.amount) from public.settlement_allocations a where a.payable_document_id=d.id and a.reversed_at is null),0)+
      case when d.balance_kind='charge' then coalesce((select sum(a.amount) from public.payable_credit_allocations a where a.charge_document_id=d.id and a.reversed_at is null),0) else coalesce((select sum(a.amount) from public.payable_credit_allocations a where a.credit_document_id=d.id and a.reversed_at is null),0) end
    from public.payable_documents d join company co on co.id=d.company_id join public.accounting_parties p on p.id=d.party_id
    left join public.clientes c on c.id=p.client_id left join public.proveedores s on s.id=p.supplier_id left join public.personal pe on pe.id=p.personal_id
    where p_kind='payable' and d.status<>'reversed' and (p_party_id is null or d.party_id=p_party_id)
  )
  select id,party_id,party_name,source_type,source_id,balance_kind,issue_date,due_date,functional_amount,applied,
    case when balance_kind='credit' then -(functional_amount-applied) else functional_amount-applied end,
    status,case when due_date is not null and due_date<p_as_of and functional_amount>applied then p_as_of-due_date else 0 end
  from docs where functional_amount-applied>0 order by due_date nulls last,issue_date,id
$$;

create or replace function api.accounting_summary(p_from date,p_to date,p_as_of date default current_date) returns jsonb
language sql stable security definer set search_path='' as $$
  with company as (select private.accounting_require('accounting.view') id),
  pnl as (
    select coalesce(sum(case when a.account_type='revenue' then l.credit-l.debit else 0 end),0) income,
      coalesce(sum(case when a.account_type in ('cost','expense') then l.debit-l.credit else 0 end),0) costs
    from public.journal_entry_lines l join public.journal_entries e on e.id=l.journal_entry_id join public.accounting_accounts a on a.id=l.account_id join company c on c.id=l.company_id
    where e.status in ('posted','reversed') and e.entry_date between p_from and p_to
  ), treasury as (
    select coalesce(sum(case when t.account_type='cash' then l.debit-l.credit else 0 end),0) cash,
      coalesce(sum(case when t.account_type='bank' then l.debit-l.credit else 0 end),0) banks
    from public.treasury_accounts t join company c on c.id=t.company_id left join public.journal_entry_lines l on l.account_id=t.ledger_account_id left join public.journal_entries e on e.id=l.journal_entry_id and e.status in ('posted','reversed') and e.entry_date<=p_as_of
  ), ar as (select coalesce(sum(balance),0) total,coalesce(sum(balance) filter(where due_date<p_as_of),0) overdue,coalesce(sum(balance) filter(where due_date between p_as_of and p_as_of+30),0) upcoming from api.accounting_open_items('receivable',null,p_as_of)),
  ap as (select coalesce(sum(balance),0) total,coalesce(sum(balance) filter(where due_date<p_as_of),0) overdue,coalesce(sum(balance) filter(where due_date between p_as_of and p_as_of+30),0) upcoming from api.accounting_open_items('payable',null,p_as_of)),
  vat as (
    select coalesce(sum(case when a.system_key='vat_debit' then l.credit-l.debit else 0 end),0) debit,
      coalesce(sum(case when a.system_key='vat_credit' then l.debit-l.credit else 0 end),0) credit
    from public.journal_entry_lines l join public.journal_entries e on e.id=l.journal_entry_id join public.accounting_accounts a on a.id=l.account_id join company c on c.id=l.company_id
    where e.status in ('posted','reversed') and e.entry_date between p_from and p_to
  )
  select jsonb_build_object('cash',treasury.cash,'banks',treasury.banks,'receivables',ar.total,'payables',ap.total,'vat_debit',vat.debit,'vat_credit',vat.credit,'vat_position',vat.debit-vat.credit,'income',pnl.income,'costs',pnl.costs,'result',pnl.income-pnl.costs,'receivables_upcoming',ar.upcoming,'payables_upcoming',ap.upcoming,'receivables_overdue',ar.overdue,'payables_overdue',ap.overdue)
  from pnl,treasury,ar,ap,vat
$$;

create or replace function api.accounting_trial_balance(p_from date,p_to date)
returns table(account_id uuid,code text,name text,account_type text,total_debit numeric,total_credit numeric,balance numeric)
language sql stable security definer set search_path='' as $$
  select a.id,a.code,a.name,a.account_type,coalesce(sum(l.debit),0),coalesce(sum(l.credit),0),
    case when a.normal_balance='debit' then coalesce(sum(l.debit-l.credit),0) else coalesce(sum(l.credit-l.debit),0) end
  from public.accounting_accounts a left join public.journal_entry_lines l on l.account_id=a.id left join public.journal_entries e on e.id=l.journal_entry_id and e.status in ('posted','reversed') and e.entry_date between p_from and p_to
  where a.company_id=private.accounting_require('accounting.view') group by a.id,a.code,a.name,a.account_type,a.normal_balance having coalesce(sum(l.debit),0)<>0 or coalesce(sum(l.credit),0)<>0 order by a.code
$$;

create or replace function api.accounting_ledger(p_account_id uuid,p_from date,p_to date)
returns table(line_id uuid,entry_id uuid,entry_number bigint,entry_date date,description text,debit numeric,credit numeric,balance numeric,obra_id uuid,maquinaria_id uuid)
language sql stable security definer set search_path='' as $$
  select l.id,e.id,e.number,e.entry_date,coalesce(l.description,e.description),l.debit,l.credit,
    sum(case when a.normal_balance='debit' then l.debit-l.credit else l.credit-l.debit end) over(order by e.entry_date,e.number,l.line_number),l.obra_id,l.maquinaria_id
  from public.journal_entry_lines l join public.journal_entries e on e.id=l.journal_entry_id join public.accounting_accounts a on a.id=l.account_id
  where l.company_id=private.accounting_require('accounting.view') and l.account_id=p_account_id and e.status in ('posted','reversed') and e.entry_date between p_from and p_to order by e.entry_date,e.number,l.line_number
$$;

create or replace function api.accounting_vat_position(p_year integer,p_month integer) returns jsonb
language sql stable security definer set search_path='' as $$
  with bounds as (select make_date(p_year,p_month,1) d1,(make_date(p_year,p_month,1)+interval '1 month')::date d2), sales as (
    select t.tax_rate,sum(case when d.document_kind='credit_note' then -t.taxable_amount else t.taxable_amount end) taxable,sum(case when d.document_kind='credit_note' then -t.amount else t.amount end) tax
    from public.customer_invoice_tax_lines t join public.customer_invoices d on d.id=t.customer_invoice_id,bounds b where d.company_id=private.accounting_require('accounting.view') and d.status in ('posted','reversed') and d.issue_date>=b.d1 and d.issue_date<b.d2 and t.tax_kind='vat' group by t.tax_rate
  ), purchases as (
    select t.tax_rate,sum(case when d.document_kind='credit_note' then -t.taxable_amount else t.taxable_amount end) taxable,sum(case when d.document_kind='credit_note' then -t.amount else t.amount end) tax
    from public.supplier_invoice_tax_lines t join public.supplier_invoices d on d.id=t.supplier_invoice_id,bounds b where d.company_id=private.accounting_require('accounting.view') and d.status in ('posted','reversed') and d.issue_date>=b.d1 and d.issue_date<b.d2 and t.tax_kind='vat' group by t.tax_rate
  ) select jsonb_build_object('sales',coalesce((select jsonb_agg(to_jsonb(s) order by tax_rate) from sales s),'[]'::jsonb),'purchases',coalesce((select jsonb_agg(to_jsonb(p) order by tax_rate) from purchases p),'[]'::jsonb),'vat_debit',coalesce((select sum(tax) from sales),0),'vat_credit',coalesce((select sum(tax) from purchases),0),'position',coalesce((select sum(tax) from sales),0)-coalesce((select sum(tax) from purchases),0))
$$;

create or replace function api.treasury_balances(p_as_of date default current_date)
returns table(account_id uuid,name text,account_type text,bank_name text,account_number text,currency text,is_active boolean,balance numeric)
language sql stable security definer set search_path='' as $$
  select t.id,t.name,t.account_type,t.bank_name,t.account_number,t.currency::text,t.is_active,coalesce(sum(l.debit-l.credit),0)
  from public.treasury_accounts t left join public.journal_entry_lines l on l.account_id=t.ledger_account_id left join public.journal_entries e on e.id=l.journal_entry_id and e.status in ('posted','reversed') and e.entry_date<=p_as_of
  where t.company_id=private.accounting_require('treasury.view') group by t.id order by t.account_type,t.name
$$;

create or replace function api.accounting_party_statement(p_kind text,p_party_id uuid,p_from date,p_to date)
returns table(movement_date date,movement_type text,reference_id uuid,description text,debit numeric,credit numeric,balance numeric)
language sql stable security definer set search_path='' as $$
  with movements as (
    select d.issue_date dt,case when d.balance_kind='credit' then 'credit_note' else 'document' end kind,d.source_id ref,d.source_type descr,
      case when p_kind='receivable' and d.balance_kind='charge' then d.functional_amount when p_kind='payable' and d.balance_kind='credit' then d.functional_amount else 0 end debit,
      case when p_kind='payable' and d.balance_kind='charge' then d.functional_amount when p_kind='receivable' and d.balance_kind='credit' then d.functional_amount else 0 end credit
    from public.receivable_documents d where p_kind='receivable' and d.company_id=private.accounting_require('accounting.view') and d.party_id=p_party_id and d.status<>'reversed'
    union all select d.issue_date,case when d.balance_kind='credit' then 'credit_note' else 'document' end,d.source_id,d.source_type,
      case when d.balance_kind='credit' then d.functional_amount else 0 end,case when d.balance_kind='charge' then d.functional_amount else 0 end from public.payable_documents d where p_kind='payable' and d.company_id=private.accounting_require('accounting.view') and d.party_id=p_party_id and d.status<>'reversed'
    union all select t.transaction_date,t.transaction_type,t.id,coalesce(t.reference,t.transaction_type),case when t.transaction_type='payment' then t.amount else 0 end,case when t.transaction_type='receipt' then t.amount else 0 end from public.treasury_transactions t where t.company_id=private.accounting_require('accounting.view') and t.party_id=p_party_id and t.status='posted' and ((p_kind='receivable' and t.transaction_type='receipt') or (p_kind='payable' and t.transaction_type='payment'))
  ) select dt,kind,ref,descr,debit,credit,sum(debit-credit) over(order by dt,ref) from movements where dt between p_from and p_to order by dt,ref
$$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='api' and p.proname in ('accounting_open_items','accounting_summary','accounting_trial_balance','accounting_ledger','accounting_vat_position','treasury_balances','accounting_party_statement') loop
    execute format('alter function %s owner to postgres',f.signature); execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature); execute format('grant execute on function %s to authenticated',f.signature);
  end loop;
end $$;

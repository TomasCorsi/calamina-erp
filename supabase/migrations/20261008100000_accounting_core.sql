-- CALAMINA ERP v2 - accounting core, receivables/payables and treasury.
-- Forward-only. The legacy contab_* schema is not authoritative.

insert into iam.permissions (id, key, description) values
  ('20000000-0000-4000-8000-000000000042', 'accounting.view', 'Consultar contabilidad de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000043', 'accounting.manage', 'Administrar borradores, cuentas y documentos contables.'),
  ('20000000-0000-4000-8000-000000000044', 'accounting.post', 'Confirmar, revertir y cerrar periodos contables.'),
  ('20000000-0000-4000-8000-000000000045', 'treasury.view', 'Consultar caja, bancos, pagos y cobranzas.'),
  ('20000000-0000-4000-8000-000000000046', 'treasury.manage', 'Registrar y revertir movimientos de tesoreria.');

insert into iam.role_permissions (role_id, permission_id)
select '10000000-0000-4000-8000-000000000001'::uuid, id
from iam.permissions where key in ('accounting.view','accounting.manage','accounting.post','treasury.view','treasury.manage');

alter table public.company_settings
  add column fiscal_condition text not null default 'RI',
  add column gross_income_number text,
  add column activity_started_on date,
  add column fiscal_address text,
  add column city text,
  add column province text,
  add column postal_code text,
  add column phone text,
  add column email extensions.citext,
  add column invoice_footer text,
  add constraint company_settings_fiscal_condition_check check (fiscal_condition in ('RI','MT','EX','CF','NR'));

create table public.accounting_accounts (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  code text not null,
  name text not null,
  account_type text not null,
  normal_balance text not null,
  parent_id uuid,
  is_postable boolean not null default true,
  is_active boolean not null default true,
  is_system boolean not null default false,
  requires_work boolean not null default false,
  system_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounting_accounts_company_id_id_key unique(company_id,id),
  constraint accounting_accounts_parent_fkey foreign key(company_id,parent_id) references public.accounting_accounts(company_id,id) on delete restrict,
  constraint accounting_accounts_code_key unique(company_id,code),
  constraint accounting_accounts_type_check check(account_type in ('asset','liability','equity','revenue','cost','expense')),
  constraint accounting_accounts_balance_check check(normal_balance in ('debit','credit')),
  constraint accounting_accounts_text_check check(code=btrim(code) and code<>'' and name=btrim(name) and name<>'')
);

create table public.accounting_periods (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  year integer not null,
  month integer not null,
  status text not null default 'open',
  closed_at timestamptz,
  closed_by uuid references auth.users(id) on delete set null,
  reopened_at timestamptz,
  reopened_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint accounting_periods_key unique(company_id,year,month),
  constraint accounting_periods_range_check check(year between 2000 and 2200 and month between 1 and 12),
  constraint accounting_periods_status_check check(status in ('open','closed')),
  constraint accounting_periods_state_check check((status='open' and closed_at is null) or (status='closed' and closed_at is not null))
);

create table public.journal_sequences (
  company_id uuid not null references public.companies(id) on delete restrict,
  year integer not null,
  last_number bigint not null default 0 check(last_number>=0),
  primary key(company_id,year)
);

create table public.accounting_parties (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  party_type text not null,
  client_id uuid,
  supplier_id uuid,
  personal_id uuid,
  tax_condition text not null default 'RI',
  bank_name text,
  bank_account_number text,
  cbu text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounting_parties_company_id_id_key unique(company_id,id),
  constraint accounting_parties_client_fkey foreign key(company_id,client_id) references public.clientes(company_id,id) on delete restrict,
  constraint accounting_parties_supplier_fkey foreign key(company_id,supplier_id) references public.proveedores(company_id,id) on delete restrict,
  constraint accounting_parties_personal_fkey foreign key(company_id,personal_id) references public.personal(company_id,id) on delete restrict,
  constraint accounting_parties_kind_check check(party_type in ('customer','supplier','personnel')),
  constraint accounting_parties_target_check check(num_nonnulls(client_id,supplier_id,personal_id)=1),
  constraint accounting_parties_target_kind_check check(
    (party_type='customer' and client_id is not null) or
    (party_type='supplier' and supplier_id is not null) or
    (party_type='personnel' and personal_id is not null)
  ),
  constraint accounting_parties_tax_condition_check check(tax_condition in ('RI','MT','EX','CF','NR')),
  constraint accounting_parties_client_key unique(company_id,client_id),
  constraint accounting_parties_supplier_key unique(company_id,supplier_id),
  constraint accounting_parties_personal_key unique(company_id,personal_id)
);

create table public.journal_entries (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  entry_date date not null,
  fiscal_year integer generated always as (extract(year from entry_date)::integer) stored,
  number bigint,
  description text not null,
  origin text not null default 'manual',
  reference_type text,
  reference_id uuid,
  source_event text,
  status text not null default 'draft',
  functional_currency char(3) not null default 'ARS',
  source_currency char(3) not null default 'ARS',
  source_amount numeric(18,2),
  exchange_rate numeric(18,8) not null default 1,
  total_debit numeric(18,2) not null default 0,
  total_credit numeric(18,2) not null default 0,
  idempotency_key uuid,
  payload_hash text,
  reversal_of_entry_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  posted_by uuid references auth.users(id) on delete set null,
  reversed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  posted_at timestamptz,
  reversed_at timestamptz,
  constraint journal_entries_company_id_id_key unique(company_id,id),
  constraint journal_entries_reversal_fkey foreign key(company_id,reversal_of_entry_id) references public.journal_entries(company_id,id) on delete restrict,
  constraint journal_entries_status_check check(status in ('draft','posted','reversed')),
  constraint journal_entries_currency_check check(functional_currency='ARS' and source_currency ~ '^[A-Z]{3}$'),
  constraint journal_entries_amounts_check check(exchange_rate>0 and total_debit>=0 and total_credit>=0),
  constraint journal_entries_posted_state_check check(
    (status='draft' and number is null and posted_at is null) or
    (status in ('posted','reversed') and number is not null and posted_at is not null)
  )
);

create table public.journal_entry_lines (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null,
  journal_entry_id uuid not null,
  line_number integer not null,
  account_id uuid not null,
  description text,
  debit numeric(18,2) not null default 0,
  credit numeric(18,2) not null default 0,
  obra_id uuid,
  maquinaria_id uuid,
  party_id uuid,
  created_at timestamptz not null default now(),
  constraint journal_entry_lines_entry_fkey foreign key(company_id,journal_entry_id) references public.journal_entries(company_id,id) on delete cascade,
  constraint journal_entry_lines_account_fkey foreign key(company_id,account_id) references public.accounting_accounts(company_id,id) on delete restrict,
  constraint journal_entry_lines_obra_fkey foreign key(company_id,obra_id) references public.obras(company_id,id) on delete restrict,
  constraint journal_entry_lines_maquinaria_fkey foreign key(company_id,maquinaria_id) references public.maquinarias(company_id,id) on delete restrict,
  constraint journal_entry_lines_party_fkey foreign key(company_id,party_id) references public.accounting_parties(company_id,id) on delete restrict,
  constraint journal_entry_lines_order_key unique(journal_entry_id,line_number),
  constraint journal_entry_lines_amount_check check((debit>0 and credit=0) or (credit>0 and debit=0)),
  constraint journal_entry_lines_number_check check(line_number>0)
);

create unique index accounting_accounts_system_key on public.accounting_accounts(company_id,system_key) where system_key is not null;
create unique index journal_entries_number_key on public.journal_entries(company_id,fiscal_year,number) where number is not null;
create unique index journal_entries_idempotency_key on public.journal_entries(company_id,idempotency_key) where idempotency_key is not null;
create unique index journal_entries_source_event_key on public.journal_entries(company_id,reference_type,reference_id,source_event) where reference_type is not null and reference_id is not null and source_event is not null;
create unique index journal_entries_reversal_key on public.journal_entries(company_id,reversal_of_entry_id) where reversal_of_entry_id is not null;
create index journal_entries_company_date_idx on public.journal_entries(company_id,entry_date desc,id) where status='posted';
create index journal_entry_lines_work_machine_idx on public.journal_entry_lines(company_id,obra_id,maquinaria_id) where obra_id is not null;
create index journal_entry_lines_machine_idx on public.journal_entry_lines(company_id,maquinaria_id) where maquinaria_id is not null;
create index journal_entry_lines_account_idx on public.journal_entry_lines(company_id,account_id,journal_entry_id);

-- Commercial accounting documents. Purchase orders remain non-accounting documents.
create table public.supplier_invoices (
  id uuid primary key default extensions.gen_random_uuid(), company_id uuid not null references public.companies(id) on delete restrict,
  supplier_id uuid not null, purchase_order_id uuid, document_type text not null, document_letter text,
  point_of_sale integer not null default 1, document_number bigint not null, issue_date date not null, due_date date,
  currency char(3) not null default 'ARS', exchange_rate numeric(18,8) not null default 1, obra_id uuid, maquinaria_id uuid,
  net_amount numeric(18,2) not null default 0, tax_amount numeric(18,2) not null default 0,
  other_tax_amount numeric(18,2) not null default 0, total_amount numeric(18,2) not null,
  status text not null default 'draft', notes text, journal_entry_id uuid,
  created_by uuid references auth.users(id) on delete set null, confirmed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), confirmed_at timestamptz,
  constraint supplier_invoices_company_id_id_key unique(company_id,id),
  constraint supplier_invoices_supplier_fkey foreign key(company_id,supplier_id) references public.proveedores(company_id,id) on delete restrict,
  constraint supplier_invoices_order_fkey foreign key(company_id,purchase_order_id) references public.ordenes_compra(company_id,id) on delete restrict,
  constraint supplier_invoices_obra_fkey foreign key(company_id,obra_id) references public.obras(company_id,id) on delete restrict,
  constraint supplier_invoices_machine_fkey foreign key(company_id,maquinaria_id) references public.maquinarias(company_id,id) on delete restrict,
  constraint supplier_invoices_entry_fkey foreign key(company_id,journal_entry_id) references public.journal_entries(company_id,id) on delete restrict,
  constraint supplier_invoices_number_key unique(company_id,supplier_id,document_type,document_letter,point_of_sale,document_number),
  constraint supplier_invoices_status_check check(status in ('draft','posted','reversed')),
  constraint supplier_invoices_amount_check check(point_of_sale>=0 and document_number>=0 and exchange_rate>0 and net_amount>=0 and tax_amount>=0 and other_tax_amount>=0 and total_amount>0)
);

create table public.supplier_invoice_lines (
  id uuid primary key default extensions.gen_random_uuid(), company_id uuid not null, supplier_invoice_id uuid not null,
  line_number integer not null, account_id uuid not null, description text not null,
  quantity numeric(18,3) not null default 1, unit_price numeric(18,2) not null, net_amount numeric(18,2) not null,
  tax_rate numeric(7,4) not null default 21, tax_amount numeric(18,2) not null default 0,
  obra_id uuid, maquinaria_id uuid,
  constraint supplier_invoice_lines_header_fkey foreign key(company_id,supplier_invoice_id) references public.supplier_invoices(company_id,id) on delete cascade,
  constraint supplier_invoice_lines_account_fkey foreign key(company_id,account_id) references public.accounting_accounts(company_id,id) on delete restrict,
  constraint supplier_invoice_lines_obra_fkey foreign key(company_id,obra_id) references public.obras(company_id,id) on delete restrict,
  constraint supplier_invoice_lines_machine_fkey foreign key(company_id,maquinaria_id) references public.maquinarias(company_id,id) on delete restrict,
  constraint supplier_invoice_lines_order_key unique(supplier_invoice_id,line_number),
  constraint supplier_invoice_lines_amount_check check(line_number>0 and quantity>0 and unit_price>=0 and net_amount>=0 and tax_rate>=0 and tax_amount>=0)
);

create table public.supplier_invoice_tax_lines (
  id uuid primary key default extensions.gen_random_uuid(), company_id uuid not null, supplier_invoice_id uuid not null,
  tax_kind text not null, tax_rate numeric(7,4), taxable_amount numeric(18,2) not null default 0, amount numeric(18,2) not null,
  constraint supplier_invoice_tax_header_fkey foreign key(company_id,supplier_invoice_id) references public.supplier_invoices(company_id,id) on delete cascade,
  constraint supplier_invoice_tax_kind_check check(tax_kind in ('vat','vat_perception','gross_income_perception','other')),
  constraint supplier_invoice_tax_amount_check check(taxable_amount>=0 and amount>=0)
);

create table public.customer_invoices (
  id uuid primary key default extensions.gen_random_uuid(), company_id uuid not null references public.companies(id) on delete restrict,
  client_id uuid not null, certificate_id uuid, document_type text not null, document_letter text,
  point_of_sale integer not null default 1, document_number bigint not null, issue_date date not null, due_date date,
  currency char(3) not null default 'ARS', exchange_rate numeric(18,8) not null default 1, obra_id uuid, maquinaria_id uuid,
  net_amount numeric(18,2) not null default 0, tax_amount numeric(18,2) not null default 0,
  other_tax_amount numeric(18,2) not null default 0, total_amount numeric(18,2) not null,
  status text not null default 'draft', notes text, journal_entry_id uuid,
  created_by uuid references auth.users(id) on delete set null, confirmed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), confirmed_at timestamptz,
  constraint customer_invoices_company_id_id_key unique(company_id,id),
  constraint customer_invoices_client_fkey foreign key(company_id,client_id) references public.clientes(company_id,id) on delete restrict,
  constraint customer_invoices_certificate_fkey foreign key(company_id,certificate_id) references public.certificados(company_id,id) on delete restrict,
  constraint customer_invoices_obra_fkey foreign key(company_id,obra_id) references public.obras(company_id,id) on delete restrict,
  constraint customer_invoices_machine_fkey foreign key(company_id,maquinaria_id) references public.maquinarias(company_id,id) on delete restrict,
  constraint customer_invoices_entry_fkey foreign key(company_id,journal_entry_id) references public.journal_entries(company_id,id) on delete restrict,
  constraint customer_invoices_number_key unique(company_id,client_id,document_type,document_letter,point_of_sale,document_number),
  constraint customer_invoices_status_check check(status in ('draft','posted','reversed')),
  constraint customer_invoices_amount_check check(point_of_sale>=0 and document_number>=0 and exchange_rate>0 and net_amount>=0 and tax_amount>=0 and other_tax_amount>=0 and total_amount>0)
);

create table public.customer_invoice_lines (
  id uuid primary key default extensions.gen_random_uuid(), company_id uuid not null, customer_invoice_id uuid not null,
  line_number integer not null, account_id uuid not null, description text not null,
  quantity numeric(18,3) not null default 1, unit_price numeric(18,2) not null, net_amount numeric(18,2) not null,
  tax_rate numeric(7,4) not null default 21, tax_amount numeric(18,2) not null default 0,
  obra_id uuid, maquinaria_id uuid,
  constraint customer_invoice_lines_header_fkey foreign key(company_id,customer_invoice_id) references public.customer_invoices(company_id,id) on delete cascade,
  constraint customer_invoice_lines_account_fkey foreign key(company_id,account_id) references public.accounting_accounts(company_id,id) on delete restrict,
  constraint customer_invoice_lines_obra_fkey foreign key(company_id,obra_id) references public.obras(company_id,id) on delete restrict,
  constraint customer_invoice_lines_machine_fkey foreign key(company_id,maquinaria_id) references public.maquinarias(company_id,id) on delete restrict,
  constraint customer_invoice_lines_order_key unique(customer_invoice_id,line_number),
  constraint customer_invoice_lines_amount_check check(line_number>0 and quantity>0 and unit_price>=0 and net_amount>=0 and tax_rate>=0 and tax_amount>=0)
);

create table public.customer_invoice_tax_lines (
  id uuid primary key default extensions.gen_random_uuid(), company_id uuid not null, customer_invoice_id uuid not null,
  tax_kind text not null, tax_rate numeric(7,4), taxable_amount numeric(18,2) not null default 0, amount numeric(18,2) not null,
  constraint customer_invoice_tax_header_fkey foreign key(company_id,customer_invoice_id) references public.customer_invoices(company_id,id) on delete cascade,
  constraint customer_invoice_tax_kind_check check(tax_kind in ('vat','vat_perception','gross_income_perception','other')),
  constraint customer_invoice_tax_amount_check check(taxable_amount>=0 and amount>=0)
);

create table public.payable_documents (
  id uuid primary key default extensions.gen_random_uuid(), company_id uuid not null, party_id uuid not null,
  source_type text not null, source_id uuid not null, issue_date date not null, due_date date,
  currency char(3) not null default 'ARS', original_amount numeric(18,2) not null, functional_amount numeric(18,2) not null,
  journal_entry_id uuid not null, status text not null default 'open', created_at timestamptz not null default now(),
  constraint payable_documents_company_id_id_key unique(company_id,id),
  constraint payable_documents_party_fkey foreign key(company_id,party_id) references public.accounting_parties(company_id,id) on delete restrict,
  constraint payable_documents_entry_fkey foreign key(company_id,journal_entry_id) references public.journal_entries(company_id,id) on delete restrict,
  constraint payable_documents_source_key unique(company_id,source_type,source_id),
  constraint payable_documents_amount_check check(original_amount>0 and functional_amount>0),
  constraint payable_documents_status_check check(status in ('open','partial','paid','reversed'))
);

create table public.receivable_documents (
  id uuid primary key default extensions.gen_random_uuid(), company_id uuid not null, party_id uuid not null,
  source_type text not null, source_id uuid not null, issue_date date not null, due_date date,
  currency char(3) not null default 'ARS', original_amount numeric(18,2) not null, functional_amount numeric(18,2) not null,
  journal_entry_id uuid not null, status text not null default 'open', created_at timestamptz not null default now(),
  constraint receivable_documents_company_id_id_key unique(company_id,id),
  constraint receivable_documents_party_fkey foreign key(company_id,party_id) references public.accounting_parties(company_id,id) on delete restrict,
  constraint receivable_documents_entry_fkey foreign key(company_id,journal_entry_id) references public.journal_entries(company_id,id) on delete restrict,
  constraint receivable_documents_source_key unique(company_id,source_type,source_id),
  constraint receivable_documents_amount_check check(original_amount>0 and functional_amount>0),
  constraint receivable_documents_status_check check(status in ('open','partial','paid','reversed'))
);

create table public.treasury_accounts (
  id uuid primary key default extensions.gen_random_uuid(), company_id uuid not null, ledger_account_id uuid not null,
  account_type text not null, name text not null, bank_name text, account_number text, currency char(3) not null default 'ARS',
  is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint treasury_accounts_company_id_id_key unique(company_id,id),
  constraint treasury_accounts_ledger_fkey foreign key(company_id,ledger_account_id) references public.accounting_accounts(company_id,id) on delete restrict,
  constraint treasury_accounts_ledger_key unique(company_id,ledger_account_id),
  constraint treasury_accounts_type_check check(account_type in ('cash','bank'))
);

create table public.treasury_transactions (
  id uuid primary key default extensions.gen_random_uuid(), company_id uuid not null, transaction_type text not null,
  transaction_date date not null, treasury_account_id uuid not null, destination_account_id uuid,
  party_id uuid, amount numeric(18,2) not null, currency char(3) not null default 'ARS', exchange_rate numeric(18,8) not null default 1,
  reference text, notes text, journal_entry_id uuid not null, status text not null default 'posted', idempotency_key uuid not null,
  created_by uuid references auth.users(id) on delete set null, reversed_at timestamptz, reversed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint treasury_transactions_company_id_id_key unique(company_id,id),
  constraint treasury_transactions_account_fkey foreign key(company_id,treasury_account_id) references public.treasury_accounts(company_id,id) on delete restrict,
  constraint treasury_transactions_destination_fkey foreign key(company_id,destination_account_id) references public.treasury_accounts(company_id,id) on delete restrict,
  constraint treasury_transactions_party_fkey foreign key(company_id,party_id) references public.accounting_parties(company_id,id) on delete restrict,
  constraint treasury_transactions_entry_fkey foreign key(company_id,journal_entry_id) references public.journal_entries(company_id,id) on delete restrict,
  constraint treasury_transactions_idempotency_key unique(company_id,idempotency_key),
  constraint treasury_transactions_type_check check(transaction_type in ('payment','receipt','transfer')),
  constraint treasury_transactions_status_check check(status in ('posted','reversed')),
  constraint treasury_transactions_amount_check check(amount>0 and exchange_rate>0),
  constraint treasury_transactions_transfer_check check((transaction_type='transfer' and destination_account_id is not null and destination_account_id<>treasury_account_id) or (transaction_type<>'transfer' and destination_account_id is null))
);

create table public.settlement_allocations (
  id uuid primary key default extensions.gen_random_uuid(), company_id uuid not null, treasury_transaction_id uuid not null,
  payable_document_id uuid, receivable_document_id uuid, amount numeric(18,2) not null, reversed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint settlement_allocations_transaction_fkey foreign key(company_id,treasury_transaction_id) references public.treasury_transactions(company_id,id) on delete restrict,
  constraint settlement_allocations_payable_fkey foreign key(company_id,payable_document_id) references public.payable_documents(company_id,id) on delete restrict,
  constraint settlement_allocations_receivable_fkey foreign key(company_id,receivable_document_id) references public.receivable_documents(company_id,id) on delete restrict,
  constraint settlement_allocations_document_check check(num_nonnulls(payable_document_id,receivable_document_id)=1),
  constraint settlement_allocations_amount_check check(amount>0),
  constraint settlement_allocations_unique_payable unique(treasury_transaction_id,payable_document_id),
  constraint settlement_allocations_unique_receivable unique(treasury_transaction_id,receivable_document_id)
);

create index payable_documents_company_due_idx on public.payable_documents(company_id,status,due_date);
create index receivable_documents_company_due_idx on public.receivable_documents(company_id,status,due_date);
create index treasury_transactions_company_date_idx on public.treasury_transactions(company_id,transaction_date desc);

do $$ declare t text; begin
  foreach t in array array['accounting_accounts','accounting_periods','journal_sequences','accounting_parties','journal_entries','journal_entry_lines','supplier_invoices','supplier_invoice_lines','supplier_invoice_tax_lines','customer_invoices','customer_invoice_lines','customer_invoice_tax_lines','payable_documents','receivable_documents','treasury_accounts','treasury_transactions','settlement_allocations'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated,service_role',t);
  end loop;
end $$;

-- Read-only API access; every financial write is an RPC.
do $$ declare t text; begin
  foreach t in array array['accounting_accounts','accounting_periods','accounting_parties','journal_entries','journal_entry_lines','supplier_invoices','supplier_invoice_lines','supplier_invoice_tax_lines','customer_invoices','customer_invoice_lines','customer_invoice_tax_lines','payable_documents','receivable_documents'] loop
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy %I on public.%I for select to authenticated using (company_id=(select private.current_company_id()) and (select private.has_permission(''accounting.view'')))',t||'_accounting_read',t);
  end loop;
  foreach t in array array['treasury_accounts','treasury_transactions','settlement_allocations'] loop
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy %I on public.%I for select to authenticated using (company_id=(select private.current_company_id()) and ((select private.has_permission(''treasury.view'')) or (select private.has_permission(''accounting.view''))))',t||'_treasury_read',t);
  end loop;
end $$;

create or replace function private.accounting_validate_line() returns trigger language plpgsql security definer set search_path='' as $$
declare v_postable boolean; v_active boolean; v_requires_work boolean; v_status text;
begin
  select is_postable,is_active,requires_work into v_postable,v_active,v_requires_work
  from public.accounting_accounts where company_id=new.company_id and id=new.account_id;
  if not coalesce(v_postable,false) or not coalesce(v_active,false) then raise exception 'account is not active and postable' using errcode='23514'; end if;
  if v_requires_work and new.obra_id is null then raise exception 'work dimension is required for this account' using errcode='23514'; end if;
  select status into v_status from public.journal_entries where company_id=new.company_id and id=new.journal_entry_id;
  if v_status<>'draft' then raise exception 'posted journal lines are immutable' using errcode='55000'; end if;
  return new;
end $$;

create or replace function private.accounting_protect_line() returns trigger language plpgsql security definer set search_path='' as $$
declare v_status text;
begin
  select status into v_status from public.journal_entries where company_id=old.company_id and id=old.journal_entry_id;
  if v_status<>'draft' then raise exception 'posted journal lines are immutable' using errcode='55000'; end if;
  return old;
end $$;

create or replace function private.accounting_protect_entry() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' and old.status<>'draft' then raise exception 'posted journal entries are immutable' using errcode='55000'; end if;
  if tg_op='UPDATE' and old.status in ('posted','reversed') then
    if not (old.status='posted' and new.status='reversed' and new.reversed_at is not null and new.reversed_by is not null) then
      raise exception 'posted journal entries are immutable' using errcode='55000';
    end if;
  end if;
  return case when tg_op='DELETE' then old else new end;
end $$;

create trigger accounting_accounts_updated before update on public.accounting_accounts for each row execute function private.set_updated_at();
create trigger accounting_parties_updated before update on public.accounting_parties for each row execute function private.set_updated_at();
create trigger journal_entries_updated before update on public.journal_entries for each row execute function private.set_updated_at();
create trigger journal_entries_protect before update or delete on public.journal_entries for each row execute function private.accounting_protect_entry();
create trigger journal_lines_validate before insert or update on public.journal_entry_lines for each row execute function private.accounting_validate_line();
create trigger journal_lines_protect before delete on public.journal_entry_lines for each row execute function private.accounting_protect_line();

create or replace function api.save_journal_draft(p_entry jsonb,p_lines jsonb,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.current_company_id(); v_id uuid:=nullif(p_entry->>'id','')::uuid; v_line jsonb; v_n integer:=0; v_hash text:=encode(extensions.digest((p_entry::text||p_lines::text)::bytea,'sha256'),'hex'); v_existing_hash text;
begin
  if (select auth.uid()) is null or not private.has_permission('accounting.manage') then raise exception 'not authorized' using errcode='42501'; end if;
  if v_company is null then raise exception 'active membership required' using errcode='42501'; end if;
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)<2 then raise exception 'at least two journal lines are required' using errcode='23514'; end if;
  if v_id is null then
    select id,payload_hash into v_id,v_existing_hash from public.journal_entries where company_id=v_company and idempotency_key=p_request_id;
    if v_id is not null then
      if v_existing_hash<>v_hash then raise exception 'idempotency key was already used with a different payload' using errcode='23505'; end if;
      return v_id;
    end if;
  end if;
  if v_id is null then
    insert into public.journal_entries(company_id,entry_date,description,origin,reference_type,reference_id,source_event,source_currency,source_amount,exchange_rate,idempotency_key,payload_hash,created_by)
    values(v_company,(p_entry->>'entry_date')::date,btrim(p_entry->>'description'),coalesce(nullif(p_entry->>'origin',''),'manual'),nullif(p_entry->>'reference_type',''),nullif(p_entry->>'reference_id','')::uuid,nullif(p_entry->>'source_event',''),coalesce(nullif(p_entry->>'source_currency',''),'ARS'),nullif(p_entry->>'source_amount','')::numeric,coalesce(nullif(p_entry->>'exchange_rate','')::numeric,1),p_request_id,v_hash,(select auth.uid())) returning id into v_id;
  else
    update public.journal_entries set entry_date=(p_entry->>'entry_date')::date,description=btrim(p_entry->>'description'),source_currency=coalesce(nullif(p_entry->>'source_currency',''),'ARS'),source_amount=nullif(p_entry->>'source_amount','')::numeric,exchange_rate=coalesce(nullif(p_entry->>'exchange_rate','')::numeric,1),payload_hash=encode(extensions.digest((p_entry::text||p_lines::text)::bytea,'sha256'),'hex') where id=v_id and company_id=v_company and status='draft';
    if not found then raise exception 'draft not found or immutable' using errcode='P0002'; end if;
    delete from public.journal_entry_lines where journal_entry_id=v_id;
  end if;
  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_n:=v_n+1;
    insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,obra_id,maquinaria_id,party_id)
    values(v_company,v_id,v_n,(v_line->>'account_id')::uuid,nullif(v_line->>'description',''),coalesce(nullif(v_line->>'debit','')::numeric,0),coalesce(nullif(v_line->>'credit','')::numeric,0),nullif(v_line->>'obra_id','')::uuid,nullif(v_line->>'maquinaria_id','')::uuid,nullif(v_line->>'party_id','')::uuid);
  end loop;
  perform private.write_audit('user','accounting.journal_draft_saved','journal_entry',v_id,null,jsonb_build_object('status','draft'),p_request_id,'{}'::jsonb,(select auth.uid()));
  return v_id;
end $$;

create or replace function api.post_journal_entry(p_entry_id uuid,p_request_id uuid default extensions.gen_random_uuid()) returns bigint
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.current_company_id(); v_entry public.journal_entries%rowtype; v_debit numeric(18,2); v_credit numeric(18,2); v_count integer; v_number bigint;
begin
  if (select auth.uid()) is null or not private.has_permission('accounting.post') then raise exception 'not authorized' using errcode='42501'; end if;
  select * into v_entry from public.journal_entries where id=p_entry_id and company_id=v_company for update;
  if not found then raise exception 'journal entry not found' using errcode='P0002'; end if;
  if v_entry.status='posted' then return v_entry.number; end if;
  if v_entry.status<>'draft' then raise exception 'journal entry is not a draft' using errcode='55000'; end if;
  if exists(select 1 from public.accounting_periods where company_id=v_company and year=extract(year from v_entry.entry_date)::int and month=extract(month from v_entry.entry_date)::int and status='closed') then raise exception 'accounting period is closed' using errcode='55000'; end if;
  select count(*),coalesce(sum(debit),0),coalesce(sum(credit),0) into v_count,v_debit,v_credit from public.journal_entry_lines where journal_entry_id=p_entry_id;
  if v_count<2 or v_debit<=0 or v_debit<>v_credit then raise exception 'journal entry must contain at least two balanced lines' using errcode='23514'; end if;
  insert into public.journal_sequences(company_id,year,last_number) values(v_company,v_entry.fiscal_year,1)
  on conflict(company_id,year) do update set last_number=public.journal_sequences.last_number+1 returning last_number into v_number;
  update public.journal_entries set status='posted',number=v_number,total_debit=v_debit,total_credit=v_credit,posted_at=now(),posted_by=(select auth.uid()) where id=p_entry_id;
  perform private.write_audit('user','accounting.journal_posted','journal_entry',p_entry_id,jsonb_build_object('status','draft'),jsonb_build_object('status','posted','number',v_number),p_request_id,'{}'::jsonb,(select auth.uid()));
  return v_number;
end $$;

create or replace function api.reverse_journal_entry(p_entry_id uuid,p_reason text,p_request_id uuid default extensions.gen_random_uuid()) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.current_company_id(); v_original public.journal_entries%rowtype; v_reversal uuid; v_number bigint;
begin
  if (select auth.uid()) is null or not private.has_permission('accounting.post') then raise exception 'not authorized' using errcode='42501'; end if;
  select id into v_reversal from public.journal_entries where company_id=v_company and reversal_of_entry_id=p_entry_id;
  if v_reversal is not null then return v_reversal; end if;
  select * into v_original from public.journal_entries where id=p_entry_id and company_id=v_company for update;
  if v_original.status<>'posted' then raise exception 'only posted entries can be reversed' using errcode='55000'; end if;
  if exists(select 1 from public.accounting_periods where company_id=v_company and year=extract(year from current_date)::int and month=extract(month from current_date)::int and status='closed') then raise exception 'current accounting period is closed' using errcode='55000'; end if;
  insert into public.journal_entries(company_id,entry_date,description,origin,reference_type,reference_id,source_event,source_currency,source_amount,exchange_rate,idempotency_key,payload_hash,reversal_of_entry_id,created_by)
  values(v_company,current_date,'Reversion: '||btrim(p_reason),'reversal','journal_entry',p_entry_id,'reversed',v_original.source_currency,v_original.source_amount,v_original.exchange_rate,p_request_id,encode(extensions.digest((p_entry_id::text||p_reason)::bytea,'sha256'),'hex'),p_entry_id,(select auth.uid())) returning id into v_reversal;
  insert into public.journal_entry_lines(company_id,journal_entry_id,line_number,account_id,description,debit,credit,obra_id,maquinaria_id,party_id)
  select company_id,v_reversal,line_number,account_id,coalesce(description,'')||' (reversion)',credit,debit,obra_id,maquinaria_id,party_id from public.journal_entry_lines where journal_entry_id=p_entry_id order by line_number;
  v_number:=api.post_journal_entry(v_reversal,p_request_id);
  update public.journal_entries set status='reversed',reversed_at=now(),reversed_by=(select auth.uid()) where id=p_entry_id;
  perform private.write_audit('user','accounting.journal_reversed','journal_entry',p_entry_id,jsonb_build_object('status','posted'),jsonb_build_object('status','reversed','reversal_entry_id',v_reversal),p_request_id,jsonb_build_object('reason',btrim(p_reason)),(select auth.uid()));
  return v_reversal;
end $$;

create or replace function api.set_accounting_period(p_year integer,p_month integer,p_status text,p_request_id uuid default extensions.gen_random_uuid()) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_company uuid:=private.current_company_id();
begin
  if (select auth.uid()) is null or not private.has_permission('accounting.post') then raise exception 'not authorized' using errcode='42501'; end if;
  if p_year not between 2000 and 2200 or p_month not between 1 and 12 or p_status not in ('open','closed') then raise exception 'invalid accounting period' using errcode='22023'; end if;
  insert into public.accounting_periods(company_id,year,month,status,closed_at,closed_by,reopened_at,reopened_by)
  values(v_company,p_year,p_month,p_status,case when p_status='closed' then now() end,case when p_status='closed' then (select auth.uid()) end,case when p_status='open' then now() end,case when p_status='open' then (select auth.uid()) end)
  on conflict(company_id,year,month) do update set status=excluded.status,closed_at=excluded.closed_at,closed_by=excluded.closed_by,reopened_at=excluded.reopened_at,reopened_by=excluded.reopened_by;
  perform private.write_audit('user','accounting.period_'||p_status,'accounting_period',null,null,jsonb_build_object('year',p_year,'month',p_month,'status',p_status),p_request_id,'{}'::jsonb,(select auth.uid()));
  return true;
end $$;

do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='api' and p.proname in ('save_journal_draft','post_journal_entry','reverse_journal_entry','set_accounting_period') loop
    execute format('alter function %s owner to postgres',f.signature);
    execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
    execute format('grant execute on function %s to authenticated',f.signature);
  end loop;
end $$;

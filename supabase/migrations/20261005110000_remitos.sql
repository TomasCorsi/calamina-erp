-- CALAMINA ERP v2 - Remitos core with the legacy presentation contract.

insert into iam.permissions (id, key, description)
values
  ('20000000-0000-4000-8000-000000000010', 'remitos.view', 'Consultar remitos y sus items dentro de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000011', 'remitos.manage', 'Crear, modificar y eliminar remitos dentro de la empresa activa.');

insert into iam.role_permissions (role_id, permission_id)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000010'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000011');

create table public.remitos (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null,
  numero text not null,
  fecha date not null,
  obra_id uuid,
  maquinaria_id uuid,
  material text not null default '-',
  cantidad numeric(14, 2) not null default 0,
  unidad text not null default 'M3',
  recibido_por text not null default '-',
  firmado boolean not null default false,
  evidencia_url text,
  observaciones text,
  row_color text,
  proveedor text,
  cliente text,
  cliente_destino text,
  cliente_cantera text,
  remito_tercero text,
  remito_local text,
  desde text,
  hasta text,
  cantidad_viajes integer not null default 1,
  tipo_material text,
  precio_total numeric(14, 2) not null default 0,
  tipo_transporte text,
  patente_tercero text,
  cantidad_uni numeric(14, 2),
  precio_unitario numeric(14, 2),
  precio_calc_mode text not null default 'viajes',
  forma_pago text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint remitos_company_fkey foreign key (company_id)
    references public.companies(id) on delete restrict,
  constraint remitos_obra_company_fkey foreign key (company_id, obra_id)
    references public.obras(company_id, id) on delete restrict,
  constraint remitos_maquinaria_company_fkey foreign key (company_id, maquinaria_id)
    references public.maquinarias(company_id, id) on delete restrict,
  constraint remitos_created_by_fkey foreign key (created_by)
    references auth.users(id) on delete set null,
  constraint remitos_company_id_id_key unique (company_id, id),
  constraint remitos_numero_check check (numero = btrim(numero) and char_length(numero) between 1 and 120),
  constraint remitos_material_check check (material = btrim(material) and char_length(material) between 1 and 200),
  constraint remitos_unidad_check check (unidad = btrim(unidad) and char_length(unidad) between 1 and 20),
  constraint remitos_recibido_por_check check (recibido_por = btrim(recibido_por) and char_length(recibido_por) between 1 and 160),
  constraint remitos_cantidades_check check (
    cantidad >= 0 and cantidad_viajes >= 0 and precio_total >= 0
    and (cantidad_uni is null or cantidad_uni >= 0)
    and (precio_unitario is null or precio_unitario >= 0)
  ),
  constraint remitos_precio_calc_mode_check check (precio_calc_mode in ('viajes', 'cantidad', 'fijo')),
  constraint remitos_forma_pago_check check (
    forma_pago is null or forma_pago in ('efectivo', 'transferencia', 'cuenta_corriente')
  ),
  constraint remitos_optional_text_check check (
    (evidencia_url is null or (evidencia_url = btrim(evidencia_url) and evidencia_url <> ''))
    and (observaciones is null or (observaciones = btrim(observaciones) and observaciones <> ''))
    and (proveedor is null or (proveedor = btrim(proveedor) and proveedor <> ''))
    and (cliente is null or (cliente = btrim(cliente) and cliente <> ''))
    and (cliente_destino is null or (cliente_destino = btrim(cliente_destino) and cliente_destino <> ''))
    and (cliente_cantera is null or (cliente_cantera = btrim(cliente_cantera) and cliente_cantera <> ''))
    and (remito_tercero is null or (remito_tercero = btrim(remito_tercero) and remito_tercero <> ''))
    and (remito_local is null or (remito_local = btrim(remito_local) and remito_local <> ''))
    and (desde is null or (desde = btrim(desde) and desde <> ''))
    and (hasta is null or (hasta = btrim(hasta) and hasta <> ''))
    and (tipo_material is null or (tipo_material = btrim(tipo_material) and tipo_material <> ''))
    and (tipo_transporte is null or (tipo_transporte = btrim(tipo_transporte) and tipo_transporte <> ''))
    and (patente_tercero is null or (patente_tercero = upper(btrim(patente_tercero)) and patente_tercero <> ''))
    and (row_color is null or (row_color = btrim(row_color) and row_color <> ''))
  )
);

create unique index remitos_company_numero_key
  on public.remitos (company_id, lower(numero));
create index remitos_company_fecha_idx on public.remitos (company_id, fecha desc, created_at desc);
create index remitos_obra_fecha_idx on public.remitos (obra_id, fecha desc) where obra_id is not null;
create index remitos_maquinaria_idx on public.remitos (maquinaria_id) where maquinaria_id is not null;
create index remitos_created_by_fecha_idx on public.remitos (created_by, fecha desc) where created_by is not null;

alter table public.remitos enable row level security;
revoke all on table public.remitos from public, anon, authenticated, service_role;

create table public.remito_items (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null,
  remito_id uuid not null,
  orden integer not null default 0,
  concepto text not null,
  cantidad numeric(14, 2) not null default 0,
  unidad text not null default 'DIA',
  precio_unitario numeric(14, 2) not null default 0,
  precio_total numeric(14, 2) not null default 0,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint remito_items_remito_company_fkey foreign key (company_id, remito_id)
    references public.remitos(company_id, id) on delete cascade,
  constraint remito_items_orden_key unique (remito_id, orden),
  constraint remito_items_orden_check check (orden >= 0),
  constraint remito_items_concepto_check check (concepto = btrim(concepto) and char_length(concepto) between 1 and 200),
  constraint remito_items_unidad_check check (unidad = btrim(unidad) and char_length(unidad) between 1 and 20),
  constraint remito_items_amounts_check check (cantidad >= 0 and precio_unitario >= 0 and precio_total >= 0),
  constraint remito_items_observaciones_check check (
    observaciones is null or (observaciones = btrim(observaciones) and observaciones <> '')
  )
);

create index remito_items_remito_idx on public.remito_items (remito_id, orden);

alter table public.remito_items enable row level security;
revoke all on table public.remito_items from public, anon, authenticated, service_role;

create trigger remitos_set_updated_at before update on public.remitos
for each row execute function private.set_updated_at();
create trigger remito_items_set_updated_at before update on public.remito_items
for each row execute function private.set_updated_at();

create or replace function private.prepare_remito_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
  else
    if new.company_id is distinct from old.company_id
      or new.created_by is distinct from old.created_by
    then
      raise exception 'remito ownership fields are immutable' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

alter function private.prepare_remito_write() owner to postgres;
revoke execute on function private.prepare_remito_write() from public, anon, authenticated, service_role;

create trigger remitos_prepare_write
before insert or update on public.remitos
for each row execute function private.prepare_remito_write();

create or replace function private.audit_remito_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_entity_id uuid := coalesce(new.id, old.id);
  v_action text;
begin
  v_action := case tg_op
    when 'INSERT' then 'remito.created'
    when 'UPDATE' then 'remito.updated'
    when 'DELETE' then 'remito.deleted'
  end;

  perform private.write_audit(
    actor_kind => case when v_actor is null then 'system' else 'user' end,
    action => v_action,
    entity_type => 'remito',
    entity_id => v_entity_id,
    before_data => case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    after_data => case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    request_id => extensions.gen_random_uuid(),
    metadata => jsonb_build_object('source', 'public.remitos'),
    actor_user_id => v_actor
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

alter function private.audit_remito_change() owner to postgres;
revoke execute on function private.audit_remito_change() from public, anon, authenticated, service_role;

create trigger remitos_write_audit
after insert or update or delete on public.remitos
for each row execute function private.audit_remito_change();

grant select, insert, update, delete on table public.remitos to authenticated;
grant select on table public.remito_items to authenticated;

create policy remitos_select on public.remitos for select to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.has_permission('remitos.view'))
);
create policy remitos_insert on public.remitos for insert to authenticated
with check (
  company_id = (select private.current_company_id())
  and (select private.has_permission('remitos.manage'))
);
create policy remitos_update on public.remitos for update to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.has_permission('remitos.manage'))
)
with check (
  company_id = (select private.current_company_id())
  and (select private.has_permission('remitos.manage'))
);
create policy remitos_delete on public.remitos for delete to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.has_permission('remitos.manage'))
);

create policy remito_items_select on public.remito_items for select to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.has_permission('remitos.view'))
  and exists (
    select 1 from public.remitos as remito
    where remito.id = remito_items.remito_id
      and remito.company_id = remito_items.company_id
  )
);

create policy obras_select_remitos on public.obras for select to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.has_permission('remitos.view'))
);
create policy clientes_select_remitos on public.clientes for select to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.has_permission('remitos.view'))
);
create policy maquinarias_select_remitos on public.maquinarias for select to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.has_permission('remitos.view'))
);

create or replace function api.replace_remito_items(p_remito_id uuid, p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_company_id uuid := private.current_company_id();
  v_previous_count integer;
  v_inserted integer := 0;
begin
  if v_actor is null or v_company_id is null
    or not private.has_permission('remitos.manage')
  then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items must be a JSON array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 100 then
    raise exception 'too many remito items' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.remitos as remito
    where remito.id = p_remito_id and remito.company_id = v_company_id
    for update
  ) then
    raise exception 'remito not found' using errcode = 'P0002';
  end if;

  select count(*) into v_previous_count
  from public.remito_items as item
  where item.remito_id = p_remito_id and item.company_id = v_company_id;

  delete from public.remito_items as item
  where item.remito_id = p_remito_id and item.company_id = v_company_id;

  insert into public.remito_items (
    company_id, remito_id, orden, concepto, cantidad, unidad, precio_unitario, precio_total, observaciones
  )
  select
    v_company_id,
    p_remito_id,
    source.ordinality::integer - 1,
    btrim(source.value ->> 'concepto'),
    coalesce(nullif(source.value ->> 'cantidad', '')::numeric, 0),
    coalesce(nullif(btrim(source.value ->> 'unidad'), ''), 'DIA'),
    coalesce(nullif(source.value ->> 'precio_unitario', '')::numeric, 0),
    coalesce(nullif(source.value ->> 'precio_total', '')::numeric, 0),
    nullif(btrim(source.value ->> 'observaciones'), '')
  from jsonb_array_elements(p_items) with ordinality as source(value, ordinality)
  where nullif(btrim(source.value ->> 'concepto'), '') is not null
    or coalesce(nullif(source.value ->> 'cantidad', '')::numeric, 0) <> 0;

  get diagnostics v_inserted = row_count;

  perform private.write_audit(
    actor_kind => 'user',
    action => 'remito.items_replaced',
    entity_type => 'remito',
    entity_id => p_remito_id,
    before_data => jsonb_build_object('item_count', v_previous_count),
    after_data => jsonb_build_object('item_count', v_inserted),
    request_id => extensions.gen_random_uuid(),
    metadata => jsonb_build_object('source', 'api.replace_remito_items'),
    actor_user_id => v_actor
  );

  return v_inserted;
end;
$$;

alter function api.replace_remito_items(uuid, jsonb) owner to postgres;
revoke all on function api.replace_remito_items(uuid, jsonb) from public, anon, authenticated, service_role;
grant execute on function api.replace_remito_items(uuid, jsonb) to authenticated;

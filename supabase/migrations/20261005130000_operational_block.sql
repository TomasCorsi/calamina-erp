-- CALAMINA ERP v2 - Core operational block: expenses, fuel, maintenance, stock and attendance.

insert into iam.permissions (id, key, description)
values
  ('20000000-0000-4000-8000-000000000014', 'gastos.view', 'Consultar gastos generales dentro de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000015', 'gastos.manage', 'Crear, modificar y eliminar gastos generales dentro de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000016', 'combustible.view', 'Consultar cargas y precios de combustible dentro de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000017', 'combustible.manage', 'Crear, modificar y eliminar cargas y precios de combustible dentro de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000018', 'mantenimiento.view', 'Consultar mantenimientos dentro de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000019', 'mantenimiento.manage', 'Crear, modificar y eliminar mantenimientos dentro de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000020', 'stock.view', 'Consultar inventario y movimientos dentro de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000021', 'stock.manage', 'Administrar inventario y registrar movimientos dentro de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000022', 'presentismo.view', 'Consultar presentismo dentro de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000023', 'presentismo.manage', 'Crear, corregir y eliminar registros de presentismo dentro de la empresa activa.');

insert into iam.role_permissions (role_id, permission_id)
select '10000000-0000-4000-8000-000000000001'::uuid, permission.id
from iam.permissions as permission
where permission.id between '20000000-0000-4000-8000-000000000014'::uuid
  and '20000000-0000-4000-8000-000000000023'::uuid;

create table public.otros_gastos (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  fecha date not null,
  obra_id uuid,
  maquinaria_id uuid,
  sector text,
  categoria text not null,
  descripcion text not null,
  monto numeric(14, 2) not null default 0,
  comprobante text,
  proveedor text,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint otros_gastos_obra_company_fkey foreign key (company_id, obra_id)
    references public.obras(company_id, id) on delete restrict,
  constraint otros_gastos_maquinaria_company_fkey foreign key (company_id, maquinaria_id)
    references public.maquinarias(company_id, id) on delete restrict,
  constraint otros_gastos_categoria_check check (categoria in ('alquiler','transporte','servicios','materiales','viaticos','varios')),
  constraint otros_gastos_descripcion_check check (descripcion = btrim(descripcion) and char_length(descripcion) between 1 and 300),
  constraint otros_gastos_monto_check check (monto >= 0),
  constraint otros_gastos_optional_text_check check (
    (sector is null or (sector = btrim(sector) and sector <> '')) and
    (comprobante is null or (comprobante = btrim(comprobante) and comprobante <> '')) and
    (proveedor is null or (proveedor = btrim(proveedor) and proveedor <> '')) and
    (observaciones is null or (observaciones = btrim(observaciones) and observaciones <> ''))
  )
);
create index otros_gastos_company_fecha_idx on public.otros_gastos(company_id, fecha desc);

create table public.cargas_combustible_repartidor (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  parte_diario_id uuid,
  fecha date not null,
  litros numeric(14, 2) not null,
  horas numeric(14, 2),
  km numeric(14, 2),
  operador_id uuid,
  maquinaria_id uuid,
  obra_id uuid,
  tipo_operador text not null default 'interno',
  tipo_producto text not null default 'combustible',
  repartidor_id uuid,
  observaciones text,
  tipo_movimiento text not null default 'egreso',
  numero_remito bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cargas_combustible_repartidor_parte_diario_id_fkey foreign key (company_id, parte_diario_id)
    references public.partes_diarios(company_id, id) on delete restrict,
  constraint cargas_combustible_repartidor_operador_id_fkey foreign key (company_id, operador_id)
    references public.personal(company_id, id) on delete restrict,
  constraint cargas_combustible_repartidor_maquinaria_id_fkey foreign key (company_id, maquinaria_id)
    references public.maquinarias(company_id, id) on delete restrict,
  constraint cargas_combustible_repartidor_obra_id_fkey foreign key (company_id, obra_id)
    references public.obras(company_id, id) on delete restrict,
  constraint cargas_combustible_repartidor_repartidor_id_fkey foreign key (company_id, repartidor_id)
    references public.personal(company_id, id) on delete restrict,
  constraint cargas_combustible_litros_check check (litros > 0),
  constraint cargas_combustible_metrics_check check ((horas is null or horas >= 0) and (km is null or km >= 0)),
  constraint cargas_combustible_tipo_operador_check check (tipo_operador in ('interno','externo','fletero')),
  constraint cargas_combustible_producto_check check (tipo_producto in ('combustible','grasa','aceite','uria')),
  constraint cargas_combustible_movimiento_check check (tipo_movimiento in ('ingreso','egreso')),
  constraint cargas_combustible_destination_check check (
    (tipo_movimiento = 'ingreso' and maquinaria_id is not null and obra_id is null and operador_id is null)
    or tipo_movimiento = 'egreso'
  )
);
create index cargas_combustible_company_fecha_idx on public.cargas_combustible_repartidor(company_id, fecha desc);

create table public.precios_productos_mes (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  anio integer not null,
  mes integer not null,
  producto text not null,
  precio_unitario numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint precios_productos_mes_key unique (company_id, anio, mes, producto),
  constraint precios_productos_period_check check (anio between 2000 and 2200 and mes between 1 and 12),
  constraint precios_productos_producto_check check (producto in ('combustible','grasa','aceite','uria')),
  constraint precios_productos_precio_check check (precio_unitario >= 0)
);

create table public.mantenimientos (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  fecha date not null,
  maquinaria_id uuid not null,
  tipo text not null,
  descripcion text not null,
  repuestos text,
  costo_repuestos numeric(14, 2) not null default 0,
  costo_mano_obra numeric(14, 2) not null default 0,
  costo_total numeric(14, 2) not null default 0,
  horas_maquina numeric(14, 2) not null default 0,
  kilometros numeric(14, 2) not null default 0,
  tecnico text not null,
  tecnico_id uuid,
  estado text not null default 'pendiente',
  proximo_mantenimiento date,
  proximo_service_km numeric(14, 2),
  proximo_service_hr numeric(14, 2),
  informe_tecnico text,
  alerta_campo text,
  checklist_cambio jsonb,
  checklist_chequeo jsonb,
  adjunto_url text,
  observaciones text,
  observacion_reporte_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mantenimientos_maquinaria_company_fkey foreign key (company_id, maquinaria_id)
    references public.maquinarias(company_id, id) on delete restrict,
  constraint mantenimientos_tecnico_company_fkey foreign key (company_id, tecnico_id)
    references public.personal(company_id, id) on delete restrict,
  constraint mantenimientos_tipo_check check (tipo in ('preventivo','correctivo','emergencia')),
  constraint mantenimientos_estado_check check (estado in ('pendiente','en_proceso','completado')),
  constraint mantenimientos_descripcion_check check (descripcion = btrim(descripcion) and char_length(descripcion) between 1 and 1000),
  constraint mantenimientos_tecnico_check check (tecnico = btrim(tecnico) and char_length(tecnico) between 1 and 200),
  constraint mantenimientos_amounts_check check (
    costo_repuestos >= 0 and costo_mano_obra >= 0 and costo_total >= 0 and
    horas_maquina >= 0 and kilometros >= 0 and
    (proximo_service_km is null or proximo_service_km >= 0) and
    (proximo_service_hr is null or proximo_service_hr >= 0)
  ),
  constraint mantenimientos_checklist_objects check (
    (checklist_cambio is null or jsonb_typeof(checklist_cambio) = 'object') and
    (checklist_chequeo is null or jsonb_typeof(checklist_chequeo) = 'object')
  )
);
create index mantenimientos_company_fecha_idx on public.mantenimientos(company_id, fecha desc);
create index mantenimientos_maquinaria_idx on public.mantenimientos(maquinaria_id, fecha desc);

create table public.stock_items (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  codigo text not null,
  nombre text not null,
  categoria text not null,
  unidad text not null,
  stock_actual numeric(14, 3) not null default 0,
  stock_minimo numeric(14, 3) not null default 0,
  stock_maximo numeric(14, 3),
  ubicacion text not null,
  precio_unitario numeric(14, 2) not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_items_company_id_id_key unique (company_id, id),
  constraint stock_items_categoria_check check (categoria in ('material','repuesto','herramienta','consumible')),
  constraint stock_items_text_check check (
    codigo = btrim(codigo) and char_length(codigo) between 1 and 80 and
    nombre = btrim(nombre) and char_length(nombre) between 1 and 200 and
    unidad = btrim(unidad) and char_length(unidad) between 1 and 40 and
    ubicacion = btrim(ubicacion) and char_length(ubicacion) between 1 and 160
  ),
  constraint stock_items_amounts_check check (
    stock_actual >= 0 and stock_minimo >= 0 and
    (stock_maximo is null or stock_maximo >= stock_minimo) and precio_unitario >= 0
  )
);
create unique index stock_items_company_codigo_key on public.stock_items(company_id, lower(codigo));

create table public.movimientos_stock (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  fecha date not null,
  item_id uuid not null,
  tipo text not null,
  cantidad numeric(14, 3) not null,
  stock_anterior numeric(14, 3) not null,
  stock_nuevo numeric(14, 3) not null,
  obra_id uuid,
  motivo text not null,
  responsable_id uuid not null,
  comprobante text,
  observaciones text,
  created_at timestamptz not null default now(),
  constraint movimientos_stock_item_company_fkey foreign key (company_id, item_id)
    references public.stock_items(company_id, id) on delete restrict,
  constraint movimientos_stock_obra_company_fkey foreign key (company_id, obra_id)
    references public.obras(company_id, id) on delete restrict,
  constraint movimientos_stock_responsable_company_fkey foreign key (company_id, responsable_id)
    references public.personal(company_id, id) on delete restrict,
  constraint movimientos_stock_tipo_check check (tipo in ('entrada','salida','ajuste')),
  constraint movimientos_stock_amounts_check check (cantidad >= 0 and stock_anterior >= 0 and stock_nuevo >= 0),
  constraint movimientos_stock_motivo_check check (motivo = btrim(motivo) and char_length(motivo) between 1 and 300)
);
create index movimientos_stock_company_fecha_idx on public.movimientos_stock(company_id, fecha desc, created_at desc);

create table public.registros_hh (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  fecha date not null,
  persona_id uuid not null,
  obra_id uuid not null,
  capataz_id uuid not null,
  hora_entrada time not null,
  hora_salida time not null,
  horas_normales numeric(8, 2) not null default 0,
  horas_extra numeric(8, 2) not null default 0,
  horas_totales numeric(8, 2) not null default 0,
  tarea text not null,
  estado text not null default 'presente',
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint registros_hh_persona_id_fkey foreign key (company_id, persona_id)
    references public.personal(company_id, id) on delete restrict,
  constraint registros_hh_obra_id_fkey foreign key (company_id, obra_id)
    references public.obras(company_id, id) on delete restrict,
  constraint registros_hh_capataz_id_fkey foreign key (company_id, capataz_id)
    references public.personal(company_id, id) on delete restrict,
  constraint registros_hh_persona_fecha_key unique (company_id, persona_id, fecha),
  constraint registros_hh_estado_check check (estado in ('presente','ausente','licencia','vacaciones','enfermedad')),
  constraint registros_hh_hours_check check (
    horas_normales >= 0 and horas_extra >= 0 and horas_totales >= 0 and
    horas_totales = horas_normales + horas_extra and
    (estado = 'presente' or horas_totales = 0)
  ),
  constraint registros_hh_tarea_check check (tarea = btrim(tarea) and char_length(tarea) between 1 and 500)
);
create index registros_hh_company_fecha_idx on public.registros_hh(company_id, fecha desc);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'otros_gastos','cargas_combustible_repartidor','precios_productos_mes',
    'mantenimientos','stock_items','movimientos_stock','registros_hh'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role', table_name);
  end loop;
end $$;

create trigger otros_gastos_set_updated_at before update on public.otros_gastos for each row execute function private.set_updated_at();
create trigger cargas_combustible_set_updated_at before update on public.cargas_combustible_repartidor for each row execute function private.set_updated_at();
create trigger precios_productos_set_updated_at before update on public.precios_productos_mes for each row execute function private.set_updated_at();
create trigger mantenimientos_set_updated_at before update on public.mantenimientos for each row execute function private.set_updated_at();
create trigger stock_items_set_updated_at before update on public.stock_items for each row execute function private.set_updated_at();
create trigger registros_hh_set_updated_at before update on public.registros_hh for each row execute function private.set_updated_at();

create or replace function private.protect_operational_company()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.company_id is distinct from old.company_id then
    raise exception 'company ownership is immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;
alter function private.protect_operational_company() owner to postgres;
revoke execute on function private.protect_operational_company() from public, anon, authenticated, service_role;

create trigger otros_gastos_protect_company before update on public.otros_gastos for each row execute function private.protect_operational_company();
create trigger cargas_combustible_protect_company before update on public.cargas_combustible_repartidor for each row execute function private.protect_operational_company();
create trigger precios_productos_protect_company before update on public.precios_productos_mes for each row execute function private.protect_operational_company();
create trigger mantenimientos_protect_company before update on public.mantenimientos for each row execute function private.protect_operational_company();
create trigger stock_items_protect_company before update on public.stock_items for each row execute function private.protect_operational_company();
create trigger registros_hh_protect_company before update on public.registros_hh for each row execute function private.protect_operational_company();

create or replace function private.audit_operational_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := (select auth.uid());
  v_row_id uuid := coalesce(new.id, old.id);
  v_action text := tg_argv[0] || '.' || lower(tg_op);
begin
  perform private.write_audit(
    case when v_actor is null then 'system' else 'user' end,
    v_action,
    tg_argv[0],
    v_row_id,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    extensions.gen_random_uuid(),
    jsonb_build_object('source', tg_table_schema || '.' || tg_table_name),
    v_actor
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
alter function private.audit_operational_change() owner to postgres;
revoke execute on function private.audit_operational_change() from public, anon, authenticated, service_role;

create trigger otros_gastos_audit after insert or update or delete on public.otros_gastos for each row execute function private.audit_operational_change('gasto');
create trigger cargas_combustible_audit after insert or update or delete on public.cargas_combustible_repartidor for each row execute function private.audit_operational_change('combustible');
create trigger mantenimientos_audit after insert or update or delete on public.mantenimientos for each row execute function private.audit_operational_change('mantenimiento');
create trigger stock_items_audit after insert or update on public.stock_items for each row execute function private.audit_operational_change('stock_item');
create trigger movimientos_stock_audit after insert on public.movimientos_stock for each row execute function private.audit_operational_change('stock_movimiento');
create trigger registros_hh_audit after insert or update or delete on public.registros_hh for each row execute function private.audit_operational_change('presentismo');

grant select, insert, update, delete on public.otros_gastos to authenticated;
grant select, insert, update, delete on public.cargas_combustible_repartidor to authenticated;
grant select, insert, update on public.precios_productos_mes to authenticated;
grant select, insert, update, delete on public.mantenimientos to authenticated;
grant select, insert, update, delete on public.stock_items to authenticated;
grant select on public.movimientos_stock to authenticated;
grant select, insert, update, delete on public.registros_hh to authenticated;

create policy otros_gastos_select on public.otros_gastos for select to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('gastos.view')));
create policy otros_gastos_insert on public.otros_gastos for insert to authenticated with check (company_id = (select private.current_company_id()) and (select private.has_permission('gastos.manage')));
create policy otros_gastos_update on public.otros_gastos for update to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('gastos.manage'))) with check (company_id = (select private.current_company_id()) and (select private.has_permission('gastos.manage')));
create policy otros_gastos_delete on public.otros_gastos for delete to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('gastos.manage')));

create policy combustible_select on public.cargas_combustible_repartidor for select to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('combustible.view')));
create policy combustible_insert on public.cargas_combustible_repartidor for insert to authenticated with check (company_id = (select private.current_company_id()) and (select private.has_permission('combustible.manage')));
create policy combustible_update on public.cargas_combustible_repartidor for update to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('combustible.manage'))) with check (company_id = (select private.current_company_id()) and (select private.has_permission('combustible.manage')));
create policy combustible_delete on public.cargas_combustible_repartidor for delete to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('combustible.manage')));
create policy precios_select on public.precios_productos_mes for select to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('combustible.view')));
create policy precios_insert on public.precios_productos_mes for insert to authenticated with check (company_id = (select private.current_company_id()) and (select private.has_permission('combustible.manage')));
create policy precios_update on public.precios_productos_mes for update to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('combustible.manage'))) with check (company_id = (select private.current_company_id()) and (select private.has_permission('combustible.manage')));

create policy mantenimientos_select on public.mantenimientos for select to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('mantenimiento.view')));
create policy mantenimientos_insert on public.mantenimientos for insert to authenticated with check (company_id = (select private.current_company_id()) and (select private.has_permission('mantenimiento.manage')));
create policy mantenimientos_update on public.mantenimientos for update to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('mantenimiento.manage'))) with check (company_id = (select private.current_company_id()) and (select private.has_permission('mantenimiento.manage')));
create policy mantenimientos_delete on public.mantenimientos for delete to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('mantenimiento.manage')));

create policy stock_items_select on public.stock_items for select to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('stock.view')));
create policy stock_items_insert on public.stock_items for insert to authenticated with check (company_id = (select private.current_company_id()) and (select private.has_permission('stock.manage')));
create policy stock_items_update on public.stock_items for update to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('stock.manage'))) with check (company_id = (select private.current_company_id()) and (select private.has_permission('stock.manage')));
create policy stock_items_delete on public.stock_items for delete to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('stock.manage')));
create policy movimientos_stock_select on public.movimientos_stock for select to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('stock.view')));

create policy registros_hh_select on public.registros_hh for select to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('presentismo.view')));
create policy registros_hh_insert on public.registros_hh for insert to authenticated with check (company_id = (select private.current_company_id()) and (select private.has_permission('presentismo.manage')));
create policy registros_hh_update on public.registros_hh for update to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('presentismo.manage'))) with check (company_id = (select private.current_company_id()) and (select private.has_permission('presentismo.manage')));
create policy registros_hh_delete on public.registros_hh for delete to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('presentismo.manage')));

create or replace function private.protect_stock_balance()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.stock_actual is distinct from old.stock_actual
    and coalesce(current_setting('calamina.stock_movement', true), '') <> 'on'
  then
    raise exception 'stock balance can only change through api.create_stock_movement' using errcode = '42501';
  end if;
  return new;
end;
$$;
alter function private.protect_stock_balance() owner to postgres;
revoke execute on function private.protect_stock_balance() from public, anon, authenticated, service_role;
create trigger stock_items_protect_balance before update on public.stock_items for each row execute function private.protect_stock_balance();

create or replace function api.create_stock_movement(
  p_fecha date,
  p_item_id uuid,
  p_tipo text,
  p_cantidad numeric,
  p_obra_id uuid,
  p_motivo text,
  p_responsable_id uuid,
  p_comprobante text default null,
  p_observaciones text default null
)
returns public.movimientos_stock
language plpgsql security definer set search_path = '' as $$
declare
  v_company_id uuid;
  v_item public.stock_items;
  v_new_stock numeric;
  v_movement public.movimientos_stock;
begin
  if (select auth.uid()) is null or not private.has_permission('stock.manage') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  v_company_id := private.current_company_id();
  if p_tipo not in ('entrada','salida','ajuste') or p_cantidad < 0 then
    raise exception 'invalid movement' using errcode = '23514';
  end if;
  select * into v_item from public.stock_items
  where company_id = v_company_id and id = p_item_id and activo
  for update;
  if not found then raise exception 'stock item not found' using errcode = 'P0002'; end if;
  v_new_stock := case p_tipo
    when 'entrada' then v_item.stock_actual + p_cantidad
    when 'salida' then v_item.stock_actual - p_cantidad
    else p_cantidad
  end;
  if v_new_stock < 0 then raise exception 'insufficient stock' using errcode = '23514'; end if;
  perform set_config('calamina.stock_movement', 'on', true);
  update public.stock_items set stock_actual = v_new_stock where id = v_item.id;
  insert into public.movimientos_stock (
    company_id, fecha, item_id, tipo, cantidad, stock_anterior, stock_nuevo,
    obra_id, motivo, responsable_id, comprobante, observaciones
  ) values (
    v_company_id, p_fecha, p_item_id, p_tipo, p_cantidad, v_item.stock_actual, v_new_stock,
    p_obra_id, btrim(p_motivo), p_responsable_id, nullif(btrim(p_comprobante), ''), nullif(btrim(p_observaciones), '')
  ) returning * into v_movement;
  return v_movement;
end;
$$;
alter function api.create_stock_movement(date, uuid, text, numeric, uuid, text, uuid, text, text) owner to postgres;
revoke execute on function api.create_stock_movement(date, uuid, text, numeric, uuid, text, uuid, text, text) from public, anon, service_role;
grant execute on function api.create_stock_movement(date, uuid, text, numeric, uuid, text, uuid, text, text) to authenticated;

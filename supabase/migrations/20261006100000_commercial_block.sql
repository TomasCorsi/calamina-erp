-- CALAMINA ERP v2 - Commercial and administrative core.

insert into iam.permissions (id, key, description)
values
  ('20000000-0000-4000-8000-000000000024', 'clientes.view', 'Consultar clientes de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000025', 'clientes.manage', 'Crear, modificar y desactivar clientes de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000026', 'proveedores.view', 'Consultar proveedores de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000027', 'proveedores.manage', 'Crear, modificar y desactivar proveedores de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000028', 'compras.view', 'Consultar ordenes de compra de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000029', 'compras.manage', 'Crear, modificar y eliminar ordenes de compra de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000030', 'cotizaciones.view', 'Consultar cotizaciones de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000031', 'cotizaciones.manage', 'Crear, modificar y eliminar cotizaciones de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000032', 'certificados.view', 'Consultar certificados y conceptos de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000033', 'certificados.manage', 'Crear, modificar y eliminar certificados y conceptos de la empresa activa.');

insert into iam.role_permissions (role_id, permission_id)
select '10000000-0000-4000-8000-000000000001'::uuid, id
from iam.permissions
where id between '20000000-0000-4000-8000-000000000024'::uuid
  and '20000000-0000-4000-8000-000000000033'::uuid;

alter table public.clientes
  add column contacto text,
  add column observaciones text,
  add constraint clientes_contacto_check check (contacto is null or (contacto = btrim(contacto) and contacto <> '')),
  add constraint clientes_observaciones_check check (observaciones is null or (observaciones = btrim(observaciones) and observaciones <> ''));

grant insert, update on public.clientes to authenticated;

create policy clientes_select_management on public.clientes for select to authenticated
using (company_id = (select private.current_company_id()) and (select private.has_permission('clientes.view')));
create policy clientes_insert_management on public.clientes for insert to authenticated
with check (company_id = (select private.current_company_id()) and (select private.has_permission('clientes.manage')));
create policy clientes_update_management on public.clientes for update to authenticated
using (company_id = (select private.current_company_id()) and (select private.has_permission('clientes.manage')))
with check (company_id = (select private.current_company_id()) and (select private.has_permission('clientes.manage')));

create trigger clientes_protect_company before update on public.clientes
for each row execute function private.protect_operational_company();
create trigger clientes_write_audit after insert or update on public.clientes
for each row execute function private.audit_operational_change('cliente');

create table public.proveedores (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  nombre text not null,
  cuit text,
  direccion text,
  localidad text,
  telefono text,
  email extensions.citext,
  contacto text,
  rubro text,
  observaciones text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proveedores_company_id_id_key unique(company_id, id),
  constraint proveedores_nombre_check check (nombre = btrim(nombre) and char_length(nombre) between 1 and 180),
  constraint proveedores_optional_text_check check (
    (cuit is null or (cuit = btrim(cuit) and cuit <> '')) and
    (direccion is null or (direccion = btrim(direccion) and direccion <> '')) and
    (localidad is null or (localidad = btrim(localidad) and localidad <> '')) and
    (telefono is null or (telefono = btrim(telefono) and telefono <> '')) and
    (contacto is null or (contacto = btrim(contacto) and contacto <> '')) and
    (rubro is null or (rubro = btrim(rubro) and rubro <> '')) and
    (observaciones is null or (observaciones = btrim(observaciones) and observaciones <> ''))
  ),
  constraint proveedores_email_check check (email is null or email::text ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);
create unique index proveedores_company_cuit_key on public.proveedores(company_id, cuit) where cuit is not null;
create index proveedores_company_activo_idx on public.proveedores(company_id, activo, nombre);

create table public.ordenes_compra (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  numero text not null,
  numero_factura text,
  fecha date not null,
  proveedor_id uuid not null,
  obra_id uuid,
  maquinaria_id uuid,
  sector text,
  estado text not null default 'borrador',
  incluir_iva boolean not null default true,
  iva_porcentaje numeric(6, 3) not null default 21,
  percepcion_iva numeric(14, 2) not null default 0,
  percepcion_iibb numeric(14, 2) not null default 0,
  moneda char(3) not null default 'ARS',
  subtotal numeric(14, 2) not null default 0,
  iva numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  condiciones_pago text,
  fecha_entrega_estimada date,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ordenes_compra_company_id_id_key unique(company_id, id),
  constraint ordenes_compra_proveedor_company_fkey foreign key(company_id, proveedor_id) references public.proveedores(company_id, id) on delete restrict,
  constraint ordenes_compra_obra_company_fkey foreign key(company_id, obra_id) references public.obras(company_id, id) on delete restrict,
  constraint ordenes_compra_maquinaria_company_fkey foreign key(company_id, maquinaria_id) references public.maquinarias(company_id, id) on delete restrict,
  constraint ordenes_compra_numero_check check (numero = btrim(numero) and char_length(numero) between 1 and 80),
  constraint ordenes_compra_estado_check check (estado in ('borrador','emitida','recibida','cancelada')),
  constraint ordenes_compra_moneda_check check (moneda in ('ARS','USD')),
  constraint ordenes_compra_amounts_check check (iva_porcentaje between 0 and 100 and percepcion_iva >= 0 and percepcion_iibb >= 0 and subtotal >= 0 and iva >= 0 and total >= 0),
  constraint ordenes_compra_dates_check check (fecha_entrega_estimada is null or fecha_entrega_estimada >= fecha)
);
create unique index ordenes_compra_company_numero_key on public.ordenes_compra(company_id, lower(numero));
create index ordenes_compra_company_fecha_idx on public.ordenes_compra(company_id, fecha desc);

create table public.orden_compra_items (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null,
  orden_id uuid not null,
  articulo text,
  descripcion text not null,
  unidad text not null default 'un',
  cantidad numeric(14, 3) not null,
  precio_unitario numeric(14, 2) not null,
  subtotal numeric(14, 2) not null,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  constraint orden_compra_items_header_fkey foreign key(company_id, orden_id) references public.ordenes_compra(company_id, id) on delete cascade,
  constraint orden_compra_items_order_key unique(orden_id, orden),
  constraint orden_compra_items_text_check check (descripcion = btrim(descripcion) and descripcion <> '' and unidad = btrim(unidad) and unidad <> ''),
  constraint orden_compra_items_amounts_check check (cantidad > 0 and precio_unitario >= 0 and subtotal >= 0 and orden >= 0)
);

create table public.cotizaciones (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  numero text not null,
  obra_id uuid,
  descripcion text not null,
  estado text not null default 'borrador',
  fecha_creacion date not null,
  fecha_vencimiento date not null,
  responsable text not null,
  subtotal numeric(14, 2) not null default 0,
  iva numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  notas text,
  moneda char(3) not null default 'ARS',
  anticipo_tipo text not null default 'ninguno',
  anticipo_valor numeric(14, 2) not null default 0,
  anticipo_monto numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cotizaciones_company_id_id_key unique(company_id, id),
  constraint cotizaciones_obra_company_fkey foreign key(company_id, obra_id) references public.obras(company_id, id) on delete restrict,
  constraint cotizaciones_numero_check check (numero = btrim(numero) and char_length(numero) between 1 and 80),
  constraint cotizaciones_text_check check (descripcion = btrim(descripcion) and descripcion <> '' and responsable = btrim(responsable) and responsable <> ''),
  constraint cotizaciones_estado_check check (estado in ('borrador','enviada','aprobada','rechazada','vencida')),
  constraint cotizaciones_moneda_check check (moneda in ('ARS','USD')),
  constraint cotizaciones_anticipo_tipo_check check (anticipo_tipo in ('ninguno','porcentaje','monto')),
  constraint cotizaciones_amounts_check check (subtotal >= 0 and iva >= 0 and total >= 0 and anticipo_valor >= 0 and anticipo_monto >= 0),
  constraint cotizaciones_dates_check check (fecha_vencimiento >= fecha_creacion)
);
create unique index cotizaciones_company_numero_key on public.cotizaciones(company_id, lower(numero));

create table public.cotizacion_categorias (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null,
  cotizacion_id uuid not null,
  numero integer not null,
  nombre text not null,
  orden integer not null,
  created_at timestamptz not null default now(),
  constraint cotizacion_categorias_company_id_id_key unique(company_id, id),
  constraint cotizacion_categorias_header_fkey foreign key(company_id, cotizacion_id) references public.cotizaciones(company_id, id) on delete cascade,
  constraint cotizacion_categorias_numero_key unique(cotizacion_id, numero),
  constraint cotizacion_categorias_values_check check (numero >= 0 and orden >= 0 and nombre = btrim(nombre) and nombre <> '')
);

create table public.cotizacion_items (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null,
  cotizacion_id uuid not null,
  categoria_id uuid,
  numero text,
  descripcion text not null,
  unidad text not null,
  cantidad numeric(14, 3) not null default 0,
  cantidad_m2 numeric(14, 3) not null default 0,
  altura_promedio numeric(14, 3) not null default 0,
  cantidad_m3 numeric(14, 3) not null default 0,
  precio_unitario numeric(14, 2) not null default 0,
  subtotal numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint cotizacion_items_header_fkey foreign key(company_id, cotizacion_id) references public.cotizaciones(company_id, id) on delete cascade,
  constraint cotizacion_items_category_fkey foreign key(company_id, categoria_id) references public.cotizacion_categorias(company_id, id) on delete restrict,
  constraint cotizacion_items_text_check check (descripcion = btrim(descripcion) and descripcion <> '' and unidad = btrim(unidad) and unidad <> ''),
  constraint cotizacion_items_amounts_check check (cantidad >= 0 and cantidad_m2 >= 0 and altura_promedio >= 0 and cantidad_m3 >= 0 and precio_unitario >= 0 and subtotal >= 0 and total >= 0)
);

create table public.cotizacion_anticipos (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null,
  cotizacion_id uuid not null,
  descripcion text not null,
  tipo text not null,
  valor numeric(14, 2) not null,
  monto numeric(14, 2) not null,
  orden integer not null,
  constraint cotizacion_anticipos_header_fkey foreign key(company_id, cotizacion_id) references public.cotizaciones(company_id, id) on delete cascade,
  constraint cotizacion_anticipos_tipo_check check (tipo in ('porcentaje','monto')),
  constraint cotizacion_anticipos_values_check check (valor >= 0 and monto >= 0 and orden >= 0 and descripcion = btrim(descripcion) and descripcion <> '')
);

create table public.certificado_conceptos (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null,
  obra_id uuid not null,
  nombre text not null,
  unidad text not null,
  precio_unitario numeric(14, 2) not null default 0,
  activo boolean not null default true,
  orden integer not null default 0,
  categoria text not null default 'General',
  cantidad_total numeric(14, 3) not null default 0,
  etapa text,
  tipo text not null default 'servicio',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint certificado_conceptos_company_id_id_key unique(company_id, id),
  constraint certificado_conceptos_obra_fkey foreign key(company_id, obra_id) references public.obras(company_id, id) on delete cascade,
  constraint certificado_conceptos_tipo_check check (tipo in ('obra','servicio')),
  constraint certificado_conceptos_values_check check (nombre = btrim(nombre) and nombre <> '' and unidad = btrim(unidad) and unidad <> '' and precio_unitario >= 0 and orden >= 0 and cantidad_total >= 0)
);
create index certificado_conceptos_obra_idx on public.certificado_conceptos(obra_id, orden);

create table public.certificados (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null,
  obra_id uuid not null,
  numero text not null,
  periodo text not null,
  estado text not null default 'borrador',
  fecha_emision date,
  fecha_certificado date not null default current_date,
  subtotal numeric(14, 2) not null default 0,
  iva numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  observaciones text,
  tipo text not null default 'servicio',
  anticipo_porcentaje numeric(6, 3) not null default 0,
  incluir_iva boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint certificados_company_id_id_key unique(company_id, id),
  constraint certificados_obra_fkey foreign key(company_id, obra_id) references public.obras(company_id, id) on delete restrict,
  constraint certificados_numero_key unique(company_id, obra_id, numero),
  constraint certificados_periodo_check check (periodo ~ '^[0-9]{4}-[0-9]{2}$'),
  constraint certificados_estado_check check (estado in ('borrador','emitido','cobrado')),
  constraint certificados_tipo_check check (tipo in ('obra','servicio','mixto')),
  constraint certificados_amounts_check check (subtotal >= 0 and iva >= 0 and total >= 0 and anticipo_porcentaje between 0 and 100)
);
create index certificados_obra_periodo_idx on public.certificados(obra_id, periodo desc);

create table public.certificado_items (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null,
  certificado_id uuid not null,
  concepto_id uuid,
  descripcion text not null,
  unidad text not null,
  cantidad numeric(14, 3) not null,
  precio_unitario numeric(14, 2) not null,
  subtotal numeric(14, 2) not null,
  etapa text,
  seccion text,
  observaciones text,
  created_at timestamptz not null default now(),
  constraint certificado_items_header_fkey foreign key(company_id, certificado_id) references public.certificados(company_id, id) on delete cascade,
  constraint certificado_items_concepto_fkey foreign key(company_id, concepto_id) references public.certificado_conceptos(company_id, id) on delete restrict,
  constraint certificado_items_values_check check (descripcion = btrim(descripcion) and descripcion <> '' and unidad = btrim(unidad) and unidad <> '' and cantidad >= 0 and precio_unitario >= 0 and subtotal >= 0)
);

create table public.certificado_pagos (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null,
  certificado_id uuid not null,
  fecha date not null,
  monto numeric(14, 2) not null,
  descripcion text,
  metodo text,
  referencia text,
  banco text,
  comprobante_url text,
  created_at timestamptz not null default now(),
  constraint certificado_pagos_header_fkey foreign key(company_id, certificado_id) references public.certificados(company_id, id) on delete cascade,
  constraint certificado_pagos_monto_check check (monto > 0),
  constraint certificado_pagos_metodo_check check (metodo is null or metodo in ('transferencia','cheque','efectivo','echeq','deposito','otro'))
);

do $$
declare v_table text;
begin
  foreach v_table in array array[
    'proveedores','ordenes_compra','orden_compra_items','cotizaciones','cotizacion_categorias',
    'cotizacion_items','cotizacion_anticipos','certificado_conceptos','certificados',
    'certificado_items','certificado_pagos'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', v_table);
  end loop;
end $$;

create trigger proveedores_updated before update on public.proveedores for each row execute function private.set_updated_at();
create trigger ordenes_compra_updated before update on public.ordenes_compra for each row execute function private.set_updated_at();
create trigger cotizaciones_updated before update on public.cotizaciones for each row execute function private.set_updated_at();
create trigger certificado_conceptos_updated before update on public.certificado_conceptos for each row execute function private.set_updated_at();
create trigger certificados_updated before update on public.certificados for each row execute function private.set_updated_at();

create trigger proveedores_protect_company before update on public.proveedores for each row execute function private.protect_operational_company();
create trigger ordenes_compra_protect_company before update on public.ordenes_compra for each row execute function private.protect_operational_company();
create trigger cotizaciones_protect_company before update on public.cotizaciones for each row execute function private.protect_operational_company();
create trigger certificado_conceptos_protect_company before update on public.certificado_conceptos for each row execute function private.protect_operational_company();
create trigger certificados_protect_company before update on public.certificados for each row execute function private.protect_operational_company();

create trigger proveedores_audit after insert or update on public.proveedores for each row execute function private.audit_operational_change('proveedor');
create trigger ordenes_compra_audit after insert or update or delete on public.ordenes_compra for each row execute function private.audit_operational_change('orden_compra');
create trigger cotizaciones_audit after insert or update or delete on public.cotizaciones for each row execute function private.audit_operational_change('cotizacion');
create trigger certificado_conceptos_audit after insert or update or delete on public.certificado_conceptos for each row execute function private.audit_operational_change('certificado_concepto');
create trigger certificados_audit after insert or update or delete on public.certificados for each row execute function private.audit_operational_change('certificado');
create trigger certificado_pagos_audit after insert or update or delete on public.certificado_pagos for each row execute function private.audit_operational_change('certificado_pago');

grant select, insert, update on public.proveedores to authenticated;
grant select, update, delete on public.ordenes_compra to authenticated;
grant select on public.orden_compra_items to authenticated;
grant select, update, delete on public.cotizaciones to authenticated;
grant select on public.cotizacion_categorias, public.cotizacion_items, public.cotizacion_anticipos to authenticated;
grant select, insert, update, delete on public.certificado_conceptos to authenticated;
grant select, update, delete on public.certificados to authenticated;
grant select on public.certificado_items to authenticated;
grant select, insert, update, delete on public.certificado_pagos to authenticated;

create policy proveedores_select on public.proveedores for select to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('proveedores.view')));
create policy proveedores_insert on public.proveedores for insert to authenticated with check (company_id = (select private.current_company_id()) and (select private.has_permission('proveedores.manage')));
create policy proveedores_update on public.proveedores for update to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('proveedores.manage'))) with check (company_id = (select private.current_company_id()) and (select private.has_permission('proveedores.manage')));

create policy ordenes_select on public.ordenes_compra for select to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('compras.view')));
create policy ordenes_update on public.ordenes_compra for update to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('compras.manage'))) with check (company_id = (select private.current_company_id()) and (select private.has_permission('compras.manage')));
create policy ordenes_delete on public.ordenes_compra for delete to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('compras.manage')));
create policy orden_items_select on public.orden_compra_items for select to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('compras.view')));

create policy cotizaciones_select on public.cotizaciones for select to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('cotizaciones.view')));
create policy cotizaciones_update on public.cotizaciones for update to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('cotizaciones.manage'))) with check (company_id = (select private.current_company_id()) and (select private.has_permission('cotizaciones.manage')));
create policy cotizaciones_delete on public.cotizaciones for delete to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('cotizaciones.manage')));
create policy cot_categorias_select on public.cotizacion_categorias for select to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('cotizaciones.view')));
create policy cot_items_select on public.cotizacion_items for select to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('cotizaciones.view')));
create policy cot_anticipos_select on public.cotizacion_anticipos for select to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('cotizaciones.view')));

create policy conceptos_select on public.certificado_conceptos for select to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('certificados.view')));
create policy conceptos_insert on public.certificado_conceptos for insert to authenticated with check (company_id = (select private.current_company_id()) and (select private.has_permission('certificados.manage')));
create policy conceptos_update on public.certificado_conceptos for update to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('certificados.manage'))) with check (company_id = (select private.current_company_id()) and (select private.has_permission('certificados.manage')));
create policy conceptos_delete on public.certificado_conceptos for delete to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('certificados.manage')));
create policy certificados_select on public.certificados for select to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('certificados.view')));
create policy certificados_update on public.certificados for update to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('certificados.manage'))) with check (company_id = (select private.current_company_id()) and (select private.has_permission('certificados.manage')));
create policy certificados_delete on public.certificados for delete to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('certificados.manage')));
create policy certificado_items_select on public.certificado_items for select to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('certificados.view')));
create policy certificado_pagos_select on public.certificado_pagos for select to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('certificados.view')));
create policy certificado_pagos_insert on public.certificado_pagos for insert to authenticated with check (company_id = (select private.current_company_id()) and (select private.has_permission('certificados.manage')));
create policy certificado_pagos_update on public.certificado_pagos for update to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('certificados.manage'))) with check (company_id = (select private.current_company_id()) and (select private.has_permission('certificados.manage')));
create policy certificado_pagos_delete on public.certificado_pagos for delete to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('certificados.manage')));

create or replace function private.validate_certificado_pago()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_total numeric; v_paid numeric;
begin
  select total into v_total from public.certificados where company_id = new.company_id and id = new.certificado_id for update;
  if v_total is null then raise exception 'certificate not found' using errcode = '23503'; end if;
  select coalesce(sum(monto),0) into v_paid from public.certificado_pagos
  where certificado_id = new.certificado_id and id <> coalesce(new.id, extensions.gen_random_uuid());
  if v_paid + new.monto > v_total + 0.01 then raise exception 'payment exceeds certificate balance' using errcode = '23514'; end if;
  return new;
end;
$$;
alter function private.validate_certificado_pago() owner to postgres;
revoke execute on function private.validate_certificado_pago() from public, anon, authenticated, service_role;
create trigger certificado_pagos_validate before insert or update on public.certificado_pagos for each row execute function private.validate_certificado_pago();

create or replace function api.save_purchase_order(p_order jsonb, p_items jsonb, p_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_company uuid := private.current_company_id(); v_id uuid; v_number text; v_item jsonb;
  v_subtotal numeric := 0; v_iva numeric; v_total numeric; v_iva_pct numeric; v_inc_iva boolean;
begin
  if (select auth.uid()) is null or not private.has_permission('compras.manage') then raise exception 'not authorized' using errcode = '42501'; end if;
  if v_company is null then raise exception 'active membership required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_company::text || ':purchase_order', 0));
  select coalesce(sum((x->>'cantidad')::numeric * (x->>'precio_unitario')::numeric),0) into v_subtotal from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) x;
  v_inc_iva := coalesce((p_order->>'incluir_iva')::boolean,true);
  v_iva_pct := coalesce((p_order->>'iva_porcentaje')::numeric,21);
  v_iva := case when v_inc_iva then round(v_subtotal * v_iva_pct / 100, 2) else 0 end;
  v_total := v_subtotal + v_iva + coalesce((p_order->>'percepcion_iva')::numeric,0) + coalesce((p_order->>'percepcion_iibb')::numeric,0);
  if p_id is null then
    v_id := extensions.gen_random_uuid();
    v_number := coalesce(nullif(btrim(p_order->>'numero'),''), 'OC-' || extract(year from (p_order->>'fecha')::date)::text || '-' || lpad(((select count(*)+1 from public.ordenes_compra where company_id=v_company))::text,4,'0'));
    insert into public.ordenes_compra(id,company_id,numero,numero_factura,fecha,proveedor_id,obra_id,maquinaria_id,sector,estado,incluir_iva,iva_porcentaje,percepcion_iva,percepcion_iibb,moneda,subtotal,iva,total,condiciones_pago,fecha_entrega_estimada,observaciones)
    values(v_id,v_company,v_number,nullif(btrim(p_order->>'numero_factura'),''),(p_order->>'fecha')::date,(p_order->>'proveedor_id')::uuid,nullif(p_order->>'obra_id','')::uuid,nullif(p_order->>'maquinaria_id','')::uuid,nullif(btrim(p_order->>'sector'),''),coalesce(p_order->>'estado','borrador'),v_inc_iva,v_iva_pct,coalesce((p_order->>'percepcion_iva')::numeric,0),coalesce((p_order->>'percepcion_iibb')::numeric,0),coalesce(p_order->>'moneda','ARS'),v_subtotal,v_iva,v_total,nullif(btrim(p_order->>'condiciones_pago'),''),nullif(p_order->>'fecha_entrega_estimada','')::date,nullif(btrim(p_order->>'observaciones'),''));
  else
    v_id := p_id;
    update public.ordenes_compra set
      numero=coalesce(nullif(btrim(p_order->>'numero'),''),numero), numero_factura=nullif(btrim(p_order->>'numero_factura'),''), fecha=(p_order->>'fecha')::date,
      proveedor_id=(p_order->>'proveedor_id')::uuid, obra_id=nullif(p_order->>'obra_id','')::uuid, maquinaria_id=nullif(p_order->>'maquinaria_id','')::uuid,
      sector=nullif(btrim(p_order->>'sector'),''), estado=coalesce(p_order->>'estado',estado), incluir_iva=v_inc_iva, iva_porcentaje=v_iva_pct,
      percepcion_iva=coalesce((p_order->>'percepcion_iva')::numeric,0), percepcion_iibb=coalesce((p_order->>'percepcion_iibb')::numeric,0), moneda=coalesce(p_order->>'moneda','ARS'),
      subtotal=v_subtotal, iva=v_iva, total=v_total, condiciones_pago=nullif(btrim(p_order->>'condiciones_pago'),''), fecha_entrega_estimada=nullif(p_order->>'fecha_entrega_estimada','')::date, observaciones=nullif(btrim(p_order->>'observaciones'),'')
    where id=v_id and company_id=v_company;
    if not found then raise exception 'purchase order not found' using errcode='P0002'; end if;
    delete from public.orden_compra_items where orden_id=v_id;
  end if;
  for v_item in select value from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    insert into public.orden_compra_items(company_id,orden_id,articulo,descripcion,unidad,cantidad,precio_unitario,subtotal,orden)
    values(v_company,v_id,nullif(btrim(v_item->>'articulo'),''),btrim(v_item->>'descripcion'),coalesce(nullif(btrim(v_item->>'unidad'),''),'un'),(v_item->>'cantidad')::numeric,(v_item->>'precio_unitario')::numeric,round((v_item->>'cantidad')::numeric*(v_item->>'precio_unitario')::numeric,2),coalesce((v_item->>'orden')::integer,0));
  end loop;
  return v_id;
end;
$$;
alter function api.save_purchase_order(jsonb,jsonb,uuid) owner to postgres;
revoke execute on function api.save_purchase_order(jsonb,jsonb,uuid) from public, anon, service_role;
grant execute on function api.save_purchase_order(jsonb,jsonb,uuid) to authenticated;

create or replace function api.save_quote(p_quote jsonb, p_categories jsonb, p_items jsonb, p_advances jsonb, p_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_company uuid := private.current_company_id(); v_id uuid; v_cat uuid; v_cat_ids uuid[] := array[]::uuid[];
  v_row jsonb; v_idx integer; v_subtotal numeric := 0; v_iva numeric := 0;
begin
  if (select auth.uid()) is null or not private.has_permission('cotizaciones.manage') then raise exception 'not authorized' using errcode='42501'; end if;
  if p_id is null then
    v_id := extensions.gen_random_uuid();
    insert into public.cotizaciones(id,company_id,numero,obra_id,descripcion,estado,fecha_creacion,fecha_vencimiento,responsable,moneda,anticipo_tipo,anticipo_valor,anticipo_monto)
    values(v_id,v_company,btrim(p_quote->>'numero'),nullif(p_quote->>'obra_id','')::uuid,btrim(p_quote->>'descripcion'),coalesce(p_quote->>'estado','borrador'),(p_quote->>'fecha_creacion')::date,(p_quote->>'fecha_vencimiento')::date,btrim(p_quote->>'responsable'),coalesce(p_quote->>'moneda','ARS'),coalesce(p_quote->>'anticipo_tipo','ninguno'),coalesce((p_quote->>'anticipo_valor')::numeric,0),coalesce((p_quote->>'anticipo_monto')::numeric,0));
  else
    v_id := p_id;
    update public.cotizaciones set numero=btrim(p_quote->>'numero'),obra_id=nullif(p_quote->>'obra_id','')::uuid,descripcion=btrim(p_quote->>'descripcion'),estado=coalesce(p_quote->>'estado',estado),fecha_creacion=(p_quote->>'fecha_creacion')::date,fecha_vencimiento=(p_quote->>'fecha_vencimiento')::date,responsable=btrim(p_quote->>'responsable'),notas=nullif(btrim(p_quote->>'notas'),''),moneda=coalesce(p_quote->>'moneda','ARS'),anticipo_tipo=coalesce(p_quote->>'anticipo_tipo','ninguno'),anticipo_valor=coalesce((p_quote->>'anticipo_valor')::numeric,0),anticipo_monto=coalesce((p_quote->>'anticipo_monto')::numeric,0) where id=v_id and company_id=v_company;
    if not found then raise exception 'quote not found' using errcode='P0002'; end if;
    delete from public.cotizacion_items where cotizacion_id=v_id;
    delete from public.cotizacion_categorias where cotizacion_id=v_id;
    delete from public.cotizacion_anticipos where cotizacion_id=v_id;
  end if;
  for v_row in select value from jsonb_array_elements(coalesce(p_categories,'[]'::jsonb)) loop
    v_cat := extensions.gen_random_uuid(); v_cat_ids := array_append(v_cat_ids,v_cat);
    insert into public.cotizacion_categorias(id,company_id,cotizacion_id,numero,nombre,orden) values(v_cat,v_company,v_id,(v_row->>'numero')::integer,btrim(v_row->>'nombre'),(v_row->>'orden')::integer);
  end loop;
  for v_row in select value from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    v_idx := nullif(v_row->>'categoria_index','')::integer;
    insert into public.cotizacion_items(company_id,cotizacion_id,categoria_id,numero,descripcion,unidad,cantidad,cantidad_m2,altura_promedio,cantidad_m3,precio_unitario,subtotal,total)
    values(v_company,v_id,case when v_idx is null then null else v_cat_ids[v_idx+1] end,nullif(btrim(v_row->>'numero'),''),btrim(v_row->>'descripcion'),btrim(v_row->>'unidad'),coalesce((v_row->>'cantidad')::numeric,0),coalesce((v_row->>'cantidad_m2')::numeric,0),coalesce((v_row->>'altura_promedio')::numeric,0),coalesce((v_row->>'cantidad_m3')::numeric,0),coalesce((v_row->>'precio_unitario')::numeric,0),coalesce((v_row->>'subtotal')::numeric,0),coalesce((v_row->>'total')::numeric,0));
    v_subtotal := v_subtotal + coalesce((v_row->>'total')::numeric,0);
  end loop;
  for v_row in select value from jsonb_array_elements(coalesce(p_advances,'[]'::jsonb)) loop
    if coalesce((v_row->>'valor')::numeric,0) > 0 then insert into public.cotizacion_anticipos(company_id,cotizacion_id,descripcion,tipo,valor,monto,orden) values(v_company,v_id,coalesce(nullif(btrim(v_row->>'descripcion'),''),'Anticipo'),v_row->>'tipo',(v_row->>'valor')::numeric,coalesce((v_row->>'monto')::numeric,0),coalesce((v_row->>'orden')::integer,0)); end if;
  end loop;
  v_iva := greatest(coalesce((p_quote->>'iva')::numeric,0),0);
  update public.cotizaciones set subtotal=v_subtotal,iva=v_iva,total=v_subtotal+v_iva,notas=nullif(btrim(p_quote->>'notas'),'') where id=v_id;
  return v_id;
end;
$$;
alter function api.save_quote(jsonb,jsonb,jsonb,jsonb,uuid) owner to postgres;
revoke execute on function api.save_quote(jsonb,jsonb,jsonb,jsonb,uuid) from public, anon, service_role;
grant execute on function api.save_quote(jsonb,jsonb,jsonb,jsonb,uuid) to authenticated;

create or replace function api.save_certificate(p_certificate jsonb, p_items jsonb, p_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_company uuid := private.current_company_id(); v_id uuid; v_row jsonb; v_subtotal numeric := 0; v_iva numeric;
begin
  if (select auth.uid()) is null or not private.has_permission('certificados.manage') then raise exception 'not authorized' using errcode='42501'; end if;
  select coalesce(sum((x->>'subtotal')::numeric),0) into v_subtotal from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) x;
  v_iva := case when coalesce((p_certificate->>'incluir_iva')::boolean,true) then round(v_subtotal*0.21,2) else 0 end;
  if p_id is null then
    v_id := extensions.gen_random_uuid();
    insert into public.certificados(id,company_id,obra_id,numero,periodo,estado,fecha_certificado,subtotal,iva,total,observaciones,tipo,anticipo_porcentaje,incluir_iva)
    values(v_id,v_company,(p_certificate->>'obra_id')::uuid,btrim(p_certificate->>'numero'),p_certificate->>'periodo','borrador',coalesce(nullif(p_certificate->>'fecha_certificado','')::date,current_date),v_subtotal,v_iva,v_subtotal+v_iva,nullif(btrim(p_certificate->>'observaciones'),''),coalesce(p_certificate->>'tipo','servicio'),coalesce((p_certificate->>'anticipo_porcentaje')::numeric,0),coalesce((p_certificate->>'incluir_iva')::boolean,true));
  else
    v_id := p_id;
    update public.certificados set periodo=p_certificate->>'periodo',numero=coalesce(nullif(btrim(p_certificate->>'numero'),''),numero),fecha_certificado=coalesce(nullif(p_certificate->>'fecha_certificado','')::date,fecha_certificado),subtotal=v_subtotal,iva=v_iva,total=v_subtotal+v_iva,observaciones=nullif(btrim(p_certificate->>'observaciones'),''),tipo=coalesce(p_certificate->>'tipo',tipo),anticipo_porcentaje=coalesce((p_certificate->>'anticipo_porcentaje')::numeric,0),incluir_iva=coalesce((p_certificate->>'incluir_iva')::boolean,true) where id=v_id and company_id=v_company;
    if not found then raise exception 'certificate not found' using errcode='P0002'; end if;
    delete from public.certificado_items where certificado_id=v_id;
  end if;
  for v_row in select value from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    insert into public.certificado_items(company_id,certificado_id,concepto_id,descripcion,unidad,cantidad,precio_unitario,subtotal,etapa,seccion,observaciones)
    values(v_company,v_id,nullif(v_row->>'concepto_id','')::uuid,btrim(v_row->>'descripcion'),btrim(v_row->>'unidad'),coalesce((v_row->>'cantidad')::numeric,0),coalesce((v_row->>'precio_unitario')::numeric,0),coalesce((v_row->>'subtotal')::numeric,0),nullif(btrim(v_row->>'etapa'),''),nullif(btrim(v_row->>'seccion'),''),nullif(btrim(v_row->>'observaciones'),''));
  end loop;
  return v_id;
end;
$$;
alter function api.save_certificate(jsonb,jsonb,uuid) owner to postgres;
revoke execute on function api.save_certificate(jsonb,jsonb,uuid) from public, anon, service_role;
grant execute on function api.save_certificate(jsonb,jsonb,uuid) to authenticated;

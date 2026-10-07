-- CALAMINA ERP v2 - RRHH completo sobre la identidad e IAM v2.

insert into iam.permissions (id, key, description) values
  ('20000000-0000-4000-8000-000000000034', 'rrhh.view', 'Consultar vacaciones, EPP y datos laborales de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000035', 'rrhh.manage', 'Administrar vacaciones, EPP y datos laborales de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000036', 'rrhh.payroll', 'Administrar datos salariales, liquidaciones, adelantos y prestamos.'),
  ('20000000-0000-4000-8000-000000000037', 'rrhh.documents', 'Administrar documentos laborales de la empresa activa.');

insert into iam.role_permissions (role_id, permission_id)
select '10000000-0000-4000-8000-000000000001'::uuid, id
from iam.permissions
where id between '20000000-0000-4000-8000-000000000034'::uuid
  and '20000000-0000-4000-8000-000000000037'::uuid;

alter table public.personal
  add column dni text,
  add column telefono text,
  add column fecha_ingreso date,
  add column licencia text,
  add column vencimiento_licencia date,
  add column situacion_laboral text,
  add constraint personal_dni_check check (dni is null or (dni = btrim(dni) and dni <> '')),
  add constraint personal_telefono_check check (telefono is null or (telefono = btrim(telefono) and telefono <> '')),
  add constraint personal_licencia_check check (licencia is null or (licencia = btrim(licencia) and licencia <> '')),
  add constraint personal_situacion_check check (situacion_laboral is null or situacion_laboral in ('registrado','monotributista','contratado','eventual')),
  add constraint personal_licencia_fecha_check check (vencimiento_licencia is null or licencia is not null);

create unique index personal_company_dni_key on public.personal(company_id, dni) where dni is not null;

create table public.vacaciones (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  personal_id uuid not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  dias_totales integer not null,
  motivo text not null default 'vacaciones',
  estado text not null default 'aprobada',
  observaciones text,
  pagada boolean not null default false,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vacaciones_personal_company_fkey foreign key(company_id, personal_id) references public.personal(company_id, id) on delete restrict,
  constraint vacaciones_fechas_check check (fecha_fin >= fecha_inicio),
  constraint vacaciones_dias_check check (dias_totales > 0 and dias_totales = fecha_fin - fecha_inicio + 1),
  constraint vacaciones_motivo_check check (motivo in ('vacaciones','licencia_medica','permiso_personal','otro')),
  constraint vacaciones_estado_check check (estado in ('pendiente','aprobada','rechazada')),
  constraint vacaciones_aprobacion_check check ((estado = 'aprobada' and approved_at is not null) or (estado <> 'aprobada' and approved_at is null)),
  constraint vacaciones_observaciones_check check (observaciones is null or (observaciones = btrim(observaciones) and observaciones <> ''))
);
create index vacaciones_company_fecha_idx on public.vacaciones(company_id, fecha_inicio desc);
create index vacaciones_personal_fecha_idx on public.vacaciones(personal_id, fecha_inicio desc);

create table public.entregas_epp (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  personal_id uuid not null,
  fecha date not null,
  estado text not null default 'entregado',
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entregas_epp_company_id_key unique(company_id, id),
  constraint entregas_epp_personal_company_fkey foreign key(company_id, personal_id) references public.personal(company_id, id) on delete restrict,
  constraint entregas_epp_estado_check check (estado in ('pendiente','entregado','devuelto')),
  constraint entregas_epp_observaciones_check check (observaciones is null or (observaciones = btrim(observaciones) and observaciones <> ''))
);
create index entregas_epp_personal_fecha_idx on public.entregas_epp(personal_id, fecha desc);

create table public.entrega_epp_items (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  entrega_id uuid not null,
  producto text not null,
  tipo_modelo text not null default '',
  marca text not null default '',
  posee_certificacion boolean not null default false,
  cantidad integer not null default 1,
  created_at timestamptz not null default now(),
  constraint entrega_epp_items_entrega_company_fkey foreign key(company_id, entrega_id) references public.entregas_epp(company_id, id) on delete cascade,
  constraint entrega_epp_items_text_check check (producto = btrim(producto) and producto <> '' and tipo_modelo = btrim(tipo_modelo) and marca = btrim(marca)),
  constraint entrega_epp_items_cantidad_check check (cantidad > 0)
);
create index entrega_epp_items_entrega_idx on public.entrega_epp_items(entrega_id);

create table public.liquidacion_config_personal (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  personal_id uuid not null,
  modalidad text not null default 'mensual',
  sueldo_blanco numeric(14,2) not null default 0,
  sueldo_negro numeric(14,2) not null default 0,
  monto_banco_fijo numeric(14,2) not null default 0,
  resto_efectivo boolean not null default true,
  presentismo_monto numeric(14,2) not null default 0,
  presentismo_porcentaje numeric(7,4) not null default 0,
  embargo boolean not null default false,
  embargo_nota text,
  cbu text,
  banco text,
  numero_cuenta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint liquidacion_config_personal_company_fkey foreign key(company_id, personal_id) references public.personal(company_id, id) on delete restrict,
  constraint liquidacion_config_personal_key unique(company_id, personal_id),
  constraint liquidacion_config_modalidad_check check (modalidad in ('mensual','quincenal','ambas')),
  constraint liquidacion_config_amounts_check check (sueldo_blanco >= 0 and sueldo_negro >= 0 and monto_banco_fijo >= 0 and presentismo_monto >= 0 and presentismo_porcentaje between 0 and 100)
);

create table public.liquidaciones (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  periodo text not null,
  mes integer not null,
  anio integer not null,
  estado text not null default 'borrador',
  fecha_pago date,
  total_blanco numeric(14,2) not null default 0,
  total_negro numeric(14,2) not null default 0,
  total_banco numeric(14,2) not null default 0,
  total_efectivo numeric(14,2) not null default 0,
  total_neto numeric(14,2) not null default 0,
  observaciones text,
  cerrada_at timestamptz,
  pagada_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint liquidaciones_periodo_check check (periodo in ('quincena_1','quincena_2','mes')),
  constraint liquidaciones_mes_anio_check check (mes between 1 and 12 and anio between 2000 and 2200),
  constraint liquidaciones_estado_check check (estado in ('borrador','cerrada','pagada')),
  constraint liquidaciones_company_id_key unique(company_id, id),
  constraint liquidaciones_key unique(company_id, periodo, mes, anio)
);
create index liquidaciones_company_period_idx on public.liquidaciones(company_id, anio desc, mes desc);

create table public.liquidacion_items (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  liquidacion_id uuid not null,
  personal_id uuid not null,
  bruto_blanco numeric(14,2) not null default 0,
  bruto_negro numeric(14,2) not null default 0,
  dias_falta numeric(8,2) not null default 0,
  dias_licencia numeric(8,2) not null default 0,
  horas_extras_50 numeric(10,2) not null default 0,
  horas_extras_100 numeric(10,2) not null default 0,
  importe_he numeric(14,2) not null default 0,
  presentismo numeric(14,2) not null default 0,
  adelantos numeric(14,2) not null default 0,
  cuota_prestamo numeric(14,2) not null default 0,
  otros_descuentos numeric(14,2) not null default 0,
  otros_adicionales numeric(14,2) not null default 0,
  neto_blanco numeric(14,2) not null default 0,
  neto_negro numeric(14,2) not null default 0,
  neto_total numeric(14,2) not null default 0,
  monto_banco numeric(14,2) not null default 0,
  monto_efectivo numeric(14,2) not null default 0,
  embargo boolean not null default false,
  cbu_snapshot text,
  banco_snapshot text,
  numero_cuenta_snapshot text,
  pagado boolean not null default false,
  pagado_at timestamptz,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint liquidacion_items_liquidacion_company_fkey foreign key(company_id, liquidacion_id) references public.liquidaciones(company_id, id) on delete cascade,
  constraint liquidacion_items_personal_company_fkey foreign key(company_id, personal_id) references public.personal(company_id, id) on delete restrict,
  constraint liquidacion_items_key unique(liquidacion_id, personal_id),
  constraint liquidacion_items_amounts_check check (bruto_blanco >= 0 and bruto_negro >= 0 and dias_falta >= 0 and dias_licencia >= 0 and horas_extras_50 >= 0 and horas_extras_100 >= 0 and importe_he >= 0 and presentismo >= 0 and adelantos >= 0 and cuota_prestamo >= 0 and otros_descuentos >= 0 and otros_adicionales >= 0 and neto_blanco >= 0 and neto_negro >= 0 and neto_total >= 0 and monto_banco >= 0 and monto_efectivo >= 0)
);
create index liquidacion_items_liquidacion_idx on public.liquidacion_items(liquidacion_id);
create index liquidacion_items_personal_idx on public.liquidacion_items(personal_id);

create table public.adelantos_personal (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  personal_id uuid not null,
  fecha date not null,
  monto numeric(14,2) not null,
  motivo text,
  estado text not null default 'pendiente',
  liquidacion_id uuid references public.liquidaciones(id) on delete set null,
  aplicado_at timestamptz,
  created_at timestamptz not null default now(),
  constraint adelantos_personal_company_fkey foreign key(company_id, personal_id) references public.personal(company_id, id) on delete restrict,
  constraint adelantos_monto_check check (monto > 0),
  constraint adelantos_estado_check check (estado in ('pendiente','aplicado','cancelado'))
);

create table public.prestamos_personal (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  personal_id uuid not null,
  fecha date not null,
  monto_total numeric(14,2) not null,
  cantidad_cuotas integer not null,
  monto_cuota numeric(14,2) not null,
  motivo text,
  estado text not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prestamos_personal_company_id_key unique(company_id, id),
  constraint prestamos_personal_company_fkey foreign key(company_id, personal_id) references public.personal(company_id, id) on delete restrict,
  constraint prestamos_amounts_check check (monto_total > 0 and cantidad_cuotas > 0 and monto_cuota > 0),
  constraint prestamos_estado_check check (estado in ('activo','saldado','cancelado'))
);

create table public.prestamo_cuotas (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  prestamo_id uuid not null,
  numero_cuota integer not null,
  monto numeric(14,2) not null,
  pagada boolean not null default false,
  liquidacion_id uuid references public.liquidaciones(id) on delete set null,
  pagada_at timestamptz,
  created_at timestamptz not null default now(),
  constraint prestamo_cuotas_prestamo_company_fkey foreign key(company_id, prestamo_id) references public.prestamos_personal(company_id, id) on delete cascade,
  constraint prestamo_cuotas_key unique(prestamo_id, numero_cuota),
  constraint prestamo_cuotas_check check (numero_cuota > 0 and monto > 0)
);

create table public.empleado_documentos (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  personal_id uuid not null,
  tipo text not null,
  titulo text not null,
  periodo text,
  descripcion text,
  storage_path text not null unique,
  mime_type text,
  tamano_bytes bigint,
  nombre_original text,
  uploaded_by uuid references auth.users(id) on delete set null,
  visto_at timestamptz,
  firma_data_url text,
  firmado_at timestamptz,
  firmado_ip inet,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint empleado_documentos_personal_company_fkey foreign key(company_id, personal_id) references public.personal(company_id, id) on delete restrict,
  constraint empleado_documentos_tipo_check check (tipo in ('estudio_medico','recibo_sueldo')),
  constraint empleado_documentos_titulo_check check (titulo = btrim(titulo) and titulo <> ''),
  constraint empleado_documentos_path_check check (storage_path = btrim(storage_path) and storage_path <> ''),
  constraint empleado_documentos_size_check check (tamano_bytes is null or tamano_bytes between 0 and 10485760)
);
create index empleado_documentos_personal_idx on public.empleado_documentos(personal_id, created_at desc);

-- Deny by default, then expose only the intended authenticated surface.
alter table public.vacaciones enable row level security;
alter table public.entregas_epp enable row level security;
alter table public.entrega_epp_items enable row level security;
alter table public.liquidacion_config_personal enable row level security;
alter table public.liquidaciones enable row level security;
alter table public.liquidacion_items enable row level security;
alter table public.adelantos_personal enable row level security;
alter table public.prestamos_personal enable row level security;
alter table public.prestamo_cuotas enable row level security;
alter table public.empleado_documentos enable row level security;

revoke all on public.vacaciones, public.entregas_epp, public.entrega_epp_items,
  public.liquidacion_config_personal, public.liquidaciones, public.liquidacion_items,
  public.adelantos_personal, public.prestamos_personal, public.prestamo_cuotas,
  public.empleado_documentos from public, anon, authenticated, service_role;

grant select, insert, update, delete on public.vacaciones to authenticated;
grant select, update, delete on public.entregas_epp to authenticated;
grant select on public.entrega_epp_items to authenticated;
grant select, insert, update, delete on public.liquidacion_config_personal, public.adelantos_personal to authenticated;
grant select, update, delete on public.liquidaciones, public.prestamos_personal to authenticated;
grant select, update on public.liquidacion_items, public.prestamo_cuotas to authenticated;
grant select, insert, delete on public.empleado_documentos to authenticated;

create policy vacaciones_select on public.vacaciones for select to authenticated using (
  company_id = (select private.current_company_id()) and ((select private.has_permission('rrhh.view')) or personal_id = (select private.current_personal_id()))
);
create policy vacaciones_manage on public.vacaciones for all to authenticated using (
  company_id = (select private.current_company_id()) and (select private.has_permission('rrhh.manage'))
) with check (company_id = (select private.current_company_id()) and (select private.has_permission('rrhh.manage')));

create policy entregas_epp_select on public.entregas_epp for select to authenticated using (
  company_id = (select private.current_company_id()) and ((select private.has_permission('rrhh.view')) or personal_id = (select private.current_personal_id()))
);
create policy entregas_epp_manage on public.entregas_epp for all to authenticated using (
  company_id = (select private.current_company_id()) and (select private.has_permission('rrhh.manage'))
) with check (company_id = (select private.current_company_id()) and (select private.has_permission('rrhh.manage')));
create policy entrega_epp_items_select on public.entrega_epp_items for select to authenticated using (
  company_id = (select private.current_company_id()) and exists (
    select 1 from public.entregas_epp e where e.id = entrega_id and (private.has_permission('rrhh.view') or e.personal_id = private.current_personal_id())
  )
);

create policy payroll_config_admin on public.liquidacion_config_personal for all to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('rrhh.payroll'))) with check (company_id = (select private.current_company_id()) and (select private.has_permission('rrhh.payroll')));
create policy payroll_headers_admin on public.liquidaciones for all to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('rrhh.payroll'))) with check (company_id = (select private.current_company_id()) and (select private.has_permission('rrhh.payroll')));
create policy payroll_items_admin on public.liquidacion_items for all to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('rrhh.payroll'))) with check (company_id = (select private.current_company_id()) and (select private.has_permission('rrhh.payroll')));
create policy payroll_advances_admin on public.adelantos_personal for all to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('rrhh.payroll'))) with check (company_id = (select private.current_company_id()) and (select private.has_permission('rrhh.payroll')));
create policy payroll_loans_admin on public.prestamos_personal for all to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('rrhh.payroll'))) with check (company_id = (select private.current_company_id()) and (select private.has_permission('rrhh.payroll')));
create policy payroll_installments_admin on public.prestamo_cuotas for all to authenticated using (company_id = (select private.current_company_id()) and (select private.has_permission('rrhh.payroll'))) with check (company_id = (select private.current_company_id()) and (select private.has_permission('rrhh.payroll')));

create policy empleado_documentos_select on public.empleado_documentos for select to authenticated using (
  company_id = (select private.current_company_id()) and ((select private.has_permission('rrhh.documents')) or personal_id = (select private.current_personal_id()))
);
create policy empleado_documentos_insert on public.empleado_documentos for insert to authenticated with check (
  company_id = (select private.current_company_id()) and (select private.has_permission('rrhh.documents'))
);
create policy empleado_documentos_delete on public.empleado_documentos for delete to authenticated using (
  company_id = (select private.current_company_id()) and (select private.has_permission('rrhh.documents'))
);
create policy empleado_documentos_update_own on public.empleado_documentos for update to authenticated using (
  company_id = (select private.current_company_id()) and personal_id = (select private.current_personal_id())
) with check (company_id = (select private.current_company_id()) and personal_id = (select private.current_personal_id()));

create trigger vacaciones_updated_at before update on public.vacaciones for each row execute function private.set_updated_at();
create trigger entregas_epp_updated_at before update on public.entregas_epp for each row execute function private.set_updated_at();
create trigger liquidacion_config_updated_at before update on public.liquidacion_config_personal for each row execute function private.set_updated_at();
create trigger liquidaciones_updated_at before update on public.liquidaciones for each row execute function private.set_updated_at();
create trigger liquidacion_items_updated_at before update on public.liquidacion_items for each row execute function private.set_updated_at();
create trigger prestamos_updated_at before update on public.prestamos_personal for each row execute function private.set_updated_at();
create trigger empleado_documentos_updated_at before update on public.empleado_documentos for each row execute function private.set_updated_at();

create trigger vacaciones_audit after insert or update or delete on public.vacaciones for each row execute function private.audit_operational_change('vacaciones');
create trigger entregas_epp_audit after insert or update or delete on public.entregas_epp for each row execute function private.audit_operational_change('entrega_epp');
create trigger liquidaciones_audit after insert or update or delete on public.liquidaciones for each row execute function private.audit_operational_change('liquidacion');
create trigger adelantos_audit after insert or update or delete on public.adelantos_personal for each row execute function private.audit_operational_change('adelanto');
create trigger prestamos_audit after insert or update or delete on public.prestamos_personal for each row execute function private.audit_operational_change('prestamo');
create trigger empleado_documentos_audit after insert or delete on public.empleado_documentos for each row execute function private.audit_operational_change('empleado_documento');

create or replace function private.audit_employee_document_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := (select auth.uid());
begin
  perform private.write_audit(
    case when v_actor is null then 'system' else 'user' end,
    'empleado_documento.updated', 'empleado_documento', new.id,
    jsonb_build_object('visto_at',old.visto_at,'firmado_at',old.firmado_at),
    jsonb_build_object('visto_at',new.visto_at,'firmado_at',new.firmado_at),
    extensions.gen_random_uuid(), jsonb_build_object('source','public.empleado_documentos'), v_actor
  );
  return new;
end; $$;
alter function private.audit_employee_document_status() owner to postgres;
revoke execute on function private.audit_employee_document_status() from public, anon, authenticated, service_role;
create trigger empleado_documentos_status_audit after update on public.empleado_documentos
for each row when (old.visto_at is distinct from new.visto_at or old.firmado_at is distinct from new.firmado_at)
execute function private.audit_employee_document_status();

create or replace function api.list_rrhh_personal()
returns table(id uuid, nombre text, apellido text, dni text, rol text, email text, telefono text,
  fecha_ingreso date, activo boolean, licencia text, vencimiento_licencia date, legajo text,
  situacion_laboral text, job_title text, modalidad_pago text, banco text, numero_cuenta text,
  has_user boolean, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.first_name, p.last_name, p.dni, p.work_role, p.work_email::text, p.telefono,
    p.fecha_ingreso, p.status = 'active', p.licencia, p.vencimiento_licencia, p.internal_code::text,
    p.situacion_laboral, p.job_title,
    case when private.has_permission('rrhh.payroll') then c.modalidad else null end,
    case when private.has_permission('rrhh.payroll') then c.banco else null end,
    case when private.has_permission('rrhh.payroll') then c.numero_cuenta else null end,
    exists(select 1 from public.company_memberships m where m.personal_id=p.id),
    p.created_at, p.updated_at
  from public.personal p
  left join public.liquidacion_config_personal c on c.company_id = p.company_id and c.personal_id = p.id
  where p.company_id = private.current_company_id()
    and private.has_permission('rrhh.view')
  order by p.last_name, p.first_name;
$$;
alter function api.list_rrhh_personal() owner to postgres;
revoke all on function api.list_rrhh_personal() from public, anon, authenticated, service_role;
grant execute on function api.list_rrhh_personal() to authenticated;

create or replace function api.update_personal_work_data(
  p_personal_id uuid, p_dni text default null, p_telefono text default null,
  p_fecha_ingreso date default null, p_licencia text default null,
  p_vencimiento_licencia date default null, p_situacion_laboral text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare v_company uuid := private.current_company_id(); v_actor uuid := (select auth.uid()); v_before public.personal%rowtype;
begin
  if v_actor is null
     or not private.has_permission('personal.manage')
     or not private.has_permission('rrhh.manage') then
    raise exception 'not authorized' using errcode='42501';
  end if;

  select * into v_before from public.personal where id=p_personal_id and company_id=v_company for update;
  if not found then raise exception 'personal not found' using errcode='P0002'; end if;

  update public.personal
  set dni=nullif(btrim(p_dni),''), telefono=nullif(btrim(p_telefono),''), fecha_ingreso=p_fecha_ingreso,
      licencia=nullif(btrim(p_licencia),''), vencimiento_licencia=p_vencimiento_licencia,
      situacion_laboral=nullif(btrim(p_situacion_laboral),'')
  where id=p_personal_id and company_id=v_company;
  perform private.write_audit(
    'user','personal.work_data_updated','personal',p_personal_id,
    jsonb_build_object('fields_present',jsonb_build_array(
      case when v_before.dni is not null then 'dni' end,
      case when v_before.telefono is not null then 'telefono' end,
      case when v_before.fecha_ingreso is not null then 'fecha_ingreso' end,
      case when v_before.licencia is not null then 'licencia' end,
      case when v_before.vencimiento_licencia is not null then 'vencimiento_licencia' end,
      case when v_before.situacion_laboral is not null then 'situacion_laboral' end
    )),
    jsonb_build_object('changed_fields',to_jsonb(array_remove(array[
      case when v_before.dni is distinct from nullif(btrim(p_dni),'') then 'dni' end,
      case when v_before.telefono is distinct from nullif(btrim(p_telefono),'') then 'telefono' end,
      case when v_before.fecha_ingreso is distinct from p_fecha_ingreso then 'fecha_ingreso' end,
      case when v_before.licencia is distinct from nullif(btrim(p_licencia),'') then 'licencia' end,
      case when v_before.vencimiento_licencia is distinct from p_vencimiento_licencia then 'vencimiento_licencia' end,
      case when v_before.situacion_laboral is distinct from nullif(btrim(p_situacion_laboral),'') then 'situacion_laboral' end
    ],null))),
    extensions.gen_random_uuid(),jsonb_build_object('source','api.update_personal_work_data'),v_actor
  );
end; $$;
alter function api.update_personal_work_data(uuid,text,text,date,text,date,text) owner to postgres;
revoke all on function api.update_personal_work_data(uuid,text,text,date,text,date,text) from public, anon, service_role;
grant execute on function api.update_personal_work_data(uuid,text,text,date,text,date,text) to authenticated;

create or replace function api.create_epp_delivery(p_personal_id uuid, p_fecha date, p_items jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_company uuid := private.current_company_id(); v_id uuid; v_item jsonb;
begin
  if (select auth.uid()) is null or not private.has_permission('rrhh.manage') then raise exception 'not authorized' using errcode='42501'; end if;
  insert into public.entregas_epp(company_id, personal_id, fecha) values(v_company, p_personal_id, p_fecha) returning id into v_id;
  for v_item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    insert into public.entrega_epp_items(company_id, entrega_id, producto, tipo_modelo, marca, posee_certificacion, cantidad)
    values(v_company, v_id, btrim(v_item->>'producto'), btrim(coalesce(v_item->>'tipo_modelo','')), btrim(coalesce(v_item->>'marca','')),
      coalesce((v_item->>'posee_certificacion')::boolean,false), coalesce((v_item->>'cantidad')::integer,1));
  end loop;
  return v_id;
end; $$;
alter function api.create_epp_delivery(uuid,date,jsonb) owner to postgres;
revoke all on function api.create_epp_delivery(uuid,date,jsonb) from public, anon, service_role;
grant execute on function api.create_epp_delivery(uuid,date,jsonb) to authenticated;

create or replace function api.create_payroll(p_periodo text, p_mes integer, p_anio integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_company uuid := private.current_company_id(); v_id uuid; v_factor numeric;
begin
  if (select auth.uid()) is null or not private.has_permission('rrhh.payroll') then raise exception 'not authorized' using errcode='42501'; end if;
  if p_periodo not in ('quincena_1','quincena_2','mes') then raise exception 'invalid period' using errcode='22023'; end if;
  v_factor := case when p_periodo = 'mes' then 1 else 0.5 end;
  insert into public.liquidaciones(company_id, periodo, mes, anio) values(v_company,p_periodo,p_mes,p_anio) returning id into v_id;
  insert into public.liquidacion_items(company_id, liquidacion_id, personal_id, bruto_blanco, bruto_negro, presentismo,
    neto_blanco, neto_negro, neto_total, monto_banco, monto_efectivo, embargo, cbu_snapshot, banco_snapshot, numero_cuenta_snapshot)
  select v_company, v_id, c.personal_id, c.sueldo_blanco*v_factor, c.sueldo_negro*v_factor,
    (c.presentismo_monto + (c.sueldo_blanco+c.sueldo_negro)*c.presentismo_porcentaje/100)*v_factor,
    c.sueldo_blanco*v_factor, c.sueldo_negro*v_factor,
    (c.sueldo_blanco+c.sueldo_negro)*v_factor + (c.presentismo_monto + (c.sueldo_blanco+c.sueldo_negro)*c.presentismo_porcentaje/100)*v_factor,
    least(c.monto_banco_fijo*v_factor,(c.sueldo_blanco+c.sueldo_negro)*v_factor),
    greatest(0,(c.sueldo_blanco+c.sueldo_negro)*v_factor-c.monto_banco_fijo*v_factor),
    c.embargo,c.cbu,c.banco,c.numero_cuenta
  from public.liquidacion_config_personal c join public.personal p on p.id=c.personal_id and p.company_id=c.company_id
  where c.company_id=v_company and p.status='active'
    and ((p_periodo='mes' and c.modalidad in ('mensual','ambas')) or (p_periodo<>'mes' and c.modalidad in ('quincenal','ambas')));
  return v_id;
end; $$;
alter function api.create_payroll(text,integer,integer) owner to postgres;
revoke all on function api.create_payroll(text,integer,integer) from public, anon, service_role;
grant execute on function api.create_payroll(text,integer,integer) to authenticated;

create or replace function api.create_personal_loan(p_personal_id uuid, p_fecha date, p_monto_total numeric, p_cantidad_cuotas integer, p_motivo text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_company uuid := private.current_company_id(); v_id uuid; v_cuota numeric; i integer;
begin
  if (select auth.uid()) is null or not private.has_permission('rrhh.payroll') then raise exception 'not authorized' using errcode='42501'; end if;
  if p_monto_total <= 0 or p_cantidad_cuotas <= 0 then raise exception 'invalid loan' using errcode='22023'; end if;
  v_cuota := round(p_monto_total/p_cantidad_cuotas,2);
  insert into public.prestamos_personal(company_id,personal_id,fecha,monto_total,cantidad_cuotas,monto_cuota,motivo)
  values(v_company,p_personal_id,p_fecha,p_monto_total,p_cantidad_cuotas,v_cuota,nullif(btrim(p_motivo),'')) returning id into v_id;
  for i in 1..p_cantidad_cuotas loop insert into public.prestamo_cuotas(company_id,prestamo_id,numero_cuota,monto) values(v_company,v_id,i,v_cuota); end loop;
  return v_id;
end; $$;
alter function api.create_personal_loan(uuid,date,numeric,integer,text) owner to postgres;
revoke all on function api.create_personal_loan(uuid,date,numeric,integer,text) from public, anon, service_role;
grant execute on function api.create_personal_loan(uuid,date,numeric,integer,text) to authenticated;

create or replace function api.current_employee_profile()
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when p.id is null then null else jsonb_build_object(
    'id',p.id,'company_id',p.company_id,'internal_code',p.internal_code::text,
    'first_name',p.first_name,'last_name',p.last_name,'work_role',p.work_role,'status',p.status,
    'dni',p.dni,'telefono',p.telefono,'work_email',p.work_email::text,'fecha_ingreso',p.fecha_ingreso,
    'licencia',p.licencia,'vencimiento_licencia',p.vencimiento_licencia,
    'banco',c.banco,'numero_cuenta',c.numero_cuenta
  ) end
  from public.company_memberships m
  join public.personal p on p.id=m.personal_id and p.company_id=m.company_id
  left join public.liquidacion_config_personal c on c.personal_id=p.id and c.company_id=p.company_id
  where m.user_id=(select auth.uid()) and m.status='active';
$$;
alter function api.current_employee_profile() owner to postgres;
revoke all on function api.current_employee_profile() from public, anon, service_role;
grant execute on function api.current_employee_profile() to authenticated;

create or replace function api.mark_own_document_seen(p_document_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or private.current_personal_id() is null then
    raise exception 'not authorized' using errcode='42501';
  end if;
  update public.empleado_documentos
  set visto_at=coalesce(visto_at,now())
  where id=p_document_id and company_id=private.current_company_id()
    and personal_id=private.current_personal_id();
  if not found then raise exception 'document not found' using errcode='P0002'; end if;
end; $$;
alter function api.mark_own_document_seen(uuid) owner to postgres;
revoke all on function api.mark_own_document_seen(uuid) from public, anon, service_role;
grant execute on function api.mark_own_document_seen(uuid) to authenticated;

create or replace function api.sign_own_receipt(p_document_id uuid, p_signature_data_url text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or private.current_personal_id() is null then
    raise exception 'not authorized' using errcode='42501';
  end if;
  if p_signature_data_url is null
     or p_signature_data_url !~ '^data:image/(png|jpeg);base64,'
     or length(p_signature_data_url) > 250000 then
    raise exception 'invalid signature' using errcode='22023';
  end if;
  update public.empleado_documentos
  set firma_data_url=p_signature_data_url, firmado_at=now(), firmado_ip=null, visto_at=coalesce(visto_at,now())
  where id=p_document_id and company_id=private.current_company_id()
    and personal_id=private.current_personal_id() and tipo='recibo_sueldo' and firmado_at is null;
  if not found then raise exception 'receipt not found or already signed' using errcode='P0002'; end if;
end; $$;
alter function api.sign_own_receipt(uuid,text) owner to postgres;
revoke all on function api.sign_own_receipt(uuid,text) from public, anon, service_role;
grant execute on function api.sign_own_receipt(uuid,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('empleado-documentos','empleado-documentos',false,10485760,array['application/pdf','image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy employee_documents_storage_admin on storage.objects for all to authenticated
using (bucket_id='empleado-documentos' and private.has_permission('rrhh.documents') and (storage.foldername(name))[1]=private.current_company_id()::text)
with check (bucket_id='empleado-documentos' and private.has_permission('rrhh.documents') and (storage.foldername(name))[1]=private.current_company_id()::text);
create policy employee_documents_storage_owner_read on storage.objects for select to authenticated
using (bucket_id='empleado-documentos' and (storage.foldername(name))[1]=private.current_company_id()::text and (storage.foldername(name))[2]=private.current_personal_id()::text);

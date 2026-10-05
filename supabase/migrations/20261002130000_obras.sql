-- CALAMINA ERP v2 - minimal Obras domain.
-- The legacy presentation is preserved; only the data contract is replaced.

create table public.clientes (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null,
  nombre text not null,
  cuit text,
  direccion text,
  localidad text,
  telefono text,
  email extensions.citext,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clientes_company_fkey
    foreign key (company_id) references public.companies(id) on delete restrict,
  constraint clientes_company_id_id_key unique (company_id, id),
  constraint clientes_nombre_check
    check (nombre = btrim(nombre) and char_length(nombre) between 1 and 160),
  constraint clientes_cuit_check
    check (cuit is null or (cuit = btrim(cuit) and cuit <> '')),
  constraint clientes_direccion_check
    check (direccion is null or (direccion = btrim(direccion) and direccion <> '')),
  constraint clientes_localidad_check
    check (localidad is null or (localidad = btrim(localidad) and localidad <> '')),
  constraint clientes_telefono_check
    check (telefono is null or (telefono = btrim(telefono) and telefono <> '')),
  constraint clientes_email_check
    check (
      email is null
      or (
        email::text = btrim(email::text)
        and email::text ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      )
    )
);

create unique index clientes_company_cuit_key
  on public.clientes (company_id, cuit)
  where cuit is not null;
create index clientes_company_active_idx
  on public.clientes (company_id, activo, nombre);

alter table public.clientes enable row level security;
revoke all on table public.clientes from public, anon, authenticated, service_role;

create table public.obras (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null,
  nombre text not null,
  numero text,
  ubicacion text,
  descripcion text,
  estado text not null default 'pendiente',
  fecha_inicio date,
  fecha_fin_estimada date,
  responsable_id uuid,
  cliente_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint obras_company_fkey
    foreign key (company_id) references public.companies(id) on delete restrict,
  constraint obras_responsable_company_fkey
    foreign key (company_id, responsable_id)
    references public.personal(company_id, id) on delete restrict,
  constraint obras_cliente_company_fkey
    foreign key (company_id, cliente_id)
    references public.clientes(company_id, id) on delete restrict,
  constraint obras_nombre_check
    check (nombre = btrim(nombre) and char_length(nombre) between 1 and 180),
  constraint obras_numero_check
    check (numero is null or (numero = btrim(numero) and numero <> '')),
  constraint obras_ubicacion_check
    check (ubicacion is null or (ubicacion = btrim(ubicacion) and ubicacion <> '')),
  constraint obras_descripcion_check
    check (descripcion is null or (descripcion = btrim(descripcion) and descripcion <> '')),
  constraint obras_estado_check
    check (estado in ('activa', 'pendiente', 'finalizada', 'pausada')),
  constraint obras_fechas_check
    check (
      fecha_fin_estimada is null
      or fecha_inicio is null
      or fecha_fin_estimada >= fecha_inicio
    )
);

create unique index obras_company_numero_key
  on public.obras (company_id, lower(numero))
  where numero is not null;
create index obras_company_estado_idx
  on public.obras (company_id, estado);
create index obras_responsable_idx on public.obras (responsable_id);
create index obras_cliente_idx on public.obras (cliente_id);

alter table public.obras enable row level security;
revoke all on table public.obras from public, anon, authenticated, service_role;

create trigger clientes_set_updated_at
before update on public.clientes
for each row execute function private.set_updated_at();

create trigger obras_set_updated_at
before update on public.obras
for each row execute function private.set_updated_at();

create or replace function private.audit_obras_change()
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
    when 'INSERT' then 'obra.created'
    when 'UPDATE' then 'obra.updated'
    when 'DELETE' then 'obra.deleted'
  end;

  perform private.write_audit(
    actor_kind => case when v_actor is null then 'system' else 'user' end,
    action => v_action,
    entity_type => 'obra',
    entity_id => v_entity_id,
    before_data => case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    after_data => case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    request_id => extensions.gen_random_uuid(),
    metadata => jsonb_build_object('source', 'public.obras'),
    actor_user_id => v_actor
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

alter function private.audit_obras_change() owner to postgres;
revoke execute on function private.audit_obras_change()
  from public, anon, authenticated, service_role;

create trigger obras_write_audit
after insert or update or delete on public.obras
for each row execute function private.audit_obras_change();

insert into iam.permissions (id, key, description)
values
  ('20000000-0000-4000-8000-000000000006', 'obras.view', 'Consultar obras y sus referencias basicas.'),
  ('20000000-0000-4000-8000-000000000007', 'obras.manage', 'Crear, modificar y eliminar obras.');

insert into iam.role_permissions (role_id, permission_id)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000007'),
  ('10000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000006');

grant select on table public.clientes to authenticated;
grant select, insert, update, delete on table public.obras to authenticated;

create policy clientes_select_obras_view
on public.clientes
for select
to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.has_permission('obras.view'))
);

create policy obras_select
on public.obras
for select
to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.has_permission('obras.view'))
);

create policy obras_insert
on public.obras
for insert
to authenticated
with check (
  company_id = (select private.current_company_id())
  and (select private.has_permission('obras.manage'))
);

create policy obras_update
on public.obras
for update
to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.has_permission('obras.manage'))
)
with check (
  company_id = (select private.current_company_id())
  and (select private.has_permission('obras.manage'))
);

create policy obras_delete
on public.obras
for delete
to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.has_permission('obras.manage'))
);

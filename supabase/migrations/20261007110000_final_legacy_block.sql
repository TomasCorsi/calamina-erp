-- CALAMINA ERP v2 - Final legacy UI block: dashboards, reports and messages.

insert into iam.permissions (id, key, description) values
  ('20000000-0000-4000-8000-000000000038', 'dashboard.view', 'Consultar el tablero operativo de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000039', 'dashboard.manage', 'Configurar y controlar el tablero operativo de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000040', 'reportes.view', 'Consultar reportes operativos de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000041', 'mensajes.view', 'Consultar destinatarios de avisos operativos de la empresa activa.');

insert into iam.role_permissions (role_id, permission_id)
select '10000000-0000-4000-8000-000000000001'::uuid, id
from iam.permissions
where id between '20000000-0000-4000-8000-000000000038'::uuid
  and '20000000-0000-4000-8000-000000000041'::uuid;

create table public.tablero_sesiones (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null default private.current_company_id()
    references public.companies(id) on delete restrict,
  nombre text not null default 'Tablero TV',
  obra_ids uuid[] not null default '{}',
  obra_activa uuid,
  metrica text not null default 'm3',
  mes text not null default to_char(current_date, 'YYYY-MM'),
  rotacion_activa boolean not null default true,
  rotacion_segundos integer not null default 20,
  refresh_token bigint not null default 0,
  tv_ping_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tablero_sesiones_company_key unique(company_id),
  constraint tablero_sesiones_company_id_id_key unique(company_id, id),
  constraint tablero_sesiones_nombre_check check (nombre = btrim(nombre) and char_length(nombre) between 1 and 120),
  constraint tablero_sesiones_metrica_check check (metrica in ('movimientos','m3','horas','litros')),
  constraint tablero_sesiones_mes_check check (mes ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  constraint tablero_sesiones_rotacion_check check (rotacion_segundos between 5 and 3600),
  constraint tablero_sesiones_obra_activa_company_fkey foreign key(company_id, obra_activa)
    references public.obras(company_id, id) on delete restrict
);

alter table public.tablero_sesiones enable row level security;
alter table public.tablero_sesiones force row level security;
revoke all on public.tablero_sesiones from public, anon, authenticated, service_role;
grant select, insert, update on public.tablero_sesiones to authenticated;

create or replace function private.validate_dashboard_session()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.company_id is distinct from private.current_company_id() then
    raise exception 'invalid company' using errcode='42501';
  end if;
  if exists (
    select 1 from unnest(new.obra_ids) as selected(id)
    where not exists (
      select 1 from public.obras o
      where o.company_id = new.company_id and o.id = selected.id
    )
  ) then
    raise exception 'invalid work selection' using errcode='23503';
  end if;
  if new.obra_activa is not null and not (new.obra_activa = any(new.obra_ids)) then
    raise exception 'active work must be selected' using errcode='23514';
  end if;
  return new;
end; $$;
alter function private.validate_dashboard_session() owner to postgres;
revoke all on function private.validate_dashboard_session() from public, anon, authenticated, service_role;

create trigger tablero_sesiones_validate before insert or update on public.tablero_sesiones
for each row execute function private.validate_dashboard_session();
create trigger tablero_sesiones_updated before update on public.tablero_sesiones
for each row execute function private.set_updated_at();

create policy tablero_sesiones_select on public.tablero_sesiones for select to authenticated
using (company_id = (select private.current_company_id()) and (select private.has_permission('dashboard.view')));
create policy tablero_sesiones_insert on public.tablero_sesiones for insert to authenticated
with check (company_id = (select private.current_company_id()) and (select private.has_permission('dashboard.manage')));
create policy tablero_sesiones_update on public.tablero_sesiones for update to authenticated
using (company_id = (select private.current_company_id()) and (select private.has_permission('dashboard.manage')))
with check (company_id = (select private.current_company_id()) and (select private.has_permission('dashboard.manage')));

create or replace function api.list_message_recipients(p_fecha date)
returns table(
  id uuid,
  nombre text,
  apellido text,
  legajo text,
  rol text,
  telefono text,
  vencimiento_licencia date,
  tiene_usuario boolean,
  tiene_parte boolean
)
language sql stable security definer set search_path = '' as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    p.internal_code::text,
    p.work_role,
    p.telefono,
    p.vencimiento_licencia,
    exists (
      select 1 from public.company_memberships m
      where m.company_id = p.company_id and m.personal_id = p.id
    ),
    exists (
      select 1 from public.partes_diarios pd
      where pd.company_id = p.company_id and pd.personal_id = p.id and pd.fecha = p_fecha
    )
  from public.personal p
  where p.company_id = private.current_company_id()
    and p.status = 'active'
    and (select auth.uid()) is not null
    and private.has_permission('mensajes.view')
  order by p.last_name, p.first_name;
$$;
alter function api.list_message_recipients(date) owner to postgres;
revoke all on function api.list_message_recipients(date) from public, anon, authenticated, service_role;
grant execute on function api.list_message_recipients(date) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.tablero_sesiones;
exception
  when duplicate_object then null;
end $$;


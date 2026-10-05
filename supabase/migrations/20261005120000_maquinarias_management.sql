-- CALAMINA ERP v2 - Operational machinery/vehicle master.

insert into iam.permissions (id, key, description)
values
  ('20000000-0000-4000-8000-000000000012', 'maquinarias.view', 'Consultar el maestro de maquinarias y vehiculos de la empresa activa.'),
  ('20000000-0000-4000-8000-000000000013', 'maquinarias.manage', 'Crear, editar y cambiar el estado de maquinarias y vehiculos de la empresa activa.');

insert into iam.role_permissions (role_id, permission_id)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000012'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000013');

alter table public.maquinarias
  add column marca text,
  add column anio integer,
  add column horas_acumuladas numeric(14, 2) not null default 0,
  add column km_acumulados numeric(14, 2) not null default 0,
  add column operador_asignado_id uuid,
  add column obra_id uuid;

alter table public.maquinarias
  drop constraint maquinarias_codigo_check,
  drop constraint maquinarias_nombre_check,
  alter column codigo set not null,
  alter column nombre set not null,
  add constraint maquinarias_codigo_check
    check (codigo = btrim(codigo) and char_length(codigo) between 1 and 80),
  add constraint maquinarias_nombre_check
    check (nombre = btrim(nombre) and char_length(nombre) between 1 and 160),
  add constraint maquinarias_marca_check
    check (marca is null or (marca = btrim(marca) and char_length(marca) between 1 and 120)),
  add constraint maquinarias_anio_check
    check (anio is null or anio between 1900 and 2100),
  add constraint maquinarias_acumulados_check
    check (horas_acumuladas >= 0 and km_acumulados >= 0),
  add constraint maquinarias_operador_company_fkey
    foreign key (company_id, operador_asignado_id)
    references public.personal(company_id, id) on delete restrict,
  add constraint maquinarias_obra_company_fkey
    foreign key (company_id, obra_id)
    references public.obras(company_id, id) on delete restrict;

create index maquinarias_operador_idx
  on public.maquinarias (operador_asignado_id)
  where operador_asignado_id is not null;
create index maquinarias_obra_idx
  on public.maquinarias (obra_id)
  where obra_id is not null;

grant select, insert, update on table public.maquinarias to authenticated;

create policy maquinarias_select_management
on public.maquinarias
for select
to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.has_permission('maquinarias.view'))
);

create policy maquinarias_insert_management
on public.maquinarias
for insert
to authenticated
with check (
  company_id = (select private.current_company_id())
  and (select private.has_permission('maquinarias.manage'))
);

create policy maquinarias_update_management
on public.maquinarias
for update
to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.has_permission('maquinarias.manage'))
)
with check (
  company_id = (select private.current_company_id())
  and (select private.has_permission('maquinarias.manage'))
);

create or replace function private.protect_maquinaria_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.company_id is distinct from old.company_id then
    raise exception 'maquinaria company is immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;

alter function private.protect_maquinaria_ownership() owner to postgres;
revoke execute on function private.protect_maquinaria_ownership()
  from public, anon, authenticated, service_role;

create trigger maquinarias_protect_ownership
before update on public.maquinarias
for each row execute function private.protect_maquinaria_ownership();

create or replace function private.audit_maquinaria_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_action text;
begin
  v_action := case
    when tg_op = 'INSERT' then 'maquinaria.created'
    when new.estado is distinct from old.estado then 'maquinaria.status_changed'
    else 'maquinaria.updated'
  end;

  perform private.write_audit(
    actor_kind => case when v_actor is null then 'system' else 'user' end,
    action => v_action,
    entity_type => 'maquinaria',
    entity_id => new.id,
    before_data => case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    after_data => to_jsonb(new),
    request_id => extensions.gen_random_uuid(),
    metadata => jsonb_build_object('source', 'public.maquinarias'),
    actor_user_id => v_actor
  );

  return new;
end;
$$;

alter function private.audit_maquinaria_change() owner to postgres;
revoke execute on function private.audit_maquinaria_change()
  from public, anon, authenticated, service_role;

create trigger maquinarias_write_audit
after insert or update on public.maquinarias
for each row execute function private.audit_maquinaria_change();

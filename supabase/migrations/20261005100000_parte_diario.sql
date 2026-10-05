-- CALAMINA ERP v2 - Parte Diario core with legacy-compatible presentation.

alter table public.personal
  add column work_role text;

alter table public.personal
  add constraint personal_work_role_check check (
    work_role is null or work_role in (
      'maquinista',
      'chofer',
      'capataz',
      'mecanico',
      'sereno',
      'topografo',
      'ayudante',
      'administrativo',
      'repartidor_calecita'
    )
  );

alter table public.obras
  add constraint obras_company_id_id_key unique (company_id, id);

insert into iam.roles (id, key, name, description, is_system, is_assignable)
values (
  '10000000-0000-4000-8000-000000000005',
  'parte_diario_operator',
  'Operador de Parte Diario',
  'Carga y consulta exclusivamente sus propios partes diarios.',
  true,
  true
);

insert into iam.permissions (id, key, description)
values
  (
    '20000000-0000-4000-8000-000000000008',
    'parte_diario.view',
    'Consultar partes diarios dentro del alcance autorizado.'
  ),
  (
    '20000000-0000-4000-8000-000000000009',
    'parte_diario.manage',
    'Crear y modificar partes diarios dentro del alcance autorizado.'
  );

insert into iam.role_permissions (role_id, permission_id)
values
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000008'),
  ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000009'),
  ('10000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000006'),
  ('10000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000008'),
  ('10000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000009');

create or replace function private.has_role_key(role_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_memberships as membership
    join iam.user_roles as user_role on user_role.membership_id = membership.id
    join iam.roles as role on role.id = user_role.role_id
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and role.key = role_key
  );
$$;

alter function private.has_role_key(text) owner to postgres;
revoke execute on function private.has_role_key(text)
  from public, anon, authenticated, service_role;
grant execute on function private.has_role_key(text) to authenticated;

create or replace function private.enforce_parte_diario_operator_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from iam.roles as role
    where role.id = new.role_id and role.key = 'parte_diario_operator'
  ) and not exists (
    select 1
    from public.company_memberships as membership
    join public.personal as person on person.id = membership.personal_id
    where membership.id = new.membership_id
      and person.company_id = membership.company_id
      and person.work_role is not null
  ) then
    raise exception 'parte diario operator requires linked personal with work role'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

alter function private.enforce_parte_diario_operator_assignment() owner to postgres;
revoke execute on function private.enforce_parte_diario_operator_assignment()
  from public, anon, authenticated, service_role;

create trigger user_roles_enforce_parte_diario_operator
before insert or update of membership_id, role_id on iam.user_roles
for each row execute function private.enforce_parte_diario_operator_assignment();

create or replace function private.enforce_parte_diario_operator_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from iam.roles as role
    where role.id = new.role_id and role.key = 'parte_diario_operator'
  ) and not exists (
    select 1
    from public.personal as person
    where person.id = new.personal_id
      and person.status = 'active'
      and person.work_role is not null
  ) then
    raise exception 'parte diario operator invitation requires active personal with work role'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

alter function private.enforce_parte_diario_operator_invitation() owner to postgres;
revoke execute on function private.enforce_parte_diario_operator_invitation()
  from public, anon, authenticated, service_role;

create trigger registration_invitations_enforce_parte_diario_operator
before insert or update of role_id, personal_id on iam.registration_invitations
for each row execute function private.enforce_parte_diario_operator_invitation();

create or replace function private.protect_assigned_work_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.work_role is null and old.work_role is not null and exists (
    select 1
    from public.company_memberships as membership
    join iam.user_roles as user_role on user_role.membership_id = membership.id
    join iam.roles as role on role.id = user_role.role_id
    where membership.personal_id = new.id
      and role.key = 'parte_diario_operator'
  ) then
    raise exception 'cannot clear work role while parte diario operator is assigned'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

alter function private.protect_assigned_work_role() owner to postgres;
revoke execute on function private.protect_assigned_work_role()
  from public, anon, authenticated, service_role;

create trigger personal_protect_assigned_work_role
before update of work_role on public.personal
for each row execute function private.protect_assigned_work_role();

drop function api.list_personal();

create function api.list_personal()
returns table (
  id uuid,
  internal_code text,
  first_name text,
  last_name text,
  work_email text,
  job_title text,
  work_role text,
  status text,
  has_user boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
begin
  if (select auth.uid()) is null or not private.has_permission('personal.view') then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select membership.company_id into v_company_id
  from public.company_memberships as membership
  where membership.user_id = (select auth.uid())
    and membership.status = 'active';

  return query
  select
    person.id,
    person.internal_code::text,
    person.first_name,
    person.last_name,
    person.work_email::text,
    person.job_title,
    person.work_role,
    person.status,
    exists (
      select 1 from public.company_memberships as linked
      where linked.personal_id = person.id
    ),
    person.created_at,
    person.updated_at
  from public.personal as person
  where person.company_id = v_company_id
  order by person.last_name, person.first_name, person.internal_code;
end;
$$;

alter function api.list_personal() owner to postgres;
revoke all on function api.list_personal() from public, anon, authenticated, service_role;
grant execute on function api.list_personal() to authenticated;

create function api.create_personal(
  p_internal_code text,
  p_first_name text,
  p_last_name text,
  p_work_email text,
  p_job_title text,
  p_work_role text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  v_id := api.create_personal(
    p_internal_code,
    p_first_name,
    p_last_name,
    p_work_email,
    p_job_title
  );

  update public.personal as person
  set work_role = nullif(btrim(coalesce(p_work_role, '')), '')
  where person.id = v_id;

  return v_id;
end;
$$;

alter function api.create_personal(text, text, text, text, text, text) owner to postgres;
revoke all on function api.create_personal(text, text, text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function api.create_personal(text, text, text, text, text, text)
  to authenticated;

create function api.update_personal(
  p_personal_id uuid,
  p_internal_code text,
  p_first_name text,
  p_last_name text,
  p_work_email text,
  p_job_title text,
  p_work_role text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base_changed boolean;
  v_work_role text := nullif(btrim(coalesce(p_work_role, '')), '');
  v_previous_work_role text;
  v_actor uuid := (select auth.uid());
begin
  v_base_changed := api.update_personal(
    p_personal_id,
    p_internal_code,
    p_first_name,
    p_last_name,
    p_work_email,
    p_job_title
  );

  select person.work_role into v_previous_work_role
  from public.personal as person
  where person.id = p_personal_id
  for update;

  if v_previous_work_role is not distinct from v_work_role then
    return v_base_changed;
  end if;

  update public.personal as person
  set work_role = v_work_role
  where person.id = p_personal_id;

  perform private.write_audit(
    actor_kind => 'user',
    action => 'personal.work_role_changed',
    entity_type => 'personal',
    entity_id => p_personal_id,
    before_data => jsonb_build_object('work_role', v_previous_work_role),
    after_data => jsonb_build_object('work_role', v_work_role),
    request_id => extensions.gen_random_uuid(),
    metadata => jsonb_build_object('source', 'api.update_personal'),
    actor_user_id => v_actor
  );

  return true;
end;
$$;

alter function api.update_personal(uuid, text, text, text, text, text, text) owner to postgres;
revoke all on function api.update_personal(uuid, text, text, text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function api.update_personal(uuid, text, text, text, text, text, text)
  to authenticated;

create table public.maquinarias (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null,
  codigo text,
  nombre text,
  tipo text not null,
  patente text,
  estado text not null default 'operativa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maquinarias_company_fkey
    foreign key (company_id) references public.companies(id) on delete restrict,
  constraint maquinarias_company_id_id_key unique (company_id, id),
  constraint maquinarias_codigo_check
    check (codigo is null or (codigo = btrim(codigo) and codigo <> '')),
  constraint maquinarias_nombre_check
    check (nombre is null or (nombre = btrim(nombre) and nombre <> '')),
  constraint maquinarias_tipo_check check (tipo in (
    'cargadora', 'compactador', 'retroexcavadora', 'minicargadora',
    'motoniveladora', 'topador', 'pala_retro', 'batea', 'acoplado',
    'camion', 'carreton', 'cisterna', 'tanque_cisterna',
    'tanque_regador_tractor', 'soplador', 'zanjeadora', 'rastra',
    'tractor', 'rastra_grosspal', 'auto', 'camioneta', 'grupo_electrogeno'
  )),
  constraint maquinarias_patente_check
    check (patente is null or (patente = upper(btrim(patente)) and patente <> '')),
  constraint maquinarias_estado_check
    check (estado in ('operativa', 'mantenimiento', 'inactiva', 'en_uso')),
  constraint maquinarias_identificacion_check
    check (codigo is not null or nombre is not null or patente is not null)
);

create unique index maquinarias_company_codigo_key
  on public.maquinarias (company_id, lower(codigo))
  where codigo is not null;
create unique index maquinarias_company_patente_key
  on public.maquinarias (company_id, patente)
  where patente is not null;
create index maquinarias_company_estado_idx
  on public.maquinarias (company_id, estado);

alter table public.maquinarias enable row level security;
revoke all on table public.maquinarias from public, anon, authenticated, service_role;

create trigger maquinarias_set_updated_at
before update on public.maquinarias
for each row execute function private.set_updated_at();

grant select on table public.maquinarias to authenticated;

create policy maquinarias_select_parte_diario
on public.maquinarias
for select
to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.has_permission('parte_diario.view'))
);

create table public.partes_diarios (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null,
  personal_id uuid not null,
  obra_id uuid,
  maquinaria_id uuid,
  fecha date not null default current_date,
  hora_entrada time,
  hora_salida time,
  horometro_inicio numeric(12, 2) not null default 0,
  horometro_fin numeric(12, 2) not null default 0,
  cantidad_viajes integer not null default 0,
  km_camion numeric(12, 2) not null default 0,
  cantidad_movimiento_interno integer not null default 0,
  combustible numeric(12, 2) not null default 0,
  estado_maquina text,
  observacion_maquina text,
  check_filtro_aire boolean not null default false,
  check_aceite_hidraulico boolean not null default false,
  check_aceite_motor boolean not null default false,
  check_liquido_refrigerante boolean not null default false,
  check_uria boolean not null default false,
  estado text not null default 'borrador',
  novedades text,
  ausencias uuid[] not null default '{}'::uuid[],
  tareas text,
  observaciones_inconvenientes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partes_diarios_company_fkey
    foreign key (company_id) references public.companies(id) on delete restrict,
  constraint partes_diarios_personal_company_fkey
    foreign key (company_id, personal_id)
    references public.personal(company_id, id) on delete restrict,
  constraint partes_diarios_obra_company_fkey
    foreign key (company_id, obra_id)
    references public.obras(company_id, id) on delete restrict,
  constraint partes_diarios_maquinaria_company_fkey
    foreign key (company_id, maquinaria_id)
    references public.maquinarias(company_id, id) on delete restrict,
  constraint partes_diarios_company_id_id_key unique (company_id, id),
  constraint partes_diarios_person_date_machine_key
    unique nulls not distinct (company_id, personal_id, fecha, maquinaria_id),
  constraint partes_diarios_horometros_check check (
    horometro_inicio >= 0
    and horometro_fin >= 0
    and (horometro_fin = 0 or horometro_fin >= horometro_inicio)
  ),
  constraint partes_diarios_cantidades_check check (
    cantidad_viajes >= 0
    and km_camion >= 0
    and cantidad_movimiento_interno >= 0
    and combustible >= 0
  ),
  constraint partes_diarios_estado_maquina_check check (
    estado_maquina is null or estado_maquina in ('OK', 'OBSERVACION')
  ),
  constraint partes_diarios_observacion_maquina_check check (
    (
      estado_maquina = 'OBSERVACION'
      and maquinaria_id is not null
      and observacion_maquina = btrim(observacion_maquina)
      and observacion_maquina <> ''
    )
    or (
      estado_maquina is distinct from 'OBSERVACION'
      and observacion_maquina is null
    )
  ),
  constraint partes_diarios_estado_check
    check (estado in ('borrador', 'completado')),
  constraint partes_diarios_novedades_check
    check (novedades is null or (novedades = btrim(novedades) and novedades <> '')),
  constraint partes_diarios_tareas_check
    check (tareas is null or (tareas = btrim(tareas) and tareas <> '')),
  constraint partes_diarios_observaciones_check check (
    observaciones_inconvenientes is null
    or (
      observaciones_inconvenientes = btrim(observaciones_inconvenientes)
      and observaciones_inconvenientes <> ''
    )
  )
);

create index partes_diarios_company_fecha_idx
  on public.partes_diarios (company_id, fecha desc);
create index partes_diarios_personal_fecha_idx
  on public.partes_diarios (personal_id, fecha desc);
create index partes_diarios_obra_fecha_idx
  on public.partes_diarios (obra_id, fecha desc)
  where obra_id is not null;

alter table public.partes_diarios enable row level security;
revoke all on table public.partes_diarios from public, anon, authenticated, service_role;

create or replace function private.validate_parte_diario_ausencias()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_distinct_count integer;
begin
  select count(distinct absence_id)
  into v_distinct_count
  from unnest(new.ausencias) as absence_id;

  if cardinality(new.ausencias) <> v_distinct_count then
    raise exception 'duplicate absence references are not allowed'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(new.ausencias) as absence_id
    where not exists (
      select 1
      from public.personal as person
      where person.id = absence_id
        and person.company_id = new.company_id
        and person.status = 'active'
    )
  ) then
    raise exception 'invalid absence reference' using errcode = '23503';
  end if;

  return new;
end;
$$;

alter function private.validate_parte_diario_ausencias() owner to postgres;
revoke execute on function private.validate_parte_diario_ausencias()
  from public, anon, authenticated, service_role;

create trigger partes_diarios_validate_ausencias
before insert or update of company_id, ausencias on public.partes_diarios
for each row execute function private.validate_parte_diario_ausencias();

create trigger partes_diarios_set_updated_at
before update on public.partes_diarios
for each row execute function private.set_updated_at();

create or replace function private.audit_parte_diario_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_action text;
  v_entity_id uuid := coalesce(new.id, old.id);
begin
  v_action := case
    when tg_op = 'INSERT' then 'parte_diario.created'
    when tg_op = 'DELETE' then 'parte_diario.deleted'
    when new.estado is distinct from old.estado then 'parte_diario.state_changed'
    else 'parte_diario.updated'
  end;

  perform private.write_audit(
    actor_kind => case when v_actor is null then 'system' else 'user' end,
    action => v_action,
    entity_type => 'parte_diario',
    entity_id => v_entity_id,
    before_data => case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    after_data => case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    request_id => extensions.gen_random_uuid(),
    metadata => jsonb_build_object('source', 'public.partes_diarios'),
    actor_user_id => v_actor
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

alter function private.audit_parte_diario_change() owner to postgres;
revoke execute on function private.audit_parte_diario_change()
  from public, anon, authenticated, service_role;

create trigger partes_diarios_write_audit
after insert or update or delete on public.partes_diarios
for each row execute function private.audit_parte_diario_change();

grant select, insert, update, delete on table public.partes_diarios to authenticated;

create policy partes_diarios_select
on public.partes_diarios
for select
to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.has_permission('parte_diario.view'))
  and (
    (select private.has_role_key('admin'))
    or personal_id = (select private.current_personal_id())
  )
);

create policy partes_diarios_insert
on public.partes_diarios
for insert
to authenticated
with check (
  company_id = (select private.current_company_id())
  and (select private.has_permission('parte_diario.manage'))
  and (
    (select private.has_role_key('admin'))
    or personal_id = (select private.current_personal_id())
  )
);

create policy partes_diarios_update
on public.partes_diarios
for update
to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.has_permission('parte_diario.manage'))
  and (
    (select private.has_role_key('admin'))
    or personal_id = (select private.current_personal_id())
  )
)
with check (
  company_id = (select private.current_company_id())
  and (select private.has_permission('parte_diario.manage'))
  and (
    (select private.has_role_key('admin'))
    or personal_id = (select private.current_personal_id())
  )
);

create policy partes_diarios_delete
on public.partes_diarios
for delete
to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.has_permission('parte_diario.manage'))
  and (
    (select private.has_role_key('admin'))
    or personal_id = (select private.current_personal_id())
  )
);

create or replace function api.list_parte_diario_personal_options()
returns table (
  id uuid,
  internal_code text,
  first_name text,
  last_name text,
  work_role text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
begin
  if (select auth.uid()) is null
    or not private.has_permission('parte_diario.manage')
  then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select membership.company_id into v_company_id
  from public.company_memberships as membership
  where membership.user_id = (select auth.uid())
    and membership.status = 'active';

  return query
  select
    person.id,
    person.internal_code::text,
    person.first_name,
    person.last_name,
    person.work_role
  from public.personal as person
  where person.company_id = v_company_id
    and person.status = 'active'
  order by person.last_name, person.first_name, person.internal_code;
end;
$$;

alter function api.list_parte_diario_personal_options() owner to postgres;
revoke all on function api.list_parte_diario_personal_options()
  from public, anon, authenticated, service_role;
grant execute on function api.list_parte_diario_personal_options()
  to authenticated;

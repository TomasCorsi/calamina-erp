-- Reserved exclusively for synthetic CALAMINA ERP v2 local-development data.
-- Never add production data, copied legacy data, credentials, tokens, or secrets.
-- Supabase will execute this file after future ERP v2 migrations.

insert into public.companies (
  id,
  legal_name,
  display_name,
  tax_id,
  is_active
)
values (
  '00000000-0000-4000-8000-000000000001',
  'CALAMINA Demo S.A.',
  'CALAMINA Demo',
  'DEMO-AR-0001',
  true
)
on conflict (id) do update
set legal_name = excluded.legal_name,
    display_name = excluded.display_name,
    tax_id = excluded.tax_id,
    is_active = excluded.is_active;

insert into public.company_settings (
  company_id,
  business_timezone,
  functional_currency,
  locale
)
values (
  '00000000-0000-4000-8000-000000000001',
  'America/Argentina/Buenos_Aires',
  'ARS',
  'es-AR'
)
on conflict (company_id) do update
set business_timezone = excluded.business_timezone,
    functional_currency = excluded.functional_currency,
    locale = excluded.locale;

insert into public.personal (
  id,
  company_id,
  internal_code,
  first_name,
  last_name,
  work_email,
  job_title,
  status
)
values
  (
    '00000000-0000-4000-8001-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'EMP-DEMO-001',
    'Ana',
    'Demostracion',
    'ana.demo@example.invalid',
    'Administracion demo',
    'active'
  ),
  (
    '00000000-0000-4000-8001-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'EMP-DEMO-002',
    'Bruno',
    'Ejemplo',
    'bruno.demo@example.invalid',
    'Operaciones demo',
    'active'
  ),
  (
    '00000000-0000-4000-8001-000000000003',
    '00000000-0000-4000-8000-000000000001',
    'EMP-DEMO-003',
    'Carla',
    'Ficticia',
    null,
    null,
    'inactive'
  )
on conflict (id) do update
set internal_code = excluded.internal_code,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    work_email = excluded.work_email,
    job_title = excluded.job_title,
    status = excluded.status;

insert into public.clientes (
  id,
  company_id,
  nombre,
  cuit,
  direccion,
  localidad,
  telefono,
  email,
  activo
)
values
  (
    '00000000-0000-4000-8002-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Cliente Demo Norte',
    'DEMO-CUIT-001',
    'Calle Ficticia 100',
    'Bahia Blanca',
    '+54 291 000-0001',
    'norte@example.invalid',
    true
  ),
  (
    '00000000-0000-4000-8002-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'Cliente Demo Sur',
    'DEMO-CUIT-002',
    'Avenida Ejemplo 200',
    'Punta Alta',
    '+54 2932 000-002',
    'sur@example.invalid',
    true
  )
on conflict (id) do update
set nombre = excluded.nombre,
    cuit = excluded.cuit,
    direccion = excluded.direccion,
    localidad = excluded.localidad,
    telefono = excluded.telefono,
    email = excluded.email,
    activo = excluded.activo;

insert into public.obras (
  id,
  company_id,
  nombre,
  numero,
  ubicacion,
  descripcion,
  estado,
  fecha_inicio,
  fecha_fin_estimada,
  responsable_id,
  cliente_id
)
values
  (
    '00000000-0000-4000-8003-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Obra Demo Parque Industrial',
    'OB-DEMO-001',
    'Parque Industrial Demo',
    'Obra local completamente ficticia para validar el modulo.',
    'activa',
    '2026-09-01',
    '2026-12-18',
    '00000000-0000-4000-8001-000000000002',
    '00000000-0000-4000-8002-000000000001'
  ),
  (
    '00000000-0000-4000-8003-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'Obra Demo Acceso Sur',
    'OB-DEMO-002',
    'Acceso Sur Demo',
    'Segunda obra ficticia para filtros y estados.',
    'pendiente',
    '2026-11-03',
    null,
    '00000000-0000-4000-8001-000000000001',
    '00000000-0000-4000-8002-000000000002'
  )
on conflict (id) do update
set nombre = excluded.nombre,
    numero = excluded.numero,
    ubicacion = excluded.ubicacion,
    descripcion = excluded.descripcion,
    estado = excluded.estado,
    fecha_inicio = excluded.fecha_inicio,
    fecha_fin_estimada = excluded.fecha_fin_estimada,
    responsable_id = excluded.responsable_id,
    cliente_id = excluded.cliente_id;

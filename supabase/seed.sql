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
  work_role,
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
    'capataz',
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
    'maquinista',
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
    'chofer',
    'inactive'
  )
on conflict (id) do update
set internal_code = excluded.internal_code,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    work_email = excluded.work_email,
    job_title = excluded.job_title,
    work_role = excluded.work_role,
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

insert into public.maquinarias (
  id,
  company_id,
  codigo,
  nombre,
  tipo,
  marca,
  anio,
  patente,
  estado,
  horas_acumuladas,
  km_acumulados,
  operador_asignado_id,
  obra_id
)
values
  (
    '00000000-0000-4000-8004-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'EXC-DEMO-01',
    'Excavadora Demo',
    'retroexcavadora',
    'Caterpillar',
    2020,
    null,
    'operativa',
    1250,
    0,
    '00000000-0000-4000-8001-000000000002',
    '00000000-0000-4000-8003-000000000001'
  ),
  (
    '00000000-0000-4000-8004-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'CAM-DEMO-01',
    'Camion Demo',
    'camion',
    'Iveco',
    2022,
    'AA000AA',
    'operativa',
    0,
    45500,
    '00000000-0000-4000-8001-000000000002',
    '00000000-0000-4000-8003-000000000002'
  )
on conflict (id) do update
set codigo = excluded.codigo,
    nombre = excluded.nombre,
    tipo = excluded.tipo,
    marca = excluded.marca,
    anio = excluded.anio,
    patente = excluded.patente,
    estado = excluded.estado,
    horas_acumuladas = excluded.horas_acumuladas,
    km_acumulados = excluded.km_acumulados,
    operador_asignado_id = excluded.operador_asignado_id,
    obra_id = excluded.obra_id;

insert into public.partes_diarios (
  id,
  company_id,
  personal_id,
  obra_id,
  maquinaria_id,
  fecha,
  hora_entrada,
  hora_salida,
  horometro_inicio,
  horometro_fin,
  combustible,
  estado_maquina,
  estado,
  tareas,
  observaciones_inconvenientes
)
values
  (
    '00000000-0000-4000-8005-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8001-000000000002',
    '00000000-0000-4000-8003-000000000001',
    '00000000-0000-4000-8004-000000000001',
    '2026-10-05',
    '08:00',
    '17:00',
    1200,
    1208,
    42,
    'OK',
    'completado',
    'Movimiento de suelo de demostracion.',
    null
  ),
  (
    '00000000-0000-4000-8005-000000000002',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8001-000000000001',
    '00000000-0000-4000-8003-000000000001',
    null,
    '2026-10-05',
    '07:45',
    null,
    0,
    0,
    0,
    null,
    'borrador',
    null,
    'Parte ficticio para validar el flujo local.'
  )
on conflict (id) do update
set obra_id = excluded.obra_id,
    maquinaria_id = excluded.maquinaria_id,
    fecha = excluded.fecha,
    hora_entrada = excluded.hora_entrada,
    hora_salida = excluded.hora_salida,
    horometro_inicio = excluded.horometro_inicio,
    horometro_fin = excluded.horometro_fin,
    combustible = excluded.combustible,
    estado_maquina = excluded.estado_maquina,
    estado = excluded.estado,
    tareas = excluded.tareas,
    observaciones_inconvenientes = excluded.observaciones_inconvenientes;

insert into public.remitos (
  id, company_id, numero, fecha, obra_id, maquinaria_id, material, cantidad,
  unidad, recibido_por, remito_local, desde, hasta, cantidad_viajes,
  tipo_material, tipo_transporte, cantidad_uni, precio_unitario, precio_total,
  precio_calc_mode, cliente, observaciones
)
values
  (
    '00000000-0000-4000-8006-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'REM-DEMO-001', '2026-10-05',
    '00000000-0000-4000-8003-000000000001',
    '00000000-0000-4000-8004-000000000002',
    'Tosca demo', 24, 'M3', '-', 'REM-DEMO-001',
    'Obra Demo Parque Industrial', 'Obra Demo Acceso Sur', 2,
    'Tosca demo', 'Camion propio', 12, 1000, 2000, 'viajes',
    'Cliente Demo Norte', 'Remito completamente ficticio.'
  ),
  (
    '00000000-0000-4000-8006-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'REM-DEMO-002', '2026-10-04',
    '00000000-0000-4000-8003-000000000002',
    null,
    'Arena demo', 10, 'M3', '-', 'REM-DEMO-002',
    'Proveedor Demo', 'Obra Demo Acceso Sur', 1,
    'Arena demo', 'Tercero', 10, 750, 7500, 'cantidad',
    'Cliente Demo Sur', null
  )
on conflict (id) do update
set numero = excluded.numero,
    fecha = excluded.fecha,
    obra_id = excluded.obra_id,
    maquinaria_id = excluded.maquinaria_id,
    material = excluded.material,
    cantidad = excluded.cantidad,
    unidad = excluded.unidad,
    remito_local = excluded.remito_local,
    desde = excluded.desde,
    hasta = excluded.hasta,
    cantidad_viajes = excluded.cantidad_viajes,
    tipo_material = excluded.tipo_material,
    tipo_transporte = excluded.tipo_transporte,
    cantidad_uni = excluded.cantidad_uni,
    precio_unitario = excluded.precio_unitario,
    precio_total = excluded.precio_total,
    precio_calc_mode = excluded.precio_calc_mode,
    cliente = excluded.cliente,
    observaciones = excluded.observaciones;

insert into public.remito_items (
  id, company_id, remito_id, orden, concepto, cantidad, unidad, precio_unitario, precio_total
)
values
  (
    '00000000-0000-4000-8007-000000000001',
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8006-000000000001',
    0, 'Hora de retro demo', 2, 'HS', 500, 1000
  )
on conflict (id) do update
set orden = excluded.orden,
    concepto = excluded.concepto,
    cantidad = excluded.cantidad,
    unidad = excluded.unidad,
    precio_unitario = excluded.precio_unitario,
    precio_total = excluded.precio_total;

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

insert into public.otros_gastos (
  id, company_id, fecha, obra_id, maquinaria_id, sector, categoria,
  descripcion, monto, comprobante, proveedor, observaciones
) values (
  '00000000-0000-4000-8008-000000000001',
  '00000000-0000-4000-8000-000000000001', '2026-10-05',
  '00000000-0000-4000-8003-000000000001', null, 'Obra', 'materiales',
  'Insumos demo para obrador', 12500, 'DEMO-001', 'Proveedor Ficticio',
  'Dato local completamente ficticio.'
) on conflict (id) do update set monto = excluded.monto, observaciones = excluded.observaciones;

insert into public.cargas_combustible_repartidor (
  id, company_id, fecha, litros, operador_id, maquinaria_id, obra_id,
  tipo_operador, tipo_producto, repartidor_id, tipo_movimiento, observaciones
) values (
  '00000000-0000-4000-8009-000000000001',
  '00000000-0000-4000-8000-000000000001', '2026-10-05', 45,
  '00000000-0000-4000-8001-000000000002',
  '00000000-0000-4000-8004-000000000001',
  '00000000-0000-4000-8003-000000000001',
  'interno', 'combustible', '00000000-0000-4000-8001-000000000001',
  'egreso', 'Carga ficticia de validacion.'
) on conflict (id) do update set litros = excluded.litros, observaciones = excluded.observaciones;

insert into public.precios_productos_mes (
  id, company_id, anio, mes, producto, precio_unitario
) values (
  '00000000-0000-4000-8010-000000000001',
  '00000000-0000-4000-8000-000000000001', 2026, 10, 'combustible', 1000
) on conflict (company_id, anio, mes, producto) do update set precio_unitario = excluded.precio_unitario;

insert into public.mantenimientos (
  id, company_id, fecha, maquinaria_id, tipo, descripcion, costo_repuestos,
  costo_mano_obra, costo_total, horas_maquina, kilometros, tecnico, tecnico_id,
  estado, observaciones
) values (
  '00000000-0000-4000-8011-000000000001',
  '00000000-0000-4000-8000-000000000001', '2026-10-04',
  '00000000-0000-4000-8004-000000000001', 'preventivo',
  'Service preventivo demo', 15000, 5000, 20000, 1250, 0,
  'Ana Demostracion', '00000000-0000-4000-8001-000000000001',
  'completado', 'Registro ficticio para validacion local.'
) on conflict (id) do update set estado = excluded.estado, observaciones = excluded.observaciones;

insert into public.stock_items (
  id, company_id, codigo, nombre, categoria, unidad, stock_actual,
  stock_minimo, stock_maximo, ubicacion, precio_unitario, activo
) values
  ('00000000-0000-4000-8012-000000000001', '00000000-0000-4000-8000-000000000001',
   'ST-DEMO-001', 'Filtro demo', 'repuesto', 'unidad', 10, 3, 30, 'Deposito demo', 2500, true),
  ('00000000-0000-4000-8012-000000000002', '00000000-0000-4000-8000-000000000001',
   'ST-DEMO-002', 'Guantes demo', 'consumible', 'par', 20, 5, 50, 'Deposito demo', 800, true)
on conflict (id) do update set nombre = excluded.nombre, stock_minimo = excluded.stock_minimo, precio_unitario = excluded.precio_unitario;

insert into public.movimientos_stock (
  id, company_id, fecha, item_id, tipo, cantidad, stock_anterior, stock_nuevo,
  obra_id, motivo, responsable_id, comprobante, observaciones
) values (
  '00000000-0000-4000-8013-000000000001',
  '00000000-0000-4000-8000-000000000001', '2026-10-05',
  '00000000-0000-4000-8012-000000000001', 'entrada', 10, 0, 10,
  null, 'Stock inicial demo', '00000000-0000-4000-8001-000000000001',
  'DEMO-STOCK-001', 'Movimiento ficticio.'
) on conflict (id) do nothing;

insert into public.registros_hh (
  id, company_id, fecha, persona_id, obra_id, capataz_id, hora_entrada,
  hora_salida, horas_normales, horas_extra, horas_totales, tarea, estado, observaciones
) values (
  '00000000-0000-4000-8014-000000000001',
  '00000000-0000-4000-8000-000000000001', '2026-10-05',
  '00000000-0000-4000-8001-000000000002',
  '00000000-0000-4000-8003-000000000001',
  '00000000-0000-4000-8001-000000000001',
  '07:00', '16:00', 8, 0, 8, 'Tarea operativa demo', 'presente',
  'Registro ficticio para validacion local.'
) on conflict (company_id, persona_id, fecha) do update set tarea = excluded.tarea, estado = excluded.estado;

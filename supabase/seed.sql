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

-- Commercial block: synthetic local-only records.
insert into public.proveedores (
  id, company_id, nombre, cuit, direccion, localidad, telefono, email, contacto, rubro, observaciones
) values (
  '00000000-0000-4000-8015-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Proveedor Comercial Demo', '30-00000000-1', 'Calle Ficticia 100', 'Buenos Aires',
  '1100000000', 'proveedor.demo@example.invalid', 'Contacto Demo', 'Materiales',
  'Dato enteramente ficticio para validación local.'
) on conflict (id) do update set nombre = excluded.nombre, observaciones = excluded.observaciones;

insert into public.ordenes_compra (
  id, company_id, numero, fecha, proveedor_id, obra_id, estado, subtotal, iva, total, observaciones
) values (
  '00000000-0000-4000-8016-000000000001',
  '00000000-0000-4000-8000-000000000001', 'OC-DEMO-001', '2026-10-06',
  '00000000-0000-4000-8015-000000000001',
  '00000000-0000-4000-8003-000000000001', 'borrador', 10000, 2100, 12100,
  'Orden ficticia para validación local.'
) on conflict (id) do update set subtotal = excluded.subtotal, iva = excluded.iva, total = excluded.total;

insert into public.orden_compra_items (
  id, company_id, orden_id, articulo, descripcion, unidad, cantidad, precio_unitario, subtotal, orden
) values (
  '00000000-0000-4000-8016-000000000002',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8016-000000000001', 'MAT-DEMO', 'Material comercial demo',
  'un', 2, 5000, 10000, 0
) on conflict (id) do update set cantidad = excluded.cantidad, subtotal = excluded.subtotal;

insert into public.cotizaciones (
  id, company_id, numero, obra_id, descripcion, estado, fecha_creacion, fecha_vencimiento,
  responsable, subtotal, iva, total, notas
) values (
  '00000000-0000-4000-8017-000000000001',
  '00000000-0000-4000-8000-000000000001', 'COT-DEMO-001',
  '00000000-0000-4000-8003-000000000001', 'Cotización comercial demo', 'borrador',
  '2026-10-06', '2026-11-06', 'Responsable Demo', 20000, 4200, 24200,
  'Cotización ficticia para validación local.'
) on conflict (id) do update set descripcion = excluded.descripcion, total = excluded.total;

insert into public.cotizacion_categorias (
  id, company_id, cotizacion_id, numero, nombre, orden
) values (
  '00000000-0000-4000-8017-000000000002',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8017-000000000001', 1, 'Trabajos demo', 0
) on conflict (id) do update set nombre = excluded.nombre;

insert into public.cotizacion_items (
  id, company_id, cotizacion_id, categoria_id, numero, descripcion, unidad,
  cantidad, precio_unitario, subtotal, total
) values (
  '00000000-0000-4000-8017-000000000003',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8017-000000000001',
  '00000000-0000-4000-8017-000000000002', '1', 'Servicio comercial demo',
  'un', 1, 20000, 20000, 20000
) on conflict (id) do update set descripcion = excluded.descripcion, total = excluded.total;

insert into public.certificado_conceptos (
  id, company_id, obra_id, nombre, unidad, precio_unitario, orden, categoria, cantidad_total, tipo
) values (
  '00000000-0000-4000-8018-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8003-000000000001', 'Concepto certificable demo', 'un',
  15000, 0, 'General', 1, 'obra'
) on conflict (id) do update set nombre = excluded.nombre, precio_unitario = excluded.precio_unitario;

insert into public.certificados (
  id, company_id, obra_id, numero, periodo, estado, fecha_certificado,
  subtotal, iva, total, observaciones, tipo
) values (
  '00000000-0000-4000-8018-000000000002',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8003-000000000001', 'CERT-DEMO-001', '2026-10', 'borrador',
  '2026-10-06', 15000, 3150, 18150, 'Certificado ficticio para validación local.', 'obra'
) on conflict (id) do update set subtotal = excluded.subtotal, iva = excluded.iva, total = excluded.total;

insert into public.certificado_items (
  id, company_id, certificado_id, concepto_id, descripcion, unidad, cantidad, precio_unitario, subtotal
) values (
  '00000000-0000-4000-8018-000000000003',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8018-000000000002',
  '00000000-0000-4000-8018-000000000001', 'Concepto certificable demo', 'un', 1, 15000, 15000
) on conflict (id) do update set cantidad = excluded.cantidad, subtotal = excluded.subtotal;

-- RRHH: datos exclusivamente ficticios para validacion local.
update public.personal
set dni = case id
    when '00000000-0000-4000-8001-000000000001' then '99000001'
    when '00000000-0000-4000-8001-000000000002' then '99000002'
    else '99000003' end,
    telefono = '1100000000', fecha_ingreso = '2024-01-15',
    situacion_laboral = 'registrado'
where id in (
  '00000000-0000-4000-8001-000000000001',
  '00000000-0000-4000-8001-000000000002',
  '00000000-0000-4000-8001-000000000003'
);

insert into public.vacaciones (
  id, company_id, personal_id, fecha_inicio, fecha_fin, dias_totales,
  motivo, estado, observaciones, approved_at
) values (
  '00000000-0000-4000-8019-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8001-000000000001',
  '2026-11-02', '2026-11-06', 5, 'vacaciones', 'aprobada',
  'Solicitud ficticia para validacion local.', now()
) on conflict (id) do update set observaciones = excluded.observaciones;

insert into public.entregas_epp (
  id, company_id, personal_id, fecha, estado, observaciones
) values (
  '00000000-0000-4000-8020-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8001-000000000002',
  '2026-10-01', 'entregado', 'Entrega ficticia para validacion local.'
) on conflict (id) do update set observaciones = excluded.observaciones;

insert into public.entrega_epp_items (
  id, company_id, entrega_id, producto, tipo_modelo, marca, posee_certificacion, cantidad
) values (
  '00000000-0000-4000-8020-000000000002',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8020-000000000001',
  'Casco', 'Demo', 'Marca ficticia', true, 1
) on conflict (id) do update set cantidad = excluded.cantidad;

insert into public.liquidacion_config_personal (
  id, company_id, personal_id, modalidad, sueldo_blanco, sueldo_negro,
  monto_banco_fijo, resto_efectivo, banco, numero_cuenta
) values (
  '00000000-0000-4000-8021-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8001-000000000001',
  'mensual', 100000, 0, 100000, false, 'Banco Demo', 'CUENTA-DEMO-001'
) on conflict (company_id, personal_id) do update
set modalidad=excluded.modalidad, sueldo_blanco=excluded.sueldo_blanco,
    sueldo_negro=excluded.sueldo_negro, monto_banco_fijo=excluded.monto_banco_fijo,
    resto_efectivo=excluded.resto_efectivo, banco=excluded.banco,
    numero_cuenta=excluded.numero_cuenta;

-- Accounting: deterministic local-only chart and bridges.
insert into public.accounting_accounts
  (id,company_id,code,name,account_type,normal_balance,is_system,requires_work,system_key)
values
('30000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','1.1.1.01','Caja','asset','debit',true,false,'cash'),
('30000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','1.1.1.02','Bancos','asset','debit',true,false,'banks'),
('30000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','1.1.2.01','Clientes','asset','debit',true,false,'accounts_receivable'),
('30000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','1.1.3.01','Anticipos a proveedores','asset','debit',true,false,'supplier_advances'),
('30000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000001','1.1.3.02','Anticipos al personal','asset','debit',true,false,'employee_advances'),
('30000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000001','1.1.3.03','Prestamos al personal','asset','debit',true,false,'employee_loans'),
('30000000-0000-4000-8000-000000000007','00000000-0000-4000-8000-000000000001','1.1.4.01','IVA credito fiscal','asset','debit',true,false,'vat_credit'),
('30000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-000000000001','1.1.4.02','Percepciones y retenciones a favor','asset','debit',true,false,'tax_credits'),
('30000000-0000-4000-8000-000000000009','00000000-0000-4000-8000-000000000001','1.1.5.01','Otros creditos','asset','debit',true,false,'other_receivables'),
('30000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','1.2.1.01','Maquinarias y vehiculos','asset','debit',true,false,'machinery_assets'),
('30000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000001','1.2.1.99','Depreciacion acumulada','asset','credit',true,false,'accumulated_depreciation'),
('30000000-0000-4000-8000-000000000012','00000000-0000-4000-8000-000000000001','2.1.1.01','Proveedores','liability','credit',true,false,'accounts_payable'),
('30000000-0000-4000-8000-000000000013','00000000-0000-4000-8000-000000000001','2.1.2.01','Sueldos a pagar','liability','credit',true,false,'wages_payable'),
('30000000-0000-4000-8000-000000000014','00000000-0000-4000-8000-000000000001','2.1.2.02','Cargas sociales a pagar','liability','credit',true,false,'social_charges_payable'),
('30000000-0000-4000-8000-000000000015','00000000-0000-4000-8000-000000000001','2.1.3.01','IVA debito fiscal','liability','credit',true,false,'vat_debit'),
('30000000-0000-4000-8000-000000000016','00000000-0000-4000-8000-000000000001','2.1.3.02','Retenciones a depositar','liability','credit',true,false,'withholdings_payable'),
('30000000-0000-4000-8000-000000000017','00000000-0000-4000-8000-000000000001','2.1.3.03','Impuestos a pagar','liability','credit',true,false,'taxes_payable'),
('30000000-0000-4000-8000-000000000018','00000000-0000-4000-8000-000000000001','2.1.4.01','Anticipos de clientes','liability','credit',true,false,'customer_advances'),
('30000000-0000-4000-8000-000000000019','00000000-0000-4000-8000-000000000001','2.2.1.01','Prestamos financieros','liability','credit',true,false,'financial_loans'),
('30000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000001','3.1.1.01','Capital','equity','credit',true,false,'capital'),
('30000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-000000000001','3.1.2.01','Resultados acumulados','equity','credit',true,false,'retained_earnings'),
('30000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-000000000001','3.1.3.01','Resultado del ejercicio','equity','credit',true,false,'current_result'),
('30000000-0000-4000-8000-000000000023','00000000-0000-4000-8000-000000000001','4.1.1.01','Ingresos por obras y certificados','revenue','credit',true,true,'revenue_works'),
('30000000-0000-4000-8000-000000000024','00000000-0000-4000-8000-000000000001','4.1.2.01','Otros ingresos operativos','revenue','credit',true,false,'other_revenue'),
('30000000-0000-4000-8000-000000000025','00000000-0000-4000-8000-000000000001','4.1.3.01','Resultados financieros','revenue','credit',true,false,'financial_income'),
('30000000-0000-4000-8000-000000000026','00000000-0000-4000-8000-000000000001','5.1.1.01','Materiales y compras directas','cost','debit',true,true,'cost_materials'),
('30000000-0000-4000-8000-000000000027','00000000-0000-4000-8000-000000000001','5.1.2.01','Combustible','cost','debit',true,true,'cost_fuel'),
('30000000-0000-4000-8000-000000000028','00000000-0000-4000-8000-000000000001','5.1.3.01','Mantenimiento y reparaciones','cost','debit',true,false,'cost_maintenance'),
('30000000-0000-4000-8000-000000000029','00000000-0000-4000-8000-000000000001','5.1.4.01','Mano de obra directa','cost','debit',true,true,'cost_direct_labor'),
('30000000-0000-4000-8000-000000000030','00000000-0000-4000-8000-000000000001','5.1.5.01','Alquileres transportes y servicios','cost','debit',true,true,'cost_services'),
('30000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000001','6.1.1.01','Sueldos administrativos','expense','debit',true,false,'expense_admin_wages'),
('30000000-0000-4000-8000-000000000032','00000000-0000-4000-8000-000000000001','6.1.1.02','Cargas sociales','expense','debit',true,false,'expense_social_charges'),
('30000000-0000-4000-8000-000000000033','00000000-0000-4000-8000-000000000001','6.1.2.01','Gastos generales','expense','debit',true,false,'expense_general'),
('30000000-0000-4000-8000-000000000034','00000000-0000-4000-8000-000000000001','6.1.3.01','Honorarios y servicios','expense','debit',true,false,'expense_services'),
('30000000-0000-4000-8000-000000000035','00000000-0000-4000-8000-000000000001','6.1.4.01','Gastos bancarios','expense','debit',true,false,'expense_bank'),
('30000000-0000-4000-8000-000000000036','00000000-0000-4000-8000-000000000001','6.1.5.01','Impuestos y tasas','expense','debit',true,false,'expense_taxes'),
('30000000-0000-4000-8000-000000000037','00000000-0000-4000-8000-000000000001','6.1.6.01','Depreciaciones','expense','debit',true,false,'expense_depreciation'),
('30000000-0000-4000-8000-000000000038','00000000-0000-4000-8000-000000000001','6.1.9.01','Otros gastos','expense','debit',true,false,'expense_other')
on conflict(id) do update set name=excluded.name,is_active=true,requires_work=excluded.requires_work;

insert into public.accounting_parties(id,company_id,party_type,client_id,tax_condition)
values('31000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','customer','00000000-0000-4000-8002-000000000001','RI')
on conflict(id) do update set is_active=true;
insert into public.accounting_parties(id,company_id,party_type,supplier_id,tax_condition)
values('31000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','supplier','00000000-0000-4000-8015-000000000001','RI')
on conflict(id) do update set is_active=true;

insert into public.treasury_accounts(id,company_id,ledger_account_id,account_type,name,currency) values
('32000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','cash','Caja principal','ARS'),
('32000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','bank','Banco demo','ARS')
on conflict(id) do update set name=excluded.name,is_active=true;

import { Persona, Maquinaria, Obra, Cotizacion, Viaje, Remito, CargaCombustible, Mantenimiento, ItemStock, MovimientoStock, RegistroHH } from "@/types";

export const personalData: Persona[] = [
  { id: "1", nombre: "Juan", apellido: "Pérez", dni: "28456789", rol: "supervisor", telefono: "280-4551234", fechaIngreso: "2020-03-15", activo: true },
  { id: "2", nombre: "Carlos", apellido: "Gómez", dni: "31234567", rol: "capataz", telefono: "280-4552345", fechaIngreso: "2021-06-20", activo: true },
  { id: "3", nombre: "María", apellido: "López", dni: "29876543", rol: "administrativo", email: "mlopez@calaminasur.com", telefono: "280-4553456", fechaIngreso: "2019-01-10", activo: true },
  { id: "4", nombre: "Pedro", apellido: "Rodríguez", dni: "32567890", rol: "maquinista", telefono: "280-4554567", fechaIngreso: "2022-02-28", activo: true, licencia: "B2", vencimientoLicencia: "2025-08-15" },
  { id: "5", nombre: "Ana", apellido: "Martínez", dni: "30123456", rol: "chofer", telefono: "280-4555678", fechaIngreso: "2021-09-05", activo: true, licencia: "E1", vencimientoLicencia: "2025-03-20" },
  { id: "6", nombre: "Roberto", apellido: "Sánchez", dni: "27890123", rol: "maquinista", telefono: "280-4556789", fechaIngreso: "2018-11-12", activo: true, licencia: "B2", vencimientoLicencia: "2024-12-01" },
  { id: "7", nombre: "Lucía", apellido: "Fernández", dni: "33456789", rol: "chofer", telefono: "280-4557890", fechaIngreso: "2023-04-18", activo: true, licencia: "E1", vencimientoLicencia: "2026-04-18" },
  { id: "8", nombre: "Diego", apellido: "Torres", dni: "29012345", rol: "capataz", telefono: "280-4558901", fechaIngreso: "2020-07-22", activo: true },
];

export const maquinariasData: Maquinaria[] = [
  { id: "1", codigo: "CARG-001", nombre: "CAT 950", tipo: "cargadora", marca: "Caterpillar", modelo: "950", anio: 2019, estado: "en_uso", ubicacionActual: "Obra Lote 45", horasAcumuladas: 4520, proximoService: 5000, operadorAsignado: "Pedro Rodríguez" },
  { id: "2", codigo: "CARG-002", nombre: "Komatsu WA380", tipo: "cargadora", marca: "Komatsu", modelo: "WA380-8", anio: 2020, estado: "operativa", ubicacionActual: "Base Central", horasAcumuladas: 3200, proximoService: 3500 },
  { id: "3", codigo: "CAM-001", nombre: "Volvo A30G", tipo: "camion", marca: "Volvo", modelo: "A30G", anio: 2018, patente: "AB123CD", estado: "mantenimiento", ubicacionActual: "Taller", horasAcumuladas: 6800, proximoService: 7000 },
  { id: "4", codigo: "TOP-001", nombre: "CAT D6T", tipo: "topador", marca: "Caterpillar", modelo: "D6T", anio: 2021, estado: "en_uso", ubicacionActual: "Obra Circunvalación", horasAcumuladas: 2100, proximoService: 2500, operadorAsignado: "Roberto Sánchez" },
  { id: "5", codigo: "COMP-001", nombre: "Bomag BW211", tipo: "compactador", marca: "Bomag", modelo: "BW211D-50", anio: 2020, estado: "inactiva", ubicacionActual: "Base Central", horasAcumuladas: 1800, proximoService: 2000 },
  { id: "6", codigo: "RETRO-001", nombre: "Hyundai R210", tipo: "retroexcavadora", marca: "Hyundai", modelo: "R210LC-9", anio: 2022, estado: "en_uso", ubicacionActual: "Obra Zona Franca", horasAcumuladas: 980, proximoService: 1000 },
];

export const obrasData: Obra[] = [
  { id: "1", nombre: "Movimiento de Suelo - Lote 45", ubicacion: "Ruta 40, Km 234", descripcion: "Movimiento de 5000m³ de suelo", estado: "activa", fechaInicio: "2025-12-15", responsableId: "1", responsable: "Juan Pérez" },
  { id: "2", nombre: "Excavación Fundaciones", ubicacion: "Av. Circunvalación 890", descripcion: "Excavación para fundaciones de edificio", estado: "activa", fechaInicio: "2026-01-02", responsableId: "2", responsable: "Carlos Gómez" },
  { id: "3", nombre: "Nivelación Terreno Industrial", ubicacion: "Zona Franca, Sector B", descripcion: "Nivelación de 2 hectáreas", estado: "pendiente", fechaInicio: "2026-01-15", responsableId: "1", responsable: "Juan Pérez" },
  { id: "4", nombre: "Relleno y Compactación", ubicacion: "Calle San Martín 1200", descripcion: "Relleno y compactación vía pública", estado: "pausada", fechaInicio: "2025-11-10", responsableId: "2", responsable: "Carlos Gómez" },
  { id: "5", nombre: "Preparación Terreno Residencial", ubicacion: "Barrio Norte, Manzana 12", descripcion: "Preparación completa del terreno", estado: "finalizada", fechaInicio: "2025-10-01", responsableId: "1", responsable: "Juan Pérez" },
];

export const cotizacionesData: Cotizacion[] = [
  {
    id: "1", numero: "2026-001", obraId: "1", obra: "Movimiento de Suelo - Lote 45", descripcion: "Movimiento de 5,000 m³ de tierra", estado: "enviada",
    fechaCreacion: "2026-01-02", fechaVencimiento: "2026-01-15", responsable: "Admin",
    items: [
      { id: "1", descripcion: "Movimiento de suelo", unidad: "m³", cantidad: 5000, precioUnitario: 450, subtotal: 2250000 },
      { id: "2", descripcion: "Transporte de material", unidad: "viaje", cantidad: 100, precioUnitario: 8500, subtotal: 850000 },
    ],
    subtotal: 3100000, iva: 651000, total: 3751000,
  },
  {
    id: "2", numero: "2026-002", obraId: "2", obra: "Excavación Fundaciones", descripcion: "Excavación y relleno para fundaciones", estado: "enviada",
    fechaCreacion: "2026-01-03", fechaVencimiento: "2026-01-12", responsable: "Admin",
    items: [
      { id: "1", descripcion: "Excavación de fundaciones", unidad: "m³", cantidad: 800, precioUnitario: 520, subtotal: 416000 },
      { id: "2", descripcion: "Relleno con tosca", unidad: "m³", cantidad: 400, precioUnitario: 380, subtotal: 152000 },
    ],
    subtotal: 568000, iva: 119280, total: 687280,
  },
];

export const viajesData: Viaje[] = [
  { id: "1", fecha: "2026-01-08", obraId: "1", obra: "Movimiento de Suelo - Lote 45", choferId: "5", chofer: "Ana Martínez", camionId: "3", camion: "Volvo A30G", origen: "Cantera Norte", destino: "Obra Lote 45", material: "Tosca", volumen: 18, estado: "completado", horaInicio: "07:30", horaFin: "09:15", kmRecorridos: 45 },
  { id: "2", fecha: "2026-01-08", obraId: "1", obra: "Movimiento de Suelo - Lote 45", choferId: "7", chofer: "Lucía Fernández", camionId: "3", camion: "Volvo A30G", origen: "Cantera Norte", destino: "Obra Lote 45", material: "Tosca", volumen: 18, estado: "completado", horaInicio: "09:45", horaFin: "11:30", kmRecorridos: 45 },
  { id: "3", fecha: "2026-01-08", obraId: "2", obra: "Excavación Fundaciones", choferId: "5", chofer: "Ana Martínez", camionId: "3", camion: "Volvo A30G", origen: "Obra Circunvalación", destino: "Vertedero Municipal", material: "Tierra excavada", volumen: 20, estado: "en_curso", horaInicio: "14:00" },
  { id: "4", fecha: "2026-01-09", obraId: "1", obra: "Movimiento de Suelo - Lote 45", choferId: "5", chofer: "Ana Martínez", camionId: "3", camion: "Volvo A30G", origen: "Cantera Norte", destino: "Obra Lote 45", material: "Tosca", volumen: 18, estado: "programado" },
];

export const remitosData: Remito[] = [
  { id: "1", numero: "REM-2026-0001", viajeId: "1", fecha: "2026-01-08", obra: "Movimiento de Suelo - Lote 45", material: "Tosca", cantidad: 18, unidad: "m³", recibidoPor: "Jorge Méndez", firmado: true },
  { id: "2", numero: "REM-2026-0002", viajeId: "2", fecha: "2026-01-08", obra: "Movimiento de Suelo - Lote 45", material: "Tosca", cantidad: 18, unidad: "m³", recibidoPor: "Jorge Méndez", firmado: true },
  { id: "3", numero: "REM-2026-0003", viajeId: "3", fecha: "2026-01-08", obra: "Excavación Fundaciones", material: "Tierra excavada", cantidad: 20, unidad: "m³", recibidoPor: "", firmado: false },
];

export const combustibleData: CargaCombustible[] = [
  { id: "1", fecha: "2026-01-08", obraId: "1", obra: "Movimiento de Suelo - Lote 45", maquinariaId: "1", maquinaria: "CAT 320D", litros: 280, precioLitro: 950, costoTotal: 266000, horasMaquina: 4520, estacion: "YPF Trelew", operador: "Pedro Rodríguez" },
  { id: "2", fecha: "2026-01-07", obraId: "2", obra: "Excavación Fundaciones", maquinariaId: "4", maquinaria: "CAT D6T", litros: 350, precioLitro: 950, costoTotal: 332500, horasMaquina: 2100, estacion: "Shell Rawson", operador: "Roberto Sánchez" },
  { id: "3", fecha: "2026-01-06", obraId: "3", obra: "Nivelación Terreno Industrial", maquinariaId: "2", maquinaria: "Komatsu WA380", litros: 220, precioLitro: 950, costoTotal: 209000, horasMaquina: 3200, estacion: "YPF Trelew", operador: "Diego Torres" },
  { id: "4", fecha: "2026-01-05", obraId: "1", obra: "Movimiento de Suelo - Lote 45", maquinariaId: "6", maquinaria: "Hyundai R210", litros: 180, precioLitro: 950, costoTotal: 171000, horasMaquina: 980, estacion: "Axion Puerto Madryn", operador: "Pedro Rodríguez" },
];

export const mantenimientosData: Mantenimiento[] = [
  { id: "1", fecha: "2026-01-08", maquinariaId: "3", maquinaria: "Volvo A30G", tipo: "preventivo", descripcion: "Service 7000 horas - cambio de aceite, filtros y revisión general", repuestos: "Aceite motor x20L, Filtro aceite, Filtro aire, Filtro combustible", costoRepuestos: 185000, costoManoObra: 45000, costoTotal: 230000, horasMaquina: 6800, tecnico: "Taller Mecánico Central", estado: "en_proceso", proximoMantenimiento: "2026-04-08" },
  { id: "2", fecha: "2026-01-03", maquinariaId: "1", maquinaria: "CAT 320D", tipo: "correctivo", descripcion: "Reparación sistema hidráulico - reemplazo de mangueras", repuestos: "Manguera hidráulica x3, Conectores, Aceite hidráulico x10L", costoRepuestos: 95000, costoManoObra: 35000, costoTotal: 130000, horasMaquina: 4480, tecnico: "Finning Argentina", estado: "completado" },
  { id: "3", fecha: "2026-01-15", maquinariaId: "6", maquinaria: "Hyundai R210", tipo: "preventivo", descripcion: "Service 1000 horas programado", costoRepuestos: 0, costoManoObra: 0, costoTotal: 0, horasMaquina: 980, tecnico: "Por asignar", estado: "programado" },
];

export const stockData: ItemStock[] = [
  { id: "1", codigo: "MAT-001", nombre: "Tosca", categoria: "material", unidad: "m³", stockActual: 450, stockMinimo: 100, stockMaximo: 800, ubicacion: "Cantera Norte", precioUnitario: 380, activo: true },
  { id: "2", codigo: "MAT-002", nombre: "Arena gruesa", categoria: "material", unidad: "m³", stockActual: 180, stockMinimo: 50, stockMaximo: 400, ubicacion: "Base Central", precioUnitario: 420, activo: true },
  { id: "3", codigo: "MAT-003", nombre: "Piedra partida", categoria: "material", unidad: "m³", stockActual: 35, stockMinimo: 80, stockMaximo: 300, ubicacion: "Base Central", precioUnitario: 550, activo: true },
  { id: "4", codigo: "REP-001", nombre: "Filtro de aceite CAT", categoria: "repuesto", unidad: "unidad", stockActual: 12, stockMinimo: 5, stockMaximo: 30, ubicacion: "Depósito Taller", precioUnitario: 15000, activo: true },
  { id: "5", codigo: "REP-002", nombre: "Filtro de aire CAT", categoria: "repuesto", unidad: "unidad", stockActual: 8, stockMinimo: 5, stockMaximo: 25, ubicacion: "Depósito Taller", precioUnitario: 22000, activo: true },
  { id: "6", codigo: "REP-003", nombre: "Manguera hidráulica 1\"", categoria: "repuesto", unidad: "metro", stockActual: 2, stockMinimo: 10, stockMaximo: 50, ubicacion: "Depósito Taller", precioUnitario: 8500, activo: true },
  { id: "7", codigo: "CON-001", nombre: "Aceite hidráulico", categoria: "consumible", unidad: "litro", stockActual: 180, stockMinimo: 100, stockMaximo: 500, ubicacion: "Depósito Taller", precioUnitario: 2800, activo: true },
  { id: "8", codigo: "HER-001", nombre: "Llave de impacto", categoria: "herramienta", unidad: "unidad", stockActual: 3, stockMinimo: 2, stockMaximo: 5, ubicacion: "Depósito Taller", precioUnitario: 85000, activo: true },
];

export const movimientosStockData: MovimientoStock[] = [
  { id: "1", fecha: "2026-01-08", itemId: "1", item: "Tosca", tipo: "salida", cantidad: 36, stockAnterior: 486, stockNuevo: 450, obraId: "1", obra: "Movimiento de Suelo - Lote 45", motivo: "Entrega a obra", responsableId: "5", responsable: "Ana Martínez" },
  { id: "2", fecha: "2026-01-07", itemId: "1", item: "Tosca", tipo: "entrada", cantidad: 200, stockAnterior: 286, stockNuevo: 486, motivo: "Compra a proveedor Cantera Sur", responsableId: "3", responsable: "María López" },
  { id: "3", fecha: "2026-01-06", itemId: "3", item: "Piedra partida", tipo: "salida", cantidad: 45, stockAnterior: 80, stockNuevo: 35, obraId: "2", obra: "Excavación Fundaciones", motivo: "Entrega a obra", responsableId: "7", responsable: "Lucía Fernández" },
  { id: "4", fecha: "2026-01-05", itemId: "6", item: "Manguera hidráulica 1\"", tipo: "salida", cantidad: 8, stockAnterior: 10, stockNuevo: 2, motivo: "Reparación CAT 320D", responsableId: "4", responsable: "Pedro Rodríguez" },
  { id: "5", fecha: "2026-01-04", itemId: "4", item: "Filtro de aceite CAT", tipo: "entrada", cantidad: 10, stockAnterior: 2, stockNuevo: 12, motivo: "Compra a Finning Argentina", responsableId: "3", responsable: "María López" },
];

export const presentismoData: RegistroHH[] = [
  { id: "1", fecha: "2026-01-09", personaId: "4", persona: "Pedro Rodríguez", obraId: "1", obra: "Movimiento de Suelo - Lote 45", capatazId: "2", capataz: "Carlos Gómez", horaEntrada: "07:00", horaSalida: "16:00", horasNormales: 8, horasExtra: 1, horasTotales: 9, tarea: "Operación excavadora", estado: "presente" },
  { id: "2", fecha: "2026-01-09", personaId: "5", persona: "Ana Martínez", obraId: "1", obra: "Movimiento de Suelo - Lote 45", capatazId: "2", capataz: "Carlos Gómez", horaEntrada: "07:00", horaSalida: "15:00", horasNormales: 8, horasExtra: 0, horasTotales: 8, tarea: "Transporte de material", estado: "presente" },
  { id: "3", fecha: "2026-01-09", personaId: "6", persona: "Roberto Sánchez", obraId: "2", obra: "Excavación Fundaciones", capatazId: "8", capataz: "Diego Torres", horaEntrada: "07:00", horaSalida: "17:00", horasNormales: 8, horasExtra: 2, horasTotales: 10, tarea: "Operación topadora", estado: "presente" },
  { id: "4", fecha: "2026-01-09", personaId: "7", persona: "Lucía Fernández", obraId: "2", obra: "Excavación Fundaciones", capatazId: "8", capataz: "Diego Torres", horaEntrada: "", horaSalida: "", horasNormales: 0, horasExtra: 0, horasTotales: 0, tarea: "", estado: "ausente", observaciones: "Sin aviso" },
  { id: "5", fecha: "2026-01-08", personaId: "4", persona: "Pedro Rodríguez", obraId: "1", obra: "Movimiento de Suelo - Lote 45", capatazId: "2", capataz: "Carlos Gómez", horaEntrada: "07:00", horaSalida: "15:00", horasNormales: 8, horasExtra: 0, horasTotales: 8, tarea: "Operación excavadora", estado: "presente" },
  { id: "6", fecha: "2026-01-08", personaId: "5", persona: "Ana Martínez", obraId: "1", obra: "Movimiento de Suelo - Lote 45", capatazId: "2", capataz: "Carlos Gómez", horaEntrada: "07:00", horaSalida: "15:00", horasNormales: 8, horasExtra: 0, horasTotales: 8, tarea: "Transporte de material", estado: "presente" },
  { id: "7", fecha: "2026-01-08", personaId: "6", persona: "Roberto Sánchez", obraId: "2", obra: "Excavación Fundaciones", capatazId: "8", capataz: "Diego Torres", horaEntrada: "", horaSalida: "", horasNormales: 0, horasExtra: 0, horasTotales: 0, tarea: "", estado: "licencia", observaciones: "Trámite personal" },
];

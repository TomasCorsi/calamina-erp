import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { normalizarNombre, remitoEsDeObra } from "@/lib/obraMatch";

export interface GastoCategoria {
  categoria: string;
  monto: number;
}

export interface MaquinaHoras {
  nombre: string;
  horas: number;
}

export interface TipoMaquinaHoras {
  tipo: string;
  horas: number;
  maquinas: number;
}

export interface MaterialMovido {
  nombre: string;
  cantidad: number;
  viajes: number;
}

export interface ObraTableroData {
  obraId: string;
  nombre: string;
  estado: string;
  ubicacion: string | null;
  movimientosHoy: number;
  m3Hoy: number;
  m3Mes: number;
  viajesMes: number;
  litrosMes: number;
  costoCombustible: number;
  costoMantenimiento: number;
  costoOtros: number;
  gastosPorCategoria: GastoCategoria[];
  montoCotizado: number;
  anticipoCobrado: number;
  maquinariasTotal: number;
  maquinariasEnUso: number;
  horasHoy: number;
  horasMes: number;
  personalHoy: number;
  gastosMes: number;
  horasPorMaquina: MaquinaHoras[];
  horasPorTipoMaquina: TipoMaquinaHoras[];
  materiales: MaterialMovido[];
  sinDatos: boolean;
  alertas: string[];
}

export const nombreTipoMaquina = (t: string) =>
  (t || "otros")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

/** Agrupa los remitos por tipo de material, unificando mayúsculas/acentos. */
export function agruparMateriales(remitos: any[]): MaterialMovido[] {
  const acc: Record<string, { nombre: string; cantidad: number; viajes: number }> = {};
  remitos.forEach((r) => {
    const raw = (r.tipo_material || "").toString().trim();
    if (!raw) return;
    const key = normalizarNombre(raw);
    if (!acc[key]) {
      acc[key] = {
        nombre: raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase(),
        cantidad: 0,
        viajes: 0,
      };
    }
    acc[key].cantidad += Number(r.cantidad) || 0;
    acc[key].viajes += Number(r.cantidad_viajes) || 1;
  });
  return Object.values(acc).sort((a, b) => b.cantidad - a.cantidad);
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

/** Trae todas las filas salteando el límite de 1000 de la API. */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>
): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let page = 0; page < 20; page++) {
    const { data, error } = await build(page * PAGE, page * PAGE + PAGE - 1);
    if (error) break;
    const rows = (data || []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

const fetchTablero = async (obraIds: string[], mes: string): Promise<ObraTableroData[]> => {
  if (obraIds.length === 0) return [];

  const base = parseISO(`${mes}-01`);
  const mesActual = mes === format(new Date(), "yyyy-MM");
  const inicioMes = format(startOfMonth(base), "yyyy-MM-dd");
  const finMes = format(endOfMonth(base), "yyyy-MM-dd");
  const anio = base.getFullYear();
  const mesNum = base.getMonth() + 1;
  // En el mes actual las métricas "del día" son de hoy; en meses pasados, del mes completo.
  const esDelPeriodo = (fecha: string) => (mesActual ? fecha === format(new Date(), "yyyy-MM-dd") : true);

  const [obrasRes, partesRes, maqRes, gastosRes, combRes, preciosRes, cotizRes, ocRes] = await Promise.all([
    supabase.from("obras").select("id, nombre, estado, ubicacion").in("id", obraIds),
    supabase
      .from("partes_diarios")
      .select("obra_id, fecha, personal_id, maquinaria_id, cantidad_viajes, cantidad_movimiento_interno, horometro_inicio, horometro_fin, estado_maquina, observacion_maquina")
      .in("obra_id", obraIds)
      .gte("fecha", inicioMes)
      .lte("fecha", finMes),
    supabase.from("maquinarias").select("id, obra_id, estado").in("obra_id", obraIds),
    supabase
      .from("otros_gastos")
      .select("obra_id, fecha, monto, categoria")
      .in("obra_id", obraIds)
      .gte("fecha", inicioMes)
      .lte("fecha", finMes),
    supabase
      .from("cargas_combustible_repartidor")
      .select("obra_id, fecha, litros, tipo_producto")
      .in("obra_id", obraIds)
      .gte("fecha", inicioMes)
      .lte("fecha", finMes),
    supabase.from("precios_productos_mes").select("producto, precio_unitario, mes, anio").eq("anio", anio).eq("mes", mesNum),
    supabase.from("cotizaciones").select("id, obra_id, subtotal, total, anticipo_monto, estado").in("obra_id", obraIds).eq("estado", "aprobada"),
    supabase
      .from("ordenes_compra")
      .select("obra_id, fecha, subtotal, total, estado")
      .in("obra_id", obraIds)
      .in("estado", ["emitida", "recibida"])
      .gte("fecha", inicioMes)
      .lte("fecha", finMes),
  ]);

  // Los remitos no tienen obra_id cargado: se traen todos del período y se asignan por nombre.
  const remitos = await fetchAll<any>((from, to) =>
    supabase
      .from("remitos")
      .select("obra_id, fecha, cantidad, cantidad_viajes, precio_total, desde, hasta, tipo_material")
      .gte("fecha", inicioMes)
      .lte("fecha", finMes)
      .range(from, to)
  );

  const maquinarias = (maqRes.data || []) as { id: string; obra_id: string | null; estado: string }[];
  const partes = (partesRes.data || []) as any[];
  const maqIds = Array.from(
    new Set([...maquinarias.map((m) => m.id), ...partes.map((p) => p.maquinaria_id).filter(Boolean)])
  ) as string[];

  let mantenimientos: { maquinaria_id: string; costo_total: number | null }[] = [];
  const maqNombres: Record<string, string> = {};
  const maqTipos: Record<string, string> = {};
  if (maqIds.length > 0) {
    const [mantRes, nombresRes] = await Promise.all([
      supabase
        .from("mantenimientos")
        .select("maquinaria_id, costo_total")
        .in("maquinaria_id", maqIds)
        .gte("fecha", inicioMes)
        .lte("fecha", finMes),
      supabase.from("maquinarias").select("id, nombre, codigo, patente, tipo").in("id", maqIds),
    ]);
    mantenimientos = (mantRes.data || []) as typeof mantenimientos;
    ((nombresRes.data || []) as any[]).forEach((m) => {
      maqNombres[m.id] = m.nombre || m.codigo || m.patente || "Sin identificar";
      maqTipos[m.id] = m.tipo || "otros";
    });
  }

  const maqObra: Record<string, string | null> = {};
  maquinarias.forEach((m) => (maqObra[m.id] = m.obra_id));
  // Si la máquina no tiene obra en su ficha, se usa la obra de su parte diario
  partes.forEach((p) => {
    if (p.maquinaria_id && !maqObra[p.maquinaria_id]) maqObra[p.maquinaria_id] = p.obra_id;
  });

  const precios: Record<string, number> = {};
  ((preciosRes.data || []) as any[]).forEach((p) => {
    precios[p.producto] = num(p.precio_unitario);
  });

  const gastos = (gastosRes.data || []) as any[];
  const cotizaciones = (cotizRes.data || []) as any[];

  // Anticipos de las cotizaciones aprobadas (múltiples por cotización)
  const anticipoPorCotiz: Record<string, number> = {};
  const cotizIds = cotizaciones.map((c) => c.id).filter(Boolean);
  if (cotizIds.length > 0) {
    const { data: antData } = await supabase
      .from("cotizacion_anticipos")
      .select("cotizacion_id, monto")
      .in("cotizacion_id", cotizIds);
    ((antData || []) as any[]).forEach((a) => {
      anticipoPorCotiz[a.cotizacion_id] = (anticipoPorCotiz[a.cotizacion_id] || 0) + num(a.monto);
    });
  }
  const combustible = (combRes.data || []) as any[];
  const ordenesCompra = (ocRes.data || []) as any[];

  return ((obrasRes.data || []) as any[]).map((obra) => {
    const nombreNorm = normalizarNombre(obra.nombre);
    const partesObra = partes.filter((p) => p.obra_id === obra.id);
    const partesHoy = partesObra.filter((p) => esDelPeriodo(p.fecha));
    const remitosObra = remitos.filter((r) => remitoEsDeObra(r, obra.id, nombreNorm));
    const remitosHoy = remitosObra.filter((r) => esDelPeriodo(r.fecha));
    const maqObraList = maquinarias.filter((m) => m.obra_id === obra.id);
    const combObra = combustible.filter((c) => c.obra_id === obra.id);

    const horas = (arr: any[]) =>
      arr.reduce((sum, p) => {
        const h = num(p.horometro_fin) - num(p.horometro_inicio);
        return sum + (h > 0 && h < 24 ? h : 0);
      }, 0);

    const viajesRemitos = (arr: any[]) =>
      arr.reduce((s, r) => s + (num(r.cantidad_viajes) || 1), 0);

    const movimientosHoy =
      partesHoy.reduce((s, p) => s + num(p.cantidad_viajes) + num(p.cantidad_movimiento_interno), 0) +
      viajesRemitos(remitosHoy);

    const litrosMes = combObra.reduce((s, c) => s + num(c.litros), 0);
    const costoCombustible = combObra.reduce(
      (s, c) => s + num(c.litros) * (precios[c.tipo_producto || "combustible"] || precios["combustible"] || 0),
      0
    );

    const gastosObra = gastos.filter((g) => g.obra_id === obra.id);
    const costoOtros = gastosObra.reduce((s, g) => s + num(g.monto), 0);
    const porCategoria: Record<string, number> = {};
    gastosObra.forEach((g) => {
      const cat = (g.categoria || "varios").toString();
      porCategoria[cat] = (porCategoria[cat] || 0) + num(g.monto);
    });
    const costoMantenimiento = mantenimientos
      .filter((m) => maqObra[m.maquinaria_id] === obra.id)
      .reduce((s, m) => s + num(m.costo_total), 0);
    const costoOrdenes = ordenesCompra
      .filter((o) => o.obra_id === obra.id)
      .reduce((s, o) => s + (o.subtotal != null ? num(o.subtotal) : num(o.total)), 0);
    const gastosMes = costoOtros + costoMantenimiento + costoCombustible + costoOrdenes;

    const gastosPorCategoria: GastoCategoria[] = [
      { categoria: "Combustible", monto: costoCombustible },
      { categoria: "Órdenes de compra", monto: costoOrdenes },
      { categoria: "Mantenimiento", monto: costoMantenimiento },
      ...Object.entries(porCategoria).map(([categoria, monto]) => ({ categoria, monto })),
    ]
      .filter((g) => g.monto > 0)
      .sort((a, b) => b.monto - a.monto);

    const montoCotizado = cotizaciones
      .filter((c) => c.obra_id === obra.id)
      .reduce((s, c) => s + num(c.subtotal), 0);

    const anticipoCobrado = cotizaciones
      .filter((c) => c.obra_id === obra.id)
      .reduce((s, c) => s + (anticipoPorCotiz[c.id] ?? num(c.anticipo_monto)), 0);

    const horasMaq: Record<string, number> = {};
    partesObra.forEach((p) => {
      if (!p.maquinaria_id) return;
      const h = num(p.horometro_fin) - num(p.horometro_inicio);
      if (h > 0 && h < 24) horasMaq[p.maquinaria_id] = (horasMaq[p.maquinaria_id] || 0) + h;
    });
    const horasPorMaquina = Object.entries(horasMaq)
      .map(([id, h]) => ({ nombre: maqNombres[id] || "Sin identificar", horas: Number(h.toFixed(1)) }))
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 6);

    // Agrupación por tipo de máquina (camión, retroexcavadora, etc.)
    const porTipo: Record<string, { horas: number; maquinas: Set<string> }> = {};
    Object.entries(horasMaq).forEach(([id, h]) => {
      const tipo = maqTipos[id] || "otros";
      if (!porTipo[tipo]) porTipo[tipo] = { horas: 0, maquinas: new Set() };
      porTipo[tipo].horas += h;
      porTipo[tipo].maquinas.add(id);
    });
    const horasPorTipoMaquina: TipoMaquinaHoras[] = Object.entries(porTipo)
      .map(([tipo, v]) => ({
        tipo: nombreTipoMaquina(tipo),
        horas: Number(v.horas.toFixed(1)),
        maquinas: v.maquinas.size,
      }))
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 8);

    const materiales = agruparMateriales(remitosObra);

    const alertas = partesHoy
      .filter((p) => p.estado_maquina === "OBSERVACION")
      .map((p) => p.observacion_maquina || "Máquina con observación")
      .slice(0, 3);

    return {
      obraId: obra.id,
      nombre: obra.nombre,
      estado: obra.estado,
      ubicacion: obra.ubicacion,
      movimientosHoy,
      m3Hoy: remitosHoy.reduce((s, r) => s + num(r.cantidad), 0),
      m3Mes: remitosObra.reduce((s, r) => s + num(r.cantidad), 0),
      viajesMes: viajesRemitos(remitosObra),
      litrosMes,
      costoCombustible,
      costoMantenimiento,
      costoOtros,
      gastosPorCategoria,
      montoCotizado,
      anticipoCobrado,
      horasPorMaquina,
      horasPorTipoMaquina,
      materiales,
      maquinariasTotal: new Set([
        ...partesObra.map((p) => p.maquinaria_id).filter(Boolean),
        ...maqObraList.map((m) => m.id),
      ]).size,
      maquinariasEnUso: new Set(partesHoy.map((p) => p.maquinaria_id).filter(Boolean)).size,
      horasHoy: horas(partesHoy),
      horasMes: horas(partesObra),
      personalHoy: new Set(partesHoy.map((p) => p.personal_id)).size,
      gastosMes,
      sinDatos:
        partesObra.length === 0 && remitosObra.length === 0 && combObra.length === 0 && gastosMes === 0,
      alertas,
    };
  });
};

export function useTableroObras(obraIds: string[], mes: string, refetchInterval?: number) {
  const { data, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["tablero-obras", [...obraIds].sort(), mes],
    queryFn: () => fetchTablero(obraIds, mes),
    enabled: obraIds.length > 0,
    refetchInterval,
    refetchOnWindowFocus: true,
  });

  // Mantiene el orden elegido por el usuario
  const ordenadas = obraIds
    .map((id) => (data || []).find((o) => o.obraId === id))
    .filter(Boolean) as ObraTableroData[];

  return {
    obras: ordenadas,
    loading: isLoading,
    refetch,
    dataUpdatedAt,
    esMesActual: mes === format(new Date(), "yyyy-MM"),
  };
}

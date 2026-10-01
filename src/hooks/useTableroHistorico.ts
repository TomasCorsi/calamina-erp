import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizarNombre, remitoEsDeObra } from "@/lib/obraMatch";
import { agruparMateriales, MaterialMovido } from "@/hooks/useTableroObras";

export interface HistoricoObra {
  gastosPorCategoria: { categoria: string; monto: number }[];
  movimientos: number;
  m3: number;
  horas: number;
  litros: number;
  viajes: number;
  gastos: number;
  maquinarias: number;
  personal: number;
  materiales: MaterialMovido[];
}

export type HistoricoTablero = Record<string, HistoricoObra>;

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>
): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let page = 0; page < 40; page++) {
    const { data, error } = await build(page * PAGE, page * PAGE + PAGE - 1);
    if (error) break;
    const rows = (data || []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

const fetchHistorico = async (
  obras: { obraId: string; nombre: string }[]
): Promise<HistoricoTablero> => {
  if (obras.length === 0) return {};
  const obraIds = obras.map((o) => o.obraId);

  const [partes, remitos, cargas, gastos, ordenesCompra, maqRes, preciosRes] = await Promise.all([
    fetchAll<any>((from, to) =>
      supabase
        .from("partes_diarios")
        .select(
          "obra_id, personal_id, maquinaria_id, cantidad_viajes, cantidad_movimiento_interno, horometro_inicio, horometro_fin"
        )
        .in("obra_id", obraIds)
        .range(from, to)
    ),
    fetchAll<any>((from, to) =>
      supabase
        .from("remitos")
        .select("obra_id, cantidad, cantidad_viajes, desde, hasta, tipo_material")
        .range(from, to)
    ),
    fetchAll<any>((from, to) =>
      supabase
        .from("cargas_combustible_repartidor")
        .select("obra_id, litros, fecha, tipo_producto")
        .in("obra_id", obraIds)
        .range(from, to)
    ),
    fetchAll<any>((from, to) =>
      supabase.from("otros_gastos").select("obra_id, monto, categoria").in("obra_id", obraIds).range(from, to)
    ),
    fetchAll<any>((from, to) =>
      supabase
        .from("ordenes_compra")
        .select("obra_id, subtotal, total, estado")
        .in("obra_id", obraIds)
        .in("estado", ["emitida", "recibida"])
        .range(from, to)
    ),
    supabase.from("maquinarias").select("id, obra_id").in("obra_id", obraIds),
    supabase.from("precios_productos_mes").select("producto, precio_unitario, mes, anio"),
  ]);

  // Costo histórico de combustible: litros valuados al precio del mes de la carga
  const precios: Record<string, number> = {};
  ((preciosRes.data || []) as any[]).forEach((p) => {
    precios[`${p.anio}-${String(p.mes).padStart(2, "0")}|${p.producto}`] = num(p.precio_unitario);
  });
  const precioCarga = (c: any) => {
    const ym = (c.fecha || "").slice(0, 7);
    return (
      precios[`${ym}|${c.tipo_producto || "combustible"}`] ??
      precios[`${ym}|combustible`] ??
      0
    );
  };

  // Mantenimientos históricos de las máquinas asignadas a cada obra
  const maqObra: Record<string, string | null> = {};
  ((maqRes.data || []) as any[]).forEach((m) => (maqObra[m.id] = m.obra_id));
  partes.forEach((p) => {
    if (p.maquinaria_id && !maqObra[p.maquinaria_id]) maqObra[p.maquinaria_id] = p.obra_id;
  });
  const maqIds = Object.keys(maqObra);
  const mantenimientos =
    maqIds.length > 0
      ? await fetchAll<any>((from, to) =>
          supabase
            .from("mantenimientos")
            .select("maquinaria_id, costo_total")
            .in("maquinaria_id", maqIds)
            .range(from, to)
        )
      : [];

  const out: HistoricoTablero = {};

  obras.forEach((o) => {
    const norm = normalizarNombre(o.nombre);
    const p = partes.filter((x) => x.obra_id === o.obraId);
    const r = remitos.filter((x) => remitoEsDeObra(x, o.obraId, norm));

    const viajes = r.reduce((s, x) => s + (num(x.cantidad_viajes) || 1), 0);

    const cargasObra = cargas.filter((x) => x.obra_id === o.obraId);
    const costoCombustible = cargasObra.reduce((s, x) => s + num(x.litros) * precioCarga(x), 0);
    const costoMantenimiento = mantenimientos
      .filter((m) => maqObra[m.maquinaria_id] === o.obraId)
      .reduce((s, m) => s + num(m.costo_total), 0);
    const gastosObra = gastos.filter((x) => x.obra_id === o.obraId);
    const costoOtros = gastosObra.reduce((s, x) => s + num(x.monto), 0);
    const porCategoria: Record<string, number> = {};
    gastosObra.forEach((g) => {
      const cat = (g.categoria || "varios").toString();
      porCategoria[cat] = (porCategoria[cat] || 0) + num(g.monto);
    });
    const costoOrdenes = ordenesCompra
      .filter((x) => x.obra_id === o.obraId)
      .reduce((s, x) => s + (x.subtotal != null ? num(x.subtotal) : num(x.total)), 0);
    const gastosPorCategoria = [
      { categoria: "Combustible", monto: costoCombustible },
      { categoria: "Órdenes de compra", monto: costoOrdenes },
      { categoria: "Mantenimiento", monto: costoMantenimiento },
      ...Object.entries(porCategoria).map(([categoria, monto]) => ({ categoria, monto })),
    ]
      .filter((g) => g.monto > 0)
      .sort((a, b) => b.monto - a.monto);

    out[o.obraId] = {
      movimientos:
        p.reduce((s, x) => s + num(x.cantidad_viajes) + num(x.cantidad_movimiento_interno), 0) + viajes,
      m3: r.reduce((s, x) => s + num(x.cantidad), 0),
      horas: p.reduce((s, x) => {
        const h = num(x.horometro_fin) - num(x.horometro_inicio);
        return s + (h > 0 && h < 24 ? h : 0);
      }, 0),
      litros: cargasObra.reduce((s, x) => s + num(x.litros), 0),
      viajes,
      gastos: costoOtros + costoCombustible + costoMantenimiento + costoOrdenes,
      gastosPorCategoria,
      maquinarias: new Set(p.map((x) => x.maquinaria_id).filter(Boolean)).size,
      personal: new Set(p.map((x) => x.personal_id).filter(Boolean)).size,
      materiales: agruparMateriales(r),
    };
  });

  return out;
};

export function useTableroHistorico(obras: { obraId: string; nombre: string }[]) {
  const key = obras.map((o) => o.obraId).sort();
  const { data, isLoading } = useQuery({
    queryKey: ["tablero-historico", key],
    queryFn: () => fetchHistorico(obras),
    enabled: obras.length > 0,
    staleTime: 30 * 60 * 1000,
  });

  return { historico: data || {}, loading: isLoading };
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, parseISO, eachDayOfInterval, isAfter } from "date-fns";
import { normalizarNombre, remitoEsDeObra } from "@/lib/obraMatch";

export type MetricaSerie = "movimientos" | "m3" | "horas" | "litros";

export interface SeriePunto {
  fecha: string; // yyyy-MM-dd
  label: string; // dd/MM
  [obraId: string]: number | string;
}

export type SeriesTablero = Record<MetricaSerie, SeriePunto[]>;

const EMPTY: SeriesTablero = { movimientos: [], m3: [], horas: [], litros: [] };

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

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

const fetchSeries = async (
  obras: { obraId: string; nombre: string }[],
  mes: string
): Promise<SeriesTablero> => {
  if (obras.length === 0) return EMPTY;

  const base = parseISO(`${mes}-01`);
  const hoy = new Date();
  const finReal = isAfter(endOfMonth(base), hoy) ? hoy : endOfMonth(base);
  const desde = format(startOfMonth(base), "yyyy-MM-dd");
  const hasta = format(finReal, "yyyy-MM-dd");
  const obraIds = obras.map((o) => o.obraId);

  const [partesRes, combRes] = await Promise.all([
    supabase
      .from("partes_diarios")
      .select("obra_id, fecha, cantidad_viajes, cantidad_movimiento_interno, horometro_inicio, horometro_fin")
      .in("obra_id", obraIds)
      .gte("fecha", desde)
      .lte("fecha", hasta),
    supabase
      .from("cargas_combustible_repartidor")
      .select("obra_id, fecha, litros")
      .in("obra_id", obraIds)
      .gte("fecha", desde)
      .lte("fecha", hasta),
  ]);

  const remitos = await fetchAll<any>((from, to) =>
    supabase
      .from("remitos")
      .select("obra_id, fecha, cantidad, cantidad_viajes, desde, hasta")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .range(from, to)
  );

  const partes = (partesRes.data || []) as any[];
  const cargas = (combRes.data || []) as any[];

  // Pre-asigna cada remito a la obra que corresponde (por id o por nombre en desde/hasta)
  const remitosPorObra: Record<string, any[]> = {};
  obras.forEach((o) => {
    const norm = normalizarNombre(o.nombre);
    remitosPorObra[o.obraId] = remitos.filter((r) => remitoEsDeObra(r, o.obraId, norm));
  });

  const dias: string[] = eachDayOfInterval({ start: startOfMonth(base), end: finReal }).map((d) =>
    format(d, "yyyy-MM-dd")
  );

  const build = (calc: (fecha: string, obraId: string) => number): SeriePunto[] =>
    dias.map((fecha) => {
      const punto: SeriePunto = { fecha, label: format(new Date(`${fecha}T00:00:00`), "dd/MM") };
      obraIds.forEach((id) => {
        punto[id] = Number(calc(fecha, id).toFixed(1));
      });
      return punto;
    });

  const movimientos = build((fecha, id) => {
    const p = partes.filter((x) => x.fecha === fecha && x.obra_id === id);
    const r = (remitosPorObra[id] || []).filter((x) => x.fecha === fecha);
    return (
      p.reduce((s, x) => s + num(x.cantidad_viajes) + num(x.cantidad_movimiento_interno), 0) +
      r.reduce((s, x) => s + (num(x.cantidad_viajes) || 1), 0)
    );
  });

  const m3 = build((fecha, id) =>
    (remitosPorObra[id] || [])
      .filter((x) => x.fecha === fecha)
      .reduce((s, x) => s + num(x.cantidad), 0)
  );

  const horas = build((fecha, id) =>
    partes
      .filter((x) => x.fecha === fecha && x.obra_id === id)
      .reduce((s, x) => {
        const h = num(x.horometro_fin) - num(x.horometro_inicio);
        return s + (h > 0 && h < 24 ? h : 0);
      }, 0)
  );

  const litros = build((fecha, id) =>
    cargas.filter((x) => x.fecha === fecha && x.obra_id === id).reduce((s, x) => s + num(x.litros), 0)
  );

  return { movimientos, m3, horas, litros };
};

export function useTableroSeries(
  obras: { obraId: string; nombre: string }[],
  mes: string,
  refetchInterval?: number
) {
  const key = obras.map((o) => o.obraId).sort();
  const { data, isLoading } = useQuery({
    queryKey: ["tablero-series", key, mes],
    queryFn: () => fetchSeries(obras, mes),
    enabled: obras.length > 0,
    refetchInterval,
    refetchOnWindowFocus: true,
  });

  return { series: data || EMPTY, loading: isLoading };
}

export const SERIE_COLORS = ["#B00020", "#E4A11B", "#6B7280"];

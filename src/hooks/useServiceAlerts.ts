import { useMemo } from "react";
import { useMantenimientos, type MantenimientoWithRelations } from "./useMantenimientos";
import { useMaquinarias } from "./useMaquinarias";

export const UMBRAL_HR = 25;
export const UMBRAL_KM = 250;

export type ServiceAlert = {
  maquinaria: string;
  maquinariaId: string;
  patente?: string | null;
  unidad: "h" | "km";
  actual: number;
  limite: number;
  diff: number; // positive if overdue, negative if remaining
  pct: number;
  estado: "vencido" | "proximo";
};

export function useServiceAlerts() {
  const { mantenimientos } = useMantenimientos();
  const { maquinarias } = useMaquinarias();

  const alerts = useMemo<ServiceAlert[]>(() => {
    const out: ServiceAlert[] = [];
    const latestByMaq = new Map<string, MantenimientoWithRelations>();
    mantenimientos.filter(m => m.tipo === "preventivo").forEach(m => {
      const existing = latestByMaq.get(m.maquinaria_id);
      if (!existing || m.fecha > existing.fecha) latestByMaq.set(m.maquinaria_id, m);
    });
    latestByMaq.forEach((m) => {
      const maq = maquinarias.find(q => q.id === m.maquinaria_id);
      if (!maq) return;
      const nombre = maq.codigo || maq.nombre || "?";
      const patente = (maq as any).patente ?? null;

      if (m.proximo_service_hr) {
        const actual = maq.horas_acumuladas || 0;
        const limite = m.proximo_service_hr;
        const diff = actual - limite;
        if (diff >= -UMBRAL_HR) {
          out.push({
            maquinaria: nombre, maquinariaId: maq.id, patente, unidad: "h",
            actual, limite, diff,
            pct: limite > 0 ? (actual / limite) * 100 : 0,
            estado: diff >= 0 ? "vencido" : "proximo",
          });
        }
      }
      if (m.proximo_service_km) {
        const actual = (maq as any).km_acumulados || 0;
        const limite = m.proximo_service_km;
        const diff = actual - limite;
        if (diff >= -UMBRAL_KM) {
          out.push({
            maquinaria: nombre, maquinariaId: maq.id, patente, unidad: "km",
            actual, limite, diff,
            pct: limite > 0 ? (actual / limite) * 100 : 0,
            estado: diff >= 0 ? "vencido" : "proximo",
          });
        }
      }
    });
    return out.sort((a, b) => {
      if (a.estado !== b.estado) return a.estado === "vencido" ? -1 : 1;
      return b.diff - a.diff;
    });
  }, [mantenimientos, maquinarias]);

  const vencidosCount = useMemo(() => alerts.filter(a => a.estado === "vencido").length, [alerts]);
  const proximosCount = alerts.length - vencidosCount;

  return { alerts, vencidosCount, proximosCount };
}

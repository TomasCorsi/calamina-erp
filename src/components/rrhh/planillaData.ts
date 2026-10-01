import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { diasEnRango, type RrhhNovedad, type RrhhPeriodo } from "@/hooks/useRrhh";

export interface PlanillaRow {
  personal_id: string;
  legajo: string;
  empleado: string;
  ingreso: string | null;
  baja: string | null;
  horasNormales: number;
  feriadoTrabajado: number;
  inasistencias: number;
  enfermedad: number;
  art: number;
  licencia: number;
  vacaciones: number;
  horasExtras: number;
  totalHoras: number;
  premio: number;
  anticipo: number;
  observaciones: string;
}

export interface PersonalMin {
  id: string;
  nombre: string | null;
  apellido: string | null;
  legajo: string | null;
  fecha_ingreso: string | null;
  fecha_baja?: string | null;
  activo: boolean;
  estado_laboral?: string | null;
  sector?: string | null;
  puesto?: string | null;
}

/** Vacaciones y adelantos ya cargados en el sistema que caen dentro del período */
export function usePeriodoExterno(periodo: RrhhPeriodo | null) {
  return useQuery({
    queryKey: ["rrhh_periodo_externo", periodo?.id],
    enabled: !!periodo,
    queryFn: async () => {
      const p = periodo!;
      const [vac, ade] = await Promise.all([
        supabase
          .from("vacaciones")
          .select("personal_id, fecha_inicio, fecha_fin, motivo")
          .lte("fecha_inicio", p.fecha_hasta)
          .gte("fecha_fin", p.fecha_desde),
        supabase
          .from("adelantos_personal")
          .select("personal_id, fecha, monto")
          .gte("fecha", p.fecha_desde)
          .lte("fecha", p.fecha_hasta),
      ]);
      if (vac.error) throw vac.error;
      if (ade.error) throw ade.error;
      return {
        vacaciones: (vac.data || []) as { personal_id: string; fecha_inicio: string; fecha_fin: string; motivo: string }[],
        adelantos: (ade.data || []) as { personal_id: string; fecha: string; monto: number }[],
      };
    },
  });
}

const horasPorDia = (horasNormales: number, desde: string, hasta: string) => {
  const dias = diasEnRango(desde, hasta, desde, hasta) || 1;
  return horasNormales / dias;
};

export function construirPlanilla(
  personal: PersonalMin[],
  periodo: RrhhPeriodo,
  novedades: RrhhNovedad[],
  externo?: { vacaciones: { personal_id: string; fecha_inicio: string; fecha_fin: string; motivo: string }[]; adelantos: { personal_id: string; monto: number }[] },
): PlanillaRow[] {
  const hDia = horasPorDia(Number(periodo.horas_normales || 0), periodo.fecha_desde, periodo.fecha_hasta);

  return personal.map((p) => {
    const misNov = novedades.filter((n) => n.personal_id === p.id);
    const row: PlanillaRow = {
      personal_id: p.id,
      legajo: p.legajo || "-",
      empleado: `${p.apellido || ""}${p.apellido && p.nombre ? ", " : ""}${p.nombre || ""}`.trim() || "-",
      ingreso: p.fecha_ingreso,
      baja: p.fecha_baja ?? null,
      horasNormales: Number(periodo.horas_normales || 0),
      feriadoTrabajado: 0,
      inasistencias: 0,
      enfermedad: 0,
      art: 0,
      licencia: 0,
      vacaciones: 0,
      horasExtras: 0,
      totalHoras: 0,
      premio: 0,
      anticipo: 0,
      observaciones: "",
    };

    const obs: string[] = [];

    const horasDeNovedad = (n: RrhhNovedad) => {
      if (n.horas != null) return Number(n.horas);
      if (n.dias != null) return Number(n.dias) * hDia;
      if (n.fecha_desde && n.fecha_hasta) {
        return diasEnRango(n.fecha_desde, n.fecha_hasta, periodo.fecha_desde, periodo.fecha_hasta) * hDia;
      }
      if (n.fecha) return hDia;
      return 0;
    };

    misNov.forEach((n) => {
      const h = horasDeNovedad(n);
      switch (n.tipo) {
        case "inasistencia": row.inasistencias += h; break;
        case "enfermedad": row.enfermedad += h; break;
        case "art": row.art += h; break;
        case "licencia": row.licencia += h; break;
        case "vacaciones": row.vacaciones += h; break;
        case "feriado_trabajado": row.feriadoTrabajado += h; break;
        case "horas_extras": row.horasExtras += h; break;
        case "premio": row.premio += Number(n.monto || 0); break;
        case "adelanto": row.anticipo += Number(n.monto || 0); break;
        default: break;
      }
      if (n.observacion) obs.push(n.observacion);
    });

    // Vacaciones y adelantos cargados en otros módulos
    externo?.vacaciones
      .filter((v) => v.personal_id === p.id)
      .forEach((v) => {
        const h = diasEnRango(v.fecha_inicio, v.fecha_fin, periodo.fecha_desde, periodo.fecha_hasta) * hDia;
        if (v.motivo === "licencia_medica") row.enfermedad += h;
        else row.vacaciones += h;
      });

    externo?.adelantos
      .filter((a) => a.personal_id === p.id)
      .forEach((a) => { row.anticipo += Number(a.monto || 0); });

    const descontadas = row.inasistencias + row.enfermedad + row.art + row.licencia + row.vacaciones;
    row.horasNormales = Math.max(Number(periodo.horas_normales || 0) - descontadas, 0);
    row.totalHoras =
      row.horasNormales + row.feriadoTrabajado + row.horasExtras +
      row.enfermedad + row.art + row.licencia + row.vacaciones;
    row.observaciones = obs.join(" · ");
    return row;
  });
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

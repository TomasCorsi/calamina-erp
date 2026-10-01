import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type RrhhPeriodoTipo = "quincena_1" | "quincena_2" | "mes";
export type RrhhPeriodoEstado = "abierto" | "revision" | "cerrado";
export type RrhhNovedadTipo =
  | "inasistencia" | "enfermedad" | "art" | "vacaciones" | "licencia"
  | "horas_extras" | "feriado_trabajado" | "premio" | "adelanto"
  | "alta" | "baja" | "cambio_sueldo" | "otro";

export interface RrhhPeriodo {
  id: string;
  tipo: RrhhPeriodoTipo;
  mes: number;
  anio: number;
  fecha_desde: string;
  fecha_hasta: string;
  estado: RrhhPeriodoEstado;
  horas_normales: number;
  observaciones: string | null;
  created_at: string;
}

export interface RrhhNovedad {
  id: string;
  periodo_id: string | null;
  personal_id: string;
  tipo: RrhhNovedadTipo;
  fecha: string | null;
  fecha_desde: string | null;
  fecha_hasta: string | null;
  horas: number | null;
  dias: number | null;
  monto: number | null;
  observacion: string | null;
  created_at: string;
  personal?: { id: string; nombre: string | null; apellido: string | null; legajo: string | null } | null;
}

export interface RrhhJornada {
  id: string;
  lunes: number; martes: number; miercoles: number; jueves: number;
  viernes: number; sabado: number; domingo: number;
}

export interface RrhhFeriado {
  id: string;
  fecha: string;
  descripcion: string | null;
}

export interface RrhhSueldo {
  id: string;
  personal_id: string;
  vigencia_desde: string;
  sueldo_acordado: number;
  sueldo_registrado: number;
  modalidad: string;
  observacion: string | null;
  created_at: string;
}

const nz = <T,>(v: T | "" | undefined | null): T | null =>
  v === "" || v === undefined ? null : (v as T | null);

/* ----------------------------- Periodos ----------------------------- */

export const useRrhhPeriodos = () =>
  useQuery({
    queryKey: ["rrhh_periodos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rrhh_periodos")
        .select("*")
        .order("anio", { ascending: false })
        .order("mes", { ascending: false })
        .order("tipo", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as RrhhPeriodo[];
    },
  });

export const useCreatePeriodo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tipo: RrhhPeriodoTipo; mes: number; anio: number;
      fecha_desde: string; fecha_hasta: string; horas_normales: number;
    }) => {
      const { data, error } = await supabase.from("rrhh_periodos").insert(input).select("*").single();
      if (error) throw error;
      return data as unknown as RrhhPeriodo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rrhh_periodos"] });
      toast.success("Período creado");
    },
    onError: (e: any) =>
      toast.error(e?.code === "23505" ? "Ese período ya existe" : e.message || "Error al crear período"),
  });
};

export const useUpdatePeriodo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<RrhhPeriodo> & { id: string }) => {
      const { error } = await supabase.from("rrhh_periodos").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rrhh_periodos"] });
      toast.success("Período actualizado");
    },
    onError: (e: any) => toast.error(e.message || "Error al actualizar"),
  });
};

export const useDeletePeriodo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rrhh_periodos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rrhh_periodos"] });
      qc.invalidateQueries({ queryKey: ["rrhh_novedades"] });
      toast.success("Período eliminado");
    },
    onError: (e: any) => toast.error(e.message || "Error al eliminar"),
  });
};

/* ----------------------------- Novedades ----------------------------- */

export const useRrhhNovedades = (periodoId: string | null) =>
  useQuery({
    queryKey: ["rrhh_novedades", periodoId],
    enabled: !!periodoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rrhh_novedades")
        .select("*, personal:personal_id(id, nombre, apellido, legajo)")
        .eq("periodo_id", periodoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as RrhhNovedad[];
    },
  });

export const useNovedadesPersonal = (personalId: string | null) =>
  useQuery({
    queryKey: ["rrhh_novedades_personal", personalId],
    enabled: !!personalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rrhh_novedades")
        .select("*")
        .eq("personal_id", personalId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as RrhhNovedad[];
    },
  });

export interface NovedadInput {
  periodo_id: string | null;
  personal_id: string;
  tipo: RrhhNovedadTipo;
  fecha?: string | null;
  fecha_desde?: string | null;
  fecha_hasta?: string | null;
  horas?: number | null;
  dias?: number | null;
  monto?: number | null;
  observacion?: string | null;
}

const cleanNovedad = (input: NovedadInput) => ({
  periodo_id: nz(input.periodo_id),
  personal_id: input.personal_id,
  tipo: input.tipo,
  fecha: nz(input.fecha),
  fecha_desde: nz(input.fecha_desde),
  fecha_hasta: nz(input.fecha_hasta),
  horas: input.horas ?? null,
  dias: input.dias ?? null,
  monto: input.monto ?? null,
  observacion: nz(input.observacion),
});

export const useCreateNovedad = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NovedadInput) => {
      const { error } = await supabase.from("rrhh_novedades").insert(cleanNovedad(input) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rrhh_novedades"] });
      qc.invalidateQueries({ queryKey: ["rrhh_novedades_personal"] });
      toast.success("Novedad registrada");
    },
    onError: (e: any) => toast.error(e.message || "Error al registrar novedad"),
  });
};

export const useUpdateNovedad = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: NovedadInput & { id: string }) => {
      const { error } = await supabase.from("rrhh_novedades").update(cleanNovedad(input) as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rrhh_novedades"] });
      qc.invalidateQueries({ queryKey: ["rrhh_novedades_personal"] });
      toast.success("Novedad actualizada");
    },
    onError: (e: any) => toast.error(e.message || "Error al actualizar"),
  });
};

export const useDeleteNovedad = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rrhh_novedades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rrhh_novedades"] });
      qc.invalidateQueries({ queryKey: ["rrhh_novedades_personal"] });
      toast.success("Novedad eliminada");
    },
    onError: (e: any) => toast.error(e.message || "Error al eliminar"),
  });
};

/* ----------------------------- Jornada / Feriados ----------------------------- */

export const useJornada = () =>
  useQuery({
    queryKey: ["rrhh_jornada"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rrhh_jornada_config").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return (data || null) as unknown as RrhhJornada | null;
    },
  });

export const useUpsertJornada = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<RrhhJornada, "id"> & { id?: string }) => {
      if (input.id) {
        const { id, ...patch } = input;
        const { error } = await supabase.from("rrhh_jornada_config").update(patch as any).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rrhh_jornada_config").insert(input as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rrhh_jornada"] });
      toast.success("Jornada guardada");
    },
    onError: (e: any) => toast.error(e.message || "Error al guardar jornada"),
  });
};

export const useFeriados = () =>
  useQuery({
    queryKey: ["rrhh_feriados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rrhh_feriados").select("*").order("fecha");
      if (error) throw error;
      return (data || []) as unknown as RrhhFeriado[];
    },
  });

export const useCreateFeriado = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { fecha: string; descripcion?: string | null }) => {
      const { error } = await supabase
        .from("rrhh_feriados")
        .insert({ fecha: input.fecha, descripcion: nz(input.descripcion) } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rrhh_feriados"] });
      toast.success("Feriado agregado");
    },
    onError: (e: any) =>
      toast.error(e?.code === "23505" ? "Ese feriado ya está cargado" : e.message || "Error"),
  });
};

export const useDeleteFeriado = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rrhh_feriados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rrhh_feriados"] });
      toast.success("Feriado eliminado");
    },
    onError: (e: any) => toast.error(e.message || "Error"),
  });
};

/* ----------------------------- Sueldos con historial ----------------------------- */

export const useSueldosHistorial = (personalId?: string | null) =>
  useQuery({
    queryKey: ["rrhh_sueldos", personalId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("rrhh_sueldos_historial").select("*").order("vigencia_desde", { ascending: false });
      if (personalId) q = q.eq("personal_id", personalId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as RrhhSueldo[];
    },
  });

export const useCreateSueldo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      personal_id: string; vigencia_desde: string;
      sueldo_acordado: number; sueldo_registrado: number; modalidad: string; observacion?: string | null;
    }) => {
      const { error } = await supabase
        .from("rrhh_sueldos_historial")
        .insert({ ...input, observacion: nz(input.observacion) } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rrhh_sueldos"] });
      toast.success("Sueldo guardado");
    },
    onError: (e: any) => toast.error(e.message || "Error al guardar sueldo"),
  });
};

export const useDeleteSueldo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rrhh_sueldos_historial").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rrhh_sueldos"] });
      toast.success("Registro eliminado");
    },
    onError: (e: any) => toast.error(e.message || "Error"),
  });
};

/* ----------------------------- Helpers ----------------------------- */

export const NOVEDAD_LABEL: Record<RrhhNovedadTipo, string> = {
  inasistencia: "Inasistencia",
  enfermedad: "Enfermedad",
  art: "ART / accidente",
  vacaciones: "Vacaciones",
  licencia: "Licencia",
  horas_extras: "Horas extras",
  feriado_trabajado: "Feriado trabajado",
  premio: "Premio",
  adelanto: "Adelanto",
  alta: "Alta",
  baja: "Baja",
  cambio_sueldo: "Cambio de sueldo",
  otro: "Otro",
};

export const PERIODO_LABEL: Record<RrhhPeriodoTipo, string> = {
  quincena_1: "1ª Quincena",
  quincena_2: "2ª Quincena",
  mes: "Mensual",
};

export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Rango de fechas (YYYY-MM-DD) para un tipo de período */
export function rangoPeriodo(tipo: RrhhPeriodoTipo, mes: number, anio: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const ultimoDia = new Date(anio, mes, 0).getDate();
  if (tipo === "quincena_1") {
    return { desde: `${anio}-${pad(mes)}-01`, hasta: `${anio}-${pad(mes)}-15` };
  }
  if (tipo === "quincena_2") {
    return { desde: `${anio}-${pad(mes)}-16`, hasta: `${anio}-${pad(mes)}-${pad(ultimoDia)}` };
  }
  return { desde: `${anio}-${pad(mes)}-01`, hasta: `${anio}-${pad(mes)}-${pad(ultimoDia)}` };
}

const DIA_KEYS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"] as const;

/** Horas laborables del rango según la jornada configurada, descontando feriados */
export function calcularHorasNormales(
  desde: string,
  hasta: string,
  jornada: RrhhJornada | null,
  feriados: RrhhFeriado[] = [],
): number {
  const j = jornada ?? ({ lunes: 8, martes: 8, miercoles: 8, jueves: 8, viernes: 8, sabado: 4, domingo: 0 } as RrhhJornada);
  const set = new Set(feriados.map((f) => f.fecha));
  const [y1, m1, d1] = desde.split("-").map(Number);
  const [y2, m2, d2] = hasta.split("-").map(Number);
  let cur = new Date(y1, m1 - 1, d1);
  const end = new Date(y2, m2 - 1, d2);
  let total = 0;
  while (cur <= end) {
    const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
    if (!set.has(iso)) total += Number((j as any)[DIA_KEYS[cur.getDay()]] || 0);
    cur = new Date(cur.getTime() + 86400000);
  }
  return total;
}

/** Días de un rango de novedad que caen dentro del período */
export function diasEnRango(desde: string, hasta: string, pDesde: string, pHasta: string): number {
  const ini = desde > pDesde ? desde : pDesde;
  const fin = hasta < pHasta ? hasta : pHasta;
  if (ini > fin) return 0;
  const a = new Date(ini + "T00:00:00");
  const b = new Date(fin + "T00:00:00");
  return Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;
}

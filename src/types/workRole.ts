export const WORK_ROLES = [
  "maquinista", "chofer", "capataz", "mecanico", "sereno", "topografo",
  "ayudante", "administrativo", "repartidor_calecita",
] as const;

export type WorkRole = (typeof WORK_ROLES)[number];

export const WORK_ROLE_LABELS: Record<WorkRole, string> = {
  maquinista: "Maquinista", chofer: "Chofer", capataz: "Capataz",
  mecanico: "Mecánico", sereno: "Sereno", topografo: "Topógrafo",
  ayudante: "Ayudante", administrativo: "Administrativo",
  repartidor_calecita: "Repartidor Calecita",
};

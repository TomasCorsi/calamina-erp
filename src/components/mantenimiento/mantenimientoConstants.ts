type ChecklistItemDef = { key: string; label: string; hasLitros?: boolean };

export const CHECKLIST_CAMBIO_ITEMS: readonly ChecklistItemDef[] = [
  { key: "aceite_motor", label: "Aceite de motor", hasLitros: true },
  { key: "filtro_aceite_motor", label: "Filtro de aceite de motor" },
  { key: "filtro_combustible", label: "Filtro de combustible" },
  { key: "filtro_aire_secundario", label: "Filtro de aire secundario" },
  { key: "filtro_aire_primario", label: "Filtro de aire primario" },
  { key: "filtro_convertidor", label: "Filtro convertidor" },
];

export const CHECKLIST_CHEQUEO_ITEMS: readonly ChecklistItemDef[] = [
  { key: "nivel_aceite_hidraulico", label: "Nivel de aceite hidráulico", hasLitros: true },
  { key: "nivel_liquido_frenos", label: "Nivel de líquido de frenos", hasLitros: true },
  { key: "nivel_agua_refrigerante", label: "Nivel de agua refrigerante", hasLitros: true },
  { key: "tension_correa", label: "Tensión de correa" },
  { key: "funcionamiento_relojes", label: "Funcionamiento de relojes" },
  { key: "engrase_diario", label: "Engrase diario" },
  { key: "aceite_diferencial", label: "Aceite diferencial trasero y delantero", hasLitros: true },
  { key: "aceite_reductores", label: "Aceite de reductores", hasLitros: true },
  { key: "eje_bomba_agua", label: "Eje de bomba de agua" },
  { key: "cilindro_hidraulico", label: "Cilindro hidráulico" },
  { key: "soldaduras_equipo", label: "Soldaduras del equipo" },
  { key: "direccion", label: "Dirección" },
  { key: "frenos", label: "Frenos" },
  { key: "partes_electricas", label: "Partes eléctricas" },
  { key: "perdida_aceite_motor", label: "Pérdida de aceite de motor" },
  { key: "funciones_convertidor", label: "Funciones del convertidor de transmisión" },
  { key: "estado_toma_aire", label: "Estado de toma de aire" },
  { key: "tornillos_flojos", label: "Tornillos flojos" },
  { key: "chequeos_radiadores", label: "Chequeos de radiadores" },
];

// A checklist value can be boolean (legacy) or an object with litros
export type ChecklistValue = boolean | { ok: boolean; litros?: number };
export type ChecklistCambio = Record<string, ChecklistValue>;
export type ChecklistChequeo = Record<string, ChecklistValue>;

/** Returns whether the item is checked (handles both legacy boolean and new object format) */
export function isChecked(val: ChecklistValue | undefined): boolean {
  if (val == null) return false;
  if (typeof val === "boolean") return val;
  return val.ok;
}

/** Returns the litros value if present */
export function getLitros(val: ChecklistValue | undefined): number | undefined {
  if (val == null || typeof val === "boolean") return undefined;
  return val.litros;
}

export function emptyChecklistCambio(): ChecklistCambio {
  return Object.fromEntries(CHECKLIST_CAMBIO_ITEMS.map(i => [i.key, false]));
}

export function emptyChecklistChequeo(): ChecklistChequeo {
  return Object.fromEntries(CHECKLIST_CHEQUEO_ITEMS.map(i => [i.key, false]));
}

export const ESTADO_CONFIG = {
  pendiente: { label: "Pendiente", emoji: "📋", className: "bg-muted text-muted-foreground border-border" },
  en_proceso: { label: "En Proceso", emoji: "⚙️", className: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  completado: { label: "Finalizado", emoji: "✅", className: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30" },
} as const;

export const TIPO_CONFIG = {
  preventivo: { label: "Service", className: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  correctivo: { label: "Reparación", className: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30" },
  emergencia: { label: "Emergencia", className: "bg-destructive/20 text-destructive border-destructive/30" },
} as const;

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

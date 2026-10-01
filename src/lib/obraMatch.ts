/** Normaliza un nombre de obra para comparaciones (sin acentos, minúsculas, espacios simples). */
export function normalizarNombre(v?: string | null): string {
  return (v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export interface RemitoObraLike {
  obra_id?: string | null;
  desde?: string | null;
  hasta?: string | null;
}

/**
 * Determina si un remito pertenece a una obra: por obra_id o por coincidencia
 * de nombre en los campos de texto Desde / Hasta (criterio usado en liquidaciones).
 */
export function remitoEsDeObra(
  remito: RemitoObraLike,
  obraId: string,
  obraNombreNormalizado: string
): boolean {
  if (remito.obra_id && remito.obra_id === obraId) return true;
  if (!obraNombreNormalizado) return false;
  return (
    normalizarNombre(remito.hasta) === obraNombreNormalizado ||
    normalizarNombre(remito.desde) === obraNombreNormalizado
  );
}

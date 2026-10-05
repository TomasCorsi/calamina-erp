import type { ParteDiario, ParteDiarioInsert } from "@/hooks/useParteDiario";

export const PARTE_DIARIO_SELECT = `
  *,
  personal:personal!partes_diarios_personal_company_fkey(id, first_name, last_name, work_role),
  obras:obras!partes_diarios_obra_company_fkey(id, nombre),
  maquinarias:maquinarias!partes_diarios_maquinaria_company_fkey(id, codigo, tipo, patente)
`;

const nullableText = (value: unknown) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
};

export function normalizeParteWrite(input: Partial<ParteDiarioInsert>, partial = false) {
  const estadoMaquina = input.estado_maquina ?? null;
  const payload: Record<string, unknown> = {
    fecha: input.fecha,
    obra_id: input.obra_id || null,
    maquinaria_id: input.maquinaria_id || null,
    hora_entrada: input.hora_entrada || null,
    hora_salida: input.hora_salida || null,
    horometro_inicio: Number(input.horometro_inicio ?? 0),
    horometro_fin: Number(input.horometro_fin ?? 0),
    cantidad_viajes: Number(input.cantidad_viajes ?? 0),
    km_camion: Number(input.km_camion ?? 0),
    cantidad_movimiento_interno: Number(input.cantidad_movimiento_interno ?? 0),
    combustible: Number(input.combustible ?? 0),
    estado_maquina: estadoMaquina,
    observacion_maquina: estadoMaquina === "OBSERVACION" ? nullableText(input.observacion_maquina) : null,
    check_filtro_aire: Boolean(input.check_filtro_aire),
    check_aceite_hidraulico: Boolean(input.check_aceite_hidraulico),
    check_aceite_motor: Boolean(input.check_aceite_motor),
    check_liquido_refrigerante: Boolean(input.check_liquido_refrigerante),
    check_uria: Boolean(input.check_uria),
    estado: input.estado ?? "borrador",
    novedades: nullableText(input.novedades),
    ausencias: Array.isArray(input.ausencias) ? input.ausencias : [],
    tareas: nullableText(input.tareas),
    observaciones_inconvenientes: nullableText(input.observaciones_inconvenientes),
  };
  if (partial) {
    for (const key of Object.keys(payload)) {
      if (!Object.prototype.hasOwnProperty.call(input, key)) delete payload[key];
    }
    if (Object.prototype.hasOwnProperty.call(input, "estado_maquina")) {
      payload.observacion_maquina = estadoMaquina === "OBSERVACION" ? nullableText(input.observacion_maquina) : null;
    }
  }
  return payload;
}

export function mapParteDiario(row: Record<string, unknown>): ParteDiario {
  const person = row.personal as Record<string, unknown> | null;
  return {
    ...(row as unknown as ParteDiario),
    personal: person ? {
      id: String(person.id), nombre: String(person.first_name ?? ""), apellido: String(person.last_name ?? ""),
      rol: String(person.work_role ?? "administrativo"),
    } : undefined,
  };
}

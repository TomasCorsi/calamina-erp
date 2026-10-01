import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RemitoItemInput {
  concepto: string;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
  precio_total: number;
}

export interface RemitoItem extends RemitoItemInput {
  id: string;
  remito_id: string;
  orden: number;
}

export const CONCEPTO_SUGERENCIAS = [
  "Día de retro",
  "Día de motoniveladora",
  "Día de topador",
  "Día de pala cargadora",
  "Día de minicargadora",
  "Día de compactador",
  "Día de tractor",
  "Hora de retro",
  "Hora de motoniveladora",
  "Flete",
  "Estadía",
];

export const UNIDAD_ITEM_OPTIONS = ["DIA", "HS", "U", "M3", "TN"];

export const totalItems = (items: RemitoItemInput[] | undefined | null): number =>
  (items || []).reduce((s, i) => s + (Number(i.precio_total) || 0), 0);

const fmtCantidad = (n: number) =>
  Number.isInteger(n) ? String(n) : String(n).replace(".", ",");

export const resumenItems = (items: RemitoItemInput[] | undefined | null): string =>
  (items || [])
    .map((i) => `${fmtCantidad(Number(i.cantidad) || 0)} ${i.unidad || ""} ${i.concepto || ""}`.trim())
    .join("; ");

const PAGE_SIZE = 1000;

export async function fetchRemitoItems(remitoId: string): Promise<RemitoItem[]> {
  const { data, error } = await (supabase as any)
    .from("remito_items")
    .select("*")
    .eq("remito_id", remitoId)
    .order("orden", { ascending: true });
  if (error) throw error;
  return (data || []).map(normalize);
}

function normalize(row: any): RemitoItem {
  return {
    id: row.id,
    remito_id: row.remito_id,
    orden: row.orden ?? 0,
    concepto: row.concepto || "",
    cantidad: Number(row.cantidad) || 0,
    unidad: row.unidad || "DIA",
    precio_unitario: Number(row.precio_unitario) || 0,
    precio_total: Number(row.precio_total) || 0,
  };
}

async function fetchAllItems(): Promise<Record<string, RemitoItem[]>> {
  const map: Record<string, RemitoItem[]> = {};
  let from = 0;
  while (true) {
    const { data, error } = await (supabase as any)
      .from("remito_items")
      .select("*")
      .order("remito_id", { ascending: true })
      .order("orden", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      const it = normalize(row);
      (map[it.remito_id] ||= []).push(it);
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return map;
}

/** Mapa remito_id -> ítems adicionales (jornadas de máquina, servicios, etc.) */
export function useRemitoItemsMap() {
  const queryClient = useQueryClient();
  const { data = {}, isLoading } = useQuery<Record<string, RemitoItem[]>>({
    queryKey: ["remito_items"],
    queryFn: fetchAllItems,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
  return {
    itemsMap: data,
    loadingItems: isLoading,
    invalidateItems: () => queryClient.invalidateQueries({ queryKey: ["remito_items"] }),
  };
}

/** Reemplaza el set completo de ítems de un remito */
export async function saveRemitoItems(remitoId: string, items: RemitoItemInput[]) {
  const { error: delError } = await (supabase as any)
    .from("remito_items")
    .delete()
    .eq("remito_id", remitoId);
  if (delError) throw delError;

  const limpios = (items || []).filter(
    (i) => (i.concepto || "").trim() !== "" || (Number(i.cantidad) || 0) !== 0
  );
  if (limpios.length === 0) return;

  const { error } = await (supabase as any).from("remito_items").insert(
    limpios.map((i, idx) => ({
      remito_id: remitoId,
      orden: idx,
      concepto: (i.concepto || "").trim(),
      cantidad: Number(i.cantidad) || 0,
      unidad: i.unidad || "DIA",
      precio_unitario: Number(i.precio_unitario) || 0,
      precio_total: Number(i.precio_total) || 0,
    }))
  );
  if (error) throw error;
}

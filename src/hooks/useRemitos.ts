import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";

export interface RemitoDB {
  id: string; numero: string; viaje_id: string | null; fecha: string; obra_id: string | null; material: string;
  cantidad: number; unidad: string; recibido_por: string; firmado: boolean; evidencia_url: string | null;
  observaciones: string | null; created_at: string; updated_at: string; row_color: string | null;
  proveedor: string | null; cliente: string | null; cliente_destino: string | null; remito_tercero: string | null;
  remito_local: string | null; desde: string | null; hasta: string | null; cantidad_viajes: number;
  tipo_material: string | null; precio_total: number; tipo_transporte: string | null; maquinaria_id: string | null;
  patente_tercero: string | null; cantidad_uni: number | null; precio_unitario: number | null;
  precio_calc_mode: string | null; forma_pago: string | null; created_by: string | null; cliente_cantera: string | null;
}
export interface RemitoWithRelations extends RemitoDB {
  obra?: { nombre: string } | null; viaje?: { origen: string; destino: string } | null;
  maquinaria?: { codigo: string; patente: string | null } | null;
}
export interface RemitoForm {
  numero: string; viaje_id?: string; fecha: string; obra_id?: string; material: string; cantidad: number; unidad: string;
  recibido_por: string; firmado: boolean; evidencia_url?: string; observaciones?: string; proveedor?: string; cliente?: string;
  cliente_destino?: string; remito_tercero?: string; remito_local?: string; desde?: string; hasta?: string;
  cantidad_viajes?: number; tipo_material?: string; precio_total?: number; tipo_transporte?: string;
  maquinaria_id?: string; patente_tercero?: string; cantidad_uni?: number | null; precio_unitario?: number | null;
  precio_calc_mode?: string | null; forma_pago?: string | null; row_color?: string | null; cliente_cantera?: string | null;
}

const SELECT = `*,obra:obras!remitos_obra_company_fkey(nombre),maquinaria:maquinarias!remitos_maquinaria_company_fkey(codigo,patente)`;
const DEFAULT_DAYS_BACK = 90;
const LOAD_ALL_SESSION_KEY = "remitos:loadAll";
const optionalText = (value: unknown) => { const text = typeof value === "string" ? value.trim() : ""; return text || null; };

function normalizeWrite(remito: Partial<RemitoForm>, partial = false): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    numero: typeof remito.numero === "string" ? remito.numero.trim() : undefined,
    fecha: remito.fecha,
    obra_id: remito.obra_id || null,
    maquinaria_id: remito.maquinaria_id || null,
    material: typeof remito.material === "string" ? remito.material.trim() : undefined,
    cantidad: remito.cantidad == null ? undefined : Number(remito.cantidad),
    unidad: typeof remito.unidad === "string" ? remito.unidad.trim() : undefined,
    recibido_por: typeof remito.recibido_por === "string" ? remito.recibido_por.trim() : undefined,
    firmado: remito.firmado,
    evidencia_url: optionalText(remito.evidencia_url), observaciones: optionalText(remito.observaciones),
    row_color: optionalText(remito.row_color), proveedor: optionalText(remito.proveedor), cliente: optionalText(remito.cliente),
    cliente_destino: optionalText(remito.cliente_destino), cliente_cantera: optionalText(remito.cliente_cantera),
    remito_tercero: optionalText(remito.remito_tercero), remito_local: optionalText(remito.remito_local),
    desde: optionalText(remito.desde), hasta: optionalText(remito.hasta),
    cantidad_viajes: remito.cantidad_viajes == null ? undefined : Number(remito.cantidad_viajes),
    tipo_material: optionalText(remito.tipo_material), precio_total: remito.precio_total == null ? undefined : Number(remito.precio_total),
    tipo_transporte: optionalText(remito.tipo_transporte),
    patente_tercero: optionalText(remito.patente_tercero)?.toUpperCase() ?? null,
    cantidad_uni: remito.cantidad_uni == null ? null : Number(remito.cantidad_uni),
    precio_unitario: remito.precio_unitario == null ? null : Number(remito.precio_unitario),
    precio_calc_mode: remito.precio_calc_mode ?? undefined, forma_pago: remito.forma_pago || null,
  };
  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined || (partial && !Object.prototype.hasOwnProperty.call(remito, key))) delete payload[key];
  }
  return payload;
}

function mapRemito(row: Record<string, unknown>): RemitoWithRelations {
  return {
    ...(row as unknown as RemitoDB), viaje_id: null,
    cantidad: Number(row.cantidad ?? 0), cantidad_viajes: Number(row.cantidad_viajes ?? 0),
    cantidad_uni: row.cantidad_uni == null ? null : Number(row.cantidad_uni),
    precio_unitario: row.precio_unitario == null ? null : Number(row.precio_unitario), precio_total: Number(row.precio_total ?? 0),
  };
}

export function useRemitos() {
  const queryClient = useQueryClient();
  const { membership, hasPermission } = useAuth();
  const companyId = membership?.company_id;
  const [loadAll, setLoadAll] = useState(() => typeof window !== "undefined" && sessionStorage.getItem(LOAD_ALL_SESSION_KEY) === "1");
  const cargarHistorico = useCallback(() => { sessionStorage.setItem(LOAD_ALL_SESSION_KEY, "1"); setLoadAll(true); }, []);
  const fechaDesde = useMemo(() => { if (loadAll) return null; const date = new Date(); date.setDate(date.getDate() - DEFAULT_DAYS_BACK); return date.toISOString().slice(0, 10); }, [loadAll]);
  const query = useQuery({
    queryKey: ["remitos-v2", companyId, fechaDesde], enabled: Boolean(companyId && hasPermission("remitos.view")),
    queryFn: async () => {
      const all: RemitoWithRelations[] = [];
      for (let from = 0; ; from += 1000) {
        let request = supabase.from("remitos").select(SELECT).eq("company_id", companyId!).order("fecha", { ascending: false }).order("created_at", { ascending: false }).range(from, from + 999);
        if (fechaDesde) request = request.gte("fecha", fechaDesde);
        const { data, error } = await request;
        if (error) throw error;
        const batch = (data ?? []).map((row) => mapRemito(row as Record<string, unknown>));
        all.push(...batch);
        if (batch.length < 1000) break;
      }
      return all;
    },
  });
  const invalidate = async () => { await queryClient.invalidateQueries({ queryKey: ["remitos-v2"] }); };
  const createMutation = useMutation({
    mutationFn: async (remito: RemitoForm) => {
      if (!companyId) throw new Error("No hay empresa activa");
      const { data, error } = await supabase.from("remitos").insert({ company_id: companyId, ...normalizeWrite(remito) }).select(SELECT).single();
      if (error) throw error;
      return mapRemito(data as Record<string, unknown>);
    }, onSuccess: invalidate, onError: () => toast.error("Error al crear remito"),
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, remito }: { id: string; remito: Partial<RemitoForm> }) => {
      if (!companyId) throw new Error("No hay empresa activa");
      const { error } = await supabase.from("remitos").update(normalizeWrite(remito, true)).eq("id", id).eq("company_id", companyId).select("id").single();
      if (error) throw error;
    }, onSuccess: invalidate, onError: () => toast.error("Error al actualizar remito"),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!companyId) throw new Error("No hay empresa activa");
      const { error } = await supabase.from("remitos").delete().eq("id", id).eq("company_id", companyId).select("id").single();
      if (error) throw error;
    },
    onSuccess: invalidate, onError: () => toast.error("Error al eliminar remito"),
  });

  const batchSave = async (changes: { created: RemitoForm[]; updated: { id: string; data: Partial<RemitoForm> }[]; deleted: string[] }) => {
    const results = { created: 0, updated: 0, deleted: 0, errors: 0 };
    for (const remito of changes.created) { try { await createMutation.mutateAsync(remito); results.created++; } catch { results.errors++; } }
    for (const item of changes.updated) { try { await updateMutation.mutateAsync({ id: item.id, remito: item.data }); results.updated++; } catch { results.errors++; } }
    for (const id of changes.deleted) { try { await deleteMutation.mutateAsync(id); results.deleted++; } catch { results.errors++; } }
    return results;
  };

  return {
    remitos: query.data ?? [], loading: query.isLoading, fetchRemitos: query.refetch, loadAll, cargarHistorico,
    cargandoHistorico: loadAll && query.isFetching,
    createRemito: async (remito: RemitoForm) => { try { return await createMutation.mutateAsync(remito); } catch { return null; } },
    updateRemito: async (id: string, remito: Partial<RemitoForm>) => { try { await updateMutation.mutateAsync({ id, remito }); return true; } catch { return false; } },
    deleteRemito: async (id: string) => { try { await deleteMutation.mutateAsync(id); return true; } catch { return false; } },
    batchSave,
    updateRowColor: async (id: string, color: string | null) => { try { await updateMutation.mutateAsync({ id, remito: { row_color: color } }); return true; } catch { return false; } },
  };
}

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useEmpleadoProfile } from "@/hooks/useEmpleadoProfile";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";
import { mapParteDiario, normalizeParteWrite, PARTE_DIARIO_SELECT } from "@/hooks/parteDiarioAdapter";

export interface ParteDiario {
  id: string; company_id: string; fecha: string; personal_id: string; obra_id: string | null; maquinaria_id: string | null;
  hora_entrada: string | null; hora_salida: string | null; horometro_inicio: number; horometro_fin: number;
  cantidad_viajes: number; km_camion: number; cantidad_movimiento_interno: number; combustible: number;
  estado_maquina: "OK" | "OBSERVACION" | null; observacion_maquina: string | null;
  check_filtro_aire: boolean; check_aceite_hidraulico: boolean; check_aceite_motor: boolean;
  check_liquido_refrigerante: boolean; check_uria: boolean; estado: "borrador" | "completado";
  novedades: string | null; ausencias: string[] | null; tareas: string | null; observaciones_inconvenientes: string | null;
  created_at: string; updated_at: string;
  personal?: { id: string; nombre: string | null; apellido: string | null; rol: string };
  obras?: { id: string; nombre: string } | null;
  maquinarias?: { id: string; codigo: string | null; tipo: string; patente: string | null } | null;
}

export interface ParteDiarioInsert {
  fecha: string; personal_id: string; obra_id?: string | null; maquinaria_id?: string | null;
  hora_entrada?: string | null; hora_salida?: string | null; horometro_inicio?: number; horometro_fin?: number;
  cantidad_viajes?: number; km_camion?: number; cantidad_movimiento_interno?: number; combustible?: number;
  estado_maquina?: "OK" | "OBSERVACION" | null; observacion_maquina?: string | null;
  check_filtro_aire?: boolean; check_aceite_hidraulico?: boolean; check_aceite_motor?: boolean;
  check_liquido_refrigerante?: boolean; check_uria?: boolean; estado?: "borrador" | "completado";
  novedades?: string | null; ausencias?: string[] | null; tareas?: string | null; observaciones_inconvenientes?: string | null;
}

export function useParteDiario() {
  const queryClient = useQueryClient();
  const { membership } = useAuth();
  const { empleado } = useEmpleadoProfile();
  const { isOnline } = useNetworkStatus();
  const fechaHoy = format(new Date(), "yyyy-MM-dd");
  const fechaDesde = format(new Date(Date.now() - 90 * 86400000), "yyyy-MM-dd");

  const query = useQuery({
    queryKey: ["partes-diarios-v2", membership?.company_id, empleado?.id],
    enabled: Boolean(membership?.company_id && empleado?.id), retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("partes_diarios").select(PARTE_DIARIO_SELECT)
        .eq("company_id", membership!.company_id).eq("personal_id", empleado!.id)
        .gte("fecha", fechaDesde).order("fecha", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => mapParteDiario(row as Record<string, unknown>));
    },
  });
  const partes = query.data ?? [];
  const partesHoy = useMemo(() => partes.filter((p) => p.fecha === fechaHoy), [fechaHoy, partes]);
  const borradorHoy = partesHoy.find((p) => p.estado === "borrador") ?? null;
  const partesCompletadosHoy = partesHoy.filter((p) => p.estado === "completado");

  const ensureOnline = () => {
    if (!isOnline) {
      toast.error("Se necesita conexión para guardar. El borrador del formulario permanece en este dispositivo.");
      throw new Error("offline persistence disabled");
    }
    if (!membership || !empleado) throw new Error("membership or personal profile unavailable");
  };
  const invalidate = async () => { await queryClient.invalidateQueries({ queryKey: ["partes-diarios-v2"] }); };

  const createMutation = useMutation({
    mutationFn: async (input: ParteDiarioInsert) => {
      ensureOnline();
      const payload = { ...normalizeParteWrite(input), company_id: membership!.company_id, personal_id: empleado!.id };
      const { data, error } = await supabase.from("partes_diarios").insert(payload).select(PARTE_DIARIO_SELECT).single();
      if (error) throw error;
      return mapParteDiario(data as Record<string, unknown>);
    },
    onSuccess: async (_, input) => { await invalidate(); toast.success(input.estado === "completado" ? "Parte completado exitosamente" : "Borrador guardado"); },
    onError: (error: Error) => { if (error.message !== "offline persistence disabled") toast.error("Error al guardar el parte diario"); },
  });
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<ParteDiarioInsert> & { id: string }) => {
      ensureOnline();
      const { data, error } = await supabase.from("partes_diarios").update(normalizeParteWrite(input))
        .eq("id", id).eq("company_id", membership!.company_id).eq("personal_id", empleado!.id)
        .select(PARTE_DIARIO_SELECT).single();
      if (error) throw error;
      return mapParteDiario(data as Record<string, unknown>);
    },
    onSuccess: async (_, input) => { await invalidate(); toast.success(input.estado === "completado" ? "Parte completado exitosamente" : "Borrador actualizado"); },
    onError: (error: Error) => { if (error.message !== "offline persistence disabled") toast.error("Error al actualizar el parte diario"); },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { ensureOnline(); const { error } = await supabase.from("partes_diarios").delete().eq("id", id).eq("company_id", membership!.company_id).eq("personal_id", empleado!.id); if (error) throw error; },
    onSuccess: async () => { await invalidate(); toast.success("Parte eliminado"); },
    onError: (error: Error) => { if (error.message !== "offline persistence disabled") toast.error("Error al eliminar el parte diario"); },
  });
  const persist = async (input: ParteDiarioInsert, estado: "borrador" | "completado", editingId?: string) => {
    const data = { ...input, estado };
    const existing = partesHoy.find((p) => p.maquinaria_id === (input.maquinaria_id || null));
    if (editingId || existing) await updateMutation.mutateAsync({ id: editingId ?? existing!.id, ...data });
    else await createMutation.mutateAsync(data);
  };

  return {
    partes, partesHoy, borradorHoy, partesCompletadosHoy,
    parteHoy: partesHoy[0] ?? null, parteCompletadoHoy: partesCompletadosHoy[0] ?? null,
    isLoading: query.isLoading, isLoadingParteHoy: query.isLoading, error: query.error,
    createParte: createMutation.mutateAsync, updateParte: updateMutation.mutateAsync, deleteParte: deleteMutation.mutateAsync,
    saveDraft: (data: ParteDiarioInsert, id?: string) => persist(data, "borrador", id),
    completeParte: (data: ParteDiarioInsert, id?: string) => persist(data, "completado", id),
    discardDraft: () => borradorHoy ? deleteMutation.mutateAsync(borradorHoy.id) : Promise.resolve(),
    isCreating: createMutation.isPending, isUpdating: updateMutation.isPending, isDeleting: deleteMutation.isPending,
    isSaving: createMutation.isPending || updateMutation.isPending,
  };
}

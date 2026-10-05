import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { mapParteDiario, normalizeParteWrite, PARTE_DIARIO_SELECT } from "@/hooks/parteDiarioAdapter";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";
import type { ParteDiario, ParteDiarioInsert } from "@/hooks/useParteDiario";

export interface ParteDiarioAdminFilters { empleadoId?: string; obraId?: string; estado?: "borrador" | "completado" | ""; fechaDesde?: string; fechaHasta?: string }

export function useParteDiarioAdmin(filters: ParteDiarioAdminFilters = {}) {
  const queryClient = useQueryClient();
  const { membership } = useAuth();
  const companyId = membership?.company_id;
  const query = useQuery({
    queryKey: ["partes-diarios-admin-v2", companyId, filters], enabled: Boolean(companyId),
    queryFn: async () => {
      let request = supabase.from("partes_diarios").select(PARTE_DIARIO_SELECT).eq("company_id", companyId!)
        .order("fecha", { ascending: false }).order("created_at", { ascending: false }).limit(2000);
      if (filters.empleadoId) request = request.eq("personal_id", filters.empleadoId);
      if (filters.obraId) request = request.eq("obra_id", filters.obraId);
      if (filters.estado) request = request.eq("estado", filters.estado);
      if (filters.fechaDesde) request = request.gte("fecha", filters.fechaDesde);
      if (filters.fechaHasta) request = request.lte("fecha", filters.fechaHasta);
      if (!filters.fechaDesde && !filters.fechaHasta) request = request.gte("fecha", format(subDays(new Date(), 30), "yyyy-MM-dd"));
      const { data, error } = await request;
      if (error) throw error;
      return (data ?? []).map((row) => mapParteDiario(row as Record<string, unknown>));
    },
  });
  const invalidate = async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["partes-diarios-admin-v2"] }), queryClient.invalidateQueries({ queryKey: ["partes-diarios-v2"] })]); };
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ParteDiario> }) => {
      const { error } = await supabase.from("partes_diarios").update(normalizeParteWrite(data as Partial<ParteDiarioInsert>, true)).eq("id", id).eq("company_id", companyId!);
      if (error) throw error;
    },
    onSuccess: async () => { await invalidate(); toast.success("Parte diario actualizado"); },
    onError: () => toast.error("Error al actualizar el parte diario"),
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("partes_diarios").delete().eq("id", id).eq("company_id", companyId!); if (error) throw error; },
    onSuccess: async () => { await invalidate(); toast.success("Parte diario eliminado"); },
    onError: () => toast.error("Error al eliminar el parte diario"),
  });
  return { partes: query.data ?? [], isLoading: query.isLoading, error: query.error, updateParte: updateMutation.mutateAsync, isUpdating: updateMutation.isPending, deleteParte: deleteMutation.mutateAsync, isDeleting: deleteMutation.isPending };
}

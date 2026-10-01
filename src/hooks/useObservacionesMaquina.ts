import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ObservacionMaquina {
  id: string;
  parte_diario_id: string;
  maquinaria_id: string | null;
  fecha_reporte: string;
  observacion: string;
  atendida: boolean;
  atendida_por: string | null;
  fecha_atencion: string | null;
  notas_resolucion: string | null;
  created_at: string;
  // Joined
  maquinaria?: { codigo: string | null; nombre: string | null; tipo: string; patente: string | null } | null;
  parte_diario?: {
    personal: { nombre: string | null; apellido: string | null } | null;
    obra: { id: string; nombre: string } | null;
  } | null;
}

export function useObservacionesMaquina() {
  const queryClient = useQueryClient();

  const { data: observaciones = [], isLoading } = useQuery({
    queryKey: ["observaciones_maquina"],
    queryFn: async () => {
      // Limit history to last 180 days to keep payload small.
      const desde = new Date();
      desde.setDate(desde.getDate() - 180);
      const fechaDesde = desde.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from("observaciones_maquina_estado")
        .select(`
          id, parte_diario_id, maquinaria_id, fecha_reporte, observacion,
          atendida, atendida_por, fecha_atencion, notas_resolucion, created_at,
          maquinaria:maquinaria_id(codigo, nombre, tipo, patente),
          parte_diario:parte_diario_id(
            personal:personal_id(nombre, apellido),
            obra:obra_id(id, nombre)
          )
        `)
        .gte("fecha_reporte", fechaDesde)
        .order("atendida", { ascending: true })
        .order("fecha_reporte", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ObservacionMaquina[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const toggleAtendida = useMutation({
    mutationFn: async ({
      id,
      atendida,
      atendida_por,
      notas_resolucion,
    }: {
      id: string;
      atendida: boolean;
      atendida_por?: string;
      notas_resolucion?: string;
    }) => {
      const updateData: Record<string, unknown> = {
        atendida,
        fecha_atencion: atendida ? new Date().toISOString() : null,
        atendida_por: atendida ? (atendida_por || null) : null,
        notas_resolucion: atendida ? (notas_resolucion || null) : null,
      };

      const { error } = await supabase
        .from("observaciones_maquina_estado")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Observación actualizada");
      queryClient.invalidateQueries({ queryKey: ["observaciones_maquina"] });
    },
    onError: (error) => {
      console.error("Error updating observación:", error);
      toast.error("Error al actualizar la observación");
    },
  });

  const pendientes = observaciones.filter((o) => !o.atendida);
  const atendidas = observaciones.filter((o) => o.atendida);

  return {
    observaciones,
    pendientes,
    atendidas,
    isLoading,
    toggleAtendida: toggleAtendida.mutateAsync,
    isUpdating: toggleAtendida.isPending,
  };
}

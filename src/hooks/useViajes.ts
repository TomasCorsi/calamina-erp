import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EstadoViaje = "programado" | "en_curso" | "completado" | "cancelado";

export interface ViajeDB {
  id: string;
  fecha: string;
  obra_id: string;
  chofer_id: string;
  camion_id: string;
  origen: string;
  destino: string;
  material: string;
  volumen: number;
  estado: EstadoViaje;
  hora_inicio: string | null;
  hora_fin: string | null;
  km_recorridos: number | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface ViajeWithRelations extends ViajeDB {
  obra?: { nombre: string };
  chofer?: { nombre: string; apellido: string };
  camion?: { nombre: string; codigo: string };
}

export interface ViajeForm {
  fecha: string;
  obra_id: string;
  chofer_id: string;
  camion_id: string;
  origen: string;
  destino: string;
  material: string;
  volumen: number;
  estado: EstadoViaje;
  hora_inicio?: string;
  hora_fin?: string;
  km_recorridos?: number;
  observaciones?: string;
}

const fetchViajesFromDB = async (): Promise<ViajeWithRelations[]> => {
  const { data, error } = await supabase
    .from("viajes")
    .select(`
      *,
      obra:obras(nombre),
      chofer:personal!viajes_chofer_id_fkey(nombre, apellido),
      camion:maquinarias!viajes_camion_id_fkey(nombre, codigo)
    `)
    .order("fecha", { ascending: false });

  if (error) throw error;
  return data || [];
};

export function useViajes() {
  const queryClient = useQueryClient();

  const { 
    data: viajes = [], 
    isLoading: loading,
    refetch: fetchViajes 
  } = useQuery({
    queryKey: ['viajes'],
    queryFn: fetchViajesFromDB,
  });

  const createMutation = useMutation({
    mutationFn: async (viaje: ViajeForm) => {
      const { data, error } = await supabase
        .from("viajes")
        .insert([viaje])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Viaje creado correctamente");
      queryClient.invalidateQueries({ queryKey: ['viajes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error creating viaje:", error);
      toast.error("Error al crear viaje");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, viaje }: { id: string; viaje: Partial<ViajeForm> }) => {
      const { error } = await supabase
        .from("viajes")
        .update(viaje)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Viaje actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ['viajes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error updating viaje:", error);
      toast.error("Error al actualizar viaje");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("viajes")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Viaje eliminado correctamente");
      queryClient.invalidateQueries({ queryKey: ['viajes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error deleting viaje:", error);
      toast.error("Error al eliminar viaje");
    },
  });

  return {
    viajes,
    loading,
    fetchViajes,
    createViaje: async (viaje: ViajeForm) => {
      try {
        return await createMutation.mutateAsync(viaje);
      } catch {
        return null;
      }
    },
    updateViaje: async (id: string, viaje: Partial<ViajeForm>) => {
      try {
        await updateMutation.mutateAsync({ id, viaje });
        return true;
      } catch {
        return false;
      }
    },
    deleteViaje: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
  };
}

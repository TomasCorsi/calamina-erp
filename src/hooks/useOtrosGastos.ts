import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CategoriaGasto = 
  | "alquiler"
  | "transporte"
  | "servicios"
  | "materiales"
  | "viaticos"
  | "varios";

export interface OtroGastoDB {
  id: string;
  fecha: string;
  obra_id: string | null;
  maquinaria_id: string | null;
  sector: string | null;
  categoria: string;
  descripcion: string;
  monto: number;
  comprobante: string | null;
  proveedor: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface OtroGastoWithRelations extends OtroGastoDB {
  obra?: { nombre: string } | null;
  maquinaria?: { id: string; codigo: string | null; nombre: string | null; patente: string | null; tipo: string } | null;
}

export interface OtroGastoForm {
  fecha: string;
  obra_id?: string | null;
  maquinaria_id?: string | null;
  sector?: string | null;
  categoria: string;
  descripcion: string;
  monto?: number;
  comprobante?: string;
  proveedor?: string;
  observaciones?: string;
}


export const categoriasGasto: Record<CategoriaGasto, { label: string; color: string }> = {
  alquiler: { label: "Alquiler", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  transporte: { label: "Transporte", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  servicios: { label: "Servicios", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  materiales: { label: "Materiales", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  viaticos: { label: "Viáticos", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  varios: { label: "Varios", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

const fetchGastosFromDB = async (): Promise<OtroGastoWithRelations[]> => {
  const { data, error } = await supabase
    .from("otros_gastos")
    .select(`
      *,
      obra:obras(nombre),
      maquinaria:maquinarias(id, codigo, nombre, patente, tipo)
    `)
    .order("fecha", { ascending: false });

  if (error) throw error;
  return (data || []) as any;
};


export function useOtrosGastos() {
  const queryClient = useQueryClient();

  const { 
    data: gastos = [], 
    isLoading: loading,
    refetch: fetchGastos 
  } = useQuery({
    queryKey: ['otros-gastos'],
    queryFn: fetchGastosFromDB,
  });

  const createMutation = useMutation({
    mutationFn: async (gasto: OtroGastoForm) => {
      const { data, error } = await supabase
        .from("otros_gastos")
        .insert([gasto])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Gasto registrado correctamente");
      queryClient.invalidateQueries({ queryKey: ['otros-gastos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error creating gasto:", error);
      toast.error("Error al registrar gasto");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, gasto }: { id: string; gasto: Partial<OtroGastoForm> }) => {
      const { error } = await supabase
        .from("otros_gastos")
        .update(gasto)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gasto actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ['otros-gastos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error updating gasto:", error);
      toast.error("Error al actualizar gasto");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("otros_gastos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gasto eliminado correctamente");
      queryClient.invalidateQueries({ queryKey: ['otros-gastos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error deleting gasto:", error);
      toast.error("Error al eliminar gasto");
    },
  });

  return {
    gastos,
    loading,
    fetchGastos,
    createGasto: async (gasto: OtroGastoForm) => {
      try {
        return await createMutation.mutateAsync(gasto);
      } catch {
        return null;
      }
    },
    updateGasto: async (id: string, gasto: Partial<OtroGastoForm>) => {
      try {
        await updateMutation.mutateAsync({ id, gasto });
        return true;
      } catch {
        return false;
      }
    },
    deleteGasto: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
  };
}

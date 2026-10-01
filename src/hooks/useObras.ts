import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EstadoObra = "activa" | "pendiente" | "finalizada" | "pausada";

export interface ObraDB {
  id: string;
  nombre: string;
  numero: string | null;
  ubicacion: string | null;
  descripcion: string | null;
  estado: EstadoObra;
  fecha_inicio: string | null;
  fecha_fin_estimada: string | null;
  responsable_id: string | null;
  cliente_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ObraWithRelations extends ObraDB {
  responsable?: { nombre: string; apellido: string };
  cliente?: { id: string; nombre: string; cuit: string | null; direccion: string | null; localidad: string | null; telefono: string | null; email: string | null } | null;
}

export interface ObraForm {
  nombre: string;
  numero?: string;
  ubicacion?: string;
  descripcion?: string;
  estado: EstadoObra;
  fecha_inicio?: string;
  fecha_fin_estimada?: string;
  responsable_id?: string;
  cliente_id?: string;
}

const fetchObrasFromDB = async (): Promise<ObraWithRelations[]> => {
  const { data, error } = await supabase
    .from("obras")
    .select(`
      id, nombre, numero, ubicacion, descripcion, estado, fecha_inicio, fecha_fin_estimada,
      responsable_id, cliente_id, created_at, updated_at,
      responsable:personal(nombre, apellido),
      cliente:clientes(id, nombre, cuit, direccion, localidad, telefono, email)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as ObraWithRelations[];
};

export function useObras() {
  const queryClient = useQueryClient();

  const { 
    data: obras = [], 
    isLoading: loading,
    refetch: fetchObras 
  } = useQuery({
    queryKey: ['obras'],
    queryFn: fetchObrasFromDB,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: async (obra: ObraForm) => {
      const insertData = {
        nombre: obra.nombre,
        numero: obra.numero || null,
        estado: obra.estado,
        ubicacion: obra.ubicacion || null,
        descripcion: obra.descripcion || null,
        fecha_inicio: obra.fecha_inicio || null,
        fecha_fin_estimada: obra.fecha_fin_estimada || null,
        responsable_id: obra.responsable_id || null,
        cliente_id: obra.cliente_id || null,
      };

      const { data, error } = await supabase
        .from("obras")
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Obra creada correctamente");
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error creating obra:", error);
      toast.error("Error al crear obra");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, obra }: { id: string; obra: Partial<ObraForm> }) => {
      const sanitized = {
        ...obra,
        fecha_inicio: obra.fecha_inicio || null,
        fecha_fin_estimada: obra.fecha_fin_estimada || null,
        ubicacion: obra.ubicacion || null,
        descripcion: obra.descripcion || null,
        responsable_id: obra.responsable_id || null,
        cliente_id: obra.cliente_id || null,
      };

      const { error } = await supabase
        .from("obras")
        .update(sanitized)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Obra actualizada correctamente");
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error updating obra:", error);
      toast.error("Error al actualizar obra");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("obras")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Obra eliminada correctamente");
      queryClient.invalidateQueries({ queryKey: ['obras'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error deleting obra:", error);
      toast.error("Error al eliminar obra");
    },
  });

  return {
    obras,
    loading,
    fetchObras,
    createObra: async (obra: ObraForm) => {
      try {
        return await createMutation.mutateAsync(obra);
      } catch {
        return null;
      }
    },
    updateObra: async (id: string, obra: Partial<ObraForm>) => {
      try {
        await updateMutation.mutateAsync({ id, obra });
        return true;
      } catch {
        return false;
      }
    },
    deleteObra: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
  };
}

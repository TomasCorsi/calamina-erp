import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TipoMaquinaria = 
  | "cargadora"
  | "compactador"
  | "retroexcavadora"
  | "minicargadora"
  | "motoniveladora"
  | "topador"
  | "pala_retro"
  | "batea"
  | "acoplado"
  | "camion"
  | "carreton"
  | "cisterna"
  | "tanque_cisterna"
  | "tanque_regador_tractor"
  | "soplador"
  | "zanjeadora"
  | "rastra"
  | "tractor"
  | "rastra_grosspal"
  | "auto"
  | "camioneta"
  | "grupo_electrogeno";
export type EstadoMaquinaria = "operativa" | "mantenimiento" | "inactiva" | "en_uso";

export interface MaquinariaDB {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoMaquinaria;
  marca: string;
  anio: number;
  patente: string | null;
  estado: EstadoMaquinaria;
  horas_acumuladas: number;
  km_acumulados: number;
  operador_asignado_id: string | null;
  obra_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaquinariaWithRelations extends MaquinariaDB {
  operador?: { nombre: string; apellido: string } | null;
  obra?: { nombre: string } | null;
}

export interface MaquinariaForm {
  codigo?: string;
  nombre?: string;
  tipo?: TipoMaquinaria;
  marca?: string;
  anio?: number;
  patente?: string;
  estado?: EstadoMaquinaria;
  horas_acumuladas?: number;
  operador_asignado_id?: string;
  obra_id?: string;
}

const fetchMaquinariasFromDB = async (): Promise<MaquinariaWithRelations[]> => {
  const { data, error } = await supabase
    .from("maquinarias")
    .select(`
      id, codigo, nombre, tipo, marca, anio, patente, estado,
      horas_acumuladas, km_acumulados, operador_asignado_id, obra_id,
      created_at, updated_at,
      operador:personal!operador_asignado_id(nombre, apellido),
      obra:obras(nombre)
    `)
    .order("nombre");

  if (error) throw error;
  return (data || []) as unknown as MaquinariaWithRelations[];
};

export function useMaquinarias() {
  const queryClient = useQueryClient();

  const { 
    data: maquinarias = [], 
    isLoading: loading,
    refetch: fetchMaquinarias 
  } = useQuery({
    queryKey: ['maquinarias'],
    queryFn: fetchMaquinariasFromDB,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: async (maq: MaquinariaForm) => {
      const insertData = {
        codigo: maq.codigo || null,
        nombre: maq.nombre || null,
        tipo: maq.tipo || "cargadora",
        marca: maq.marca || null,
        anio: maq.anio || null,
        patente: maq.patente || null,
        estado: maq.estado || "operativa",
        horas_acumuladas: maq.horas_acumuladas || 0,
        operador_asignado_id: maq.operador_asignado_id || null,
        obra_id: maq.obra_id || null,
      };

      const { data, error } = await supabase
        .from("maquinarias")
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Maquinaria creada correctamente");
      queryClient.invalidateQueries({ queryKey: ['maquinarias'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error creating maquinaria:", error);
      toast.error("Error al crear maquinaria");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, maq }: { id: string; maq: Partial<MaquinariaForm> }) => {
      const updateData: any = { ...maq };
      if (maq.patente === "") updateData.patente = null;
      if (maq.operador_asignado_id === undefined) updateData.operador_asignado_id = null;
      if (maq.obra_id === undefined) updateData.obra_id = null;

      const { error } = await supabase
        .from("maquinarias")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Maquinaria actualizada correctamente");
      queryClient.invalidateQueries({ queryKey: ['maquinarias'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error updating maquinaria:", error);
      toast.error("Error al actualizar maquinaria");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("maquinarias")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Maquinaria eliminada correctamente");
      queryClient.invalidateQueries({ queryKey: ['maquinarias'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error deleting maquinaria:", error);
      toast.error("Error al eliminar maquinaria");
    },
  });

  const batchSaveMutation = useMutation({
    mutationFn: async (changes: {
      created: MaquinariaForm[];
      updated: { id: string; data: Partial<MaquinariaForm> }[];
      deleted: string[];
    }) => {
      // Handle creations
      if (changes.created.length > 0) {
        const insertData = changes.created.map(maq => ({
          codigo: maq.codigo || null,
          nombre: maq.nombre || null,
          tipo: maq.tipo || "cargadora",
          marca: maq.marca || null,
          anio: maq.anio || null,
          patente: maq.patente || null,
          estado: maq.estado || "operativa",
          horas_acumuladas: maq.horas_acumuladas || 0,
          operador_asignado_id: maq.operador_asignado_id || null,
          obra_id: maq.obra_id || null,
        }));
        
        const { error } = await supabase.from("maquinarias").insert(insertData);
        if (error) throw new Error(`Error creating: ${error.message}`);
      }
      
      // Handle updates
      for (const item of changes.updated) {
        const updateData: any = { ...item.data };
        if (item.data.patente === "") updateData.patente = null;
        
        const { error } = await supabase.from("maquinarias").update(updateData).eq("id", item.id);
        if (error) throw new Error(`Error updating: ${error.message}`);
      }
      
      // Handle deletions
      if (changes.deleted.length > 0) {
        const { error } = await supabase.from("maquinarias").delete().in("id", changes.deleted);
        if (error) throw new Error(`Error deleting: ${error.message}`);
      }
      
      return changes.created.length + changes.updated.length + changes.deleted.length;
    },
    onSuccess: (totalChanges) => {
      toast.success(`${totalChanges} cambio${totalChanges > 1 ? 's' : ''} guardado${totalChanges > 1 ? 's' : ''}`);
      queryClient.invalidateQueries({ queryKey: ['maquinarias'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error in batch save:", error);
      toast.error("Error al guardar cambios");
    },
  });

  return {
    maquinarias,
    loading,
    fetchMaquinarias,
    createMaquinaria: async (maq: MaquinariaForm) => {
      try {
        return await createMutation.mutateAsync(maq);
      } catch {
        return null;
      }
    },
    updateMaquinaria: async (id: string, maq: Partial<MaquinariaForm>) => {
      try {
        await updateMutation.mutateAsync({ id, maq });
        return true;
      } catch {
        return false;
      }
    },
    deleteMaquinaria: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
    batchSave: async (changes: {
      created: MaquinariaForm[];
      updated: { id: string; data: Partial<MaquinariaForm> }[];
      deleted: string[];
    }) => {
      await batchSaveMutation.mutateAsync(changes);
    },
  };
}

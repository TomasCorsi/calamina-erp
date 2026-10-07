import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const db = supabase as any;

export type EstadoPresentismo = "presente" | "ausente" | "licencia" | "vacaciones" | "enfermedad";

export interface RegistroHHDB {
  id: string;
  fecha: string;
  persona_id: string;
  obra_id: string;
  capataz_id: string;
  hora_entrada: string;
  hora_salida: string;
  horas_normales: number;
  horas_extra: number;
  horas_totales: number;
  tarea: string;
  estado: EstadoPresentismo;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegistroHHWithRelations extends RegistroHHDB {
  persona?: { nombre: string; apellido: string };
  obra?: { nombre: string };
  capataz?: { nombre: string; apellido: string };
}

export interface RegistroHHForm {
  fecha: string;
  persona_id: string;
  obra_id: string;
  capataz_id: string;
  hora_entrada: string;
  hora_salida: string;
  horas_normales: number;
  horas_extra: number;
  horas_totales: number;
  tarea: string;
  estado: EstadoPresentismo;
  observaciones?: string;
}

const fetchRegistrosFromDB = async (companyId: string, fecha: string): Promise<RegistroHHWithRelations[]> => {
  const { data, error } = await db
    .from("registros_hh")
    .select(`
      id,fecha,persona_id,obra_id,capataz_id,hora_entrada,hora_salida,horas_normales,horas_extra,horas_totales,tarea,estado,observaciones,created_at,updated_at,
      persona:personal!registros_hh_persona_id_fkey(first_name, last_name),
      obra:obras(nombre),
      capataz:personal!registros_hh_capataz_id_fkey(first_name, last_name)
    `).eq("company_id", companyId).eq("fecha", fecha)
    .order("fecha", { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => ({
    ...row,
    persona: row.persona ? { nombre: row.persona.first_name, apellido: row.persona.last_name } : null,
    capataz: row.capataz ? { nombre: row.capataz.first_name, apellido: row.capataz.last_name } : null,
  }));
};

export function usePresentismo(fecha: string) {
  const queryClient = useQueryClient();
  const { membership } = useAuth();
  const companyId = membership?.company_id;

  const { 
    data: registros = [], 
    isLoading: loading,
    refetch: fetchRegistros 
  } = useQuery({
    queryKey: ['presentismo', companyId, fecha],
    queryFn: () => fetchRegistrosFromDB(companyId!, fecha),
    enabled: Boolean(companyId && fecha),
  });

  const createMutation = useMutation({
    mutationFn: async (registro: RegistroHHForm) => {
      if (!companyId) throw new Error("No hay empresa activa");
      const { data, error } = await db
        .from("registros_hh")
        .insert([{ company_id: companyId, ...registro }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Registro creado correctamente");
      queryClient.invalidateQueries({ queryKey: ['presentismo', companyId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error creating registro:", error);
      toast.error("Error al crear registro");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, registro }: { id: string; registro: Partial<RegistroHHForm> }) => {
      const { error } = await db
        .from("registros_hh")
        .update(registro)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ['presentismo', companyId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error updating registro:", error);
      toast.error("Error al actualizar registro");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("registros_hh")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro eliminado correctamente");
      queryClient.invalidateQueries({ queryKey: ['presentismo', companyId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error deleting registro:", error);
      toast.error("Error al eliminar registro");
    },
  });

  return {
    registros,
    loading,
    fetchRegistros,
    createRegistro: async (registro: RegistroHHForm) => {
      try {
        return await createMutation.mutateAsync(registro);
      } catch {
        return null;
      }
    },
    updateRegistro: async (id: string, registro: Partial<RegistroHHForm>) => {
      try {
        await updateMutation.mutateAsync({ id, registro });
        return true;
      } catch {
        return false;
      }
    },
    deleteRegistro: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
  };
}

import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ChecklistCambio, ChecklistChequeo } from "@/components/mantenimiento/mantenimientoConstants";

const DEFAULT_DAYS_BACK = 90;
const LOAD_ALL_SESSION_KEY = "mantenimientos:loadAll";

export type TipoMantenimiento = "preventivo" | "correctivo" | "emergencia";
export type EstadoMantenimiento = "pendiente" | "en_proceso" | "completado";

export interface MantenimientoDB {
  id: string;
  fecha: string;
  maquinaria_id: string;
  tipo: TipoMantenimiento;
  descripcion: string;
  repuestos: string | null;
  costo_repuestos: number;
  costo_mano_obra: number;
  costo_total: number;
  horas_maquina: number;
  kilometros: number;
  tecnico: string;
  tecnico_id: string | null;
  estado: EstadoMantenimiento;
  proximo_mantenimiento: string | null;
  proximo_service_km: number | null;
  proximo_service_hr: number | null;
  informe_tecnico: string | null;
  alerta_campo: string | null;
  checklist_cambio: ChecklistCambio | null;
  checklist_chequeo: ChecklistChequeo | null;
  adjunto_url: string | null;
  observaciones: string | null;
  observacion_reporte_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MantenimientoWithRelations extends MantenimientoDB {
  maquinaria?: { nombre: string; codigo: string; horas_acumuladas?: number };
  tecnico_personal?: { nombre: string | null; apellido: string | null } | null;
}

export interface MantenimientoForm {
  fecha: string;
  maquinaria_id: string;
  tipo: TipoMantenimiento;
  descripcion: string;
  repuestos?: string;
  costo_repuestos: number;
  costo_mano_obra: number;
  costo_total: number;
  horas_maquina: number;
  kilometros?: number;
  tecnico: string;
  tecnico_id?: string;
  estado: EstadoMantenimiento;
  proximo_mantenimiento?: string;
  proximo_service_km?: number;
  proximo_service_hr?: number;
  informe_tecnico?: string;
  alerta_campo?: string;
  checklist_cambio?: ChecklistCambio;
  checklist_chequeo?: ChecklistChequeo;
  adjunto_url?: string;
  observaciones?: string;
  observacion_reporte_id?: string;
}

const fetchMantenimientosFromDB = async (fechaDesde: string | null): Promise<MantenimientoWithRelations[]> => {
  let query = (supabase as any)
    .from("mantenimientos_list_view")
    .select(`
      id, fecha, maquinaria_id, tipo, descripcion, repuestos, costo_repuestos, costo_mano_obra,
      costo_total, horas_maquina, kilometros, tecnico, tecnico_id, estado, proximo_mantenimiento,
      proximo_service_km, proximo_service_hr, informe_tecnico, alerta_campo, checklist_cambio,
      checklist_chequeo, adjunto_url, observaciones, observacion_reporte_id, created_at, updated_at,
      maquinaria_nombre, maquinaria_codigo, maquinaria_horas_acumuladas,
      tecnico_nombre, tecnico_apellido
    `)
    .order("fecha", { ascending: false });

  if (fechaDesde) {
    query = query.gte("fecha", fechaDesde);
  }

  const { data, error } = await query;
  if (error) throw error;
  // Map flat columns back into nested relations to keep the existing component contract
  return (data || []).map((row: any) => ({
    ...row,
    maquinaria: row.maquinaria_id
      ? {
          nombre: row.maquinaria_nombre,
          codigo: row.maquinaria_codigo,
          horas_acumuladas: row.maquinaria_horas_acumuladas,
        }
      : undefined,
    tecnico_personal: row.tecnico_id
      ? { nombre: row.tecnico_nombre, apellido: row.tecnico_apellido }
      : null,
  })) as MantenimientoWithRelations[];
};


export function useMantenimientos() {
  const queryClient = useQueryClient();

  const [loadAll, setLoadAll] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(LOAD_ALL_SESSION_KEY) === "1";
  });
  const cargarHistorico = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(LOAD_ALL_SESSION_KEY, "1");
    }
    setLoadAll(true);
  }, []);

  const fechaDesde = useMemo(() => {
    if (loadAll) return null;
    const d = new Date();
    d.setDate(d.getDate() - DEFAULT_DAYS_BACK);
    return d.toISOString().slice(0, 10);
  }, [loadAll]);

  const { 
    data: mantenimientos = [], 
    isLoading: loading,
    refetch: fetchMantenimientos 
  } = useQuery({
    queryKey: ['mantenimientos', fechaDesde],
    queryFn: () => fetchMantenimientosFromDB(fechaDesde),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: async (mant: MantenimientoForm) => {
      const payload: any = { ...mant };
      if (payload.checklist_cambio) payload.checklist_cambio = payload.checklist_cambio;
      if (payload.checklist_chequeo) payload.checklist_chequeo = payload.checklist_chequeo;

      const { data, error } = await supabase
        .from("mantenimientos")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Mantenimiento creado correctamente");
      queryClient.invalidateQueries({ queryKey: ['mantenimientos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error creating mantenimiento:", error);
      toast.error("Error al crear mantenimiento");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, mant }: { id: string; mant: Partial<MantenimientoForm> }) => {
      const { data, error } = await supabase
        .from("mantenimientos")
        .update(mant as any)
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("No se pudo actualizar el registro. Verificá permisos.");
      return data;
    },
    onSuccess: () => {
      toast.success("Mantenimiento actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ['mantenimientos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['observaciones_maquina'] });
    },
    onError: (error: Error) => {
      console.error("Error updating mantenimiento:", error);
      toast.error(error.message || "Error al actualizar mantenimiento");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mantenimientos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mantenimiento eliminado correctamente");
      queryClient.invalidateQueries({ queryKey: ['mantenimientos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error deleting mantenimiento:", error);
      toast.error("Error al eliminar mantenimiento");
    },
  });

  return {
    mantenimientos,
    loading,
    fetchMantenimientos,
    loadAll,
    cargarHistorico,
    createMantenimiento: async (mant: MantenimientoForm) => {
      try {
        return await createMutation.mutateAsync(mant);
      } catch {
        return null;
      }
    },
    updateMantenimiento: async (id: string, mant: Partial<MantenimientoForm>) => {
      try {
        await updateMutation.mutateAsync({ id, mant });
        return true;
      } catch {
        return false;
      }
    },
    deleteMantenimiento: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
  };
}

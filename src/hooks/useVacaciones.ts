import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export type MotivoVacacion = "vacaciones" | "licencia_medica" | "permiso_personal" | "otro";

export interface VacacionDB {
  id: string;
  personal_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_totales: number;
  motivo: string;
  pagada: boolean;
  aprobado_por: string | null;
  fecha_aprobacion: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  personal?: {
    nombre: string | null;
    apellido: string | null;
    legajo: string | null;
  };
}

export interface VacacionForm {
  personal_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias_totales: number;
  motivo: string;
  observaciones?: string;
}

// Calcular antigüedad en años
export const calcularAntiguedad = (fechaIngreso: string | null): number | null => {
  if (!fechaIngreso) return null;
  const ingreso = new Date(fechaIngreso);
  const hoy = new Date();
  const diffMs = hoy.getTime() - ingreso.getTime();
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
};

// Calcular días base por antigüedad (legislación Argentina/Paraguay)
export const calcularDiasBase = (antiguedad: number | null): number => {
  if (antiguedad === null) return 14;
  if (antiguedad < 5) return 14;
  if (antiguedad < 10) return 21;
  if (antiguedad < 20) return 28;
  return 35;
};

// Calcular días usados (vacaciones del año actual)
export const calcularDiasUsados = (vacaciones: VacacionDB[], personalId: string): number => {
  const añoActual = new Date().getFullYear();
  return vacaciones
    .filter(v => 
      v.personal_id === personalId && 
      new Date(v.fecha_inicio).getFullYear() === añoActual
    )
    .reduce((sum, v) => sum + v.dias_totales, 0);
};


export function useVacaciones() {
  const { membership } = useAuth();
  const companyId = membership?.company_id;
  const [vacaciones, setVacaciones] = useState<VacacionDB[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVacaciones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vacaciones")
      .select(`
        *,
        personal:personal!vacaciones_personal_company_fkey (
          first_name,
          last_name,
          internal_code
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching vacaciones:", error);
      toast.error("Error al cargar vacaciones");
    } else {
      setVacaciones(((data || []) as Array<any>).map((row) => ({
        ...row,
        personal: row.personal ? { nombre: row.personal.first_name, apellido: row.personal.last_name, legajo: row.personal.internal_code } : null,
      })) as VacacionDB[]);
    }
    setLoading(false);
  };

  const createVacacion = async (vacacion: VacacionForm) => {
    const { data, error } = await supabase
      .from("vacaciones")
      .insert([{ ...vacacion, company_id: companyId, estado: "aprobada", approved_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) {
      console.error("Error creating vacacion:", error);
      toast.error("Error al crear solicitud de vacaciones");
      return null;
    }

    toast.success("Solicitud de vacaciones creada correctamente");
    await fetchVacaciones();
    return data;
  };

  const updateVacacion = async (id: string, vacacion: Partial<VacacionForm>) => {
    const { error } = await supabase
      .from("vacaciones")
      .update(vacacion)
      .eq("id", id);

    if (error) {
      console.error("Error updating vacacion:", error);
      toast.error("Error al actualizar vacaciones");
      return false;
    }

    toast.success("Vacaciones actualizadas correctamente");
    await fetchVacaciones();
    return true;
  };

  const deleteVacacion = async (id: string) => {
    const { error } = await supabase
      .from("vacaciones")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting vacacion:", error);
      toast.error("Error al eliminar vacaciones");
      return false;
    }

    toast.success("Vacaciones eliminadas correctamente");
    await fetchVacaciones();
    return true;
  };


  const togglePagada = async (id: string) => {
    const vacacion = vacaciones.find(v => v.id === id);
    if (!vacacion) return false;

    const newPagada = !vacacion.pagada;
    
    // Optimistic update - actualizar estado local inmediatamente
    setVacaciones(prev => 
      prev.map(v => v.id === id ? { ...v, pagada: newPagada } : v)
    );

    const { error } = await supabase
      .from("vacaciones")
      .update({ pagada: newPagada })
      .eq("id", id);

    if (error) {
      // Revertir si hay error
      setVacaciones(prev => 
        prev.map(v => v.id === id ? { ...v, pagada: !newPagada } : v)
      );
      console.error("Error toggling pagada:", error);
      toast.error("Error al actualizar estado de pago");
      return false;
    }

    toast.success(newPagada ? "Vacaciones marcadas como pagadas" : "Vacaciones marcadas como no pagadas");
    return true;
  };

  useEffect(() => {
    if (companyId) fetchVacaciones();
  }, [companyId]);

  return {
    vacaciones,
    loading,
    fetchVacaciones,
    createVacacion,
    updateVacacion,
    deleteVacacion,
    togglePagada,
  };
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type RolPersonal = "capataz" | "maquinista" | "chofer" | "administrativo" | "ayudante" | "sereno" | "mecanico" | "topografo" | "repartidor_calecita";
export type ModalidadPago = "mensual" | "quincenal";

export interface PersonalDB {
  id: string;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  rol: RolPersonal;
  email: string | null;
  telefono: string | null;
  fecha_ingreso: string | null;
  activo: boolean;
  licencia: string | null;
  vencimiento_licencia: string | null;
  sueldo: number | null;
  sueldo_negro: number | null;
  modalidad_pago: string | null;
  legajo: string | null;
  situacion_laboral: string | null;
  banco: string | null;
  numero_cuenta: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonalForm {
  nombre?: string;
  apellido?: string;
  dni?: string;
  rol?: RolPersonal;
  email?: string;
  telefono?: string;
  fecha_ingreso?: string;
  activo?: boolean;
  licencia?: string;
  vencimiento_licencia?: string;
  sueldo?: number;
  sueldo_negro?: number;
  modalidad_pago?: ModalidadPago;
  legajo?: string;
  situacion_laboral?: string;
  banco?: string;
  numero_cuenta?: string;
}

const DATE_FIELDS = new Set(["fecha_ingreso", "vencimiento_licencia"]);
const NUMERIC_FIELDS = new Set(["sueldo", "sueldo_negro"]);

// Normalize payload before sending to DB:
// - remove undefined
// - convert empty strings to null (or 0 for numeric fields)
// - convert empty date strings to null
const normalizePersonalPayload = (payload: Record<string, unknown>): Record<string, unknown> => {
  const cleaned: Record<string, unknown> = {};

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;

    if (value === "") {
      if (key === "nombre" || key === "apellido") {
        cleaned[key] = "";
        return;
      }

      if (DATE_FIELDS.has(key)) {
        cleaned[key] = null;
        return;
      }

      if (NUMERIC_FIELDS.has(key)) {
        cleaned[key] = 0;
        return;
      }

      cleaned[key] = null;
      return;
    }

    cleaned[key] = value;
  });

  return cleaned;
};

const fetchPersonalFromDB = async (): Promise<PersonalDB[]> => {
  const { data, error } = await supabase
    .from("personal")
    .select("*")
    .order("apellido");

  if (error) throw error;
  return data || [];
};

export function usePersonal() {
  const queryClient = useQueryClient();

  const { 
    data: personal = [], 
    isLoading: loading,
    refetch: fetchPersonal 
  } = useQuery({
    queryKey: ['personal'],
    queryFn: fetchPersonalFromDB,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Helper to clean form data - converts empty strings to null for date fields
  const cleanFormData = (persona: PersonalForm): Record<string, unknown> => {
    const cleanedData: Record<string, unknown> = {};
    const dateFields = ['fecha_ingreso', 'vencimiento_licencia'];
    
    Object.entries(persona).forEach(([key, value]) => {
      if (value === undefined) return;
      
      // Convert empty strings to null for date fields
      if (dateFields.includes(key) && value === "") {
        cleanedData[key] = null;
      } else if (value === "" && key !== "nombre" && key !== "apellido") {
        // Convert other empty strings to null for optional fields
        cleanedData[key] = null;
      } else {
        cleanedData[key] = value;
      }
    });
    
    return cleanedData;
  };

  const createMutation = useMutation({
    mutationFn: async (persona: PersonalForm) => {
      const cleanedData = cleanFormData(persona);
      
      const { data, error } = await supabase
        .from("personal")
        .insert([normalizePersonalPayload(cleanedData as Record<string, unknown>)])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Personal creado correctamente");
      queryClient.invalidateQueries({ queryKey: ['personal'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      console.error("Error creating personal:", error);
      if (error.code === '23505') {
        toast.error("El número de cuenta bancaria ya está registrado por otro empleado.");
      } else {
        toast.error("Error al crear personal: " + (error.message || ""));
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, persona }: { id: string; persona: Partial<PersonalForm> }) => {
      // Use the same cleaning logic for updates
      const cleanedData: Record<string, unknown> = {};
      const dateFields = ['fecha_ingreso', 'vencimiento_licencia'];
      
      Object.entries(persona).forEach(([key, value]) => {
        if (value === undefined) return;
        
        // Convert empty strings to null for date fields
        if (dateFields.includes(key) && value === "") {
          cleanedData[key] = null;
        } else if (value === "" && key !== "nombre" && key !== "apellido") {
          cleanedData[key] = null;
        } else {
          cleanedData[key] = value;
        }
      });

      const { error } = await supabase
        .from("personal")
        .update(cleanedData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Personal actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ['personal'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      console.error("Error updating personal:", error);
      if (error.code === '23505') {
        toast.error("El número de cuenta bancaria ya está registrado por otro empleado.");
      } else {
        toast.error("Error al actualizar personal: " + (error.message || ""));
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("personal")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Personal eliminado correctamente");
      queryClient.invalidateQueries({ queryKey: ['personal'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error deleting personal:", error);
      toast.error("Error al eliminar personal");
    },
  });

  return {
    personal,
    loading,
    fetchPersonal,
    createPersonal: async (persona: PersonalForm) => {
      try {
        return await createMutation.mutateAsync(persona);
      } catch {
        return null;
      }
    },
    updatePersonal: async (id: string, persona: Partial<PersonalForm>) => {
      try {
        await updateMutation.mutateAsync({ id, persona });
        return true;
      } catch {
        return false;
      }
    },
    deletePersonal: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
  };
}

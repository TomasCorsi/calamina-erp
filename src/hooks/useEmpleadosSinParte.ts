import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type RolPersonal = Database["public"]["Enums"]["rol_personal"];

export interface EmpleadoSinParte {
  id: string;
  nombre: string | null;
  apellido: string | null;
  legajo: string | null;
  rol: RolPersonal;
  tieneUsuario: boolean;
}

interface UseEmpleadosSinParteResult {
  empleadosSinParte: EmpleadoSinParte[];
  totalActivos: number;
  isLoading: boolean;
  error: Error | null;
}

export function useEmpleadosSinParte(fecha: string, enabled: boolean = true): UseEmpleadosSinParteResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["empleados-sin-parte", fecha],
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: enabled && !!fecha,
    queryFn: async () => {
      // Parallelize independent fetches
      const [empleadosRes, partesRes] = await Promise.all([
        supabase
          .from("personal_selector" as any)
          .select("id, nombre, apellido, legajo, rol, user_id")
          .eq("activo", true)
          .order("apellido") as unknown as Promise<{ data: { id: string; nombre: string | null; apellido: string | null; legajo: string | null; rol: RolPersonal; user_id: string | null }[] | null; error: any }>,
        supabase
          .from("partes_diarios")
          .select("personal_id")
          .eq("fecha", fecha),
      ]);

      if (empleadosRes.error) throw empleadosRes.error;
      if (partesRes.error) throw partesRes.error;

      const empleadosActivos = empleadosRes.data;
      const partesDelDia = partesRes.data;

      // Filter out roles that don't need to submit partes
      const ROLES_EXCLUIDOS = ['administrativo', 'sereno', 'topografo'];
      const empleadosRelevantes = (empleadosActivos || [])
        .filter((emp) => !ROLES_EXCLUIDOS.includes(emp.rol));

      const conParte = new Set(partesDelDia?.map((p) => p.personal_id) || []);

      const sinParte: EmpleadoSinParte[] = empleadosRelevantes
        .filter((emp) => !conParte.has(emp.id))
        .map((emp) => ({
          id: emp.id,
          nombre: emp.nombre,
          apellido: emp.apellido,
          legajo: emp.legajo,
          rol: emp.rol,
          tieneUsuario: emp.user_id !== null,
        }));

      return {
        empleadosSinParte: sinParte,
        totalActivos: empleadosRelevantes.length,
      };
    },
  });

  return {
    empleadosSinParte: data?.empleadosSinParte || [],
    totalActivos: data?.totalActivos || 0,
    isLoading,
    error: error as Error | null,
  };
}

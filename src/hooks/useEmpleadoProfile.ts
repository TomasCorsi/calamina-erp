import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";
import type { WorkRole } from "@/types/workRole";

export type EmpleadoProfile = {
  id: string;
  company_id: string;
  nombre: string;
  apellido: string;
  legajo: string;
  rol: WorkRole | null;
  activo: boolean;
  nombreCompleto: string;
  dni: string | null;
  telefono: string | null;
  email: string | null;
  fecha_ingreso: string | null;
  licencia: string | null;
  vencimiento_licencia: string | null;
  banco: string | null;
  numero_cuenta: string | null;
};

export function useEmpleadoProfile() {
  const { membership } = useAuth();
  const personalId = membership?.personal_id ?? null;
  const query = useQuery({
    queryKey: ["empleado-profile-v2", membership?.company_id, personalId],
    enabled: Boolean(membership?.company_id && personalId),
    retry: false,
    queryFn: async (): Promise<EmpleadoProfile | null> => {
      const { data, error } = await supabase.schema("api").rpc("current_employee_profile");
      if (error) throw error;
      if (!data) return null;
      const row = data as Record<string, unknown>;
      const nombre = String(row.first_name ?? "");
      const apellido = String(row.last_name ?? "");
      return {
        id: String(row.id), company_id: String(row.company_id), nombre, apellido,
        legajo: String(row.internal_code ?? ""), rol: (row.work_role as WorkRole | null) ?? null,
        activo: row.status === "active", nombreCompleto: `${nombre} ${apellido}`.trim(),
        dni: row.dni == null ? null : String(row.dni), telefono: row.telefono == null ? null : String(row.telefono),
        email: row.work_email == null ? null : String(row.work_email), fecha_ingreso: row.fecha_ingreso == null ? null : String(row.fecha_ingreso),
        licencia: row.licencia == null ? null : String(row.licencia), vencimiento_licencia: row.vencimiento_licencia == null ? null : String(row.vencimiento_licencia),
        banco: row.banco == null ? null : String(row.banco), numero_cuenta: row.numero_cuenta == null ? null : String(row.numero_cuenta),
      };
    },
  });
  const empleado = query.data ?? null;
  const rolPersonal = empleado?.rol ?? null;
  return {
    empleado,
    loading: Boolean(personalId) && query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    rolPersonal,
    isFieldEmployee: empleado !== null,
    isMaquinista: rolPersonal === "maquinista", isChofer: rolPersonal === "chofer",
    isCapataz: rolPersonal === "capataz", isMecanico: rolPersonal === "mecanico",
    isSereno: rolPersonal === "sereno", isTopografo: rolPersonal === "topografo",
    isAyudante: rolPersonal === "ayudante", isAdministrativo: rolPersonal === "administrativo",
    isRepartidorCalecita: rolPersonal === "repartidor_calecita",
  };
}

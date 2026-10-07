import { useQuery } from "@tanstack/react-query";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MessageRecipient {
  id: string;
  nombre: string | null;
  apellido: string | null;
  legajo: string | null;
  rol: string | null;
  telefono: string | null;
  vencimientoLicencia: string | null;
  tieneUsuario: boolean;
  tieneParte: boolean;
}

export interface EmpleadoSinParte extends MessageRecipient {}

interface UseEmpleadosSinParteResult {
  destinatarios: MessageRecipient[];
  empleadosSinParte: EmpleadoSinParte[];
  totalActivos: number;
  isLoading: boolean;
  error: Error | null;
}

export function useEmpleadosSinParte(fecha: string, enabled = true): UseEmpleadosSinParteResult {
  const { membership } = useAuth();
  const query = useQuery({
    queryKey: ["message-recipients-v2", membership?.company_id, fecha],
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: enabled && Boolean(fecha && membership?.company_id),
    queryFn: async (): Promise<MessageRecipient[]> => {
      const { data, error } = await supabase.schema("api").rpc("list_message_recipients", {
        p_fecha: fecha,
      });
      if (error) throw error;
      return ((data || []) as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        nombre: row.nombre == null ? null : String(row.nombre),
        apellido: row.apellido == null ? null : String(row.apellido),
        legajo: row.legajo == null ? null : String(row.legajo),
        rol: row.rol == null ? null : String(row.rol),
        telefono: row.telefono == null ? null : String(row.telefono),
        vencimientoLicencia:
          row.vencimiento_licencia == null ? null : String(row.vencimiento_licencia),
        tieneUsuario: Boolean(row.tiene_usuario),
        tieneParte: Boolean(row.tiene_parte),
      }));
    },
  });

  const destinatarios = query.data ?? [];
  const rolesExcluidos = new Set(["administrativo", "sereno", "topografo"]);
  const relevantes = destinatarios.filter((empleado) => !rolesExcluidos.has(empleado.rol ?? ""));

  return {
    destinatarios,
    empleadosSinParte: relevantes.filter((empleado) => !empleado.tieneParte),
    totalActivos: relevantes.length,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
  };
}

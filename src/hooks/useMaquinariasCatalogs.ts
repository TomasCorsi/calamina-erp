import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";

export type MaquinariaObraOption = { id: string; nombre: string };
export type MaquinariaOperadorOption = { id: string; nombre: string; apellido: string };

export function useMaquinariasCatalogs() {
  const { membership, hasPermission } = useAuth();
  const companyId = membership?.company_id;

  const query = useQuery({
    queryKey: ["maquinarias-catalogs-v2", companyId],
    enabled: Boolean(companyId && hasPermission("maquinarias.view")),
    queryFn: async () => {
      const [obrasResult, operadoresResult] = await Promise.all([
        supabase
          .from("obras")
          .select("id,nombre")
          .eq("company_id", companyId!)
          .order("nombre"),
        supabase
          .from("personal")
          .select("id,first_name,last_name")
          .eq("company_id", companyId!)
          .eq("status", "active")
          .eq("work_role", "maquinista")
          .order("last_name"),
      ]);
      if (obrasResult.error) throw obrasResult.error;
      if (operadoresResult.error) throw operadoresResult.error;

      return {
        obras: (obrasResult.data ?? []).map((row) => ({
          id: String(row.id),
          nombre: String(row.nombre),
        })),
        operadores: (operadoresResult.data ?? []).map((row) => ({
          id: String(row.id),
          nombre: String(row.first_name),
          apellido: String(row.last_name),
        })),
      };
    },
  });

  return {
    ...(query.data ?? { obras: [], operadores: [] }),
    loading: query.isLoading,
    error: query.error,
  };
}

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";

export type ParteObraOption = { id: string; nombre: string; estado: string };
export type ParteMaquinariaOption = { id: string; codigo: string | null; tipo: string; patente: string | null };
export type PartePersonalOption = { id: string; nombre: string; apellido: string; legajo: string; rol: string | null };

export function useParteDiarioCatalogs(requested = true) {
  const { membership, hasPermission } = useAuth();
  const companyId = membership?.company_id;
  const enabled = Boolean(requested && companyId && hasPermission("parte_diario.view"));

  const obrasQuery = useQuery({
    queryKey: ["parte-diario-obras-v2", companyId], enabled,
    queryFn: async (): Promise<ParteObraOption[]> => {
      const { data, error } = await supabase.from("obras").select("id, nombre, estado").eq("company_id", companyId!).order("nombre");
      if (error) throw error;
      return (data ?? []) as ParteObraOption[];
    },
  });
  const maquinariasQuery = useQuery({
    queryKey: ["parte-diario-maquinarias-v2", companyId], enabled,
    queryFn: async (): Promise<ParteMaquinariaOption[]> => {
      const { data, error } = await supabase.from("maquinarias").select("id, codigo, tipo, patente").eq("company_id", companyId!).neq("estado", "inactiva").order("codigo");
      if (error) throw error;
      return (data ?? []) as ParteMaquinariaOption[];
    },
  });
  const personalQuery = useQuery({
    queryKey: ["parte-diario-personal-options-v2", companyId],
    enabled: Boolean(enabled && hasPermission("parte_diario.manage")),
    queryFn: async (): Promise<PartePersonalOption[]> => {
      const { data, error } = await supabase.schema("api").rpc("list_parte_diario_personal_options");
      if (error) throw error;
      return (Array.isArray(data) ? data : []).map((row: Record<string, unknown>) => ({
        id: String(row.id), nombre: String(row.first_name ?? ""), apellido: String(row.last_name ?? ""),
        legajo: String(row.internal_code ?? ""), rol: row.work_role ? String(row.work_role) : null,
      }));
    },
  });
  return {
    obras: obrasQuery.data ?? [], maquinarias: maquinariasQuery.data ?? [], personal: personalQuery.data ?? [],
    isLoading: obrasQuery.isLoading || maquinariasQuery.isLoading || personalQuery.isLoading,
    error: obrasQuery.error ?? maquinariasQuery.error ?? personalQuery.error,
  };
}

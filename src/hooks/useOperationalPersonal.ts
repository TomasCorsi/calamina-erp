import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";

export type OperationalPerson = {
  id: string;
  nombre: string;
  apellido: string;
  legajo: string;
  rol: string | null;
  activo: boolean;
};

export function useOperationalPersonal(enabled = true) {
  const { membership } = useAuth();
  const companyId = membership?.company_id;
  const query = useQuery({
    queryKey: ["operational-personal-v2", companyId],
    enabled: Boolean(enabled && companyId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal")
        .select("id, internal_code, first_name, last_name, work_role, status")
        .eq("company_id", companyId!)
        .order("last_name");
      if (error) throw error;
      return (data ?? []).map((person) => ({
        id: String(person.id),
        nombre: String(person.first_name),
        apellido: String(person.last_name),
        legajo: String(person.internal_code),
        rol: person.work_role == null ? null : String(person.work_role),
        activo: person.status === "active",
      }));
    },
  });

  return { personal: query.data ?? [], loading: query.isLoading };
}

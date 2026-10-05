import { useQuery } from "@tanstack/react-query";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";

export interface RemitosFilterOptions {
  tipos: string[];
  proveedores: string[];
  transportes: string[];
  desde: string[];
  hasta: string[];
  creadores: string[];
}

const EMPTY: RemitosFilterOptions = {
  tipos: [],
  proveedores: [],
  transportes: [],
  desde: [],
  hasta: [],
  creadores: [],
};

const PAGE_SIZE = 1000;

/**
 * Trae los valores posibles de los filtros desde la base completa
 * (no solo desde los remitos cargados en pantalla).
 */
const fetchOptions = async (filterByUserId: string | null): Promise<RemitosFilterOptions> => {
  const tipos = new Set<string>();
  const proveedores = new Set<string>();
  const transportes = new Set<string>();
  const desde = new Set<string>();
  const hasta = new Set<string>();
  const creadores = new Set<string>();

  let from = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase
      .from("remitos")
      .select("tipo_material, proveedor, tipo_transporte, desde, hasta, created_by")
      .range(from, from + PAGE_SIZE - 1);

    if (filterByUserId) query = query.eq("created_by", filterByUserId);

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []) as Array<Record<string, string | null>>;

    rows.forEach((r) => {
      if (r.tipo_material) tipos.add(r.tipo_material);
      if (r.proveedor) proveedores.add(r.proveedor);
      if (r.tipo_transporte) transportes.add(r.tipo_transporte);
      if (r.desde) desde.add(r.desde);
      if (r.hasta) hasta.add(r.hasta);
      if (r.created_by) creadores.add(r.created_by);
    });

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const sorted = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b));

  return {
    tipos: sorted(tipos),
    proveedores: sorted(proveedores),
    transportes: sorted(transportes),
    desde: sorted(desde),
    hasta: sorted(hasta),
    creadores: [...creadores],
  };
};

export function useRemitosFilterOptions(filterByUserId: string | null, enabled = true) {
  const { data = EMPTY, isLoading } = useQuery<RemitosFilterOptions>({
    queryKey: ["remitos-filter-options", filterByUserId],
    queryFn: () => fetchOptions(filterByUserId),
    enabled,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return { options: data, loadingOptions: isLoading };
}

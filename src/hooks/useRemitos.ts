import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RemitoDB {
  id: string;
  numero: string;
  viaje_id: string | null;
  fecha: string;
  obra_id: string | null;
  material: string;
  cantidad: number;
  unidad: string;
  recibido_por: string;
  firmado: boolean;
  evidencia_url: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  row_color: string | null;
  proveedor: string | null;
  cliente: string | null;
  cliente_destino: string | null;
  remito_tercero: string | null;
  remito_local: string | null;
  desde: string | null;
  hasta: string | null;
  cantidad_viajes: number;
  tipo_material: string | null;
  precio_total: number;
  tipo_transporte: string | null;
  maquinaria_id: string | null;
  patente_tercero: string | null;
  cantidad_uni: number | null;
  precio_unitario: number | null;
  precio_calc_mode: string | null;
  forma_pago: string | null;
  created_by: string | null;
  
  cliente_cantera: string | null;
}

export interface RemitoWithRelations extends RemitoDB {
  obra?: { nombre: string };
  viaje?: { origen: string; destino: string };
  maquinaria?: { codigo: string; patente: string | null };
}

export interface RemitoForm {
  numero: string;
  viaje_id?: string;
  fecha: string;
  obra_id?: string;
  material: string;
  cantidad: number;
  unidad: string;
  recibido_por: string;
  firmado: boolean;
  evidencia_url?: string;
  observaciones?: string;
  proveedor?: string;
  cliente?: string;
  cliente_destino?: string;
  remito_tercero?: string;
  remito_local?: string;
  desde?: string;
  hasta?: string;
  cantidad_viajes?: number;
  tipo_material?: string;
  precio_total?: number;
  tipo_transporte?: string;
  maquinaria_id?: string;
  patente_tercero?: string;
  cantidad_uni?: number | null;
  precio_unitario?: number | null;
  precio_calc_mode?: string | null;
  forma_pago?: string | null;
  row_color?: string | null;
  cliente_cantera?: string | null;
}

const SERGIO_USER_ID = "c92028bd-dd42-416d-8892-f00b5ef90f8f";
const FRANCO_USER_ID = "2184b0ef-3c4f-4ca7-bdbf-c7cc69fc4c3a";
const CALAMINASUR_USER_ID = "73236f17-0602-41aa-8959-ee14be48f477";

// Default fetch window: last 90 days keeps initial load snappy.
// Full history is opt-in via cargarHistorico() (persisted in sessionStorage).
const DEFAULT_DAYS_BACK = 90;
const LOAD_ALL_SESSION_KEY = "remitos:loadAll";

const fetchRemitosFromDB = async (
  filterByUserId: string | null,
  fechaDesde: string | null
): Promise<RemitoWithRelations[]> => {
  const PAGE_SIZE = 1000;
  let allData: RemitoWithRelations[] = [];
  let from = 0;

  while (true) {
    let query = (supabase as any)
      .from("remitos_list_view")
      .select(`
        id, numero, viaje_id, fecha, obra_id, material, cantidad, unidad, recibido_por,
        firmado, evidencia_url, observaciones, created_at, updated_at, row_color, proveedor,
        cliente, cliente_destino, remito_tercero, remito_local, desde, hasta, cantidad_viajes,
        tipo_material, precio_total, tipo_transporte, maquinaria_id, patente_tercero,
        cantidad_uni, precio_unitario, precio_calc_mode, forma_pago, created_by, cliente_cantera,
        obra_nombre, maquinaria_codigo, maquinaria_patente
      `)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (filterByUserId) {
      query = query.eq("created_by", filterByUserId);
    }
    if (fechaDesde) {
      query = query.gte("fecha", fechaDesde);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data || data.length === 0) break;

    const mapped = (data as any[]).map((row) => ({
      ...row,
      obra: row.obra_nombre ? { nombre: row.obra_nombre } : undefined,
      maquinaria: row.maquinaria_id
        ? { codigo: row.maquinaria_codigo, patente: row.maquinaria_patente }
        : undefined,
    })) as RemitoWithRelations[];

    allData = allData.concat(mapped);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allData;
};


export function useRemitos() {
  const queryClient = useQueryClient();

  // Realtime subscription with longer debounce to avoid heavy refetches during batch saves
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedInvalidate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ['remitos'] });
    }, 1500);
  }, [queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel('remitos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'remitos' },
        () => debouncedInvalidate()
      )
      .subscribe();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [queryClient, debouncedInvalidate]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  // Load-all toggle persisted per session so navigating away/back doesn't reset it.
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

  const isOwnOnly = currentUserId === SERGIO_USER_ID || currentUserId === FRANCO_USER_ID || currentUserId === CALAMINASUR_USER_ID;
  const filterUserId = isOwnOnly ? currentUserId : null;

  // fechaDesde = null when loadAll; otherwise today - 90 days as YYYY-MM-DD
  const fechaDesde = useMemo(() => {
    if (loadAll) return null;
    const d = new Date();
    d.setDate(d.getDate() - DEFAULT_DAYS_BACK);
    return d.toISOString().slice(0, 10);
  }, [loadAll]);

  const {
    data: remitos = [],
    isLoading: loading,
    isFetching,
    refetch: fetchRemitos
  } = useQuery<RemitoWithRelations[]>({
    queryKey: ['remitos', filterUserId, fechaDesde],
    queryFn: () => fetchRemitosFromDB(filterUserId, fechaDesde),
    enabled: currentUserId !== null,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // true mientras se está trayendo el histórico completo
  const cargandoHistorico = loadAll && isFetching;



  const createMutation = useMutation({
    mutationFn: async (remito: RemitoForm) => {
      const { data, error } = await supabase
        .from("remitos")
        .insert([remito])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Remito creado correctamente");
      queryClient.invalidateQueries({ queryKey: ['remitos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error creating remito:", error);
      toast.error("Error al crear remito");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, remito }: { id: string; remito: Partial<RemitoForm> }) => {
      const { error } = await supabase
        .from("remitos")
        .update(remito)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Remito actualizado correctamente");
      queryClient.invalidateQueries({ queryKey: ['remitos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error updating remito:", error);
      toast.error("Error al actualizar remito");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("remitos")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Remito eliminado correctamente");
      queryClient.invalidateQueries({ queryKey: ['remitos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error deleting remito:", error);
      toast.error("Error al eliminar remito");
    },
  });

  const batchSaveMutation = useMutation({
    mutationFn: async (changes: {
      created: RemitoForm[];
      updated: { id: string; data: Partial<RemitoForm> }[];
      deleted: string[];
    }) => {
      const results = { created: 0, updated: 0, deleted: 0, errors: 0 };
      const promises: Promise<void>[] = [];

      // Row-by-row insert for resilience
      for (const record of changes.created) {
        const insertPromise = (async () => {
          const { error } = await supabase
            .from("remitos")
            .insert([record]);
          if (error) {
            console.error("Error inserting remito:", error);
            results.errors++;
          } else {
            results.created++;
          }
        })();
        promises.push(insertPromise);
      }

      // Parallel updates
      for (const { id, data } of changes.updated) {
        const updatePromise = (async () => {
          const { error } = await supabase
            .from("remitos")
            .update(data)
            .eq("id", id);
          if (error) {
            console.error("Error updating:", error);
            results.errors++;
          } else {
            results.updated++;
          }
        })();
        promises.push(updatePromise);
      }

      // Batch delete (single call with array of IDs)
      if (changes.deleted.length > 0) {
        const deletePromise = (async () => {
          const { error } = await supabase
            .from("remitos")
            .delete()
            .in("id", changes.deleted);
          if (error) {
            console.error("Error batch delete:", error);
            results.errors++;
          } else {
            results.deleted = changes.deleted.length;
          }
        })();
        promises.push(deletePromise);
      }

      await Promise.all(promises);
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remitos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      console.error("Error in batch save:", error);
    },
  });

  return {
    remitos,
    loading,
    fetchRemitos,
    loadAll,
    cargarHistorico,
    cargandoHistorico,


    createRemito: async (remito: RemitoForm) => {
      try {
        return await createMutation.mutateAsync(remito);
      } catch {
        return null;
      }
    },
    updateRemito: async (id: string, remito: Partial<RemitoForm>) => {
      try {
        await updateMutation.mutateAsync({ id, remito });
        return true;
      } catch {
        return false;
      }
    },
    deleteRemito: async (id: string) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
    batchSave: async (changes: {
      created: RemitoForm[];
      updated: { id: string; data: Partial<RemitoForm> }[];
      deleted: string[];
    }) => {
      return await batchSaveMutation.mutateAsync(changes);
    },
    updateRowColor: async (id: string, color: string | null) => {
      const { error } = await supabase
        .from("remitos")
        .update({ row_color: color } as Record<string, unknown>)
        .eq("id", id);
      if (error) {
        console.error("Error updating row color:", error);
        toast.error("Error al cambiar color");
        return false;
      }
      queryClient.invalidateQueries({ queryKey: ['remitos'] });
      return true;
    },
  };
}

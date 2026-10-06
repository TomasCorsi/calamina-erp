import { useCallback, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const db = supabase as any;

const DEFAULT_DAYS_BACK = 30;
const LOAD_ALL_SESSION_KEY = 'cargas_repartidor:loadAll';

export interface CargaRepartidorFull {
  id: string;
  parte_diario_id: string | null;
  fecha: string;
  litros: number;
  horas: number | null;
  km: number | null;
  operador_id: string | null;
  maquinaria_id: string | null;
  obra_id: string | null;
  tipo_operador: string | null;
  tipo_producto: string | null;
  repartidor_id: string | null;
  observaciones: string | null;
  tipo_movimiento?: string | null;
  numero_remito: number | null;
  created_at: string;
  updated_at: string | null;
  operador?: { nombre: string | null; apellido: string | null } | null;
  maquinaria?: { codigo: string | null; tipo: string; nombre: string | null } | null;
  obra?: { nombre: string } | null;
  parte_diario?: { personal: { nombre: string | null; apellido: string | null } | null } | null;
  repartidor?: { nombre: string | null; apellido: string | null } | null;
}

export function useCargasRepartidorAll() {
  const queryClient = useQueryClient();
  const { membership } = useAuth();
  const companyId = membership?.company_id;

  const [loadAll, setLoadAll] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(LOAD_ALL_SESSION_KEY) === '1';
  });

  const cargarHistorico = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(LOAD_ALL_SESSION_KEY, '1');
    }
    setLoadAll(true);
  }, []);

  const fechaDesde = useMemo(() => {
    if (loadAll) return null;
    const d = new Date();
    d.setDate(d.getDate() - DEFAULT_DAYS_BACK);
    return d.toISOString().slice(0, 10);
  }, [loadAll]);

  const { data: cargas = [], isLoading } = useQuery({
    queryKey: ['cargas_combustible_repartidor_all', fechaDesde],
    queryFn: async () => {
      let query = db
        .from('cargas_combustible_repartidor')
        .select(`
          id, parte_diario_id, fecha, litros, horas, km,
          operador_id, maquinaria_id, obra_id, tipo_operador, tipo_producto,
          repartidor_id, observaciones, numero_remito, created_at, updated_at,
          operador:personal!cargas_combustible_repartidor_operador_id_fkey(first_name, last_name),
          maquinaria:maquinarias!cargas_combustible_repartidor_maquinaria_id_fkey(codigo, tipo, nombre),
          obra:obras!cargas_combustible_repartidor_obra_id_fkey(nombre),
          parte_diario:partes_diarios!cargas_combustible_repartidor_parte_diario_id_fkey(
            personal:personal!partes_diarios_personal_company_fkey(first_name, last_name)
          ),
          repartidor:personal!cargas_combustible_repartidor_repartidor_id_fkey(first_name, last_name)
        `)
        .order('fecha', { ascending: false });

      if (fechaDesde) query = query.gte('fecha', fechaDesde);

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching all cargas repartidor:', error);
        throw error;
      }
      return (data || []).map((row: any) => ({
        ...row,
        operador: row.operador ? { nombre: row.operador.first_name, apellido: row.operador.last_name } : null,
        repartidor: row.repartidor ? { nombre: row.repartidor.first_name, apellido: row.repartidor.last_name } : null,
        parte_diario: row.parte_diario?.personal ? {
          personal: { nombre: row.parte_diario.personal.first_name, apellido: row.parte_diario.personal.last_name },
        } : null,
      })) as CargaRepartidorFull[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    enabled: Boolean(companyId),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!companyId) throw new Error('No hay empresa activa');
      const { data, error } = await db.from('cargas_combustible_repartidor')
        .insert({ company_id: companyId, ...payload }).select('id').single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargas_combustible_repartidor_all'] });
      toast.success('Entrega registrada');
    },
    onError: () => toast.error('Error al registrar entrega'),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const { error } = await db
        .from('cargas_combustible_repartidor')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargas_combustible_repartidor'] });
      queryClient.invalidateQueries({ queryKey: ['cargas_combustible_repartidor_all'] });
      toast.success('Entrega actualizada');
    },
    onError: () => toast.error('Error al actualizar entrega'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('cargas_combustible_repartidor')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargas_combustible_repartidor'] });
      queryClient.invalidateQueries({ queryKey: ['cargas_combustible_repartidor_all'] });
      toast.success('Entrega eliminada');
    },
    onError: () => toast.error('Error al eliminar entrega'),
  });

  const totalLitros = cargas.reduce((sum, c) => sum + (c.litros || 0), 0);

  return {
    cargas,
    isLoading,
    totalLitros,
    loadAll,
    cargarHistorico,
    createCarga: createMutation.mutateAsync,
    updateCarga: updateMutation.mutateAsync,
    deleteCarga: deleteMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

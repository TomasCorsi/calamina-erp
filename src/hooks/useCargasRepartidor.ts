import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const db = supabase as any;

export interface CargaRepartidor {
  id: string;
  parte_diario_id: string | null;
  fecha: string;
  operador_id: string | null;
  maquinaria_id: string | null;
  obra_id: string | null;
  litros: number;
  horas: number | null;
  km: number | null;
  tipo_operador: string | null;
  tipo_producto: string | null;
  repartidor_id: string | null;
  observaciones: string | null;
  tipo_movimiento?: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  operador?: { nombre: string | null; apellido: string | null } | null;
  maquinaria?: { codigo: string | null; tipo: string } | null;
  obra?: { nombre: string } | null;
  repartidor?: { nombre: string | null; apellido: string | null } | null;
}

export interface CargaRepartidorInsert {
  parte_diario_id?: string | null;
  fecha: string;
  operador_id?: string | null;
  maquinaria_id?: string | null;
  obra_id?: string | null;
  litros: number;
  horas?: number | null;
  km?: number | null;
  tipo_operador?: string | null;
  tipo_producto?: string | null;
  repartidor_id?: string | null;
  observaciones?: string | null;
  tipo_movimiento?: string | null;
}

const SELECT_QUERY = `
  *,
  operador:personal!cargas_combustible_repartidor_operador_id_fkey(first_name, last_name),
  maquinaria:maquinarias!cargas_combustible_repartidor_maquinaria_id_fkey(codigo, tipo),
  obra:obras!cargas_combustible_repartidor_obra_id_fkey(nombre),
  repartidor:personal!cargas_combustible_repartidor_repartidor_id_fkey(first_name, last_name)
`;

export function useCargasRepartidor(parteDiarioId: string | null, repartidorId?: string | null) {
  const queryClient = useQueryClient();
  const { membership } = useAuth();
  const companyId = membership?.company_id;
  const queryMode = parteDiarioId ? 'parte' : repartidorId ? 'repartidor' : 'none';
  const queryId = parteDiarioId || repartidorId || 'none';

  const { data: cargas = [], isLoading } = useQuery({
    queryKey: ['cargas_combustible_repartidor', queryMode, queryId],
    queryFn: async () => {
      let query = db
        .from('cargas_combustible_repartidor')
        .select(SELECT_QUERY);

      if (parteDiarioId) {
        query = query.eq('parte_diario_id', parteDiarioId);
      } else if (repartidorId) {
        query = query.eq('repartidor_id', repartidorId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cargas repartidor:', error);
        throw error;
      }

      return (data || []).map((row: any) => ({
        ...row,
        operador: row.operador ? { nombre: row.operador.first_name, apellido: row.operador.last_name } : null,
        repartidor: row.repartidor ? { nombre: row.repartidor.first_name, apellido: row.repartidor.last_name } : null,
      })) as CargaRepartidor[];
    },
    enabled: queryMode !== 'none' && Boolean(companyId),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: async (carga: CargaRepartidorInsert) => {
      if (!companyId) throw new Error('No hay empresa activa');
      const { data, error } = await db
        .from('cargas_combustible_repartidor')
        .insert({ company_id: companyId, ...carga })
        .select(SELECT_QUERY)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargas_combustible_repartidor'] });
      queryClient.invalidateQueries({ queryKey: ['cargas_combustible_repartidor_all'] });
      toast.success('Entrega registrada');
    },
    onError: (error) => {
      console.error('Error creating carga:', error);
      toast.error('Error al registrar entrega');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CargaRepartidorInsert> & { id: string }) => {
      const { data: updated, error } = await db
        .from('cargas_combustible_repartidor')
        .update(data)
        .eq('id', id)
        .select(SELECT_QUERY)
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cargas_combustible_repartidor'] });
      queryClient.invalidateQueries({ queryKey: ['cargas_combustible_repartidor_all'] });
      toast.success('Entrega actualizada');
    },
    onError: (error) => {
      console.error('Error updating carga:', error);
      toast.error('Error al actualizar carga');
    },
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
    onError: (error) => {
      console.error('Error deleting carga:', error);
      toast.error('Error al eliminar carga');
    },
  });

  const totalLitros = cargas.reduce((sum, c) => sum + (c.litros || 0), 0);
  const totalIngreso = cargas.filter((c) => c.tipo_movimiento === 'ingreso').reduce((s, c) => s + (c.litros || 0), 0);
  const totalEgreso = totalLitros - totalIngreso;

  return {
    cargas,
    isLoading,
    totalLitros,
    totalIngreso,
    totalEgreso,
    createCarga: createMutation.mutateAsync,
    updateCarga: updateMutation.mutateAsync,
    deleteCarga: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

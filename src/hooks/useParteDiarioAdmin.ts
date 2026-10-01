import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import type { ParteDiario } from './useParteDiario';

export interface ParteDiarioAdminFilters {
  empleadoId?: string;
  obraId?: string;
  estado?: 'borrador' | 'completado' | '';
  fechaDesde?: string;
  fechaHasta?: string;
}

export function useParteDiarioAdmin(filters: ParteDiarioAdminFilters = {}) {
  const queryClient = useQueryClient();

  const { data: partes = [], isLoading, error } = useQuery({
    queryKey: ['partes_diarios_admin', filters],
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      let query = supabase
        .from('partes_diarios')
        .select(`
          *,
          personal:personal_id (id, nombre, apellido, rol),
          obras:obra_id (id, nombre),
          maquinarias:maquinaria_id (id, codigo, tipo, patente)
        `)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(2000);

      if (filters.empleadoId) {
        query = query.eq('personal_id', filters.empleadoId);
      }
      if (filters.obraId) {
        query = query.eq('obra_id', filters.obraId);
      }
      if (filters.estado) {
        query = query.eq('estado', filters.estado);
      }
      if (filters.fechaDesde) {
        query = query.gte('fecha', filters.fechaDesde);
      }
      if (filters.fechaHasta) {
        query = query.lte('fecha', filters.fechaHasta);
      }
      // Default window: last 30 days if no date range provided
      if (!filters.fechaDesde && !filters.fechaHasta) {
        query = query.gte('fecha', format(subDays(new Date(), 30), 'yyyy-MM-dd'));
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ParteDiario[];
    },
  });

  // Update parte mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ParteDiario> }) => {
      const { error } = await supabase
        .from('partes_diarios')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partes_diarios_admin'] });
      queryClient.invalidateQueries({ queryKey: ['partes_diarios'] });
      toast.success('Parte diario actualizado');
    },
    onError: (error: Error) => {
      console.error('Error updating parte:', error);
      toast.error('Error al actualizar el parte diario');
    },
  });

  // Delete parte mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('partes_diarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partes_diarios_admin'] });
      queryClient.invalidateQueries({ queryKey: ['partes_diarios'] });
      toast.success('Parte diario eliminado');
    },
    onError: (error: Error) => {
      console.error('Error deleting parte:', error);
      toast.error('Error al eliminar el parte diario');
    },
  });

  return {
    partes,
    isLoading,
    error,
    updateParte: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deleteParte: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}

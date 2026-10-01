import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEmpleadoProfile } from './useEmpleadoProfile';
import { useOfflineQueue } from './useOfflineQueue';
import { useNetworkStatus } from './useNetworkStatus';
import { format } from 'date-fns';

export interface ParteDiario {
  id: string;
  fecha: string;
  personal_id: string;
  obra_id: string | null;
  maquinaria_id: string | null;
  hora_entrada: string | null;
  hora_salida: string | null;
  horometro_inicio: number;
  horometro_fin: number;
  cantidad_viajes: number;
  km_camion: number;
  cantidad_movimiento_interno: number;
  combustible: number;
  estado_maquina: 'OK' | 'OBSERVACION' | null;
  observacion_maquina: string | null;
  check_filtro_aire: boolean;
  check_aceite_hidraulico: boolean;
  check_aceite_motor: boolean;
  check_liquido_refrigerante: boolean;
  check_uria: boolean;
  estado: 'borrador' | 'completado';
  // New role-specific fields
  novedades: string | null;
  ausencias: string[] | null;
  tareas: string | null;
  observaciones_inconvenientes: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  personal?: {
    id: string;
    nombre: string | null;
    apellido: string | null;
    rol: string;
  };
  obras?: {
    id: string;
    nombre: string;
  } | null;
  maquinarias?: {
    id: string;
    codigo: string | null;
    tipo: string;
    patente: string | null;
  } | null;
}

export interface ParteDiarioInsert {
  fecha: string;
  personal_id: string;
  obra_id?: string | null;
  maquinaria_id?: string | null;
  hora_entrada?: string | null;
  hora_salida?: string | null;
  horometro_inicio?: number;
  horometro_fin?: number;
  cantidad_viajes?: number;
  km_camion?: number;
  cantidad_movimiento_interno?: number;
  combustible?: number;
  estado_maquina?: 'OK' | 'OBSERVACION' | null;
  observacion_maquina?: string | null;
  check_filtro_aire?: boolean;
  check_aceite_hidraulico?: boolean;
  check_aceite_motor?: boolean;
  check_liquido_refrigerante?: boolean;
  check_uria?: boolean;
  estado?: 'borrador' | 'completado';
  // New role-specific fields
  novedades?: string | null;
  ausencias?: string[] | null;
  tareas?: string | null;
  observaciones_inconvenientes?: string | null;
}

export function useParteDiario() {
  const queryClient = useQueryClient();
  const { empleado } = useEmpleadoProfile();
  const { isOnline } = useNetworkStatus();
  const { enqueueOfflineParte } = useOfflineQueue();
  const fechaHoy = format(new Date(), 'yyyy-MM-dd');
  const fechaDesde = format(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

  // Fetch partes for the current employee (last 90 days)
  const { data: partes = [], isLoading, error } = useQuery({
    queryKey: ['partes_diarios', empleado?.id],
    enabled: !!empleado?.id,
    retry: false,
    networkMode: 'offlineFirst',
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partes_diarios')
        .select(`
          *,
          personal:personal_id (id, nombre, apellido, rol),
          obras:obra_id (id, nombre),
          maquinarias:maquinaria_id (id, codigo, tipo, patente)
        `)
        .eq('personal_id', empleado!.id)
        .gte('fecha', fechaDesde)
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as ParteDiario[];
    },
  });

  // Derive today's partes from the already-fetched list (no extra network call)
  const partesHoy = useMemo(
    () => partes.filter(p => p.fecha === fechaHoy),
    [partes, fechaHoy]
  );
  const isLoadingParteHoy = isLoading;

  // Derived: first draft found today (for "continue draft" flow)
  const borradorHoy = partesHoy.find(p => p.estado === 'borrador') || null;
  
  // Derived: all completed partes today
  const partesCompletadosHoy = partesHoy.filter(p => p.estado === 'completado');
  
  // Legacy compat: single parteHoy (first one)
  const parteHoy = partesHoy.length > 0 ? partesHoy[0] : null;
  
  // Legacy compat
  const parteCompletadoHoy = partesCompletadosHoy.length > 0 ? partesCompletadosHoy[0] : null;

  // Create new parte
  const createMutation = useMutation({
    mutationFn: async (parte: ParteDiarioInsert) => {
      const { data, error } = await supabase
        .from('partes_diarios')
        .insert(parte)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['partes_diarios'] });
      queryClient.invalidateQueries({ queryKey: ['parte_hoy'] });
      const isComplete = variables.estado === 'completado';
      toast.success(isComplete ? 'Parte completado exitosamente' : 'Borrador guardado');
    },
    onError: (error: Error) => {
      console.error('Error creating parte:', error);
      toast.error('Error al guardar el parte diario');
    },
  });

  // Update existing parte
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ParteDiario> & { id: string }) => {
      const { data, error } = await supabase
        .from('partes_diarios')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['partes_diarios'] });
      queryClient.invalidateQueries({ queryKey: ['parte_hoy'] });
      const isComplete = variables.estado === 'completado';
      toast.success(isComplete ? 'Parte completado exitosamente' : 'Borrador actualizado');
    },
    onError: (error: Error) => {
      console.error('Error updating parte:', error);
      toast.error('Error al actualizar el parte diario');
    },
  });

  // Delete parte
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('partes_diarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partes_diarios'] });
      queryClient.invalidateQueries({ queryKey: ['parte_hoy'] });
      toast.success('Parte eliminado');
    },
    onError: (error: Error) => {
      console.error('Error deleting parte:', error);
      toast.error('Error al eliminar el parte diario');
    },
  });

  // Find existing parte for a specific machine today
  const findParteForMachine = (maquinariaId: string | null) => {
    if (!maquinariaId) {
      // For roles without machine, find any parte today
      return partesHoy[0] || null;
    }
    return partesHoy.find(p => p.maquinaria_id === maquinariaId) || null;
  };

  // Save as draft - finds matching parte by machine to prevent duplicates
  const saveDraft = async (data: ParteDiarioInsert, editingParteId?: string) => {
    const parteData = { ...data, estado: 'borrador' as const };
    
    // Offline: queue locally
    if (!isOnline) {
      enqueueOfflineParte(parteData);
      return;
    }

    if (editingParteId) {
      await updateMutation.mutateAsync({ id: editingParteId, ...parteData });
    } else {
      const existing = findParteForMachine(data.maquinaria_id || null);
      if (existing) {
        await updateMutation.mutateAsync({ id: existing.id, ...parteData });
      } else {
        await createMutation.mutateAsync(parteData);
      }
    }
  };

  // Complete parte - finds matching parte by machine to prevent duplicates
  const completeParte = async (data: ParteDiarioInsert, editingParteId?: string) => {
    const parteData = { ...data, estado: 'completado' as const };
    
    // Offline: queue locally
    if (!isOnline) {
      enqueueOfflineParte(parteData);
      return;
    }

    if (editingParteId) {
      await updateMutation.mutateAsync({ id: editingParteId, ...parteData });
    } else {
      const existing = findParteForMachine(data.maquinaria_id || null);
      if (existing) {
        await updateMutation.mutateAsync({ id: existing.id, ...parteData });
      } else {
        await createMutation.mutateAsync(parteData);
      }
    }
  };

  // Discard draft
  const discardDraft = async () => {
    if (borradorHoy) {
      await deleteMutation.mutateAsync(borradorHoy.id);
    }
  };

  return {
    partes,
    parteHoy,
    partesHoy,
    borradorHoy,
    parteCompletadoHoy,
    partesCompletadosHoy,
    isLoading,
    isLoadingParteHoy,
    error,
    createParte: createMutation.mutateAsync,
    updateParte: updateMutation.mutateAsync,
    deleteParte: deleteMutation.mutateAsync,
    saveDraft,
    completeParte,
    discardDraft,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSaving: createMutation.isPending || updateMutation.isPending,
  };
}

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type PersonalRow = Database['public']['Tables']['personal']['Row'];
type RolPersonal = Database['public']['Enums']['rol_personal'];

interface EmpleadoProfile extends PersonalRow {
  nombreCompleto: string;
}

export function useEmpleadoProfile() {
  const { user } = useAuth();
  const [empleado, setEmpleado] = useState<EmpleadoProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id ?? null;
  const legajo = user?.user_metadata?.legajo ? String(user.user_metadata.legajo).trim() : null;

  useEffect(() => {
    if (!userId) {
      setEmpleado(null);
      setLoading(false);
      return;
    }

    // 1. Hydrate from cache IMMEDIATELY
    try {
      const cached = localStorage.getItem(`offline_cache_empleado_${userId}`);
      if (cached) {
        setEmpleado(JSON.parse(cached));
        setError(null);
      }
    } catch {}

    const fetchAndLinkEmpleado = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // First try to find by user_id (already linked)
        let { data, error: fetchError } = await supabase
          .from('personal')
          .select('*')
          .eq('user_id', userId!)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching empleado profile:', fetchError);
          setError('Error al cargar perfil de empleado');
          setLoading(false);
          return;
        }

        // If not found by user_id, try to auto-link using legajo from user metadata
        if (!data) {
          if (legajo) {
            console.log('Attempting auto-link for legajo:', legajo, 'user_id:', user.id);
            
            const { data: linkResult, error: linkError } = await supabase
              .rpc('link_personal_to_user', {
                p_legajo: String(legajo).trim(),
                p_user_id: userId
              });

            console.log('Link result:', linkResult, 'Error:', linkError);

            if (!linkError && linkResult && linkResult.length > 0 && linkResult[0].success) {
              console.log('Successfully auto-linked personal record via RPC');
              
              const { data: linkedData } = await supabase
                .from('personal')
                .select('*')
                 .eq('user_id', userId)
                .maybeSingle();
              
              data = linkedData;
            } else if (linkError) {
              console.error('Failed to auto-link personal record:', linkError);
            } else if (linkResult?.[0]?.error_message) {
              console.log('Auto-link not possible:', linkResult[0].error_message);
            }
          } else {
            console.log('No legajo found in user metadata:', user.user_metadata);
          }
        }

        if (data) {
          const profile = {
            ...data,
            nombreCompleto: `${data.nombre || ''} ${data.apellido || ''}`.trim(),
          };
          setEmpleado(profile);
          try { localStorage.setItem(`offline_cache_empleado_${userId}`, JSON.stringify(profile)); } catch {}
        } else {
          setEmpleado(null);
        }
      } catch (err) {
        console.error('Error in fetchAndLinkEmpleado:', err);
        // Offline fallback (cache already hydrated above, but try again in case)
        try {
          const cached = localStorage.getItem(`offline_cache_empleado_${userId}`);
          if (cached) {
            setEmpleado(JSON.parse(cached));
            setError(null);
          } else {
            setError('Error al cargar perfil');
          }
        } catch {
          setError('Error al cargar perfil');
        }
      } finally {
        setLoading(false);
      }
    };

    // Race the fetch against a 3s timeout — if offline, cache is already in state
    const raceWithTimeout = Promise.race([
      fetchAndLinkEmpleado(),
      new Promise<void>((resolve) => setTimeout(() => {
        setLoading(false);
        resolve();
      }, 3000)),
    ]);

    raceWithTimeout;
  }, [userId, legajo]);

  const rolPersonal: RolPersonal | null = empleado?.rol || null;

  // Un empleado de campo es cualquier usuario que NO es admin
  // Se usa para restringir el acceso solo a Parte Diario
  const isFieldEmployee = empleado !== null;

  return {
    empleado,
    loading,
    error,
    rolPersonal,
    isFieldEmployee, // true si solo debe ver Parte Diario
    isMaquinista: rolPersonal === 'maquinista',
    isChofer: rolPersonal === 'chofer',
    isCapataz: rolPersonal === 'capataz',
    isMecanico: rolPersonal === 'mecanico',
    isSereno: rolPersonal === 'sereno',
    isTopografo: rolPersonal === 'topografo',
    isAyudante: rolPersonal === 'ayudante',
    isAdministrativo: rolPersonal === 'administrativo',
    isRepartidorCalecita: rolPersonal === 'repartidor_calecita',
  };
}

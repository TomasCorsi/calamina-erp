import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export type RolPersonal = 'maquinista' | 'chofer' | 'capataz' | 'mecanico' | 'sereno' | 'topografo' | 'ayudante' | 'administrativo';

export interface EmpleadoResumen {
  id: string;
  nombre: string | null;
  apellido: string | null;
  rol: RolPersonal;
  legajo: string | null;
  partesCompletados: number;
  partesBorrador: number;
  horasMaquinaTotales: number;
  viajesTotales: number;
  movimientoInternoTotal: number;
  combustibleTotal: number;
  checklistCumplimiento: number;
}

export interface ResumenGeneralData {
  empleados: EmpleadoResumen[];
  totales: {
    totalEmpleados: number;
    totalPartesCompletados: number;
    totalPartesBorrador: number;
    totalHorasMaquina: number;
    totalViajes: number;
    totalMovimientoInterno: number;
    totalCombustible: number;
    promedioChecklist: number;
  };
}

function calculateChecklistCumplimiento(partes: any[], rol: RolPersonal): number {
  if (partes.length === 0) return 0;
  
  let totalChecks = 0;
  let checksCompletos = 0;
  
  partes.forEach(parte => {
    if (rol === 'maquinista') {
      totalChecks += 4;
      if (parte.check_filtro_aire) checksCompletos++;
      if (parte.check_aceite_motor) checksCompletos++;
      if (parte.check_aceite_hidraulico) checksCompletos++;
      if (parte.check_liquido_refrigerante) checksCompletos++;
    } else if (rol === 'chofer') {
      totalChecks += 3;
      if (parte.check_aceite_motor) checksCompletos++;
      if (parte.check_liquido_refrigerante) checksCompletos++;
      if (parte.check_uria) checksCompletos++;
    }
  });
  
  if (totalChecks === 0) return 100;
  return Math.round((checksCompletos / totalChecks) * 100);
}

export function useParteDiarioResumenGeneral(
  fechaDesde: Date,
  fechaHasta: Date,
  obraId?: string
) {
  const desdeStr = format(fechaDesde, 'yyyy-MM-dd');
  const hastaStr = format(fechaHasta, 'yyyy-MM-dd');
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['partes_diarios_resumen_general', desdeStr, hastaStr, obraId || 'all'],
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      let partesQuery = supabase
        .from('partes_diarios')
        .select('personal_id, obra_id, estado, horometro_inicio, horometro_fin, cantidad_viajes, cantidad_movimiento_interno, combustible, check_filtro_aire, check_aceite_motor, check_aceite_hidraulico, check_liquido_refrigerante, check_uria')
        .gte('fecha', desdeStr)
        .lte('fecha', hastaStr);

      if (obraId) {
        partesQuery = partesQuery.eq('obra_id', obraId);
      }

      const [empleadosRes, partesRes] = await Promise.all([
        supabase
          .from('personal_selector' as any)
          .select('id, nombre, apellido, rol, legajo')
          .eq('activo', true)
          .order('apellido') as unknown as Promise<{ data: { id: string; nombre: string | null; apellido: string | null; rol: string; legajo: string | null }[] | null; error: any }>,
        partesQuery,
      ]);

      if (empleadosRes.error) throw empleadosRes.error;
      if (partesRes.error) throw partesRes.error;

      const empleadosData = empleadosRes.data;
      const partesData = partesRes.data;
      
      const partesPorEmpleado = new Map<string, any[]>();
      partesData?.forEach(parte => {
        const current = partesPorEmpleado.get(parte.personal_id) || [];
        current.push(parte);
        partesPorEmpleado.set(parte.personal_id, current);
      });
      
      const empleados: EmpleadoResumen[] = (empleadosData || []).map(emp => {
        const partes = partesPorEmpleado.get(emp.id) || [];
        const partesCompletados = partes.filter(p => p.estado === 'completado').length;
        const partesBorrador = partes.filter(p => p.estado === 'borrador').length;
        
        const horasMaquinaTotales = partes.reduce((sum, p) => {
          const horasM = (p.horometro_fin || 0) - (p.horometro_inicio || 0);
          return sum + Math.max(0, horasM);
        }, 0);
        
        const viajesTotales = partes.reduce((sum, p) => sum + (p.cantidad_viajes || 0), 0);
        const movimientoInternoTotal = partes.reduce((sum, p) => sum + (p.cantidad_movimiento_interno || 0), 0);
        const combustibleTotal = partes.reduce((sum, p) => sum + (p.combustible || 0), 0);
        const checklistCumplimiento = calculateChecklistCumplimiento(partes, emp.rol as RolPersonal);
        
        return {
          id: emp.id,
          nombre: emp.nombre,
          apellido: emp.apellido,
          rol: emp.rol as RolPersonal,
          legajo: emp.legajo,
          partesCompletados,
          partesBorrador,
          horasMaquinaTotales,
          viajesTotales,
          movimientoInternoTotal,
          combustibleTotal,
          checklistCumplimiento,
        };
      });
      
      const empleadosConPartes = empleados.filter(
        e => e.partesCompletados > 0 || e.partesBorrador > 0
      );
      
      const totales = {
        totalEmpleados: empleadosConPartes.length,
        totalPartesCompletados: empleadosConPartes.reduce((sum, e) => sum + e.partesCompletados, 0),
        totalPartesBorrador: empleadosConPartes.reduce((sum, e) => sum + e.partesBorrador, 0),
        totalHorasMaquina: empleadosConPartes.reduce((sum, e) => sum + e.horasMaquinaTotales, 0),
        totalViajes: empleadosConPartes.reduce((sum, e) => sum + e.viajesTotales, 0),
        totalMovimientoInterno: empleadosConPartes.reduce((sum, e) => sum + e.movimientoInternoTotal, 0),
        totalCombustible: empleadosConPartes.reduce((sum, e) => sum + e.combustibleTotal, 0),
        promedioChecklist: empleadosConPartes.length > 0
          ? Math.round(empleadosConPartes.reduce((sum, e) => sum + e.checklistCumplimiento, 0) / empleadosConPartes.length)
          : 0,
      };
      
      return {
        empleados: empleadosConPartes,
        totales,
      } as ResumenGeneralData;
    },
  });
  
  return {
    data: data || {
      empleados: [],
      totales: {
        totalEmpleados: 0,
        totalPartesCompletados: 0,
        totalPartesBorrador: 0,
        totalHorasMaquina: 0,
        totalViajes: 0,
        totalMovimientoInterno: 0,
        totalCombustible: 0,
        promedioChecklist: 0,
      },
    },
    isLoading,
    error,
  };
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { eachDayOfInterval, format } from 'date-fns';
import type { ParteDiario } from './useParteDiario';

export type RolPersonal = 'maquinista' | 'chofer' | 'capataz' | 'mecanico' | 'sereno' | 'topografo' | 'ayudante' | 'administrativo';

export interface EmpleadoRendimiento {
  id: string;
  nombre: string | null;
  apellido: string | null;
  rol: RolPersonal;
  legajo: string | null;
}

export interface DiaRendimiento {
  dia: number;
  fecha: string;
  tieneParte: boolean;
  horasTrabajadas: number;
  horasMaquina: number;
  viajes: number;
  movimientoInterno: number;
  combustible: number;
  estado: 'borrador' | 'completado' | null;
}

export interface TotalesRendimiento {
  partesCompletados: number;
  partesBorrador: number;
  diasTrabajados: number;
  horasMaquinaTotales: number;
  viajesTotales: number;
  movimientoInternoTotal: number;
  combustibleTotal: number;
  checklistCumplimiento: number;
}

export interface RendimientoData {
  empleado: EmpleadoRendimiento | null;
  partes: ParteDiario[];
  diasDelMes: DiaRendimiento[];
  totales: TotalesRendimiento;
}

function calculateHorasTrabajadas(horaEntrada: string | null, horaSalida: string | null): number {
  if (!horaEntrada || !horaSalida) return 0;
  
  const [entradaH, entradaM] = horaEntrada.split(':').map(Number);
  const [salidaH, salidaM] = horaSalida.split(':').map(Number);
  
  const entradaMinutos = entradaH * 60 + entradaM;
  const salidaMinutos = salidaH * 60 + salidaM;
  
  const diffMinutos = salidaMinutos - entradaMinutos;
  return Math.max(0, diffMinutos / 60);
}

function calculateChecklistCumplimiento(partes: ParteDiario[], rol: RolPersonal): number {
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

export function useParteDiarioRendimiento(
  empleadoId: string | undefined,
  fechaDesde: Date,
  fechaHasta: Date,
  obraId?: string
) {
  const desdeStr = format(fechaDesde, 'yyyy-MM-dd');
  const hastaStr = format(fechaHasta, 'yyyy-MM-dd');
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['partes_diarios_rendimiento', empleadoId, desdeStr, hastaStr, obraId || 'all'],
    enabled: !!empleadoId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      let partesQuery = supabase
        .from('partes_diarios')
        .select(`
          *,
          personal:personal_id (id, nombre, apellido, rol),
          obras:obra_id (id, nombre),
          maquinarias:maquinaria_id (id, codigo, tipo, patente)
        `)
        .eq('personal_id', empleadoId!)
        .gte('fecha', desdeStr)
        .lte('fecha', hastaStr)
        .order('fecha', { ascending: true });

      if (obraId) {
        partesQuery = partesQuery.eq('obra_id', obraId);
      }

      const [empleadoRes, partesRes] = await Promise.all([
        supabase
          .from('personal_selector' as any)
          .select('id, nombre, apellido, rol, legajo')
          .eq('id', empleadoId!)
          .single() as unknown as Promise<{ data: EmpleadoRendimiento | null; error: any }>,
        partesQuery,
      ]);

      if (empleadoRes.error) throw empleadoRes.error;
      if (partesRes.error) throw partesRes.error;

      const partes = partesRes.data as unknown as ParteDiario[];
      const empleado = empleadoRes.data as EmpleadoRendimiento;
      
      const diasIntervalo = eachDayOfInterval({ start: fechaDesde, end: fechaHasta });
      
      const partesPorFecha = new Map<string, ParteDiario>();
      partes.forEach(parte => {
        partesPorFecha.set(parte.fecha, parte);
      });
      
      const diasDelMes: DiaRendimiento[] = diasIntervalo.map(dia => {
        const fechaStr = format(dia, 'yyyy-MM-dd');
        const parte = partesPorFecha.get(fechaStr);
        
        if (!parte) {
          return {
            dia: dia.getDate(),
            fecha: fechaStr,
            tieneParte: false,
            horasTrabajadas: 0,
            horasMaquina: 0,
            viajes: 0,
            movimientoInterno: 0,
            combustible: 0,
            estado: null,
          };
        }
        
        const horasTrabajadas = calculateHorasTrabajadas(parte.hora_entrada, parte.hora_salida);
        const horasMaquina = (parte.horometro_fin || 0) - (parte.horometro_inicio || 0);
        
        return {
          dia: dia.getDate(),
          fecha: fechaStr,
          tieneParte: true,
          horasTrabajadas,
          horasMaquina: Math.max(0, horasMaquina),
          viajes: parte.cantidad_viajes || 0,
          movimientoInterno: parte.cantidad_movimiento_interno || 0,
          combustible: parte.combustible || 0,
          estado: parte.estado as 'borrador' | 'completado',
        };
      });
      
      const partesCompletados = partes.filter(p => p.estado === 'completado').length;
      const partesBorrador = partes.filter(p => p.estado === 'borrador').length;
      
      const totales: TotalesRendimiento = {
        partesCompletados,
        partesBorrador,
        diasTrabajados: diasDelMes.filter(d => d.tieneParte && d.estado === 'completado').length,
        horasMaquinaTotales: diasDelMes.reduce((sum, d) => sum + d.horasMaquina, 0),
        viajesTotales: diasDelMes.reduce((sum, d) => sum + d.viajes, 0),
        movimientoInternoTotal: diasDelMes.reduce((sum, d) => sum + d.movimientoInterno, 0),
        combustibleTotal: diasDelMes.reduce((sum, d) => sum + d.combustible, 0),
        checklistCumplimiento: calculateChecklistCumplimiento(partes, empleado.rol),
      };
      
      return {
        empleado,
        partes,
        diasDelMes,
        totales,
      } as RendimientoData;
    },
  });
  
  return {
    data: data || {
      empleado: null,
      partes: [],
      diasDelMes: [],
      totales: {
        partesCompletados: 0,
        partesBorrador: 0,
        diasTrabajados: 0,
        horasMaquinaTotales: 0,
        viajesTotales: 0,
        movimientoInternoTotal: 0,
        combustibleTotal: 0,
        checklistCumplimiento: 0,
      },
    },
    isLoading,
    error,
  };
}

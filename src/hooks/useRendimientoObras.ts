import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ObraRendimiento {
  obraId: string;
  obraNombre: string;
  obraNumero: string | null;
  totalPartes: number;
  partesCompletados: number;
  partesBorradores: number;
  horasMaquina: number;
  viajesTotal: number;
  movimientoInterno: number;
  combustibleTotal: number;
  empleadosUnicos: Set<string>;
  empleados: Map<string, EmpleadoRendimiento>;
  tareasUnicas: Set<string>;
}

export interface EmpleadoRendimiento {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
  partes: number;
  horasMaquina: number;
  viajes: number;
  movimientoInterno: number;
  combustible: number;
}

export interface RendimientoObrasData {
  porObra: ObraRendimiento[];
  totales: {
    partes: number;
    horasMaquina: number;
    viajes: number;
    combustible: number;
  };
}

export function useRendimientoObras(fechaDesde: string, fechaHasta: string) {
  return useQuery({
    queryKey: ['rendimiento_obras', fechaDesde, fechaHasta],
    queryFn: async (): Promise<RendimientoObrasData> => {
      const batchSize = 1000;
      let from = 0;
      let allPartes: any[] = [];

      while (true) {
        const { data, error } = await supabase
          .from('partes_diarios')
          .select(`
            *,
            personal:personal_id (id, nombre, apellido, rol),
            obras:obra_id (id, nombre, numero)
          `)
          .gte('fecha', fechaDesde)
          .lte('fecha', fechaHasta)
          .not('obra_id', 'is', null)
          .range(from, from + batchSize - 1);

        if (error) throw error;
        const batch = data ?? [];
        allPartes = [...allPartes, ...batch];
        if (batch.length < batchSize) break;
        from += batchSize;
      }

      // Group by obra
      const obrasMap = new Map<string, ObraRendimiento>();

      for (const parte of allPartes) {
        const obraId = parte.obra_id;
        if (!obraId) continue;

        if (!obrasMap.has(obraId)) {
          obrasMap.set(obraId, {
            obraId,
            obraNombre: parte.obras?.nombre || 'Sin nombre',
            obraNumero: parte.obras?.numero || null,
            totalPartes: 0,
            partesCompletados: 0,
            partesBorradores: 0,
            horasMaquina: 0,
            viajesTotal: 0,
            movimientoInterno: 0,
            combustibleTotal: 0,
            empleadosUnicos: new Set(),
            empleados: new Map(),
            tareasUnicas: new Set(),
          });
        }

        const obra = obrasMap.get(obraId)!;
        obra.totalPartes++;
        if (parte.estado === 'completado') obra.partesCompletados++;
        else obra.partesBorradores++;

        const hsMaq = Math.max((parte.horometro_fin || 0) - (parte.horometro_inicio || 0), 0);
        const viajes = parte.cantidad_viajes || 0;
        const movInt = parte.cantidad_movimiento_interno || 0;
        const combustible = parte.combustible || 0;

        obra.horasMaquina += hsMaq;
        obra.viajesTotal += viajes;
        obra.movimientoInterno += movInt;
        obra.combustibleTotal += combustible;

        if (parte.personal_id) {
          obra.empleadosUnicos.add(parte.personal_id);

          const empId = parte.personal_id;
          if (!obra.empleados.has(empId)) {
            obra.empleados.set(empId, {
              id: empId,
              nombre: parte.personal?.nombre || '',
              apellido: parte.personal?.apellido || '',
              rol: parte.personal?.rol || '',
              partes: 0,
              horasMaquina: 0,
              viajes: 0,
              movimientoInterno: 0,
              combustible: 0,
            });
          }
          const emp = obra.empleados.get(empId)!;
          emp.partes++;
          emp.horasMaquina += hsMaq;
          emp.viajes += viajes;
          emp.movimientoInterno += movInt;
          emp.combustible += combustible;
        }

        if (parte.tareas) {
          parte.tareas.split(/[,;\n]/).forEach((t: string) => {
            const trimmed = t.trim();
            if (trimmed) obra.tareasUnicas.add(trimmed);
          });
        }
      }

      const porObra = Array.from(obrasMap.values()).sort((a, b) => b.totalPartes - a.totalPartes);

      const totales = {
        partes: allPartes.length,
        horasMaquina: porObra.reduce((s, o) => s + o.horasMaquina, 0),
        viajes: porObra.reduce((s, o) => s + o.viajesTotal, 0),
        combustible: porObra.reduce((s, o) => s + o.combustibleTotal, 0),
      };

      return { porObra, totales };
    },
    enabled: !!fechaDesde && !!fechaHasta,
  });
}

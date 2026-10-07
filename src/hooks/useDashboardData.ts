import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface ObraWithRelations {
  id: string;
  nombre: string;
  ubicacion: string | null;
  estado: "activa" | "pendiente" | "finalizada" | "pausada";
  fecha_inicio: string | null;
  responsable?: { nombre: string; apellido: string } | null;
}

interface MaquinariaWithRelations {
  id: string;
  nombre: string | null;
  codigo: string | null;
  tipo: string;
  estado: "operativa" | "mantenimiento" | "inactiva" | "en_uso";
  horas_acumuladas: number;
  obra?: { nombre: string } | null;
}

interface CotizacionPendiente {
  id: string;
  numero: string;
  descripcion: string;
  total: number;
  fecha_vencimiento: string;
  obra?: { nombre: string } | null;
}

interface ViajesPorDia {
  dia: string;
  viajes: number;
  volumen: number;
}

interface DashboardStats {
  obrasActivas: number;
  maquinariasTotal: number;
  maquinariasOperativas: number;
  viajesHoy: number;
  volumenHoy: number;
  cotizacionesPendientes: number;
  personalActivo: number;
  facturacionMes: number;
}

interface DashboardData {
  stats: DashboardStats;
  obrasRecientes: ObraWithRelations[];
  maquinarias: MaquinariaWithRelations[];
  cotizaciones: CotizacionPendiente[];
  viajesSemana: ViajesPorDia[];
}

const fetchDashboardDataFromDB = async (): Promise<DashboardData> => {
  const today = format(new Date(), "yyyy-MM-dd");
  const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const endOfCurrentWeek = endOfWeek(new Date(), { weekStartsOn: 1 });

  // Fetch all data in parallel
  const [
    obrasResult,
    maquinariasResult,
    viajesHoyResult,
    viajesSemanaResult,
    cotizacionesResult,
    personalResult,
    combustibleResult,
  ] = await Promise.all([
    // Obras recientes
    supabase
      .from("obras")
      .select("id, nombre, ubicacion, estado, fecha_inicio, responsable:personal(nombre, apellido)")
      .order("created_at", { ascending: false })
      .limit(5),
    
    // Maquinarias
    supabase
      .from("maquinarias")
      .select("id, nombre, codigo, tipo, estado, horas_acumuladas, obra:obras(nombre)")
      .order("nombre"),
    
    // Viajes de hoy
    supabase
      .from("viajes")
      .select("id, volumen")
      .eq("fecha", today),
    
    // Viajes de la semana
    supabase
      .from("viajes")
      .select("fecha, volumen")
      .gte("fecha", format(startOfCurrentWeek, "yyyy-MM-dd"))
      .lte("fecha", format(endOfCurrentWeek, "yyyy-MM-dd")),
    
    // Cotizaciones pendientes
    supabase
      .from("cotizaciones")
      .select("id, numero, descripcion, total, fecha_vencimiento, obra:obras(nombre)")
      .in("estado", ["borrador", "enviada"])
      .order("fecha_vencimiento", { ascending: true })
      .limit(5),
    
    // Personal activo
    supabase
      .from("personal_selector" as any)
      .select("id")
      .eq("activo", true) as any,
    
    // Facturación del mes (cotizaciones aprobadas)
    supabase
      .from("cotizaciones")
      .select("total")
      .eq("estado", "aprobada"),
  ]);

  // Process viajes de la semana
  const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const viajesSemana: ViajesPorDia[] = diasSemana.map((dia, index) => {
    const fechaDia = format(
      new Date(startOfCurrentWeek.getTime() + index * 24 * 60 * 60 * 1000),
      "yyyy-MM-dd"
    );
    const viajesDelDia = viajesSemanaResult.data?.filter(
      (v: any) => v.fecha === fechaDia
    ) || [];
    return {
      dia,
      viajes: viajesDelDia.length,
      volumen: viajesDelDia.reduce((sum: number, v: any) => sum + (v.volumen || 0), 0),
    };
  });

  // Calculate stats
  const obrasActivas = obrasResult.data?.filter((o: any) => o.estado === "activa").length || 0;
  const maquinariasTotal = maquinariasResult.data?.length || 0;
  const maquinariasOperativas = maquinariasResult.data?.filter(
    (m: any) => m.estado === "operativa" || m.estado === "en_uso"
  ).length || 0;
  const viajesHoy = viajesHoyResult.data?.length || 0;
  const volumenHoy = viajesHoyResult.data?.reduce((sum: number, v: any) => sum + (v.volumen || 0), 0) || 0;
  const cotizacionesPendientes = cotizacionesResult.data?.length || 0;
  const personalActivo = personalResult.data?.length || 0;
  const facturacionMes = combustibleResult.data?.reduce((sum: number, c: any) => sum + (c.total || 0), 0) || 0;

  return {
    stats: {
      obrasActivas,
      maquinariasTotal,
      maquinariasOperativas,
      viajesHoy,
      volumenHoy,
      cotizacionesPendientes,
      personalActivo,
      facturacionMes,
    },
    obrasRecientes: obrasResult.data as ObraWithRelations[] || [],
    maquinarias: maquinariasResult.data as MaquinariaWithRelations[] || [],
    cotizaciones: cotizacionesResult.data as CotizacionPendiente[] || [],
    viajesSemana,
  };
};

export function useDashboardData() {
  const { 
    data,
    isLoading: loading,
    refetch 
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardDataFromDB,
    refetchOnWindowFocus: true, // Dashboard sí recarga al volver (datos críticos)
  });

  return {
    loading,
    stats: data?.stats || {
      obrasActivas: 0,
      maquinariasTotal: 0,
      maquinariasOperativas: 0,
      viajesHoy: 0,
      volumenHoy: 0,
      cotizacionesPendientes: 0,
      personalActivo: 0,
      facturacionMes: 0,
    },
    obrasRecientes: data?.obrasRecientes || [],
    maquinarias: data?.maquinarias || [],
    cotizaciones: data?.cotizaciones || [],
    viajesSemana: data?.viajesSemana || [],
    refetch,
  };
}

// Reportes data hook
interface ReportesData {
  obras: any[];
  maquinarias: any[];
  viajes: any[];
  combustible: any[];
  mantenimientos: any[];
}

const fetchReportesDataFromDB = async (): Promise<ReportesData> => {
  const [obrasResult, maquinariasResult, mantenimientosResult, combustibleResult, preciosResult] = await Promise.all([
    supabase.from("obras").select("id,nombre,numero,estado,ubicacion,fecha_inicio,fecha_fin_estimada"),
    supabase.from("maquinarias").select("id, nombre, codigo, tipo, estado, obra_id"),
    supabase.from("mantenimientos").select("id, fecha, costo_total, maquinaria_id, maquinaria:maquinarias(obra_id)"),
    supabase.from("cargas_combustible_repartidor").select("obra_id,fecha,litros,tipo_producto").eq("tipo_movimiento", "egreso"),
    supabase.from("precios_productos_mes").select("anio,mes,producto,precio_unitario"),
  ]);

  for (const result of [obrasResult, maquinariasResult, mantenimientosResult, combustibleResult, preciosResult]) {
    if (result.error) throw result.error;
  }

  const precios = new Map<string, number>();
  (preciosResult.data || []).forEach((precio: any) => {
    precios.set(`${precio.anio}-${String(precio.mes).padStart(2, "0")}|${precio.producto}`, Number(precio.precio_unitario) || 0);
  });
  const combustible = (combustibleResult.data || []).map((carga: any) => ({
    ...carga,
    costo_total:
      (Number(carga.litros) || 0) *
      (precios.get(`${String(carga.fecha).slice(0, 7)}|${carga.tipo_producto || "combustible"}`) || 0),
  }));

  return {
    obras: obrasResult.data || [],
    maquinarias: maquinariasResult.data || [],
    viajes: [],
    combustible,
    mantenimientos: mantenimientosResult.data || [],
  };
};

export function useReportesData() {
  const { 
    data,
    isLoading: loading,
    refetch 
  } = useQuery({
    queryKey: ['reportes'],
    queryFn: fetchReportesDataFromDB,
  });

  return {
    loading,
    obras: data?.obras || [],
    maquinarias: data?.maquinarias || [],
    viajes: data?.viajes || [],
    combustible: data?.combustible || [],
    mantenimientos: data?.mantenimientos || [],
    refetch,
  };
}

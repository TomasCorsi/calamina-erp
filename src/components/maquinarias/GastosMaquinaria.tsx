import { useState, useMemo } from "react";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Fuel, Truck, Wrench, Calendar, DollarSign, Download, FileText, ChevronDown, AlertTriangle, MapPin, User, Gauge, ClipboardList, Cog } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { useMaquinarias, TipoMaquinaria } from "@/hooks/useMaquinarias";
import { useCargasRepartidorAll } from "@/hooks/useCargasRepartidorAll";
import { usePreciosTodos } from "@/hooks/usePreciosMes";
import { useRemitos } from "@/hooks/useRemitos";
import { useMantenimientos } from "@/hooks/useMantenimientos";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { generateGastosMaquinariaPDF, generateLiquidacionVehiculosPDF } from "@/utils/generateGastosMaquinariaPDF";
import { VehiculosActivosMesPanel } from "./VehiculosActivosMesPanel";

interface GastoUnificado {
  id: string;
  fecha: string;
  tipo: "combustible" | "remito" | "mantenimiento";
  descripcion: string;
  costo: number;
  obra?: string;
  cantidad?: number;
  unidad?: string;
  precioUnitario?: number;
}

const tiposConfig: Record<TipoMaquinaria, string> = {
  cargadora: "Cargadora",
  compactador: "Compactador",
  retroexcavadora: "Retroexcavadora",
  minicargadora: "Minicargadora",
  motoniveladora: "Motoniveladora",
  topador: "Topador",
  pala_retro: "Pala Retro",
  batea: "Batea",
  acoplado: "Acoplado",
  camion: "Camión",
  carreton: "Carretón",
  cisterna: "Cisterna",
  tanque_cisterna: "Tanque Cisterna",
  tanque_regador_tractor: "Tanque Regador Tractor",
  soplador: "Soplador",
  zanjeadora: "Zanjeadora",
  rastra: "Rastra",
  tractor: "Tractor",
  rastra_grosspal: "Rastra Grosspal",
  auto: "Auto",
  camioneta: "Camioneta",
  grupo_electrogeno: "Grupo Electrógeno",
};

const chartConfig = {
  combustible: { label: "Combustible", color: "hsl(38, 92%, 50%)" },
  mantenimiento: { label: "Mantenimiento", color: "hsl(270, 70%, 60%)" },
};

export function GastosMaquinaria() {
  const { maquinarias } = useMaquinarias();
  const { cargas: cargasRepartidorRaw } = useCargasRepartidorAll();
  // Los ingresos a cisternas no son consumo de máquina
  const cargasRepartidor = useMemo(
    () => cargasRepartidorRaw.filter((c) => c.tipo_movimiento !== "ingreso"),
    [cargasRepartidorRaw]
  );
  const now = new Date();
  const { preciosPorMesProducto } = usePreciosTodos(now.getFullYear());
  const { remitos } = useRemitos();
  const { mantenimientos } = useMantenimientos();

  // Helper: get cost for a repartidor carga
  const getCostoCarga = (carga: { fecha: string; litros: number; tipo_producto: string | null }) => {
    const mes = parseInt(carga.fecha.split("-")[1], 10);
    const producto = carga.tipo_producto || "combustible";
    const precio = preciosPorMesProducto[`${mes}-${producto}`];
    return precio ? carga.litros * precio : 0;
  };

  const [selectedMaquinariaId, setSelectedMaquinariaId] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(() => startOfMonth(new Date()));
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(() => endOfMonth(new Date()));
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [mesActivo, setMesActivo] = useState<string>(() => format(new Date(), "yyyy-MM")); // "todos", "YYYY-MM", "custom"

  // Query partes_diarios for the selected maquinaria to get operator and KM data
  const { data: partesDiarios = [] } = useQuery({
    queryKey: ['partes_diarios_gastos', selectedMaquinariaId],
    enabled: !!selectedMaquinariaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('partes_diarios')
        .select(`
          fecha,
          km_camion,
          horometro_inicio,
          horometro_fin,
          cantidad_viajes,
          cantidad_movimiento_interno,
          obra_id,
          obras:obra_id (nombre),
          personal:personal_id (nombre, apellido)
        `)
        .eq('maquinaria_id', selectedMaquinariaId)
        .eq('estado', 'completado')
        .order('fecha', { ascending: false });
      if (error) throw error;
      return data as unknown as Array<{
        fecha: string;
        km_camion: number | null;
        horometro_inicio: number | null;
        horometro_fin: number | null;
        cantidad_viajes: number | null;
        cantidad_movimiento_interno: number | null;
        obra_id: string | null;
        obras: { nombre: string | null } | null;
        personal: { nombre: string | null; apellido: string | null } | null;
      }>;
    },
  });

  // Build operator lookup by date from partes_diarios
  const operadorPorFecha = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of partesDiarios) {
      if (p.personal && !map.has(p.fecha)) {
        const nombre = [p.personal.nombre, p.personal.apellido].filter(Boolean).join(' ');
        if (nombre) map.set(p.fecha, nombre);
      }
    }
    return map;
  }, [partesDiarios]);

  // Selected maquinaria object
  const maquinariaSeleccionada = useMemo(
    () => maquinarias.find((m) => m.id === selectedMaquinariaId),
    [maquinarias, selectedMaquinariaId]
  );

  const esVehiculoKm = useMemo(() => {
    if (!maquinariaSeleccionada) return false;
    return ["camion", "auto", "camioneta"].includes(maquinariaSeleccionada.tipo);
  }, [maquinariaSeleccionada]);

  // Vehicle real-time status (last known location, operator, etc.)
  const vehicleStatus = useMemo(() => {
    const ultimo = partesDiarios[0];
    return {
      ultimaObra: ultimo?.obras?.nombre || null,
      ultimoOperador: ultimo?.personal
        ? [ultimo.personal.nombre, ultimo.personal.apellido].filter(Boolean).join(' ') || null
        : null,
      ultimoParteFecha: ultimo?.fecha || null,
    };
  }, [partesDiarios]);

  // KM data, conductores, viajes y movimientos from partes_diarios filtered by period
  const rendimientoData = useMemo(() => {
    const filtered = partesDiarios.filter(p => {
      const f = parseISO(p.fecha);
      if (fechaDesde && f < fechaDesde) return false;
      if (fechaHasta && f > fechaHasta) return false;
      return true;
    });
    const totalKm = filtered.reduce((sum, p) => sum + (p.km_camion || 0), 0);
    const horasMaquina = filtered.reduce((sum, p) => {
      const diff = Math.max((p.horometro_fin || 0) - (p.horometro_inicio || 0), 0);
      return sum + diff;
    }, 0);

    // Conductores con días únicos
    const conductorMap = new Map<string, Set<string>>();
    for (const p of filtered) {
      if (p.personal) {
        const nombre = [p.personal.nombre, p.personal.apellido].filter(Boolean).join(' ');
        if (nombre) {
          if (!conductorMap.has(nombre)) conductorMap.set(nombre, new Set());
          conductorMap.get(nombre)!.add(p.fecha);
        }
      }
    }
    const conductores = Array.from(conductorMap.entries()).map(([nombre, fechas]) => ({
      nombre,
      dias: fechas.size,
    }));

    // Totales de viajes y movimientos internos desde partes
    const totalViajesPartes = filtered.reduce((sum, p) => sum + (p.cantidad_viajes || 0), 0);
    const totalMovInternos = filtered.reduce((sum, p) => sum + (p.cantidad_movimiento_interno || 0), 0);

    return { totalKm, horasMaquina, conductores, totalViajesPartes, totalMovInternos, viajesPorTipo: {} as Record<string, number> };
  }, [partesDiarios, fechaDesde, fechaHasta]);

  const mesesDisponibles = useMemo(() => {
    const now = new Date();
    const meses: { value: string; label: string; desde: Date; hasta: Date }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = subMonths(now, i);
      meses.push({
        value: format(d, "yyyy-MM"),
        label: format(d, "MMM yyyy", { locale: es }),
        desde: startOfMonth(d),
        hasta: endOfMonth(d),
      });
    }
    return meses;
  }, []);

  const seleccionarMes = (valor: string) => {
    setMesActivo(valor);
    if (valor === "todos") {
      setFechaDesde(undefined);
      setFechaHasta(undefined);
    } else if (valor === "custom") {
      // keep current manual dates
    } else {
      const mes = mesesDisponibles.find(m => m.value === valor);
      if (mes) {
        setFechaDesde(mes.desde);
        setFechaHasta(mes.hasta);
      }
    }
  };

  const maquinariasFiltradas = useMemo(() => {
    if (tipoFilter === "todos") return maquinarias;
    return maquinarias.filter((m) => m.tipo === tipoFilter);
  }, [maquinarias, tipoFilter]);

  const maquinariaOptions = useMemo(() => {
    return maquinariasFiltradas
      .sort((a, b) => (a.codigo || "").localeCompare(b.codigo || "", undefined, { numeric: true }))
      .map((m) => {
        const codigo = m.codigo || "S/C";
        const tipo = tiposConfig[m.tipo] || m.tipo;
        const marca = m.marca || "";
        const anio = m.anio ? String(m.anio) : "";
        const patente = m.patente || "";
        const label = [codigo, tipo, marca, anio, patente].filter(Boolean).join(" - ");
        const searchValue = `${codigo} ${tipo} ${marca} ${anio} ${patente} ${m.nombre || ""}`.toLowerCase();
        return { value: m.id, label, searchValue };
      });
  }, [maquinariasFiltradas]);

  useMemo(() => {
    if (selectedMaquinariaId && !maquinariasFiltradas.find(m => m.id === selectedMaquinariaId)) {
      setSelectedMaquinariaId("");
    }
  }, [maquinariasFiltradas, selectedMaquinariaId]);

  const datosFiltrados = useMemo(() => {
    if (!selectedMaquinariaId) {
      return { combustible: [], remitos: [], mantenimientos: [] };
    }

    const filtrarPorFecha = (fecha: string) => {
      const fechaItem = parseISO(fecha);
      if (fechaDesde && fechaItem < fechaDesde) return false;
      if (fechaHasta && fechaItem > fechaHasta) return false;
      return true;
    };

    return {
      combustible: cargasRepartidor.filter(
        (c) => c.maquinaria_id === selectedMaquinariaId && filtrarPorFecha(c.fecha)
      ),
      remitos: remitos.filter(
        (r) => r.maquinaria_id === selectedMaquinariaId && filtrarPorFecha(r.fecha)
      ),
      mantenimientos: mantenimientos.filter(
        (m) => m.maquinaria_id === selectedMaquinariaId && filtrarPorFecha(m.fecha)
      ),
    };
  }, [selectedMaquinariaId, cargasRepartidor, remitos, mantenimientos, fechaDesde, fechaHasta]);

  // Viajes por tipo de material desde remitos filtrados
  const viajesPorTipo = useMemo(() => {
    const map: Record<string, number> = {};
    datosFiltrados.remitos.forEach(r => {
      const tipo = r.tipo_material || r.material || "Sin tipo";
      map[tipo] = (map[tipo] || 0) + (r.cantidad_viajes || 1);
    });
    return map;
  }, [datosFiltrados.remitos]);

  // Próximo mantenimiento: del último mantenimiento completado con datos de próximo service
  const proximoMantenimiento = useMemo(() => {
    if (!selectedMaquinariaId) return null;
    const completados = mantenimientos
      .filter(m => m.maquinaria_id === selectedMaquinariaId && m.estado === "completado")
      .sort((a, b) => parseISO(b.fecha).getTime() - parseISO(a.fecha).getTime());

    const conProximo = completados.find(
      m => m.proximo_mantenimiento || m.proximo_service_hr || m.proximo_service_km
    );
    if (!conProximo) return null;
    return {
      fecha: conProximo.proximo_mantenimiento,
      horas: conProximo.proximo_service_hr,
      km: conProximo.proximo_service_km,
    };
  }, [selectedMaquinariaId, mantenimientos]);

  const totales = useMemo(() => {
    const totalCombustible = datosFiltrados.combustible.reduce((acc, c) => acc + getCostoCarga(c), 0);
    const totalLitros = datosFiltrados.combustible.reduce((acc, c) => acc + (c.litros || 0), 0);
    const totalRemitos = datosFiltrados.remitos.length;
    const totalViajes = datosFiltrados.remitos.reduce((acc, r) => acc + (r.cantidad_viajes || 0), 0);
    const costoRemitos = datosFiltrados.remitos.reduce((acc, r) => acc + (r.precio_total || 0), 0);
    const totalMantenimientos = datosFiltrados.mantenimientos.length;
    const costoMantenimientos = datosFiltrados.mantenimientos.reduce((acc, m) => acc + (m.costo_total || 0), 0);

    return {
      totalCombustible,
      totalLitros,
      totalRemitos,
      totalViajes,
      costoRemitos,
      totalMantenimientos,
      costoMantenimientos,
      gastoTotal: totalCombustible + costoMantenimientos + costoRemitos,
    };
  }, [datosFiltrados, preciosPorMesProducto]);

  const datosGraficoMensual = useMemo(() => {
    const mesesMap = new Map<string, { combustible: number; mantenimiento: number }>();

    datosFiltrados.combustible.forEach((c) => {
      if (!c.fecha) return;
      const mes = format(parseISO(c.fecha), "yyyy-MM");
      const actual = mesesMap.get(mes) || { combustible: 0, mantenimiento: 0 };
      actual.combustible += getCostoCarga(c);
      mesesMap.set(mes, actual);
    });

    datosFiltrados.mantenimientos.forEach((m) => {
      const mes = format(parseISO(m.fecha), "yyyy-MM");
      const actual = mesesMap.get(mes) || { combustible: 0, mantenimiento: 0 };
      actual.mantenimiento += m.costo_total || 0;
      mesesMap.set(mes, actual);
    });

    return Array.from(mesesMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mes, data]) => ({
        mes: format(parseISO(mes + "-01"), "MMM yyyy", { locale: es }),
        combustible: data.combustible,
        mantenimiento: data.mantenimiento,
      }));
  }, [datosFiltrados, preciosPorMesProducto]);

  const gastosUnificados = useMemo(() => {
    const gastos: GastoUnificado[] = [];

    datosFiltrados.combustible.forEach((c) => {
      const costo = getCostoCarga(c);
      const producto = c.tipo_producto || "combustible";
      const litros = Number(c.litros) || 0;
      const precioUnit = litros > 0 ? costo / litros : 0;
      gastos.push({
        id: c.id,
        fecha: c.fecha || "",
        tipo: "combustible",
        descripcion: `${litros.toLocaleString()} L - ${producto}`,
        costo,
        obra: c.obra?.nombre,
        cantidad: litros,
        unidad: "L",
        precioUnitario: precioUnit,
      });
    });

    datosFiltrados.remitos.forEach((r) => {
      const ruta = [r.desde, r.hasta].filter(Boolean).join(" → ");
      const modoViajes = (r.precio_calc_mode || "viajes") === "viajes";
      const cantidad = modoViajes
        ? Number(r.cantidad_viajes) || 0
        : Number(r.cantidad_uni ?? r.cantidad) || 0;
      const unidad = modoViajes ? "viajes" : (r.unidad || "");
      const precioUnit = Number(r.precio_unitario) || (cantidad > 0 ? (r.precio_total || 0) / cantidad : 0);
      gastos.push({
        id: r.id,
        fecha: r.fecha,
        tipo: "remito",
        descripcion: `Remito #${r.remito_local || r.numero} - ${r.material}${ruta ? ` (${ruta})` : ""}`,
        costo: r.precio_total || 0,
        obra: r.obra?.nombre,
        cantidad,
        unidad,
        precioUnitario: precioUnit,
      });
    });

    datosFiltrados.mantenimientos.forEach((m) => {
      gastos.push({
        id: m.id,
        fecha: m.fecha,
        tipo: "mantenimiento",
        descripcion: `${m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1)}: ${m.descripcion}`,
        costo: m.costo_total || 0,
        obra: undefined,
      });
    });

    return gastos.sort((a, b) => (b.fecha ? parseISO(b.fecha).getTime() : 0) - (a.fecha ? parseISO(a.fecha).getTime() : 0));
  }, [datosFiltrados, preciosPorMesProducto]);

  const tipoGastoConfig = {
    combustible: { label: "Combustible", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    remito: { label: "Remito", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    mantenimiento: { label: "Mantenimiento", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  };

  const limpiarFiltros = () => {
    setFechaDesde(undefined);
    setFechaHasta(undefined);
    setMesActivo("todos");
  };

  const exportarExcel = () => {
    const maquinaria = maquinarias.find((m) => m.id === selectedMaquinariaId);
    if (!maquinaria) { toast.error("Selecciona una maquinaria primero"); return; }

    const workbook = XLSX.utils.book_new();

    const resumenData = [
      ["Gastos por Maquinaria"],
      [""],
      ["Maquinaria:", maquinaria?.nombre || ""],
      ["Código:", maquinaria?.codigo || ""],
      ["Tipo:", tiposConfig[maquinaria.tipo] || maquinaria.tipo],
      ["Período:", `${fechaDesde ? format(fechaDesde, "dd/MM/yyyy") : "Inicio"} - ${fechaHasta ? format(fechaHasta, "dd/MM/yyyy") : "Actual"}`],
      [""],
      ["Combustible", `$${totales.totalCombustible.toLocaleString()}`, `${totales.totalLitros.toLocaleString()} L`],
      ["Remitos/Viajes", `$${totales.costoRemitos.toLocaleString()}`, `${totales.totalRemitos} remitos / ${totales.totalViajes} viajes`],
      ["Mantenimientos", `$${totales.costoMantenimientos.toLocaleString()}`, `${totales.totalMantenimientos} servicios`],
      [""],
      ["GASTO TOTAL", `$${totales.gastoTotal.toLocaleString()}`],
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(workbook, wsResumen, "Resumen");

    const detalleData = [
      ["Fecha", "Tipo", "Descripción", "Cantidad", "Unidad", "P. Unitario", "Obra", "Costo"],
      ...gastosUnificados.map((g) => [
        g.fecha ? format(parseISO(g.fecha), "dd/MM/yyyy") : "",
        tipoGastoConfig[g.tipo].label,
        g.descripcion,
        g.cantidad ?? "",
        g.unidad ?? "",
        g.precioUnitario ?? "",
        g.obra || "-",
        g.costo,
      ]),
    ];
    const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData);
    XLSX.utils.book_append_sheet(workbook, wsDetalle, "Detalle");

    const fileName = `Gastos_${maquinaria?.codigo || "Maquinaria"}_${format(new Date(), "yyyyMMdd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success("Excel exportado correctamente");
  };

  const exportarPDFTodos = async () => {
    const enRango = (fecha?: string | null) => {
      if (!fecha) return false;
      const f = parseISO(fecha);
      if (fechaDesde && f < fechaDesde) return false;
      if (fechaHasta && f > fechaHasta) return false;
      return true;
    };

    // Conductores por maquinaria en el período (partes diarios completados)
    const conductoresPorMaquinaria = new Map<string, Map<string, Set<string>>>();
    try {
      const pageSize = 1000;
      let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        let q = supabase
          .from('partes_diarios')
          .select('maquinaria_id, fecha, personal:personal_id (nombre, apellido)')
          .eq('estado', 'completado')
          .not('maquinaria_id', 'is', null)
          .order('fecha', { ascending: false })
          .range(from, from + pageSize - 1);
        if (fechaDesde) q = q.gte('fecha', format(fechaDesde, 'yyyy-MM-dd'));
        if (fechaHasta) q = q.lte('fecha', format(fechaHasta, 'yyyy-MM-dd'));
        const { data, error } = await q;
        if (error) throw error;
        const rows = (data || []) as unknown as Array<{
          maquinaria_id: string | null;
          fecha: string;
          personal: { nombre: string | null; apellido: string | null } | null;
        }>;
        for (const r of rows) {
          if (!r.maquinaria_id || !r.personal) continue;
          const nombre = [r.personal.nombre, r.personal.apellido].filter(Boolean).join(' ').trim();
          if (!nombre) continue;
          if (!conductoresPorMaquinaria.has(r.maquinaria_id)) conductoresPorMaquinaria.set(r.maquinaria_id, new Map());
          const m = conductoresPorMaquinaria.get(r.maquinaria_id)!;
          if (!m.has(nombre)) m.set(nombre, new Set());
          m.get(nombre)!.add(r.fecha);
        }
        if (rows.length < pageSize) break;
        from += pageSize;
      }
    } catch (e) {
      console.error('Error cargando conductores:', e);
    }

    const getConductores = (maquinariaId: string) => {
      const m = conductoresPorMaquinaria.get(maquinariaId);
      if (!m) return [];
      return Array.from(m.entries())
        .map(([nombre, fechas]) => ({ nombre, dias: fechas.size }))
        .sort((a, b) => b.dias - a.dias);
    };


    const filas = maquinariasFiltradas
      .map((m) => {
        const cargas = cargasRepartidor.filter((c) => c.maquinaria_id === m.id && enRango(c.fecha));
        const rems = remitos.filter((r) => r.maquinaria_id === m.id && enRango(r.fecha));
        const mants = mantenimientos.filter((x) => x.maquinaria_id === m.id && enRango(x.fecha));

        const litros = cargas.reduce((a, c) => a + (Number(c.litros) || 0), 0);
        const costoCombustible = cargas.reduce((a, c) => a + getCostoCarga(c), 0);
        const costoRemitos = rems.reduce((a, r) => a + (r.precio_total || 0), 0);
        const costoMantenimientos = mants.reduce((a, x) => a + (x.costo_total || 0), 0);

        return {
          codigo: m.codigo,
          nombre: m.nombre,
          patente: m.patente,
          tipo: tiposConfig[m.tipo] || m.tipo,
          conductores: getConductores(m.id),
          litros,
          costoCombustible,
          cantRemitos: rems.length,
          cantViajes: rems.reduce((a, r) => a + (r.cantidad_viajes || 0), 0),
          costoRemitos,
          cantMantenimientos: mants.length,
          costoMantenimientos,
          gastoTotal: costoCombustible + costoMantenimientos,
        };
      })
      .filter((f) => f.cantRemitos > 0)
      .sort((a, b) => (b.costoRemitos - b.gastoTotal) - (a.costoRemitos - a.gastoTotal));

    if (filas.length === 0) {
      toast.error("No hay movimientos en el período seleccionado");
      return;
    }

    try {
      await generateLiquidacionVehiculosPDF(filas, fechaDesde, fechaHasta);
      toast.success("PDF generado correctamente");
    } catch (error) {
      console.error("Error generating consolidated PDF:", error);
      toast.error("Error al generar el PDF");
    }
  };

  const exportarPDF = async () => {
    const maquinaria = maquinarias.find((m) => m.id === selectedMaquinariaId);
    if (!maquinaria) { toast.error("Selecciona una maquinaria primero"); return; }

    try {
      await generateGastosMaquinariaPDF(
        {
          codigo: maquinaria.codigo,
          nombre: maquinaria.nombre,
          tipo: tiposConfig[maquinaria.tipo],
          marca: maquinaria.marca,
          patente: maquinaria.patente,
          anio: maquinaria.anio,
          estado: maquinaria.estado,
          horas_acumuladas: maquinaria.horas_acumuladas,
          km_acumulados: maquinaria.km_acumulados || 0,
        },
        { ...totales, cantCargas: datosFiltrados.combustible.length },
        { ...rendimientoData, viajesPorTipo },
        fechaDesde,
        fechaHasta
      );
      toast.success("PDF exportado correctamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    }
  };

  return (
    <div className="space-y-5">
      {/* Vehículos activos del mes (vista rápida) */}
      <VehiculosActivosMesPanel
        maquinarias={maquinarias}
        cargas={cargasRepartidor}
        remitos={remitos}
        mantenimientos={mantenimientos}
        preciosPorMesProducto={preciosPorMesProducto}
        selectedId={selectedMaquinariaId}
        onSelect={(id) => setSelectedMaquinariaId(id)}
        mes={/^\d{4}-\d{2}$/.test(mesActivo) ? mesActivo : undefined}
        onMesChange={(m) => seleccionarMes(m)}
        desdeCustom={mesActivo === "custom" ? fechaDesde : undefined}
        hastaCustom={mesActivo === "custom" ? fechaHasta : undefined}
        onDesdeCustomChange={(d) => {
          if (d) { setMesActivo("custom"); setFechaDesde(d); }
          else seleccionarMes(format(new Date(), "yyyy-MM"));
        }}
        onHastaCustomChange={(d) => {
          if (d) { setMesActivo("custom"); setFechaHasta(d); }
          else seleccionarMes(format(new Date(), "yyyy-MM"));
        }}
      />

      {/* Filtros — todo en una sola fila */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="w-full lg:w-44">
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Tipo de maquinaria" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {Object.entries(tiposConfig).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-0 max-w-xl">
          <Combobox
            options={maquinariaOptions}
            value={selectedMaquinariaId}
            onValueChange={setSelectedMaquinariaId}
            placeholder="Seleccionar maquinaria..."
            searchPlaceholder="Buscar por código, marca, año o patente..."
            emptyText="No se encontraron maquinarias"
          />
        </div>
        <div className="w-full lg:w-48">
          <Select value={mesActivo} onValueChange={seleccionarMes}>
            <SelectTrigger className="bg-background">
              <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="todos">Todo el período</SelectItem>
              {mesesDisponibles.map((mes) => (
                <SelectItem key={mes.value} value={mes.value} className="capitalize">
                  {mes.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {mesActivo !== "todos" && (
          <Button variant="ghost" size="sm" onClick={limpiarFiltros} className="text-muted-foreground">
            Limpiar
          </Button>
        )}
        <div className="flex-1 hidden lg:block" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-background z-50" align="end">
            {selectedMaquinariaId && (
              <>
                <DropdownMenuItem onClick={exportarExcel} className="cursor-pointer">
                  <Download className="w-4 h-4 mr-2" />
                  Excel (.xlsx) - máquina seleccionada
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportarPDF} className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />
                  PDF - máquina seleccionada
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={exportarPDFTodos} className="cursor-pointer">
              <FileText className="w-4 h-4 mr-2" />
              PDF - todos los vehículos
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!selectedMaquinariaId || !maquinariaSeleccionada ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-lg">
          Selecciona una maquinaria para ver sus gastos asociados
        </div>
      ) : (
        <>
          {/* Ficha del Vehículo + Próximo Mantenimiento */}
          <div className={cn(
            "grid gap-4",
            proximoMantenimiento ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"
          )}>
            <Card className={cn("card-industrial", proximoMantenimiento && "lg:col-span-2")}>
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Identidad */}
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Cog className="w-7 h-7 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {maquinariaSeleccionada.codigo || "S/C"}
                        </span>
                        <Badge variant="outline" className="capitalize">
                          {tiposConfig[maquinariaSeleccionada.tipo] || maquinariaSeleccionada.tipo}
                        </Badge>
                        <Badge
                          className={cn(
                            "capitalize",
                            maquinariaSeleccionada.estado === "operativa" && "bg-green-500/15 text-green-400 border-green-500/30",
                            maquinariaSeleccionada.estado === "mantenimiento" && "bg-amber-500/15 text-amber-400 border-amber-500/30",
                            maquinariaSeleccionada.estado === "inactiva" && "bg-red-500/15 text-red-400 border-red-500/30",
                            maquinariaSeleccionada.estado === "en_uso" && "bg-blue-500/15 text-blue-400 border-blue-500/30",
                          )}
                          variant="outline"
                        >
                          {maquinariaSeleccionada.estado.replace("_", " ")}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mt-2 truncate">
                        {maquinariaSeleccionada.nombre || tiposConfig[maquinariaSeleccionada.tipo]}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {[
                          maquinariaSeleccionada.marca,
                          maquinariaSeleccionada.anio,
                          maquinariaSeleccionada.patente,
                        ].filter(Boolean).join(" · ") || "Sin datos adicionales"}
                      </p>
                    </div>
                  </div>

                  {/* Mini-stats */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm shrink-0">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="text-xs text-muted-foreground/80">Última obra</div>
                        <div className="text-foreground font-medium truncate max-w-[180px]">
                          {vehicleStatus.ultimaObra || "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4 text-purple-400" />
                      <div>
                        <div className="text-xs text-muted-foreground/80">Último operador</div>
                        <div className="text-foreground font-medium truncate max-w-[180px]">
                          {vehicleStatus.ultimoOperador || "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Gauge className="w-4 h-4 text-amber-400" />
                      <div>
                        <div className="text-xs text-muted-foreground/80">
                          {esVehiculoKm ? "Kilómetros" : "Horas"}
                        </div>
                        <div className="text-foreground font-medium font-mono">
                          {esVehiculoKm
                            ? `${(maquinariaSeleccionada.km_acumulados || 0).toLocaleString()} km`
                            : `${(maquinariaSeleccionada.horas_acumuladas || 0).toLocaleString()} hr`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ClipboardList className="w-4 h-4 text-green-400" />
                      <div>
                        <div className="text-xs text-muted-foreground/80">Último parte</div>
                        <div className="text-foreground font-medium font-mono">
                          {vehicleStatus.ultimoParteFecha
                            ? format(parseISO(vehicleStatus.ultimoParteFecha), "dd/MM/yyyy")
                            : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {proximoMantenimiento && (
              <Card className="card-industrial border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <span className="font-semibold text-foreground">Próximo Mantenimiento</span>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {proximoMantenimiento.fecha && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Fecha</span>
                        <span className="font-mono text-amber-400 font-medium">
                          {format(parseISO(proximoMantenimiento.fecha), "dd/MM/yyyy")}
                        </span>
                      </div>
                    )}
                    {proximoMantenimiento.horas && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">A las</span>
                        <span className="font-mono text-foreground">
                          {proximoMantenimiento.horas.toLocaleString()} hr
                        </span>
                      </div>
                    )}
                    {proximoMantenimiento.km && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">A los</span>
                        <span className="font-mono text-foreground">
                          {proximoMantenimiento.km.toLocaleString()} km
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* KPIs financieros: 4 cards simétricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="card-industrial">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1.5">
                  <Fuel className="w-4 h-4 text-amber-400" />
                  Combustible
                </div>
                <div className="text-2xl font-bold text-foreground">
                  ${totales.totalCombustible.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totales.totalLitros.toLocaleString()} L · {datosFiltrados.combustible.length} cargas
                </p>
              </CardContent>
            </Card>

            <Card className="card-industrial">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1.5">
                  <Truck className="w-4 h-4 text-blue-400" />
                  Remitos / Viajes
                </div>
                <div className="text-2xl font-bold text-foreground">
                  ${totales.costoRemitos.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totales.totalRemitos} remitos · {totales.totalViajes} viajes
                </p>
              </CardContent>
            </Card>

            <Card className="card-industrial">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1.5">
                  <Wrench className="w-4 h-4 text-purple-400" />
                  Mantenimientos
                </div>
                <div className="text-2xl font-bold text-foreground">
                  ${totales.costoMantenimientos.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totales.totalMantenimientos} servicios
                </p>
              </CardContent>
            </Card>

            <Card className="card-industrial border-primary/40 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-primary mb-1.5">
                  <DollarSign className="w-4 h-4" />
                  Gasto Total
                </div>
                <div className="text-2xl font-bold text-primary">
                  ${totales.gastoTotal.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Combustible + Remitos + Mant.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de evolución mensual */}
          {datosGraficoMensual.length > 0 && (
            <Card className="card-industrial">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Evolución de Gastos Mensuales</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[240px] w-full">
                  <BarChart data={datosGraficoMensual}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickLine={{ stroke: 'hsl(var(--border))' }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => <span>${Number(value).toLocaleString()}</span>} />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="combustible" name="Combustible" stackId="a" fill="hsl(38, 92%, 50%)" />
                    <Bar dataKey="mantenimiento" name="Mantenimiento" stackId="a" fill="hsl(270, 70%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Tabla detallada */}
          <Card className="card-industrial">
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Detalle de Gastos</CardTitle>
              <span className="text-xs text-muted-foreground">
                {gastosUnificados.length} {gastosUnificados.length === 1 ? "registro" : "registros"}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              {gastosUnificados.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No hay registros para esta maquinaria en el período seleccionado
                </div>
              ) : (
                <div className="max-h-[480px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead className="w-[110px]">Fecha</TableHead>
                        <TableHead className="w-[130px]">Tipo</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="w-[120px] text-right">Cantidad</TableHead>
                        <TableHead className="w-[120px] text-right">P. Unitario</TableHead>
                        <TableHead className="w-[140px]">Operador</TableHead>
                        <TableHead className="w-[140px]">Obra</TableHead>
                        <TableHead className="w-[120px] text-right">Costo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gastosUnificados.map((gasto, idx) => {
                        const operador = gasto.tipo !== "mantenimiento"
                          ? operadorPorFecha.get(gasto.fecha) ?? "—"
                          : "—";
                        const cantidadTxt = gasto.cantidad && gasto.cantidad > 0
                          ? `${gasto.cantidad.toLocaleString(undefined, { maximumFractionDigits: 2 })}${gasto.unidad ? ` ${gasto.unidad}` : ""}`
                          : "—";
                        const precioUnitTxt = gasto.precioUnitario && gasto.precioUnitario > 0
                          ? `$${gasto.precioUnitario.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                          : "—";
                        return (
                          <TableRow
                            key={`${gasto.tipo}-${gasto.id}`}
                            className={cn(idx % 2 === 1 && "bg-muted/30")}
                          >
                            <TableCell className="font-mono text-sm">
                              {gasto.fecha ? format(parseISO(gasto.fecha), "dd/MM/yyyy") : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn("font-normal", tipoGastoConfig[gasto.tipo].className)}
                              >
                                {tipoGastoConfig[gasto.tipo].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-sm">{gasto.descripcion}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{cantidadTxt}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{precioUnitTxt}</TableCell>
                            <TableCell className="text-sm text-muted-foreground truncate">{operador}</TableCell>
                            <TableCell className="text-sm text-muted-foreground truncate">{gasto.obra || "—"}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {gasto.costo > 0 ? `$${gasto.costo.toLocaleString()}` : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

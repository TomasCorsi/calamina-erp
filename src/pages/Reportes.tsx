import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
const ChatReportesTab = lazy(() => import("@/components/reportes/ChatReportesTab").then(m => ({ default: m.ChatReportesTab })));
const ReporteObraTab = lazy(() => import("@/components/reportes/ReporteObraTab").then(m => ({ default: m.ReporteObraTab })));

import { BarChart3, Sparkles, Building } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import {
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  AlertTriangle,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useReportesData } from "@/hooks/useDashboardData";
import { useCotizaciones } from "@/hooks/useCotizaciones";
import { useOtrosGastos } from "@/hooks/useOtrosGastos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyShort(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

interface ObraFinanciera {
  obraId: string;
  nombre: string;
  estado: string;
  cotizacionTotal: number;
  gastosTotal: number;
  combustible: number;
  mantenimiento: number;
  sueldos: number;
  horasMaquina: number;
  otrosGastos: number;
  balance: number;
  rentabilidad: number;
}

export default function Reportes() {
  const { loading, obras, combustible, mantenimientos } = useReportesData();
  const asignacionesPorObra: Record<string, { totalSueldos: number }> = {};
  const asignacionesMaquinaria: Array<{ obra_id: string; activa: boolean; cantidad?: number; horas?: number; costo_hora?: number }> = [];
  const loadingAsignaciones = false;
  const loadingAsignacionesMaq = false;
  const { cotizaciones, loading: loadingCotizaciones } = useCotizaciones();
  const { gastos: otrosGastosList, loading: loadingOtrosGastos } = useOtrosGastos();

  // Filter states
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");

  // Pagination state for chart
  const [paginaGrafico, setPaginaGrafico] = useState(0);
  const OBRAS_POR_PAGINA = 5;

  // Check if filters are active
  const hasActiveFilters = fechaInicio || fechaFin || estadoFilter !== "todos";

  // Clear all filters
  const clearFilters = () => {
    setFechaInicio("");
    setFechaFin("");
    setEstadoFilter("todos");
  };

  // Reset pagination when filters change
  useEffect(() => {
    setPaginaGrafico(0);
  }, [estadoFilter, fechaInicio, fechaFin]);

  // Helper function to check if a date is within the filter range
  const isWithinDateRange = (fecha: string | null | undefined): boolean => {
    if (!fecha) return true;
    if (!fechaInicio && !fechaFin) return true;
    
    try {
      const date = parseISO(fecha);
      const start = fechaInicio ? parseISO(fechaInicio) : new Date(0);
      const end = fechaFin ? parseISO(fechaFin) : new Date(9999, 11, 31);
      return isWithinInterval(date, { start, end });
    } catch {
      return true;
    }
  };

  // Build financial data per obra with filters applied
  const obrasFinancieras: ObraFinanciera[] = useMemo(() => {
    // Filter obras by status
    const filteredObras = estadoFilter === "todos" 
      ? obras 
      : obras.filter(o => o.estado === estadoFilter);

    return filteredObras.map((obra) => {
      // Get cotizaciones aprobadas for this obra (filtered by date)
      const cotizacionesObra = cotizaciones.filter(
        (c) => c.obra_id === obra.id && 
               c.estado === "aprobada" &&
               isWithinDateRange(c.fecha_creacion)
      );
      const cotizacionTotal = cotizacionesObra.reduce((sum, c) => sum + (c.total || 0), 0);

      // Get gastos filtered by date
      const gastoCombustible = combustible
        .filter((c) => c.obra_id === obra.id && isWithinDateRange(c.fecha))
        .reduce((sum, c) => sum + (c.costo_total || 0), 0);

      const gastoMantenimiento = mantenimientos
        .filter((m) => m.maquinaria?.obra_id === obra.id && isWithinDateRange(m.fecha))
        .reduce((sum, m) => sum + (m.costo_total || 0), 0);

      // Sueldos are monthly, so we don't filter by date for now
      const gastoSueldos = asignacionesPorObra[obra.id]?.totalSueldos || 0;

      // Calculate machine hours cost - now directly from assignments
      const asignacionesObraMaq = asignacionesMaquinaria.filter(a => a.obra_id === obra.id && a.activa);
      const gastoHorasMaquina = asignacionesObraMaq.reduce((total, asig) => {
        const cantidad = asig.cantidad || 1;
        const horas = asig.horas || 0;
        const costoHora = asig.costo_hora || 0;
        return total + (cantidad * horas * costoHora);
      }, 0);

      // Calculate otros gastos
      const gastoOtros = otrosGastosList
        .filter((g) => g.obra_id === obra.id && isWithinDateRange(g.fecha))
        .reduce((sum, g) => sum + (g.monto || 0), 0);

      const gastosTotal = gastoCombustible + gastoMantenimiento + gastoSueldos + gastoHorasMaquina + gastoOtros;
      const balance = cotizacionTotal - gastosTotal;
      const rentabilidad = cotizacionTotal > 0 ? ((balance / cotizacionTotal) * 100) : 0;

      return {
        obraId: obra.id,
        nombre: obra.nombre,
        estado: obra.estado,
        cotizacionTotal,
        gastosTotal,
        combustible: gastoCombustible,
        mantenimiento: gastoMantenimiento,
        sueldos: gastoSueldos,
        horasMaquina: gastoHorasMaquina,
        otrosGastos: gastoOtros,
        balance,
        rentabilidad,
      };
    });
  }, [obras, cotizaciones, combustible, mantenimientos, asignacionesPorObra, asignacionesMaquinaria, otrosGastosList, estadoFilter, fechaInicio, fechaFin]);

  // Filter obras with financial activity and sort by cotizacion
  const obrasConActividad = obrasFinancieras
    .filter((o) => o.cotizacionTotal > 0 || o.gastosTotal > 0)
    .sort((a, b) => b.cotizacionTotal - a.cotizacionTotal);

  // Calculate totals
  const totalCotizaciones = obrasFinancieras.reduce((sum, o) => sum + o.cotizacionTotal, 0);
  const totalGastos = obrasFinancieras.reduce((sum, o) => sum + o.gastosTotal, 0);
  const totalBalance = totalCotizaciones - totalGastos;
  const obrasConPerdida = obrasFinancieras.filter((o) => o.balance < 0 && o.cotizacionTotal > 0).length;

  // Pagination calculations
  const totalPaginas = Math.ceil(obrasConActividad.length / OBRAS_POR_PAGINA);
  
  // Prepare chart data - Paginated vertical grouped bar chart
  const chartDataCotizacionesVsGastos = obrasConActividad
    .slice(paginaGrafico * OBRAS_POR_PAGINA, (paginaGrafico + 1) * OBRAS_POR_PAGINA)
    .map((o) => ({
      obra: o.nombre.length > 12 ? o.nombre.slice(0, 12) + "…" : o.nombre,
      obraFull: o.nombre,
      Cotización: o.cotizacionTotal,
      Gastos: o.gastosTotal,
      Balance: o.balance,
    }));

  // Prepare chart data - Desglose de gastos por obra
  const chartDataGastosDesglose = obrasConActividad
    .filter((o) => o.gastosTotal > 0)
    .slice(0, 8)
    .map((o) => ({
      obra: o.nombre.length > 12 ? o.nombre.slice(0, 12) + "..." : o.nombre,
      combustible: o.combustible,
      mantenimiento: o.mantenimiento,
      sueldos: o.sueldos,
      horasMaquina: o.horasMaquina,
      otrosGastos: o.otrosGastos,
    }));

  const isLoading = loading || loadingAsignaciones || loadingCotizaciones || loadingOtrosGastos;

  if (isLoading) {
    return (
      <MainLayout title="Reportes" subtitle="Cotizaciones vs Gastos por Obra">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="card-industrial">
              <CardContent className="pt-6">
                <div className="h-20 bg-muted/50 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </MainLayout>
    );
  }

  // Format axis tick with better abbreviation
  const formatAxisTick = (value: number): string => {
    if (Math.abs(value) >= 1000000000) {
      return `$${(value / 1000000000).toFixed(0)}B`;
    }
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(0)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  return (
    <MainLayout title="Reportes" subtitle="Análisis financiero y consultas con IA">
      <Tabs defaultValue="financiero" className="mb-6">
        <TabsList>
          <TabsTrigger value="financiero" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Financiero
          </TabsTrigger>
          <TabsTrigger value="obra" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Por Obra
          </TabsTrigger>
          <TabsTrigger value="ia" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Consultar con IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="obra">
          <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Cargando…</div>}>
            <ReporteObraTab />
          </Suspense>
        </TabsContent>

        <TabsContent value="ia">
          <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Cargando…</div>}>
            <ChatReportesTab />
          </Suspense>
        </TabsContent>


        <TabsContent value="financiero">
      {/* Filters Section */}
      <Card className="card-industrial mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2 w-full lg:w-auto lg:mb-0">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filtros</span>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fechaInicio" className="text-xs text-muted-foreground">
                Fecha Inicio
              </Label>
              <Input
                id="fechaInicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-40"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fechaFin" className="text-xs text-muted-foreground">
                Fecha Fin
              </Label>
              <Input
                id="fechaFin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-40"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="estado" className="text-xs text-muted-foreground">
                Estado de Obra
              </Label>
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activa">Activa</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="finalizada">Finalizada</SelectItem>
                  <SelectItem value="pausada">Pausada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPIs Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="card-industrial">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cotizaciones Aprobadas</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyShort(totalCotizaciones)}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <FileText className="w-3 h-3" />
                  {cotizaciones.filter((c) => c.estado === "aprobada").length} cotizaciones
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-industrial">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gastos Totales</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrencyShort(totalGastos)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Combustible + Mantenimiento + Sueldos
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-industrial">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Balance General</p>
                <p className={`text-2xl font-bold ${totalBalance >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatCurrencyShort(totalBalance)}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  {totalBalance >= 0 ? (
                    <TrendingUp className="w-3 h-3 text-success" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-destructive" />
                  )}
                  {totalCotizaciones > 0
                    ? `${((totalBalance / totalCotizaciones) * 100).toFixed(1)}% rentabilidad`
                    : "Sin cotizaciones"}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                totalBalance >= 0 ? "bg-success/20" : "bg-destructive/20"
              }`}>
                <TrendingUp className={`w-6 h-6 ${totalBalance >= 0 ? "text-success" : "text-destructive"}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-industrial">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Obras con Pérdida</p>
                <p className="text-2xl font-bold text-foreground">{obrasConPerdida}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Gastos mayores a cotización
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart: Cotizaciones vs Gastos - Vertical Bar Chart */}
      <Card className="card-industrial mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Cotizaciones vs Gastos por Obra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            {chartDataCotizacionesVsGastos.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartDataCotizacionesVsGastos} 
                  margin={{ top: 20, right: 20, left: 10, bottom: 40 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="obra"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    height={40}
                    interval={0}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatAxisTick}
                    width={70}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted)/0.1)" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      padding: "12px",
                    }}
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name,
                    ]}
                    labelFormatter={(label: string, payload: any) => {
                      const data = payload?.[0]?.payload;
                      return data?.obraFull || label;
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: "10px" }}
                    iconType="square"
                    iconSize={12}
                  />
                  <Bar 
                    dataKey="Cotización" 
                    fill="#14b8a6" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                  />
                  <Bar 
                    dataKey="Gastos" 
                    fill="#f87171" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                  />
                  <Bar 
                    dataKey="Balance" 
                    radius={[4, 4, 0, 0]}
                    maxBarSize={60}
                  >
                    {chartDataCotizacionesVsGastos.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.Balance >= 0 ? "#22c55e" : "#ef4444"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay datos de cotizaciones aprobadas o gastos</p>
                </div>
              </div>
            )}
          </div>

          {/* Summary Table below the chart */}
          {chartDataCotizacionesVsGastos.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground w-28">Métrica</th>
                    {chartDataCotizacionesVsGastos.map((item, index) => (
                      <th key={index} className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">
                        {item.obra}
                      </th>
                    ))}
                    <th className="text-center py-2 px-3 font-bold text-foreground bg-muted/30">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm bg-[#14b8a6]"></span>
                      Cotización
                    </td>
                    {chartDataCotizacionesVsGastos.map((item, index) => (
                      <td key={index} className="text-center py-2 px-2 font-mono text-xs">
                        {formatCurrencyShort(item.Cotización)}
                      </td>
                    ))}
                    <td className="text-center py-2 px-3 font-mono font-bold text-success bg-muted/30">
                      {formatCurrencyShort(chartDataCotizacionesVsGastos.reduce((s, i) => s + i.Cotización, 0))}
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3 font-medium flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm bg-[#f87171]"></span>
                      Gastos
                    </td>
                    {chartDataCotizacionesVsGastos.map((item, index) => (
                      <td key={index} className="text-center py-2 px-2 font-mono text-xs">
                        {formatCurrencyShort(item.Gastos)}
                      </td>
                    ))}
                    <td className="text-center py-2 px-3 font-mono font-bold text-destructive bg-muted/30">
                      {formatCurrencyShort(chartDataCotizacionesVsGastos.reduce((s, i) => s + i.Gastos, 0))}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-medium flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm bg-[#22c55e]"></span>
                      Balance
                    </td>
                    {chartDataCotizacionesVsGastos.map((item, index) => (
                      <td key={index} className={`text-center py-2 px-2 font-mono text-xs font-bold ${
                        item.Balance >= 0 ? "text-success" : "text-destructive"
                      }`}>
                        {formatCurrencyShort(item.Balance)}
                      </td>
                    ))}
                    <td className={`text-center py-2 px-3 font-mono font-bold bg-muted/30 ${
                      chartDataCotizacionesVsGastos.reduce((s, i) => s + i.Balance, 0) >= 0 
                        ? "text-success" 
                        : "text-destructive"
                    }`}>
                      {formatCurrencyShort(chartDataCotizacionesVsGastos.reduce((s, i) => s + i.Balance, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {obrasConActividad.length > OBRAS_POR_PAGINA && (
            <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaGrafico((p) => Math.max(0, p - 1))}
                disabled={paginaGrafico === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Anterior
              </Button>

              <span className="text-sm text-muted-foreground">
                Página {paginaGrafico + 1} de {totalPaginas}
                <span className="ml-2 text-xs">
                  ({paginaGrafico * OBRAS_POR_PAGINA + 1}-
                  {Math.min((paginaGrafico + 1) * OBRAS_POR_PAGINA, obrasConActividad.length)} de{" "}
                  {obrasConActividad.length} obras)
                </span>
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaGrafico((p) => Math.min(totalPaginas - 1, p + 1))}
                disabled={paginaGrafico >= totalPaginas - 1}
              >
                Siguiente
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Desglose de Gastos Chart */}
      <Card className="card-industrial mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Desglose de Gastos por Obra
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {chartDataGastosDesglose.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartDataGastosDesglose} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="obra"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(value) => formatCurrencyShort(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ paddingTop: "10px" }} />
                  <Bar dataKey="combustible" stackId="a" fill="#eab308" name="Combustible" />
                  <Bar dataKey="mantenimiento" stackId="a" fill="#f97316" name="Mantenimiento" />
                  <Bar dataKey="sueldos" stackId="a" fill="#3b82f6" name="Sueldos" />
                  <Bar dataKey="horasMaquina" stackId="a" fill="#8b5cf6" name="Horas Máquina" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No hay gastos registrados
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table: Detalle por Obra */}
      <Card className="card-industrial">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Detalle Financiero por Obra
          </CardTitle>
        </CardHeader>
        <CardContent>
          {obrasConActividad.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Obra</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Cotización</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Combustible</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Mantenimiento</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Sueldos</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Horas Máq.</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total Gastos</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Balance</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Rentabilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {obrasConActividad.map((obra) => (
                    <tr key={obra.obraId} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-2 font-medium">{obra.nombre}</td>
                      <td className="py-3 px-2 text-right text-success font-mono">
                        {formatCurrency(obra.cotizacionTotal)}
                      </td>
                      <td className="py-3 px-2 text-right text-warning font-mono">
                        {formatCurrency(obra.combustible)}
                      </td>
                      <td className="py-3 px-2 text-right text-orange-500 font-mono">
                        {formatCurrency(obra.mantenimiento)}
                      </td>
                      <td className="py-3 px-2 text-right text-blue-500 font-mono">
                        {formatCurrency(obra.sueldos)}
                      </td>
                      <td className="py-3 px-2 text-right text-purple-500 font-mono">
                        {formatCurrency(obra.horasMaquina)}
                      </td>
                      <td className="py-3 px-2 text-right text-destructive font-mono">
                        {formatCurrency(obra.gastosTotal)}
                      </td>
                      <td className={`py-3 px-2 text-right font-mono font-bold ${
                        obra.balance >= 0 ? "text-success" : "text-destructive"
                      }`}>
                        {formatCurrency(obra.balance)}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {obra.cotizacionTotal > 0 ? (
                          <Badge 
                            variant={obra.rentabilidad >= 0 ? "default" : "destructive"}
                            className={obra.rentabilidad >= 0 ? "bg-success text-success-foreground" : ""}
                          >
                            {obra.rentabilidad.toFixed(1)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/20">
                    <td className="py-3 px-2 font-bold">TOTAL</td>
                    <td className="py-3 px-2 text-right text-success font-mono font-bold">
                      {formatCurrency(totalCotizaciones)}
                    </td>
                    <td className="py-3 px-2 text-right text-warning font-mono font-bold">
                      {formatCurrency(obrasFinancieras.reduce((s, o) => s + o.combustible, 0))}
                    </td>
                    <td className="py-3 px-2 text-right text-orange-500 font-mono font-bold">
                      {formatCurrency(obrasFinancieras.reduce((s, o) => s + o.mantenimiento, 0))}
                    </td>
                    <td className="py-3 px-2 text-right text-blue-500 font-mono font-bold">
                      {formatCurrency(obrasFinancieras.reduce((s, o) => s + o.sueldos, 0))}
                    </td>
                    <td className="py-3 px-2 text-right text-purple-500 font-mono font-bold">
                      {formatCurrency(obrasFinancieras.reduce((s, o) => s + o.horasMaquina, 0))}
                    </td>
                    <td className="py-3 px-2 text-right text-destructive font-mono font-bold">
                      {formatCurrency(totalGastos)}
                    </td>
                    <td className={`py-3 px-2 text-right font-mono font-bold ${
                      totalBalance >= 0 ? "text-success" : "text-destructive"
                    }`}>
                      {formatCurrency(totalBalance)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      {totalCotizaciones > 0 && (
                        <Badge 
                          variant={totalBalance >= 0 ? "default" : "destructive"}
                          className={totalBalance >= 0 ? "bg-success text-success-foreground" : ""}
                        >
                          {((totalBalance / totalCotizaciones) * 100).toFixed(1)}%
                        </Badge>
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay datos financieros disponibles</p>
              <p className="text-sm mt-1">Agregue cotizaciones aprobadas o registre gastos en las obras</p>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}

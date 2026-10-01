import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  ComposedChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Clock, 
  Fuel, 
  Truck, 
  CheckCircle2, 
  FileText,
  Calendar,
  Activity
} from "lucide-react";
import type { DiaRendimiento, TotalesRendimiento, RolPersonal } from "@/hooks/useParteDiarioRendimiento";

interface ParteDiarioRendimientoChartProps {
  diasDelMes: DiaRendimiento[];
  totales: TotalesRendimiento;
  rol: RolPersonal;
  mesLabel: string;
}

const ROL_LABELS: Record<string, string> = {
  maquinista: 'Maquinista',
  chofer: 'Chofer',
  capataz: 'Capataz',
  mecanico: 'Mecánico',
  sereno: 'Sereno',
  topografo: 'Topógrafo',
  ayudante: 'Ayudante',
  administrativo: 'Administrativo',
};

export const ParteDiarioRendimientoChart = ({
  diasDelMes,
  totales,
  rol,
  mesLabel,
}: ParteDiarioRendimientoChartProps) => {
  const chartData = useMemo(() => {
    return diasDelMes.map((dia) => ({
      dia: dia.dia,
      fecha: dia.fecha,
      horasMaquina: dia.horasMaquina,
      viajes: dia.viajes,
      movimientoInterno: dia.movimientoInterno,
      combustible: dia.combustible,
      horasTrabajadas: dia.horasTrabajadas,
      tieneParte: dia.tieneParte ? 1 : 0,
    }));
  }, [diasDelMes]);

  const isMaquinista = rol === 'maquinista';
  const isChofer = rol === 'chofer';

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Partes Completados</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totales.partesCompletados}</p>
            {totales.partesBorrador > 0 && (
              <p className="text-xs text-chart-3">+{totales.partesBorrador} borradores</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-chart-1" />
              <span className="text-sm text-muted-foreground">Días Trabajados</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {totales.diasTrabajados}/{diasDelMes.length}
            </p>
          </CardContent>
        </Card>
        
        {isMaquinista && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-chart-2" />
                  <span className="text-sm text-muted-foreground">Horas Máquina</span>
                </div>
                <p className="text-2xl font-bold mt-1">{totales.horasMaquinaTotales.toFixed(1)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-chart-1" />
                  <span className="text-sm text-muted-foreground">Checklist %</span>
                </div>
                <p className="text-2xl font-bold mt-1">{totales.checklistCumplimiento}%</p>
              </CardContent>
            </Card>
          </>
        )}
        
        {isChofer && (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-chart-2" />
                  <span className="text-sm text-muted-foreground">Total Viajes</span>
                </div>
                <p className="text-2xl font-bold mt-1">{totales.viajesTotales}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-chart-4" />
                  <span className="text-sm text-muted-foreground">Mov. Interno</span>
                </div>
                <p className="text-2xl font-bold mt-1">{totales.movimientoInternoTotal}</p>
              </CardContent>
            </Card>
          </>
        )}
        
        {!isMaquinista && !isChofer && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-chart-2" />
                <span className="text-sm text-muted-foreground">Rol</span>
              </div>
              <p className="text-lg font-bold mt-1">{ROL_LABELS[rol] || rol}</p>
            </CardContent>
          </Card>
        )}
        
        {(isMaquinista || isChofer) && (
          <Card className="md:col-span-4 lg:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Fuel className="h-4 w-4 text-chart-3" />
                <span className="text-sm text-muted-foreground">Combustible</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totales.combustibleTotal.toFixed(0)} L</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Main chart based on role */}
        {isMaquinista && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Horas de Máquina por Día - {mesLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="dia" 
                      tick={{ fontSize: 10 }}
                      interval={1}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(1)} hrs`, 'Horas']}
                      labelFormatter={(dia) => `Día ${dia}`}
                    />
                    <Bar 
                      dataKey="horasMaquina" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="Horas Máquina"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {isChofer && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Viajes por Día - {mesLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="dia" 
                      tick={{ fontSize: 10 }}
                      interval={1}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                      labelFormatter={(dia) => `Día ${dia}`}
                    />
                    <Legend />
                    <Bar 
                      dataKey="viajes" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="Viajes"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="movimientoInterno" 
                      stroke="hsl(var(--destructive))"
                      name="Mov. Interno"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {!isMaquinista && !isChofer && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Asistencia - {mesLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="dia" 
                      tick={{ fontSize: 10 }}
                      interval={1}
                    />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 1]} ticks={[0, 1]} />
                    <Tooltip 
                      formatter={(value: number) => [value === 1 ? 'Presente' : 'Ausente', 'Estado']}
                      labelFormatter={(dia) => `Día ${dia}`}
                    />
                    <Bar 
                      dataKey="tieneParte" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="Asistencia"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Combustible chart for maquinistas and choferes */}
        {(isMaquinista || isChofer) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Combustible Acumulado - {mesLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="dia" 
                      tick={{ fontSize: 10 }}
                      interval={1}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(0)} L`, 'Combustible']}
                      labelFormatter={(dia) => `Día ${dia}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="combustible" 
                      stroke="hsl(var(--chart-2))"
                      fill="hsl(var(--chart-2))"
                      fillOpacity={0.3}
                      name="Combustible (L)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

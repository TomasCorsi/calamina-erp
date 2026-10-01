import { useState, useMemo } from "react";
import { format, startOfMonth } from "date-fns";
import { 
  Loader2, 
  Users, 
  FileCheck, 
  Clock, 
  Truck, 
  Fuel,
  CheckCircle,
  Search,
  User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useParteDiarioResumenGeneral, type EmpleadoResumen } from "@/hooks/useParteDiarioResumenGeneral";
import { useObras } from "@/hooks/useObras";
import { PeriodoObraFilters } from "./PeriodoObraFilters";

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

interface ParteDiarioResumenGeneralProps {
  onSelectEmpleado: (empleadoId: string) => void;
}

export const ParteDiarioResumenGeneral = ({ onSelectEmpleado }: ParteDiarioResumenGeneralProps) => {
  const today = new Date();
  const [fechaDesde, setFechaDesde] = useState<Date>(startOfMonth(today));
  const [fechaHasta, setFechaHasta] = useState<Date>(today);
  const [obraId, setObraId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { obras } = useObras();
  const { data, isLoading } = useParteDiarioResumenGeneral(fechaDesde, fechaHasta, obraId || undefined);

  const filteredEmpleados = useMemo(() => {
    if (!searchTerm.trim()) return data.empleados;
    
    const term = searchTerm.toLowerCase();
    return data.empleados.filter(emp => {
      const nombreCompleto = `${emp.nombre || ''} ${emp.apellido || ''}`.toLowerCase();
      const legajo = (emp.legajo || '').toLowerCase();
      return nombreCompleto.includes(term) || legajo.includes(term);
    });
  }, [data.empleados, searchTerm]);

  const { totales } = data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Resumen General
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {format(fechaDesde, "dd/MM/yyyy")} - {format(fechaHasta, "dd/MM/yyyy")}
            </div>
          </div>
          <PeriodoObraFilters
            fechaDesde={fechaDesde}
            fechaHasta={fechaHasta}
            obraId={obraId}
            obras={obras}
            onFechaDesdeChange={setFechaDesde}
            onFechaHastaChange={setFechaHasta}
            onObraChange={setObraId}
          />
        </CardHeader>
      </Card>


      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totales.totalEmpleados}</p>
                    <p className="text-xs text-muted-foreground">Empleados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-chart-1/10">
                    <FileCheck className="h-5 w-5 text-chart-1" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totales.totalPartesCompletados}</p>
                    <p className="text-xs text-muted-foreground">Partes Completados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-chart-2/10">
                    <Clock className="h-5 w-5 text-chart-2" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totales.totalHorasMaquina.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Horas Máquina</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-chart-3/10">
                    <Truck className="h-5 w-5 text-chart-3" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totales.totalViajes}</p>
                    <p className="text-xs text-muted-foreground">Viajes Totales</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-chart-4/10">
                    <Fuel className="h-5 w-5 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totales.totalCombustible.toFixed(0)} L</p>
                    <p className="text-xs text-muted-foreground">Combustible</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-chart-5/10">
                    <Truck className="h-5 w-5 text-chart-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totales.totalMovimientoInterno}</p>
                    <p className="text-xs text-muted-foreground">Mov. Internos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totales.promedioChecklist}%</p>
                    <p className="text-xs text-muted-foreground">Prom. Checklist</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Employee table with search */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-base">Detalle por Empleado</CardTitle>
                <div className="relative w-full sm:w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o legajo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredEmpleados.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>
                    {searchTerm 
                      ? "No se encontraron empleados con ese nombre" 
                      : "No hay datos de partes para este período"}
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Legajo</TableHead>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead className="text-center">Partes</TableHead>
                        <TableHead className="text-center">Hs Máq.</TableHead>
                        <TableHead className="text-center">Viajes</TableHead>
                        <TableHead className="text-center">Combustible</TableHead>
                        <TableHead className="text-center">Checklist</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmpleados.map((emp) => (
                        <TableRow 
                          key={emp.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => onSelectEmpleado(emp.id)}
                        >
                          <TableCell className="font-medium">
                            {emp.legajo || "-"}
                          </TableCell>
                          <TableCell>
                            {[emp.apellido, emp.nombre].filter(Boolean).join(", ")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {ROL_LABELS[emp.rol] || emp.rol}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium text-chart-1">
                              {emp.partesCompletados}
                            </span>
                            {emp.partesBorrador > 0 && (
                              <span className="text-muted-foreground text-xs ml-1">
                                (+{emp.partesBorrador})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {emp.horasMaquinaTotales.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-center">
                            {emp.viajesTotales}
                          </TableCell>
                          <TableCell className="text-center">
                            {emp.combustibleTotal.toFixed(0)} L
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant="secondary"
                              className={
                                emp.checklistCumplimiento >= 80 
                                  ? "bg-chart-1/10 text-chart-1" 
                                  : emp.checklistCumplimiento >= 50
                                  ? "bg-chart-3/10 text-chart-3"
                                  : "bg-destructive/10 text-destructive"
                              }
                            >
                              {emp.checklistCumplimiento}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {filteredEmpleados.length > 0 && (
                <p className="text-sm text-muted-foreground mt-4">
                  Mostrando {filteredEmpleados.length} de {data.empleados.length} empleado{data.empleados.length !== 1 ? 's' : ''}
                  {searchTerm && " (filtrado)"}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

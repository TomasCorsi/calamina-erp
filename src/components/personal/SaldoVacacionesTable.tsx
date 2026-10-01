import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, User, AlertTriangle, CheckCircle, Users, UserCheck, UserX } from "lucide-react";
import {
  VacacionDB,
  calcularAntiguedad,
  calcularDiasBase,
  calcularDiasUsados,
} from "@/hooks/useVacaciones";
import { PersonalDB } from "@/hooks/usePersonal";
import { cn } from "@/lib/utils";

interface SaldoVacacionesTableProps {
  vacaciones: VacacionDB[];
  personal: PersonalDB[];
}

interface SaldoEmpleado {
  id: string;
  nombre: string;
  apellido: string;
  fechaIngreso: string | null;
  antiguedad: number | null;
  diasBase: number;
  diasUsados: number;
  diasDisponibles: number;
}

export function SaldoVacacionesTable({ vacaciones, personal }: SaldoVacacionesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSinVacaciones, setShowSinVacaciones] = useState(false);

  const saldos = useMemo((): SaldoEmpleado[] => {
    return personal
      .filter(p => p.activo)
      .map(p => {
        const antiguedad = calcularAntiguedad(p.fecha_ingreso);
        const diasBase = calcularDiasBase(antiguedad);
        const diasUsados = calcularDiasUsados(vacaciones, p.id);
        const diasDisponibles = Math.max(0, diasBase - diasUsados);

        return {
          id: p.id,
          nombre: p.nombre || "",
          apellido: p.apellido || "",
          fechaIngreso: p.fecha_ingreso,
          antiguedad,
          diasBase,
          diasUsados,
          diasDisponibles,
        };
      });
  }, [personal, vacaciones]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = saldos.length;
    const sinVacaciones = saldos.filter(s => s.diasUsados === 0).length;
    const conVacaciones = total - sinVacaciones;
    return { total, conVacaciones, sinVacaciones };
  }, [saldos]);

  const filteredSaldos = useMemo(() => {
    let result = saldos;
    
    // Filtro de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        s =>
          s.nombre.toLowerCase().includes(term) ||
          s.apellido.toLowerCase().includes(term)
      );
    }
    
    // Filtro sin vacaciones
    if (showSinVacaciones) {
      result = result.filter(s => s.diasUsados === 0);
    }
    
    // Ordenar: sin vacaciones primero, luego por apellido
    return result.sort((a, b) => {
      if (a.diasUsados === 0 && b.diasUsados > 0) return -1;
      if (a.diasUsados > 0 && b.diasUsados === 0) return 1;
      return a.apellido.localeCompare(b.apellido);
    });
  }, [saldos, searchTerm, showSinVacaciones]);

  const formatAntiguedad = (antiguedad: number | null): string => {
    if (antiguedad === null) return "N/A";
    if (antiguedad === 0) return "< 1 año";
    if (antiguedad === 1) return "1 año";
    return `${antiguedad} años`;
  };

  const getEstadoIndicador = (saldo: SaldoEmpleado) => {
    if (!saldo.fechaIngreso) {
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        color: "text-orange-400",
        tooltip: "Sin fecha de ingreso registrada",
      };
    }
    if (saldo.diasDisponibles === 0) {
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        color: "text-red-400",
        tooltip: "Sin días disponibles",
      };
    }
    return {
      icon: <CheckCircle className="w-4 h-4" />,
      color: "text-green-400",
      tooltip: `${saldo.diasDisponibles} días disponibles`,
    };
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-industrial p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total activos</p>
          </div>
        </div>
        <div className="card-industrial p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{stats.conVacaciones}</p>
            <p className="text-sm text-muted-foreground">Con vacaciones</p>
          </div>
        </div>
        <div className="card-industrial p-4 flex items-center gap-3 border-destructive/50">
          <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
            <UserX className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold text-destructive">{stats.sinVacaciones}</p>
            <p className="text-sm text-muted-foreground">Sin vacaciones</p>
          </div>
        </div>
      </div>

      {/* Buscador y filtros */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empleado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="sinVacaciones"
            checked={showSinVacaciones}
            onCheckedChange={(checked) => setShowSinVacaciones(checked === true)}
          />
          <Label htmlFor="sinVacaciones" className="text-sm text-muted-foreground cursor-pointer">
            Solo sin vacaciones cargadas
          </Label>
        </div>
      </div>

      {/* Info de reglas */}
      <div className="card-industrial p-4">
        <h4 className="font-medium text-foreground mb-2">Días de vacaciones por antigüedad</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-muted">0-5 años</Badge>
            <span className="text-muted-foreground">14 días</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-muted">5-10 años</Badge>
            <span className="text-muted-foreground">21 días</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-muted">10-20 años</Badge>
            <span className="text-muted-foreground">28 días</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-muted">+20 años</Badge>
            <span className="text-muted-foreground">35 días</span>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card-industrial overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">Estado</TableHead>
              <TableHead className="text-muted-foreground font-medium">Empleado</TableHead>
              <TableHead className="text-muted-foreground font-medium">Antigüedad</TableHead>
              <TableHead className="text-muted-foreground font-medium text-center">Días Base</TableHead>
              <TableHead className="text-muted-foreground font-medium text-center">Usados</TableHead>
              <TableHead className="text-muted-foreground font-medium text-center">Disponibles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSaldos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No se encontraron empleados" : "No hay empleados activos"}
                </TableCell>
              </TableRow>
            ) : (
              filteredSaldos.map((saldo, index) => {
                const indicador = getEstadoIndicador(saldo);
                return (
                  <TableRow
                    key={saldo.id}
                    className="border-border table-row-hover animate-fade-in"
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <div className={cn("p-1", indicador.color)}>
                              {indicador.icon}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-popover border-border">
                            {indicador.tooltip}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">
                          {saldo.nombre} {saldo.apellido}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-muted-foreground",
                        !saldo.fechaIngreso && "text-orange-400 italic"
                      )}>
                        {formatAntiguedad(saldo.antiguedad)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium text-foreground">{saldo.diasBase}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          saldo.diasUsados > 0
                            ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {saldo.diasUsados}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          saldo.diasDisponibles > 0
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        )}
                      >
                        {saldo.diasDisponibles}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

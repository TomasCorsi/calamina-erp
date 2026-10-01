import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Filter, X } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { ParteDiarioAdminFilters as FilterType } from "@/hooks/useParteDiarioAdmin";

interface Personal {
  id: string;
  nombre: string | null;
  apellido: string | null;
  rol: string;
}

interface Obra {
  id: string;
  nombre: string;
}

interface ParteDiarioAdminFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  empleados: Personal[];
  obras: Obra[];
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

export const ParteDiarioAdminFilters = ({
  filters,
  onFiltersChange,
  empleados,
  obras,
}: ParteDiarioAdminFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterType>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleClear = () => {
    const cleared: FilterType = {};
    setLocalFilters(cleared);
    onFiltersChange(cleared);
  };

  const handleSetThisMonth = () => {
    const now = new Date();
    setLocalFilters({
      ...localFilters,
      fechaDesde: format(startOfMonth(now), 'yyyy-MM-dd'),
      fechaHasta: format(endOfMonth(now), 'yyyy-MM-dd'),
    });
  };

  const activeFiltersCount = Object.values(filters).filter(v => v).length;

  const getEmpleadoLabel = (emp: Personal) => {
    const nombre = [emp.nombre, emp.apellido].filter(Boolean).join(' ') || 'Sin nombre';
    const rol = ROL_LABELS[emp.rol] || emp.rol;
    return `${nombre} (${rol})`;
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-popover" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filtros</h4>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            </div>

            {/* Empleado */}
            <div className="space-y-2">
              <Label>Empleado</Label>
              <Select
                value={localFilters.empleadoId || "all"}
                onValueChange={(value) =>
                  setLocalFilters({ ...localFilters, empleadoId: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los empleados" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Todos los empleados</SelectItem>
                  {empleados.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {getEmpleadoLabel(emp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Obra */}
            <div className="space-y-2">
              <Label>Obra</Label>
              <Select
                value={localFilters.obraId || "all"}
                onValueChange={(value) =>
                  setLocalFilters({ ...localFilters, obraId: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las obras" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Todas las obras</SelectItem>
                  {obras.map((obra) => (
                    <SelectItem key={obra.id} value={obra.id}>
                      {obra.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={localFilters.estado || "all"}
                onValueChange={(value) =>
                  setLocalFilters({ 
                    ...localFilters, 
                    estado: value === "all" ? undefined : value as 'borrador' | 'completado' 
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="borrador">Borrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rango de fechas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Rango de fechas</Label>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={handleSetThisMonth}>
                  Este mes
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Desde</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !localFilters.fechaDesde && "text-muted-foreground"
                        )}
                        size="sm"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {localFilters.fechaDesde
                          ? format(new Date(localFilters.fechaDesde), "dd/MM/yy")
                          : "-"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover" align="start">
                      <Calendar
                        mode="single"
                        selected={localFilters.fechaDesde ? new Date(localFilters.fechaDesde) : undefined}
                        onSelect={(date) =>
                          setLocalFilters({
                            ...localFilters,
                            fechaDesde: date ? format(date, "yyyy-MM-dd") : undefined,
                          })
                        }
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Hasta</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !localFilters.fechaHasta && "text-muted-foreground"
                        )}
                        size="sm"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {localFilters.fechaHasta
                          ? format(new Date(localFilters.fechaHasta), "dd/MM/yy")
                          : "-"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover" align="start">
                      <Calendar
                        mode="single"
                        selected={localFilters.fechaHasta ? new Date(localFilters.fechaHasta) : undefined}
                        onSelect={(date) =>
                          setLocalFilters({
                            ...localFilters,
                            fechaHasta: date ? format(date, "yyyy-MM-dd") : undefined,
                          })
                        }
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <Button onClick={handleApply} className="w-full">
              Aplicar filtros
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="h-4 w-4 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  );
};

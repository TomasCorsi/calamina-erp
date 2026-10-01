import { format, subDays, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Building2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { ParteDiarioAdminFilters } from "@/hooks/useParteDiarioAdmin";

type DatePreset = 'hoy' | 'ayer' | 'semana' | 'mes' | 'custom' | 'all';

interface Obra {
  id: string;
  nombre: string;
}

interface ParteDiarioQuickFiltersProps {
  filters: ParteDiarioAdminFilters;
  onFiltersChange: (filters: ParteDiarioAdminFilters) => void;
  obras: Obra[];
}

export function ParteDiarioQuickFilters({
  filters,
  onFiltersChange,
  obras,
}: ParteDiarioQuickFiltersProps) {
  const today = new Date();
  
  const getDatePreset = (): DatePreset => {
    if (!filters.fechaDesde && !filters.fechaHasta) return 'all';
    
    const todayStr = format(today, 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');
    const weekStartStr = format(startOfWeek(today, { locale: es }), 'yyyy-MM-dd');
    const weekEndStr = format(endOfWeek(today, { locale: es }), 'yyyy-MM-dd');
    const monthStartStr = format(startOfMonth(today), 'yyyy-MM-dd');
    const monthEndStr = format(endOfMonth(today), 'yyyy-MM-dd');
    
    if (filters.fechaDesde === todayStr && filters.fechaHasta === todayStr) return 'hoy';
    if (filters.fechaDesde === yesterdayStr && filters.fechaHasta === yesterdayStr) return 'ayer';
    if (filters.fechaDesde === weekStartStr && filters.fechaHasta === weekEndStr) return 'semana';
    if (filters.fechaDesde === monthStartStr && filters.fechaHasta === monthEndStr) return 'mes';
    
    return 'custom';
  };

  const handleDatePresetChange = (preset: DatePreset) => {
    let fechaDesde: string | undefined;
    let fechaHasta: string | undefined;

    switch (preset) {
      case 'hoy':
        fechaDesde = fechaHasta = format(today, 'yyyy-MM-dd');
        break;
      case 'ayer':
        fechaDesde = fechaHasta = format(subDays(today, 1), 'yyyy-MM-dd');
        break;
      case 'semana':
        fechaDesde = format(startOfWeek(today, { locale: es }), 'yyyy-MM-dd');
        fechaHasta = format(endOfWeek(today, { locale: es }), 'yyyy-MM-dd');
        break;
      case 'mes':
        fechaDesde = format(startOfMonth(today), 'yyyy-MM-dd');
        fechaHasta = format(endOfMonth(today), 'yyyy-MM-dd');
        break;
      case 'all':
      default:
        fechaDesde = undefined;
        fechaHasta = undefined;
    }

    onFiltersChange({ ...filters, fechaDesde, fechaHasta });
  };

  const handleObraChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      obraId: value === 'todas' ? undefined : value 
    });
  };

  const handleEstadoChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      estado: value === 'todos' ? '' : value as 'borrador' | 'completado' 
    });
  };

  const activeFiltersCount = [
    filters.fechaDesde || filters.fechaHasta,
    filters.obraId,
    filters.estado,
    filters.empleadoId,
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({});
  };

  const currentPreset = getDatePreset();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date Preset Selector */}
      <Select value={currentPreset || 'all'} onValueChange={handleDatePresetChange}>
        <SelectTrigger className="w-[130px] h-9">
          <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Fecha" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="hoy">Hoy</SelectItem>
          <SelectItem value="ayer">Ayer</SelectItem>
          <SelectItem value="semana">Esta semana</SelectItem>
          <SelectItem value="mes">Este mes</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom Date Range */}
      {currentPreset === 'custom' && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                {filters.fechaDesde ? format(new Date(filters.fechaDesde + 'T12:00:00'), 'dd/MM') : 'Desde'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.fechaDesde ? new Date(filters.fechaDesde + 'T12:00:00') : undefined}
                onSelect={(date) => date && onFiltersChange({ 
                  ...filters, 
                  fechaDesde: format(date, 'yyyy-MM-dd') 
                })}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <span>-</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                {filters.fechaHasta ? format(new Date(filters.fechaHasta + 'T12:00:00'), 'dd/MM') : 'Hasta'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.fechaHasta ? new Date(filters.fechaHasta + 'T12:00:00') : undefined}
                onSelect={(date) => date && onFiltersChange({ 
                  ...filters, 
                  fechaHasta: format(date, 'yyyy-MM-dd') 
                })}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Obra Selector */}
      <Select value={filters.obraId || 'todas'} onValueChange={handleObraChange}>
        <SelectTrigger className="w-[160px] h-9">
          <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Obra" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas las obras</SelectItem>
          {obras.map((obra) => (
            <SelectItem key={obra.id} value={obra.id}>
              {obra.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Estado Selector */}
      <Select value={filters.estado || 'todos'} onValueChange={handleEstadoChange}>
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="completado">Completados</SelectItem>
          <SelectItem value="borrador">Borradores</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {activeFiltersCount > 0 && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearFilters}
          className="h-9 text-muted-foreground"
        >
          <Filter className="h-4 w-4 mr-1" />
          Limpiar ({activeFiltersCount})
        </Button>
      )}
    </div>
  );
}

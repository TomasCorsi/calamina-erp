import { useState, useMemo, useEffect } from "react";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, endOfDay, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import { Calendar as CalendarIcon, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MultiSelectFilter } from "@/components/shared/MultiSelectFilter";
import { useUrlFilters, UrlFilterState } from "@/hooks/useUrlState";


interface Obra {
  id: string;
  nombre: string;
}

interface Maquinaria {
  id: string;
  codigo: string | null;
  nombre: string | null;
  tipo: string;
  patente: string | null;
}

interface FilterBarProps {
  obras: Obra[];
  maquinarias?: Maquinaria[];
  onFilterChange: (filters: FilterState) => void;
  showObraFilter?: boolean;
  showMaquinariaFilter?: boolean;
  persistKey?: string;
  /** Habilita selección múltiple en Obra y Maquinaria */
  multiple?: boolean;
}

export interface FilterState {
  fechaDesde: Date | undefined;
  fechaHasta: Date | undefined;
  mes: string | undefined;
  obraId: string | undefined;
  maquinariaId?: string | undefined;
  obraIds?: string[];
  maquinariaIds?: string[];
}


const MESES = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

export function FilterBar({ obras, maquinarias, onFilterChange, showObraFilter = true, showMaquinariaFilter = false, multiple = false }: FilterBarProps) {
  const currentYear = new Date().getFullYear();
  
  const years = useMemo(() => {
    const result = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      result.push(y);
    }
    return result;
  }, [currentYear]);

  // Usar hook de URL para persistir filtros
  const [urlFilters, setUrlFilters] = useUrlFilters({
    year: currentYear,
  });
  
  // Estados locales derivados de URL
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(() => 
    urlFilters.fechaDesde ? parseISO(urlFilters.fechaDesde) : undefined
  );
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(() =>
    urlFilters.fechaHasta ? parseISO(urlFilters.fechaHasta) : undefined
  );
  const [mes, setMes] = useState<string | undefined>(urlFilters.mes);
  const [obraId, setObraId] = useState<string | undefined>(urlFilters.obraId);
  const [maquinariaId, setMaquinariaId] = useState<string | undefined>(urlFilters.maquinariaId);
  const [selectedYear, setSelectedYear] = useState<number>(urlFilters.year || currentYear);

  const toList = (v: string | undefined) => (v ? v.split(",").filter(Boolean) : []);
  const obraIds = toList(obraId);
  const maquinariaIds = toList(maquinariaId);

  const emit = (f: FilterState) => {
    if (multiple) {
      onFilterChange({
        ...f,
        obraId: undefined,
        maquinariaId: undefined,
        obraIds: toList(f.obraId),
        maquinariaIds: toList(f.maquinariaId),
      });
    } else {
      onFilterChange(f);
    }
  };


  useEffect(() => {
    if (urlFilters.fechaDesde || urlFilters.fechaHasta || urlFilters.mes || urlFilters.obraId || urlFilters.maquinariaId) {
      emit({
        fechaDesde: urlFilters.fechaDesde ? parseISO(urlFilters.fechaDesde) : undefined,
        fechaHasta: urlFilters.fechaHasta ? parseISO(urlFilters.fechaHasta) : undefined,
        mes: urlFilters.mes,
        obraId: urlFilters.obraId,
        maquinariaId: urlFilters.maquinariaId,
      });
    } else {
      // Sin filtros persistidos: por defecto aplicar el año actual completo
      const yearDate = new Date(selectedYear, 0, 1);
      const desde = startOfYear(yearDate);
      const hasta = endOfYear(yearDate);
      setFechaDesde(desde);
      setFechaHasta(hasta);
      emit({ fechaDesde: desde, fechaHasta: hasta, mes: undefined, obraId: undefined, maquinariaId: undefined });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleMesChange = (value: string) => {
    if (value === "none") {
      // Sin mes: aplicar rango del año completo seleccionado
      const yearDate = new Date(selectedYear, 0, 1);
      const desde = startOfYear(yearDate);
      const hasta = endOfYear(yearDate);
      setMes(undefined);
      setFechaDesde(desde);
      setFechaHasta(hasta);
      setUrlFilters({
        mes: undefined,
        year: selectedYear,
        fechaDesde: format(desde, "yyyy-MM-dd"),
        fechaHasta: format(hasta, "yyyy-MM-dd"),
      });
      emit({ fechaDesde: desde, fechaHasta: hasta, mes: undefined, obraId, maquinariaId });
    } else {
      setMes(value);
      const monthDate = parseISO(`${selectedYear}-${value}-01`);
      const desde = startOfMonth(monthDate);
      const hasta = endOfMonth(monthDate);
      setFechaDesde(desde);
      setFechaHasta(hasta);
      setUrlFilters({ 
        mes: value, 
        year: selectedYear,
        fechaDesde: format(desde, "yyyy-MM-dd"),
        fechaHasta: format(hasta, "yyyy-MM-dd"),
      });
      emit({ fechaDesde: desde, fechaHasta: hasta, mes: value, obraId, maquinariaId });
    }
  };

  const handleYearChange = (value: string) => {
    const year = parseInt(value);
    setSelectedYear(year);
    if (mes) {
      const monthDate = parseISO(`${year}-${mes}-01`);
      const desde = startOfMonth(monthDate);
      const hasta = endOfMonth(monthDate);
      setFechaDesde(desde);
      setFechaHasta(hasta);
      setUrlFilters({ 
        year, 
        mes,
        fechaDesde: format(desde, "yyyy-MM-dd"),
        fechaHasta: format(hasta, "yyyy-MM-dd"),
      });
      emit({ fechaDesde: desde, fechaHasta: hasta, mes, obraId, maquinariaId });
    } else {
      // Sin mes: aplicar rango del año completo
      const yearDate = new Date(year, 0, 1);
      const desde = startOfYear(yearDate);
      const hasta = endOfYear(yearDate);
      setFechaDesde(desde);
      setFechaHasta(hasta);
      setUrlFilters({
        year,
        fechaDesde: format(desde, "yyyy-MM-dd"),
        fechaHasta: format(hasta, "yyyy-MM-dd"),
      });
      emit({ fechaDesde: desde, fechaHasta: hasta, mes: undefined, obraId, maquinariaId });
    }
  };


  const handleFechaDesdeChange = (date: Date | undefined) => {
    setFechaDesde(date);
    setMes(undefined);
    setUrlFilters({ 
      fechaDesde: date ? date.toISOString().split("T")[0] : undefined,
      mes: undefined,
    });
    emit({ fechaDesde: date, fechaHasta, mes: undefined, obraId, maquinariaId });
  };

  const handleFechaHastaChange = (date: Date | undefined) => {
    setFechaHasta(date);
    setMes(undefined);
    setUrlFilters({ 
      fechaHasta: date ? date.toISOString().split("T")[0] : undefined,
      mes: undefined,
    });
    emit({ fechaDesde, fechaHasta: date, mes: undefined, obraId, maquinariaId });
  };

  const handleObraChange = (value: string) => {
    const newObraId = value === "none" ? undefined : value;
    setObraId(newObraId);
    setUrlFilters({ obraId: newObraId });
    emit({ fechaDesde, fechaHasta, mes, obraId: newObraId, maquinariaId });
  };

  const handleMaquinariaChange = (value: string) => {
    const newMaquinariaId = value === "none" ? undefined : value;
    setMaquinariaId(newMaquinariaId);
    setUrlFilters({ maquinariaId: newMaquinariaId });
    emit({ fechaDesde, fechaHasta, mes, obraId, maquinariaId: newMaquinariaId });
  };

  const clearFilters = () => {
    const yearDate = new Date(currentYear, 0, 1);
    const desde = startOfYear(yearDate);
    const hasta = endOfYear(yearDate);
    setFechaDesde(desde);
    setFechaHasta(hasta);
    setMes(undefined);
    setObraId(undefined);
    setMaquinariaId(undefined);
    setSelectedYear(currentYear);
    setUrlFilters({
      fechaDesde: format(desde, "yyyy-MM-dd"),
      fechaHasta: format(hasta, "yyyy-MM-dd"),
      mes: undefined,
      obraId: undefined,
      maquinariaId: undefined,
      year: currentYear,
    });
    emit({ fechaDesde: desde, fechaHasta: hasta, mes: undefined, obraId: undefined, maquinariaId: undefined });
  };

  const hasActiveFilters = mes || obraId || maquinariaId || selectedYear !== currentYear;


  // Build maquinaria options for the select
  const maquinariaOptions = useMemo(() => {
    if (!maquinarias) return [];
    return maquinarias
      .map(m => ({
        id: m.id,
        label: [m.codigo, m.nombre || m.tipo, m.patente].filter(Boolean).join(' - '),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [maquinarias]);

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border/50">
      <Filter className="w-4 h-4 text-muted-foreground" />
      
      {/* Year Selector */}
      <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[100px] h-9">
          <SelectValue placeholder="Año" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Month Selector */}
      <Select value={mes || "none"} onValueChange={handleMesChange}>
        <SelectTrigger className="w-[130px] h-9">
          <SelectValue placeholder="Mes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Todos los meses</SelectItem>
          {MESES.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Date From */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 justify-start text-left font-normal",
              !fechaDesde && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {fechaDesde ? format(fechaDesde, "dd/MM/yyyy") : "Desde"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={fechaDesde}
            onSelect={handleFechaDesdeChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Date To */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-9 justify-start text-left font-normal",
              !fechaHasta && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {fechaHasta ? format(fechaHasta, "dd/MM/yyyy") : "Hasta"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={fechaHasta}
            onSelect={handleFechaHastaChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {showObraFilter && (
        <>
          <div className="h-6 w-px bg-border mx-1" />

          {/* Obra Selector */}
          {multiple ? (
            <MultiSelectFilter
              className="w-[200px]"
              allLabel="Todas las obras"
              itemsLabel="obras"
              placeholder="Buscar obra..."
              options={obras.map((o) => ({ value: o.id, label: o.nombre }))}
              selected={obraIds}
              onChange={(vals) => handleObraChange(vals.length ? vals.join(",") : "none")}
            />
          ) : (
            <Select value={obraId || "none"} onValueChange={handleObraChange}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Obra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Todas las obras</SelectItem>
                {obras.map((obra) => (
                  <SelectItem key={obra.id} value={obra.id}>
                    {obra.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </>
      )}

      {showMaquinariaFilter && maquinarias && maquinarias.length > 0 && (
        <>
          <div className="h-6 w-px bg-border mx-1" />

          {/* Maquinaria Selector */}
          {multiple ? (
            <MultiSelectFilter
              className="w-[220px]"
              allLabel="Todas las maquinarias"
              itemsLabel="maquinarias"
              placeholder="Buscar maquinaria..."
              options={maquinariaOptions.map((m) => ({ value: m.id, label: m.label }))}
              selected={maquinariaIds}
              onChange={(vals) => handleMaquinariaChange(vals.length ? vals.join(",") : "none")}
            />
          ) : (
            <Select value={maquinariaId || "none"} onValueChange={handleMaquinariaChange}>
              <SelectTrigger className="w-[220px] h-9">
                <SelectValue placeholder="Maquinaria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Todas las maquinarias</SelectItem>
                {maquinariaOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

        </>
      )}

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 px-2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  );
}

// Helper function to filter data by date range and obra
export function filterByDateAndObra<T extends { fecha?: string | null; obra_id?: string | null; maquinaria_id?: string | null }>(
  data: T[],
  filters: FilterState
): T[] {
  return data.filter((item) => {
    // Filter by date range (parseISO + day-bound to avoid TZ shift)
    if (filters.fechaDesde || filters.fechaHasta) {
      if (!item.fecha) return false;
      const itemDate = parseISO(item.fecha);

      if (filters.fechaDesde && itemDate < startOfDay(filters.fechaDesde)) return false;
      if (filters.fechaHasta && itemDate > endOfDay(filters.fechaHasta)) return false;
    }


    // Filter by obra
    if (filters.obraId && item.obra_id !== filters.obraId) {
      return false;
    }

    // Filter by maquinaria
    if (filters.maquinariaId && item.maquinaria_id !== filters.maquinariaId) {
      return false;
    }

    return true;
  });
}

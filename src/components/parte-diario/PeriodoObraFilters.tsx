import { useMemo } from "react";
import { format, startOfMonth, startOfYear, subDays, subMonths, endOfMonth } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { toast } from "sonner";
import type { ObraWithRelations } from "@/hooks/useObras";

interface PeriodoObraFiltersProps {
  fechaDesde: Date;
  fechaHasta: Date;
  obraId: string;
  obras: ObraWithRelations[];
  onFechaDesdeChange: (d: Date) => void;
  onFechaHastaChange: (d: Date) => void;
  onObraChange: (id: string) => void;
}

export const PeriodoObraFilters = ({
  fechaDesde,
  fechaHasta,
  obraId,
  obras,
  onFechaDesdeChange,
  onFechaHastaChange,
  onObraChange,
}: PeriodoObraFiltersProps) => {
  const obraOptions: ComboboxOption[] = useMemo(() => {
    return [
      { value: "__all__", label: "Todas las obras", searchValue: "todas" },
      ...obras.map(o => ({
        value: o.id,
        label: o.numero ? `${o.numero} - ${o.nombre}` : o.nombre,
        searchValue: `${o.numero || ""} ${o.nombre}`,
      })),
    ];
  }, [obras]);

  const handleDesdeChange = (d: Date | undefined) => {
    if (!d) return;
    if (d > fechaHasta) {
      toast.error("La fecha 'Desde' no puede ser mayor que 'Hasta'");
      return;
    }
    onFechaDesdeChange(d);
  };

  const handleHastaChange = (d: Date | undefined) => {
    if (!d) return;
    if (d < fechaDesde) {
      toast.error("La fecha 'Hasta' no puede ser menor que 'Desde'");
      return;
    }
    onFechaHastaChange(d);
  };

  const setRange = (desde: Date, hasta: Date) => {
    onFechaDesdeChange(desde);
    onFechaHastaChange(hasta);
  };

  const today = new Date();
  const startMesActual = startOfMonth(today);
  const inicioMesAnterior = startOfMonth(subMonths(today, 1));
  const finMesAnterior = endOfMonth(subMonths(today, 1));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Combobox
          options={obraOptions}
          value={obraId || "__all__"}
          onValueChange={(v) => onObraChange(v === "__all__" ? "" : v)}
          placeholder="Obra"
          searchPlaceholder="Buscar obra..."
          emptyText="Sin resultados"
          className="w-[240px]"
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[150px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(fechaDesde, "dd/MM/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fechaDesde}
              onSelect={handleDesdeChange}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <span className="text-sm text-muted-foreground">al</span>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[150px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(fechaHasta, "dd/MM/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fechaHasta}
              onSelect={handleHastaChange}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button variant="outline" size="sm" onClick={() => setRange(startMesActual, today)}>
          Mes actual
        </Button>
        <Button variant="outline" size="sm" onClick={() => setRange(inicioMesAnterior, finMesAnterior)}>
          Mes anterior
        </Button>
        <Button variant="outline" size="sm" onClick={() => setRange(subDays(today, 29), today)}>
          Últimos 30 días
        </Button>
        <Button variant="outline" size="sm" onClick={() => setRange(startOfYear(today), today)}>
          Año actual
        </Button>
      </div>
    </div>
  );
};

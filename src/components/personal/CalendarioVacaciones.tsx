import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Circle,
  CalendarDays,
} from "lucide-react";
import { VacacionDB } from "@/hooks/useVacaciones";
import { cn } from "@/lib/utils";
import {
  startOfMonth,
  endOfMonth,
  format,
  addMonths,
  subMonths,
  parseISO,
  isWithinInterval,
  eachDayOfInterval,
} from "date-fns";
import { es } from "date-fns/locale";

interface CalendarioVacacionesProps {
  vacaciones: VacacionDB[];
}

const MOTIVO_LABELS: Record<string, string> = {
  vacaciones: "Vacaciones",
  licencia_medica: "Licencia Médica",
  permiso_personal: "Permiso Personal",
  otro: "Otro",
};

function formatNombreCompleto(nombre: string | null, apellido: string | null): string {
  if (!apellido && !nombre) return "Sin nombre";
  return `${apellido || ""}, ${nombre || ""}`.trim();
}

function formatRangoFechas(fechaInicio: string, fechaFin: string): string {
  const inicio = parseISO(fechaInicio);
  const fin = parseISO(fechaFin);
  return `${format(inicio, "dd/MM")} - ${format(fin, "dd/MM")}`;
}

export function CalendarioVacaciones({ vacaciones }: CalendarioVacacionesProps) {
  const [mesActual, setMesActual] = useState(new Date());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Filtrar vacaciones del mes actual
  const vacacionesDelMes = useMemo(() => {
    const inicioMes = startOfMonth(mesActual);
    const finMes = endOfMonth(mesActual);

    return vacaciones
      .filter(v => {
        const inicio = parseISO(v.fecha_inicio);
        const fin = parseISO(v.fecha_fin);
        // La licencia toca el mes si termina después del inicio del mes Y empieza antes del fin del mes
        return fin >= inicioMes && inicio <= finMes;
      })
      .sort((a, b) => parseISO(a.fecha_inicio).getTime() - parseISO(b.fecha_inicio).getTime());
  }, [vacaciones, mesActual]);

  // Filtrar por día seleccionado si hay uno
  const vacacionesFiltradas = useMemo(() => {
    if (!selectedDate) return vacacionesDelMes;
    
    return vacacionesDelMes.filter(v => {
      const inicio = parseISO(v.fecha_inicio);
      const fin = parseISO(v.fecha_fin);
      return isWithinInterval(selectedDate, { start: inicio, end: fin });
    });
  }, [vacacionesDelMes, selectedDate]);

  // Días con licencias para marcar en el mini-calendario
  const diasConLicencias = useMemo(() => {
    const inicioMes = startOfMonth(mesActual);
    const finMes = endOfMonth(mesActual);
    const dias = eachDayOfInterval({ start: inicioMes, end: finMes });
    
    return dias.filter(dia => {
      return vacacionesDelMes.some(v => {
        const inicio = parseISO(v.fecha_inicio);
        const fin = parseISO(v.fecha_fin);
        return isWithinInterval(dia, { start: inicio, end: fin });
      });
    });
  }, [vacacionesDelMes, mesActual]);

  const mesAnterior = () => {
    setMesActual(prev => subMonths(prev, 1));
    setSelectedDate(undefined);
  };
  
  const mesSiguiente = () => {
    setMesActual(prev => addMonths(prev, 1));
    setSelectedDate(undefined);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date && selectedDate && format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")) {
      setSelectedDate(undefined);
    } else {
      setSelectedDate(date);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-4">
      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={mesAnterior}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold text-foreground capitalize min-w-48 text-center">
            {format(mesActual, "MMMM yyyy", { locale: es })}
          </h2>
          <Button variant="outline" size="icon" onClick={mesSiguiente}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Leyenda simple */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Circle className="w-3 h-3 fill-green-500 text-green-500" />
            <span className="text-muted-foreground">Pagada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Circle className="w-3 h-3 fill-yellow-500 text-yellow-500" />
            <span className="text-muted-foreground">No pagada</span>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Mini-Calendario */}
        <Card className="shrink-0">
          <CardContent className="p-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              month={mesActual}
              onMonthChange={setMesActual}
              locale={es}
              className="pointer-events-auto"
              modifiers={{
                hasVacation: diasConLicencias,
              }}
              modifiersStyles={{
                hasVacation: {
                  backgroundColor: "hsl(var(--primary) / 0.15)",
                  fontWeight: "bold",
                },
              }}
              components={{
                IconLeft: () => null,
                IconRight: () => null,
              }}
            />
            {selectedDate && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-2"
                onClick={() => setSelectedDate(undefined)}
              >
                Mostrar todas
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Lista de licencias */}
        <div className="flex-1 space-y-2">
          {vacacionesFiltradas.length === 0 ? (
            <Card className="p-8 text-center">
              <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {selectedDate 
                  ? `No hay licencias para el ${format(selectedDate, "d 'de' MMMM", { locale: es })}`
                  : "No hay licencias registradas para este mes"
                }
              </p>
            </Card>
          ) : (
            vacacionesFiltradas.map((vacacion) => {
              const isPagada = vacacion.pagada;
              const isExpanded = expandedId === vacacion.id;

              return (
                <Collapsible 
                  key={vacacion.id} 
                  open={isExpanded}
                  onOpenChange={() => toggleExpand(vacacion.id)}
                >
                  <Card className={cn(
                    "transition-all hover:bg-muted/50",
                    isExpanded && "ring-1 ring-primary"
                  )}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center gap-4 p-4">
                        {/* Indicador de estado de pago */}
                        <Circle 
                          className={cn(
                            "w-3 h-3 shrink-0",
                            isPagada 
                              ? "fill-green-500 text-green-500" 
                              : "fill-yellow-500 text-yellow-500"
                          )} 
                        />
                        
                        {/* Rango de fechas */}
                        <span className="text-sm font-mono text-muted-foreground min-w-24">
                          {formatRangoFechas(vacacion.fecha_inicio, vacacion.fecha_fin)}
                        </span>
                        
                        {/* Nombre del empleado */}
                        <span className="font-medium text-foreground flex-1 text-left">
                          {formatNombreCompleto(
                            vacacion.personal?.nombre || null,
                            vacacion.personal?.apellido || null
                          )}
                        </span>
                        
                        {/* Motivo */}
                        <span className="text-sm text-muted-foreground">
                          {MOTIVO_LABELS[vacacion.motivo] || vacacion.motivo}
                        </span>
                        
                        {/* Días */}
                        <span className="text-sm font-medium text-foreground min-w-16 text-right">
                          {vacacion.dias_totales} días
                        </span>
                        
                        {/* Chevron */}
                        <ChevronDown 
                          className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform",
                            isExpanded && "rotate-180"
                          )} 
                        />
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-0 border-t border-border mt-0">
                        <div className="grid grid-cols-2 gap-4 pt-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Legajo:</span>
                            <span className="ml-2 font-medium">{vacacion.personal?.legajo || "-"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Pago:</span>
                            <span className={cn(
                              "ml-2 font-medium",
                              isPagada ? "text-green-500" : "text-yellow-500"
                            )}>
                              {isPagada ? "Pagada" : "No pagada"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Desde:</span>
                            <span className="ml-2 font-medium">
                              {format(parseISO(vacacion.fecha_inicio), "dd/MM/yyyy")}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Hasta:</span>
                            <span className="ml-2 font-medium">
                              {format(parseISO(vacacion.fecha_fin), "dd/MM/yyyy")}
                            </span>
                          </div>
                          {vacacion.observaciones && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Observaciones:</span>
                              <p className="mt-1 text-foreground">{vacacion.observaciones}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

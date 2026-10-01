import { useMemo } from "react";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Clock, 
  Eye, 
  Pencil,
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Building2,
  Wrench,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ParteDiario } from "@/hooks/useParteDiario";

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

interface ParteDiarioCardViewProps {
  partes: ParteDiario[];
  onView: (parte: ParteDiario) => void;
  onEdit: (parte: ParteDiario) => void;
  onDelete: (parte: ParteDiario) => void;
}

export function ParteDiarioCardView({ partes, onView, onEdit, onDelete }: ParteDiarioCardViewProps) {
  // Group partes by date
  const partesByDate = useMemo(() => {
    const grouped = partes.reduce((acc, parte) => {
      const fecha = parte.fecha;
      if (!acc[fecha]) acc[fecha] = [];
      acc[fecha].push(parte);
      return acc;
    }, {} as Record<string, ParteDiario[]>);

    // Sort by date descending
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([fecha, items]) => ({
        fecha,
        partes: items,
        completados: items.filter(p => p.estado === 'completado').length,
        total: items.length,
      }));
  }, [partes]);

  const formatDateHeader = (fechaStr: string) => {
    const date = parseISO(fechaStr);
    if (isToday(date)) return "Hoy";
    if (isYesterday(date)) return "Ayer";
    return format(date, "EEEE dd/MM", { locale: es });
  };

  const formatTime = (time: string | null) => {
    if (!time) return "-";
    return time.slice(0, 5);
  };

  const getEmpleadoNombre = (parte: ParteDiario) => {
    if (!parte.personal) return "Sin asignar";
    const { nombre, apellido } = parte.personal;
    return [nombre, apellido].filter(Boolean).join(" ") || "Sin nombre";
  };

  const getEmpleadoRol = (parte: ParteDiario) => {
    if (!parte.personal) return "";
    return ROL_LABELS[parte.personal.rol] || parte.personal.rol;
  };

  const getMaquinariaLabel = (parte: ParteDiario) => {
    if (!parte.maquinarias) return null;
    const { codigo, patente } = parte.maquinarias;
    return codigo + (patente ? ` (${patente})` : "");
  };

  if (partes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No hay partes diarios que coincidan con los filtros</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {partesByDate.map(({ fecha, partes: dayPartes, completados, total }) => (
        <Collapsible key={fecha} defaultOpen={isToday(parseISO(fecha)) || isYesterday(parseISO(fecha))}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              className="w-full justify-between px-3 py-2 h-auto hover:bg-muted/50"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold capitalize">
                  📅 {formatDateHeader(fecha)}
                </span>
                <span className="text-sm text-muted-foreground">
                  - {format(parseISO(fecha), "dd/MM/yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {total} partes - {completados} completados
                </Badge>
                <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {dayPartes.map((parte) => (
                <Card 
                  key={parte.id} 
                  className={cn(
                    "hover:shadow-md transition-shadow cursor-pointer",
                    parte.estado === 'borrador' && "border-chart-3/50"
                  )}
                  onClick={() => onView(parte)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{getEmpleadoNombre(parte)}</h4>
                        <p className="text-sm text-muted-foreground">{getEmpleadoRol(parte)}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          parte.estado === "borrador"
                            ? "border-chart-3 text-chart-3 bg-chart-3/10"
                            : "bg-chart-1/10 text-chart-1 border-chart-1/30"
                        )}
                      >
                        {parte.estado === "borrador" ? (
                          <><AlertCircle className="w-3 h-3 mr-1" /> Borrador</>
                        ) : (
                          <><CheckCircle className="w-3 h-3 mr-1" /> Completado</>
                        )}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="w-4 h-4" />
                        <span className="truncate">{parte.obras?.nombre || "-"}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(parte.hora_entrada)} → {formatTime(parte.hora_salida)}</span>
                      </div>

                      {getMaquinariaLabel(parte) && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Wrench className="w-4 h-4" />
                          <span className="truncate">{getMaquinariaLabel(parte)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-1 mt-3 pt-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onView(parte);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(parte);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(parte);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

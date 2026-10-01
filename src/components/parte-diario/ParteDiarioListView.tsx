import { useState, useMemo } from "react";
import { ArrowLeft, FileEdit, CheckCircle, Clock, Calendar, Lock, Pencil, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ParteDiario } from "@/hooks/useParteDiario";
import { ParteDiarioDetailDialog } from "./ParteDiarioDetailDialog";

interface ParteDiarioListViewProps {
  partes: ParteDiario[];
  onBack: () => void;
  onEdit: (parte: ParteDiario) => void;
}

export const ParteDiarioListView = ({
  partes,
  onBack,
  onEdit,
}: ParteDiarioListViewProps) => {
  const [viewingParte, setViewingParte] = useState<ParteDiario | null>(null);

  // Pre-compute date-derived flags once per partes list (avoid re-parsing per render)
  const partesEnriquecidos = useMemo(() => {
    return partes.map((parte) => {
      const parteDate = parseISO(parte.fecha);
      const isHoy = isToday(parteDate);
      const isAyer = isYesterday(parteDate);
      return {
        parte,
        isBorrador: (parte as any).estado === 'borrador',
        isHoy,
        isAyer,
        canEdit: isHoy || isAyer,
        fechaLabel: format(parteDate, "EEEE d 'de' MMMM", { locale: es }),
      };
    });
  }, [partes]);

  const handleCardClick = (parte: ParteDiario, canEdit: boolean) => {
    if (canEdit) {
      onEdit(parte);
    } else {
      setViewingParte(parte);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Mis Partes</h1>
          <p className="text-sm text-muted-foreground">{partes.length} registros</p>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {partesEnriquecidos.map(({ parte, isBorrador, isHoy, isAyer, canEdit, fechaLabel }) => {
          return (
            <Card 
              key={parte.id} 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                isBorrador && "border-amber-500/50 bg-amber-500/5",
                !canEdit && "opacity-90"
              )}
              onClick={() => handleCardClick(parte, canEdit)}
            >
              <CardContent className="py-4 px-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {fechaLabel}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      {parte.hora_entrada && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {parte.hora_entrada.slice(0, 5)}
                          {parte.hora_salida && ` - ${parte.hora_salida.slice(0, 5)}`}
                        </span>
                      )}
                      {parte.maquinarias && (
                        <span>• {parte.maquinarias.codigo || parte.maquinarias.tipo}</span>
                      )}
                      {parte.obras && (
                        <span className="truncate">• {parte.obras.nombre}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    {/* Estado borrador/completado */}
                    <Badge 
                      variant={isBorrador ? "outline" : "secondary"}
                      className={cn(
                        "text-xs",
                        isBorrador 
                          ? "border-amber-500 text-amber-600 bg-amber-500/10" 
                          : "bg-green-500/10 text-green-600 border-green-500/30"
                      )}
                    >
                      {isBorrador ? (
                        <>
                          <FileEdit className="w-3 h-3 mr-1" />
                          Borrador
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completado
                        </>
                      )}
                    </Badge>
                    
                    {/* Estado máquina */}
                    {parte.estado_maquina && (
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        parte.estado_maquina === 'OK' 
                          ? "bg-green-500/10 text-green-600"
                          : "bg-amber-500/10 text-amber-600"
                      )}>
                        {parte.estado_maquina}
                      </span>
                    )}
                    
                     {/* Indicador de editable/ver detalle */}
                     {canEdit ? (
                       <span className="flex items-center gap-1 text-xs text-primary">
                         <Pencil className="w-3 h-3" />
                         {isAyer ? "Editar (ayer)" : "Editar"}
                       </span>
                     ) : (
                       <span className="flex items-center gap-1 text-xs text-muted-foreground">
                         <Eye className="w-3 h-3" />
                         Ver detalle
                       </span>
                     )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {partes.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No hay partes registrados</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detail Dialog for past entries */}
      <ParteDiarioDetailDialog
        parte={viewingParte}
        open={!!viewingParte}
        onOpenChange={(open) => !open && setViewingParte(null)}
      />
    </div>
  );
};

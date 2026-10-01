import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, Fuel, CheckCircle, XCircle, Users, Wrench, AlertTriangle, ClipboardList, Gauge } from "lucide-react";
import { DetailDialog } from "@/components/shared/DetailDialog";
import { DetailRow, DetailSection } from "@/components/shared/DetailRow";
import { Badge } from "@/components/ui/badge";
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

interface ParteDiarioDetailDialogProps {
  parte: ParteDiario | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showEmpleado?: boolean;
  personalList?: Array<{ id: string; nombre: string | null; apellido: string | null }>;
}

export const ParteDiarioDetailDialog = ({
  parte,
  open,
  onOpenChange,
  showEmpleado = false,
  personalList = [],
}: ParteDiarioDetailDialogProps) => {
  if (!parte) return null;

  const formatTime = (time: string | null) => {
    if (!time) return "-";
    return time.slice(0, 5);
  };

  const checklistItems = [
    { key: 'check_filtro_aire', label: 'Filtro de aire' },
    { key: 'check_aceite_motor', label: 'Aceite motor' },
    { key: 'check_aceite_hidraulico', label: 'Aceite hidráulico' },
    { key: 'check_liquido_refrigerante', label: 'Líquido refrigerante' },
    { key: 'check_uria', label: 'Uría' },
  ];

  const activeChecks = checklistItems.filter(
    item => parte[item.key as keyof ParteDiario]
  );

  const getEmpleadoNombre = () => {
    if (!parte.personal) return "Sin asignar";
    const { nombre, apellido } = parte.personal;
    return [nombre, apellido].filter(Boolean).join(" ") || "Sin nombre";
  };

  const getEmpleadoRol = () => {
    if (!parte.personal) return "";
    return ROL_LABELS[parte.personal.rol] || parte.personal.rol;
  };

  const getAusenciasNombres = () => {
    if (!parte.ausencias || parte.ausencias.length === 0 || personalList.length === 0) return [];
    return parte.ausencias.map(id => {
      const emp = personalList.find(p => p.id === id);
      return emp ? `${emp.apellido || ''}, ${emp.nombre || ''}`.trim() : id;
    });
  };

  return (
    <DetailDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Detalle del Parte Diario"
      size="md"
    >
      <div className="space-y-6">
        {/* Header con fecha y estado */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold text-foreground">
                {format(parseISO(parte.fecha), "EEEE d 'de' MMMM, yyyy", { locale: es })}
              </p>
              {showEmpleado && parte.personal && (
                <p className="text-sm text-muted-foreground">
                  {getEmpleadoNombre()} • {getEmpleadoRol()}
                </p>
              )}
            </div>
          </div>
          <Badge 
            variant="secondary"
            className={cn(
              "text-xs",
              parte.estado === 'borrador' 
                ? "border-amber-500 text-amber-600 bg-amber-500/10" 
                : "bg-green-500/10 text-green-600 border-green-500/30"
            )}
          >
            {parte.estado === 'borrador' ? 'Borrador' : 'Completado'}
          </Badge>
        </div>

        {/* Información General */}
        <DetailSection title="Información General">
          <DetailRow 
            label="Horario" 
            value={
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(parte.hora_entrada)} - {formatTime(parte.hora_salida)}
              </span>
            } 
          />
          {parte.obras && (
            <DetailRow label="Obra" value={parte.obras.nombre} />
          )}
          {parte.maquinarias && (
            <DetailRow 
              label="Máquina" 
              value={`${parte.maquinarias.codigo || parte.maquinarias.tipo} ${parte.maquinarias.patente ? `(${parte.maquinarias.patente})` : ''}`} 
            />
          )}
        </DetailSection>

        {/* Datos de Trabajo */}
        {(parte.horometro_inicio > 0 || parte.horometro_fin > 0 || parte.combustible > 0 || parte.cantidad_viajes > 0) && (
          <DetailSection title="Datos de Trabajo">
            {(parte.horometro_inicio > 0 || parte.horometro_fin > 0) && (
              <DetailRow 
                label="Horómetro" 
                value={`${parte.horometro_inicio} → ${parte.horometro_fin} (${(parte.horometro_fin - parte.horometro_inicio).toFixed(1)} hrs)`} 
              />
            )}
            {parte.combustible > 0 && (
              <DetailRow 
                label="Combustible" 
                value={
                  <span className="flex items-center gap-1">
                    <Fuel className="w-3 h-3" />
                    {parte.combustible} litros
                  </span>
                } 
              />
            )}
            {parte.cantidad_viajes > 0 && (
              <DetailRow label="Viajes" value={parte.cantidad_viajes} />
            )}
            {parte.cantidad_movimiento_interno > 0 && (
              <DetailRow label="Movimiento Interno" value={parte.cantidad_movimiento_interno} />
            )}
            {parte.km_camion > 0 && (
              <DetailRow 
                label="KM Camión" 
                value={
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3 h-3" />
                    {parte.km_camion} km
                  </span>
                } 
              />
            )}
          </DetailSection>
        )}

        {/* Estado de la Máquina */}
        {parte.estado_maquina && (
          <DetailSection title="Estado de la Máquina">
            <div className="flex items-center gap-2">
              <span className={cn(
                "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
                parte.estado_maquina === 'OK' 
                  ? "bg-green-500/10 text-green-600"
                  : "bg-amber-500/10 text-amber-600"
              )}>
                {parte.estado_maquina === 'OK' ? (
                  <><CheckCircle className="w-4 h-4" /> OK</>
                ) : (
                  <><XCircle className="w-4 h-4" /> OBSERVACIÓN</>
                )}
              </span>
            </div>
            {parte.observacion_maquina && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">{parte.observacion_maquina}</p>
              </div>
            )}
          </DetailSection>
        )}

        {/* Checklist */}
        {activeChecks.length > 0 && (
          <DetailSection title="Checklist Completado">
            <div className="flex flex-wrap gap-2">
              {activeChecks.map(item => (
                <span 
                  key={item.key}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                >
                  <CheckCircle className="w-3 h-3" />
                  {item.label}
                </span>
              ))}
            </div>
          </DetailSection>
        )}

        {/* Novedades (Capataz) */}
        {parte.novedades && (
          <DetailSection title="Novedades del Día">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-2">
                <ClipboardList className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm whitespace-pre-wrap">{parte.novedades}</p>
              </div>
            </div>
          </DetailSection>
        )}

        {/* Ausencias (Capataz) */}
        {parte.ausencias && parte.ausencias.length > 0 && (
          <DetailSection title="Ausencias Registradas">
            <div className="flex flex-wrap gap-2">
              {getAusenciasNombres().map((nombre, idx) => (
                <Badge 
                  key={idx} 
                  variant="secondary" 
                  className="bg-chart-3/10 text-chart-3 border-chart-3/30"
                >
                  <Users className="w-3 h-3 mr-1" />
                  {nombre}
                </Badge>
              ))}
            </div>
          </DetailSection>
        )}

        {/* Tareas (Mecánico/Ayudante) */}
        {parte.tareas && (
          <DetailSection title="Tareas Realizadas">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-start gap-2">
                <Wrench className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm whitespace-pre-wrap">{parte.tareas}</p>
              </div>
            </div>
          </DetailSection>
        )}

        {/* Observaciones/Inconvenientes (TODOS) */}
        {parte.observaciones_inconvenientes && (
          <DetailSection title="Observaciones / Inconvenientes">
            <div className="p-3 bg-chart-3/10 rounded-lg border border-chart-3/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-chart-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm whitespace-pre-wrap">{parte.observaciones_inconvenientes}</p>
              </div>
            </div>
          </DetailSection>
        )}
      </div>
    </DetailDialog>
  );
};

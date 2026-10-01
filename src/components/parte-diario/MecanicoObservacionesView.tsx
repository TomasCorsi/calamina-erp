import { useState } from "react";
import { ArrowLeft, Bell, Wrench, CheckCircle2, ChevronDown, ChevronUp, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { useObservacionesMaquina, type ObservacionMaquina } from "@/hooks/useObservacionesMaquina";

interface MecanicoObservacionesViewProps {
  onBack: () => void;
  onCrearMantenimiento: (obs: ObservacionMaquina) => void;
  nombreMecanico?: string;
}

function getUrgencyConfig(fechaReporte: string) {
  const days = differenceInDays(new Date(), parseISO(fechaReporte));
  if (days >= 7) return { border: "border-l-destructive", badge: "bg-destructive/10 text-destructive border-destructive/30", label: `${days}d`, icon: "🔴" };
  if (days >= 3) return { border: "border-l-orange-500", badge: "bg-orange-500/10 text-orange-600 border-orange-500/30", label: `${days}d`, icon: "🟠" };
  return { border: "border-l-green-500", badge: "bg-green-500/10 text-green-600 border-green-500/30", label: `${days}d`, icon: "🟢" };
}

export const MecanicoObservacionesView = ({
  onBack,
  onCrearMantenimiento,
  nombreMecanico,
}: MecanicoObservacionesViewProps) => {
  const { pendientes, atendidas, isLoading, toggleAtendida, isUpdating } = useObservacionesMaquina();
  const [showAtendidas, setShowAtendidas] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const handleMarcarAtendida = async (obs: ObservacionMaquina) => {
    setMarkingId(obs.id);
    try {
      await toggleAtendida({
        id: obs.id,
        atendida: true,
        atendida_por: nombreMecanico || "Mecánico",
        notas_resolucion: "Atendida manualmente",
      });
    } finally {
      setMarkingId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">Alertas de Campo</h1>
          <p className="text-xs text-muted-foreground">Observaciones de maquinistas</p>
        </div>
        {pendientes.length > 0 && (
          <Badge variant="destructive" className="shrink-0">
            {pendientes.length} pendiente{pendientes.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto pb-safe">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">Cargando observaciones...</p>
          </div>
        ) : pendientes.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">¡Sin alertas pendientes!</h3>
            <p className="text-sm text-muted-foreground mt-1">Todas las observaciones están atendidas</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide px-1">
              Pendientes · {pendientes.length}
            </p>
            {pendientes.map((obs) => {
              const urgency = getUrgencyConfig(obs.fecha_reporte);
              const isMarkingThis = markingId === obs.id;

              return (
                <div
                  key={obs.id}
                  className={`bg-card border border-border rounded-xl border-l-4 ${urgency.border} shadow-sm overflow-hidden`}
                >
                  {/* Card header */}
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-base leading-tight">
                          {obs.maquinaria?.codigo || obs.maquinaria?.nombre || obs.maquinaria?.tipo || "Máquina desconocida"}
                        </p>
                        {obs.maquinaria?.patente && (
                          <p className="text-xs text-muted-foreground mt-0.5">📍 {obs.maquinaria.patente}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 ${urgency.badge}`}>
                        <Clock className="w-3 h-3 mr-1" />
                        {urgency.label}
                      </Badge>
                    </div>

                    {obs.parte_diario?.personal && (
                      <p className="text-xs text-muted-foreground mt-1">
                        👤 {obs.parte_diario.personal.nombre} {obs.parte_diario.personal.apellido}
                        {obs.parte_diario.obra && ` · ${obs.parte_diario.obra.nombre}`}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground mt-1">
                      📅 {format(parseISO(obs.fecha_reporte), "d 'de' MMMM, yyyy", { locale: es })}
                    </p>
                  </div>

                  {/* Observación */}
                  <div className="mx-4 mb-3 bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-foreground leading-relaxed">{obs.observacion}</p>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2 px-4 pb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 text-xs gap-1.5 border-green-500/30 text-green-600 hover:bg-green-500/10 hover:text-green-700"
                      onClick={() => handleMarcarAtendida(obs)}
                      disabled={isMarkingThis || isUpdating}
                    >
                      {isMarkingThis ? (
                        <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Atendida
                    </Button>
                    <Button
                      size="sm"
                      className="h-11 text-xs gap-1.5"
                      onClick={() => onCrearMantenimiento(obs)}
                    >
                      <Wrench className="w-4 h-4" />
                      Mantenimiento
                    </Button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Atendidas recientes colapsables */}
        {atendidas.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowAtendidas(!showAtendidas)}
              className="w-full flex items-center justify-between py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="font-medium">Atendidas recientes ({atendidas.length})</span>
              {showAtendidas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAtendidas && (
              <div className="space-y-2">
                {atendidas.slice(0, 10).map((obs) => (
                  <div key={obs.id} className="bg-muted/30 border border-border rounded-xl px-4 py-3 opacity-70">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">
                          ✅ {obs.maquinaria?.codigo || obs.maquinaria?.nombre || "Máquina"}
                          {obs.maquinaria?.patente && <span className="text-muted-foreground font-normal"> · {obs.maquinaria.patente}</span>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{obs.observacion}</p>
                        {obs.atendida_por && (
                          <p className="text-xs text-green-600 mt-1">Atendida por: {obs.atendida_por}</p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">
                        {format(parseISO(obs.fecha_reporte), "d MMM", { locale: es })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

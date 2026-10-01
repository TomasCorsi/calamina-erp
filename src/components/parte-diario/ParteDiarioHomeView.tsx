import { Plus, ClipboardList, AlertCircle, Trash2, CheckCircle2, Fuel, Pencil, ChevronLeft, ChevronRight, Wrench, Bell, Clock, Receipt, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isToday as isDateToday } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useMisDocumentos } from "@/hooks/useMisDocumentos";
import type { ParteDiario } from "@/hooks/useParteDiario";
import type { CargaRepartidor } from "@/hooks/useCargasRepartidor";
import { CargasCombustibleRepartidorList } from "./CargasCombustibleRepartidorList";
import type { MantenimientoWithRelations } from "@/hooks/useMantenimientos";
import type { ServiceAlert } from "@/hooks/useServiceAlerts";
import { TIPO_CONFIG, ESTADO_CONFIG } from "@/components/mantenimiento/mantenimientoConstants";


interface ParteDiarioHomeViewProps {
  borradorHoy: ParteDiario | null;
  partesCompletadosHoy: ParteDiario[];
  nombreEmpleado: string;
  rolLabel: string;
  isRepartidor?: boolean;
  isMecanico?: boolean;
  alertasPendientesCount?: number;
  entregasHoyCount?: number;
  cargasHoy?: CargaRepartidor[];
  totalLitrosHoy?: number;
  isDeletingCarga?: boolean;
  selectedDate?: Date;
  isToday?: boolean;
  mantenimientosPendientes?: MantenimientoWithRelations[];
  serviceAlerts?: ServiceAlert[];
  onServiceAlertClick?: (maquinariaId: string) => void;

  // Mechanic history props
  selectedDateMecanico?: Date;
  isTodayMecanico?: boolean;
  mantenimientosDia?: MantenimientoWithRelations[];
  onPrevDayMec?: () => void;
  onNextDayMec?: () => void;
  onEditMantenimiento?: (mant: MantenimientoWithRelations) => void;
  onDeleteMantenimiento?: (mant: MantenimientoWithRelations) => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onNewParte: () => void;
  onViewList: () => void;
  onContinueDraft: () => void;
  onDiscardDraft: () => void;
  onEditCompletado: (parte: ParteDiario) => void;
  onRegistrarEntrega?: () => void;
  onEditCarga?: (carga: CargaRepartidor) => void;
  onDeleteCarga?: (carga: CargaRepartidor) => void;
  onVerAlertas?: () => void;
  onNuevoMantenimiento?: () => void;
  onRetomarMantenimiento?: (mant: MantenimientoWithRelations) => void;
  isDiscarding?: boolean;
  showRemitosButton?: boolean;
  onIrRemitos?: () => void;
}

export const ParteDiarioHomeView = ({
  borradorHoy,
  partesCompletadosHoy,
  nombreEmpleado,
  rolLabel,
  isRepartidor = false,
  isMecanico = false,
  alertasPendientesCount = 0,
  entregasHoyCount = 0,
  cargasHoy = [],
  totalLitrosHoy = 0,
  isDeletingCarga = false,
  selectedDate = new Date(),
  isToday: isTodayProp = true,
  mantenimientosPendientes = [],
  serviceAlerts = [],
  onServiceAlertClick,

  selectedDateMecanico = new Date(),
  isTodayMecanico = true,
  mantenimientosDia = [],
  onPrevDayMec,
  onNextDayMec,
  onEditMantenimiento,
  onDeleteMantenimiento,
  onPrevDay,
  onNextDay,
  onNewParte,
  onViewList,
  onContinueDraft,
  onDiscardDraft,
  onEditCompletado,
  onRegistrarEntrega,
  onEditCarga,
  onDeleteCarga,
  onVerAlertas,
  onNuevoMantenimiento,
  onRetomarMantenimiento,
  isDiscarding = false,
  showRemitosButton = false,
  onIrRemitos,
}: ParteDiarioHomeViewProps) => {
  const navigate = useNavigate();
  const { pendientesCount: docsPendientes } = useMisDocumentos();
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-foreground">📋 Parte Diario</h1>
        <p className="text-muted-foreground mt-1">
          Hola, {nombreEmpleado} ({rolLabel})
        </p>
      </div>

      {docsPendientes > 0 && (
        <Alert className="bg-amber-500/10 border-amber-500/50">
          <FileText className="h-5 w-5 text-amber-500" />
          <AlertDescription className="ml-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-foreground">
                  Tenés {docsPendientes} documento{docsPendientes !== 1 ? 's' : ''} para revisar
                </p>
                <p className="text-xs text-muted-foreground">Estudios médicos o recibos de sueldo pendientes</p>
              </div>
              <Button size="sm" onClick={() => navigate('/mis-documentos')}>
                Ver
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main buttons */}
      <div className={`grid ${isRepartidor ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
        <Button 
          onClick={onNewParte} 
          className="h-24 flex-col gap-2 px-2"
          size="lg"
        >
          <Plus className="w-8 h-8" />
          <span className="font-semibold text-xs leading-tight text-center">Nuevo Parte</span>
        </Button>
        <Button 
          onClick={onViewList} 
          variant="outline" 
          className="h-24 flex-col gap-2 px-2"
          size="lg"
        >
          <ClipboardList className="w-8 h-8" />
          <span className="font-semibold text-xs leading-tight text-center">Mis Partes</span>
        </Button>
        {isRepartidor && onRegistrarEntrega && (
          <Button 
            onClick={onRegistrarEntrega} 
            variant="secondary"
            className="h-24 flex-col gap-2 px-2"
            size="lg"
            disabled={!isTodayProp}
          >
            <Fuel className="w-8 h-8" />
            <span className="font-semibold text-xs leading-tight text-center">Entrega</span>
          </Button>
        )}
      </div>

      {/* Mis Documentos - acceso siempre visible */}
      <Button
        onClick={() => navigate('/mis-documentos')}
        variant="outline"
        className="w-full h-16 gap-3 relative"
        size="lg"
      >
        <FileText className="w-6 h-6" />
        <span className="font-semibold">Mis Documentos</span>
        {docsPendientes > 0 && (
          <Badge className="ml-2 h-5 min-w-[20px] px-1 flex items-center justify-center text-[10px] bg-destructive text-destructive-foreground">
            {docsPendientes}
          </Badge>
        )}
      </Button>

      {/* Remitos shortcut (Sergio) */}
      {showRemitosButton && onIrRemitos && (
        <Button
          onClick={onIrRemitos}
          className="w-full h-16 gap-3"
          size="lg"
        >
          <Receipt className="w-6 h-6" />
          <span className="font-semibold">Cargar Remitos</span>
        </Button>
      )}

      {/* Mechanic buttons */}

      {isMecanico && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={onVerAlertas}
            variant="outline"
            className="h-24 flex-col gap-2 px-2 relative border-orange-500/40 hover:bg-orange-500/5"
            size="lg"
          >
            <div className="relative">
              <Bell className="w-8 h-8 text-orange-500" />
              {alertasPendientesCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {alertasPendientesCount}
                </span>
              )}
            </div>
            <span className="font-semibold text-xs leading-tight text-center text-foreground">Alertas de Campo</span>
          </Button>
          <Button
            onClick={onNuevoMantenimiento}
            variant="outline"
            className="h-24 flex-col gap-2 px-2 border-primary/40 hover:bg-primary/5"
            size="lg"
          >
            <Wrench className="w-8 h-8 text-primary" />
            <span className="font-semibold text-xs leading-tight text-center text-foreground">Nuevo Mantenim.</span>
          </Button>
        </div>
      )}

      {/* Service alerts (mecánicos y ayudantes) */}
      {isMecanico && serviceAlerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              <Wrench className="w-3 h-3 inline mr-1" />
              Services a realizar · {serviceAlerts.length}
            </p>
            <div className="flex gap-1">
              {serviceAlerts.filter(a => a.estado === "vencido").length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                  {serviceAlerts.filter(a => a.estado === "vencido").length} vencido{serviceAlerts.filter(a => a.estado === "vencido").length !== 1 ? 's' : ''}
                </Badge>
              )}
              {serviceAlerts.filter(a => a.estado === "proximo").length > 0 && (
                <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30">
                  {serviceAlerts.filter(a => a.estado === "proximo").length} próximo{serviceAlerts.filter(a => a.estado === "proximo").length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
          {serviceAlerts.map((a, idx) => {
            const isVencido = a.estado === "vencido";
            const barColor = isVencido ? "bg-destructive" : a.pct >= 90 ? "bg-orange-500" : "bg-green-500";
            const borderColor = isVencido ? "border-l-destructive" : "border-l-orange-500";
            const badgeColor = isVencido
              ? "bg-destructive/10 text-destructive border-destructive/30"
              : "bg-orange-500/10 text-orange-600 border-orange-500/30";
            const diffAbs = Math.abs(a.diff);
            const diffLabel = isVencido
              ? `Excedido +${diffAbs.toLocaleString()} ${a.unidad}`
              : `Faltan ${diffAbs.toLocaleString()} ${a.unidad}`;
            return (
              <button
                key={`${a.maquinariaId}-${a.unidad}-${idx}`}
                onClick={() => onServiceAlertClick?.(a.maquinariaId)}
                className={`w-full text-left bg-card border border-border rounded-xl border-l-4 ${borderColor} p-3 shadow-sm hover:bg-muted/50 transition-colors`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {a.maquinaria}
                      {a.patente && <span className="text-muted-foreground font-normal"> · {a.patente}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Actual <span className="font-semibold text-foreground">{a.actual.toLocaleString()} {a.unidad}</span>
                      {" · "}
                      Próx. service <span className="font-semibold text-foreground">{a.limite.toLocaleString()} {a.unidad}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${badgeColor}`}>
                    {isVencido ? "Vencido" : "Próximo"}
                  </Badge>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${barColor} transition-all`}
                    style={{ width: `${Math.min(100, Math.max(4, a.pct))}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{diffLabel}</p>
              </button>
            );
          })}
        </div>
      )}



      {/* Pending mantenimientos for mechanic */}
      {isMecanico && mantenimientosPendientes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide px-1">
            <Clock className="w-3 h-3 inline mr-1" />
            Mantenimientos pendientes · {mantenimientosPendientes.length}
          </p>
          {mantenimientosPendientes.map(mant => {
            const tipoConf = TIPO_CONFIG[mant.tipo as keyof typeof TIPO_CONFIG];
            return (
              <button
                key={mant.id}
                onClick={() => onRetomarMantenimiento?.(mant)}
                className="w-full text-left bg-card border border-border rounded-xl p-3 shadow-sm hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {mant.maquinaria?.codigo || mant.maquinaria?.nombre || "Máquina"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {mant.descripcion === "Pendiente de completar" ? "Sin descripción aún" : mant.descripcion}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(mant.fecha), "d MMM", { locale: es })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${tipoConf?.className || ''}`}>
                      {tipoConf?.label || mant.tipo}
                    </Badge>
                    <span className="text-xs text-primary font-medium">Continuar →</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      {isRepartidor && (
        <div className="space-y-2">
          {/* Date navigator */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={onPrevDay} className="h-8 w-8">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <span className="text-sm font-semibold">
                {isTodayProp && <span className="text-primary mr-1">Hoy •</span>}
                {format(selectedDate, "EEE d MMM yyyy", { locale: es })}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={onNextDay} className="h-8 w-8" disabled={isTodayProp}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {cargasHoy.length > 0 && onEditCarga && onDeleteCarga ? (
            <>
              <p className="text-xs text-muted-foreground text-center">{entregasHoyCount} entregas • {totalLitrosHoy.toFixed(0)} lts</p>
              <CargasCombustibleRepartidorList
                cargas={cargasHoy}
                totalLitros={totalLitrosHoy}
                onEdit={onEditCarga}
                onDelete={onDeleteCarga}
                isDeleting={isDeletingCarga}
              />
            </>
          ) : (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-sm text-muted-foreground">
                {isTodayProp ? 'No registraste entregas hoy' : 'Sin entregas este día'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mechanic maintenance history with date navigator */}
      {isMecanico && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={onPrevDayMec} className="h-8 w-8">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <span className="text-sm font-semibold">
                {isTodayMecanico && <span className="text-primary mr-1">Hoy •</span>}
                {format(selectedDateMecanico, "EEE d MMM yyyy", { locale: es })}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={onNextDayMec} className="h-8 w-8" disabled={isTodayMecanico}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {mantenimientosDia.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground text-center">
                {mantenimientosDia.length} mantenimiento{mantenimientosDia.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-2">
                {mantenimientosDia.map(mant => {
                  const tipoConf = TIPO_CONFIG[mant.tipo as keyof typeof TIPO_CONFIG];
                  const estadoConf = ESTADO_CONFIG[mant.estado as keyof typeof ESTADO_CONFIG];
                  return (
                    <div
                      key={mant.id}
                      className="bg-card border border-border rounded-xl p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {mant.maquinaria?.codigo || mant.maquinaria?.nombre || "Máquina"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {mant.descripcion === "Pendiente de completar" ? "Sin descripción aún" : mant.descripcion}
                          </p>
                          <div className="flex gap-1 mt-1.5">
                            <Badge variant="outline" className={`text-[10px] ${tipoConf?.className || ''}`}>
                              {tipoConf?.label || mant.tipo}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] ${estadoConf?.className || ''}`}>
                              {estadoConf?.label || mant.estado}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEditMantenimiento?.(mant)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onDeleteMantenimiento?.(mant)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-sm text-muted-foreground">
                {isTodayMecanico ? 'Sin mantenimientos hoy' : 'Sin mantenimientos este día'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Completed partes list */}
      {partesCompletadosHoy.length > 0 && !borradorHoy && (
        <Alert className="bg-green-500/10 border-green-500/50">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <AlertDescription className="ml-2">
            <div className="space-y-3">
              <p className="font-semibold text-foreground">
                {partesCompletadosHoy.length === 1 
                  ? 'Ya completaste tu parte de hoy ✓'
                  : `Completaste ${partesCompletadosHoy.length} partes hoy ✓`}
              </p>
              <div className="space-y-2">
                {partesCompletadosHoy.map(parte => (
                  <div key={parte.id} className="flex items-center justify-between bg-background/50 rounded-md p-2">
                    <div className="text-sm">
                      {parte.maquinarias 
                        ? <span className="font-medium">{parte.maquinarias.codigo || parte.maquinarias.tipo}{parte.maquinarias.patente ? ` - ${parte.maquinarias.patente}` : ''}</span>
                        : parte.obras 
                          ? <span className="font-medium">{parte.obras.nombre}</span>
                          : <span className="text-muted-foreground">Sin máquina</span>
                      }
                      {parte.hora_entrada && parte.hora_salida && (
                        <span className="text-muted-foreground ml-2">
                          {parte.hora_entrada} - {parte.hora_salida}
                        </span>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => onEditCompletado(parte)} className="h-8 w-8 p-0">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Draft alert */}
      {borradorHoy && (
        <Alert className="bg-amber-500/10 border-amber-500/50">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <AlertDescription className="ml-2">
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-foreground">Tienes un borrador sin completar</p>
                <p className="text-sm text-muted-foreground">
                  Fecha: {format(parseISO(borradorHoy.fecha), "d 'de' MMMM, yyyy", { locale: es })}
                  {borradorHoy.obras && ` • ${borradorHoy.obras.nombre}`}
                  {borradorHoy.maquinarias && ` • ${borradorHoy.maquinarias.codigo || borradorHoy.maquinarias.tipo}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={onContinueDraft} className="flex-1">
                  Continuar
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={onDiscardDraft}
                  disabled={isDiscarding}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Descartar
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

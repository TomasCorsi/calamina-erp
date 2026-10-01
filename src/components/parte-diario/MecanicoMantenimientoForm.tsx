import { useState, useEffect } from "react";
import { ArrowLeft, Wrench, Loader2, Calculator, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { useMantenimientos, type MantenimientoForm, type TipoMantenimiento, type EstadoMantenimiento, type MantenimientoWithRelations } from "@/hooks/useMantenimientos";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import {
  CHECKLIST_CAMBIO_ITEMS,
  CHECKLIST_CHEQUEO_ITEMS,
  emptyChecklistCambio,
  emptyChecklistChequeo,
  isChecked,
  getLitros,
  type ChecklistCambio,
  type ChecklistChequeo,
  type ChecklistValue,
} from "@/components/mantenimiento/mantenimientoConstants";
import type { ObservacionMaquina } from "@/hooks/useObservacionesMaquina";

interface MecanicoMantenimientoFormProps {
  onBack: () => void;
  onSuccess: () => void;
  obsPreload?: ObservacionMaquina | null;
  nombreMecanico?: string;
  empleadoId?: string;
  editData?: MantenimientoWithRelations | null;
  preloadMaquinariaId?: string;
}


type TipoOption = { value: TipoMantenimiento; label: string; emoji: string; color: string };
type EstadoOption = { value: EstadoMantenimiento; label: string; emoji: string; color: string };

const TIPOS: TipoOption[] = [
  { value: "preventivo", label: "Service", emoji: "🛡️", color: "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  { value: "correctivo", label: "Reparación", emoji: "🔧", color: "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  { value: "emergencia", label: "Emergencia", emoji: "🚨", color: "border-destructive bg-destructive/10 text-destructive" },
];

const ESTADOS: EstadoOption[] = [
  { value: "pendiente", label: "Pendiente", emoji: "📋", color: "border-muted-foreground bg-muted text-muted-foreground" },
  { value: "en_proceso", label: "En proceso", emoji: "⚙️", color: "border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  { value: "completado", label: "Completado", emoji: "✅", color: "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400" },
];

export const MecanicoMantenimientoForm = ({
  onBack,
  onSuccess,
  obsPreload,
  nombreMecanico,
  empleadoId,
  editData,
  preloadMaquinariaId,
}: MecanicoMantenimientoFormProps) => {

  const { createMantenimiento, updateMantenimiento } = useMantenimientos();
  const { maquinarias } = useMaquinarias();

  const isEditing = !!editData;
  const today = format(new Date(), "yyyy-MM-dd");

  const [fecha, setFecha] = useState(editData?.fecha || today);
  const [maquinariaId, setMaquinariaId] = useState(editData?.maquinaria_id || obsPreload?.maquinaria_id || preloadMaquinariaId || "");
  const [tipo, setTipo] = useState<TipoMantenimiento>(editData?.tipo as TipoMantenimiento || (obsPreload ? "correctivo" : "preventivo"));
  const [estado, setEstado] = useState<EstadoMantenimiento>(editData?.estado as EstadoMantenimiento || "pendiente");
  const [descripcion, setDescripcion] = useState(editData?.descripcion === "Pendiente de completar" ? "" : (editData?.descripcion || ""));
  const [informeTecnico, setInformeTecnico] = useState(
    editData?.informe_tecnico || 
    (editData?.tipo === "preventivo" && editData?.descripcion && editData?.descripcion !== "Pendiente de completar" ? editData.descripcion : "")
  );
  const [repuestos, setRepuestos] = useState(editData?.repuestos || "");
  const [tecnico, setTecnico] = useState(editData?.tecnico || nombreMecanico || "");
  const [horasMaquina, setHorasMaquina] = useState(editData?.horas_maquina ? String(editData.horas_maquina) : "");
  const [kilometros, setKilometros] = useState(editData?.kilometros ? String(editData.kilometros) : "");
  const [costoRepuestos, setCostoRepuestos] = useState(editData?.costo_repuestos ? String(editData.costo_repuestos) : "0");
  const [costoManoObra, setCostoManoObra] = useState(editData?.costo_mano_obra ? String(editData.costo_mano_obra) : "0");
  const [proximoMantenimiento, setProximoMantenimiento] = useState(editData?.proximo_mantenimiento || "");
  const [proximoKm, setProximoKm] = useState(editData?.proximo_service_km ? String(editData.proximo_service_km) : "");
  const [proximoHr, setProximoHr] = useState(editData?.proximo_service_hr ? String(editData.proximo_service_hr) : "");
  const [alertaCampo, setAlertaCampo] = useState(editData?.alerta_campo || "");
  const [observaciones, setObservaciones] = useState(editData?.observaciones || (obsPreload ? `Reporte de campo: ${obsPreload.observacion}` : ""));
  const [isSaving, setIsSaving] = useState(false);
  const [maquinaSearch, setMaquinaSearch] = useState("");
  const [showMaquinaDropdown, setShowMaquinaDropdown] = useState(false);
  const [checkCambio, setCheckCambio] = useState<ChecklistCambio>(editData?.checklist_cambio as ChecklistCambio || emptyChecklistCambio());
  const [checkChequeo, setCheckChequeo] = useState<ChecklistChequeo>(editData?.checklist_chequeo as ChecklistChequeo || emptyChecklistChequeo());

  // Pre-fill machine name in search when coming from obs or editData
  useEffect(() => {
    if (editData?.maquinaria) {
      const m = editData.maquinaria;
      setMaquinaSearch([m.codigo, m.nombre].filter(Boolean).join(" · "));
    } else if (obsPreload?.maquinaria) {
      const m = obsPreload.maquinaria;
      setMaquinaSearch([m.codigo, m.nombre, m.patente].filter(Boolean).join(" · "));
    }
  }, [obsPreload, editData]);

  // Sync tecnico with logged-in mechanic's name (only if not editing)
  useEffect(() => {
    if (nombreMecanico && !editData) setTecnico(nombreMecanico);
  }, [nombreMecanico, editData]);

  const isService = tipo === "preventivo";
  const costoTotal = (parseFloat(costoRepuestos) || 0) + (parseFloat(costoManoObra) || 0);

  const maquinariasFiltradas = maquinarias.filter(m => {
    if (!maquinaSearch) return true;
    const q = maquinaSearch.toLowerCase();
    return (
      m.codigo?.toLowerCase().includes(q) ||
      m.nombre?.toLowerCase().includes(q) ||
      m.patente?.toLowerCase().includes(q) ||
      m.tipo?.toLowerCase().includes(q)
    );
  }).slice(0, 8);

  const selectedMaquinaria = maquinarias.find(m => m.id === maquinariaId);

  const handleSelectMaquinaria = (m: typeof maquinarias[0]) => {
    setMaquinariaId(m.id);
    setMaquinaSearch([m.codigo, m.nombre, m.patente].filter(Boolean).join(" · "));
    setShowMaquinaDropdown(false);
  };

  const buildPayload = (estadoOverride?: EstadoMantenimiento): MantenimientoForm => ({
    fecha,
    maquinaria_id: maquinariaId,
    tipo,
    estado: estadoOverride || estado,
    descripcion: isService
      ? (informeTecnico.trim() || "Pendiente de completar")
      : (descripcion.trim() || "Pendiente de completar"),
    informe_tecnico: isService ? (informeTecnico.trim() || undefined) : undefined,
    checklist_cambio: isService ? checkCambio : undefined,
    checklist_chequeo: isService ? checkChequeo : undefined,
    repuestos: repuestos.trim() || undefined,
    tecnico: tecnico.trim() || nombreMecanico || "Pendiente",
    horas_maquina: parseFloat(horasMaquina) || 0,
    kilometros: parseFloat(kilometros) || 0,
    costo_repuestos: parseFloat(costoRepuestos) || 0,
    costo_mano_obra: parseFloat(costoManoObra) || 0,
    costo_total: costoTotal,
    proximo_mantenimiento: proximoMantenimiento || undefined,
    proximo_service_km: proximoKm ? parseFloat(proximoKm) : null,
    proximo_service_hr: proximoHr ? parseFloat(proximoHr) : null,
    alerta_campo: alertaCampo.trim() || undefined,
    observaciones: observaciones.trim() || undefined,
    observacion_reporte_id: obsPreload?.id || editData?.observacion_reporte_id || undefined,
    tecnico_id: empleadoId || editData?.tecnico_id || undefined,
  });

  const handleSaveParcial = async () => {
    if (!maquinariaId) return;
    const data = buildPayload("pendiente");
    setIsSaving(true);
    try {
      if (isEditing) {
        const ok = await updateMantenimiento(editData.id, data);
        if (ok) onSuccess();
      } else {
        const result = await createMantenimiento(data);
        if (result) onSuccess();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalizar = async () => {
    if (!maquinariaId || !tecnico.trim()) return;
    if (!isService && !descripcion.trim()) return;
    const finalEstado = estado === "pendiente" ? "en_proceso" : estado;
    const data = buildPayload(finalEstado);
    setIsSaving(true);
    try {
      if (isEditing) {
        const ok = await updateMantenimiento(editData.id, data);
        if (ok) onSuccess();
      } else {
        const result = await createMantenimiento(data);
        if (result) onSuccess();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isValidParcial = !!maquinariaId;
  const isValidFull = maquinariaId && tecnico.trim() && (isService ? true : descripcion.trim());

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">
            {isEditing ? "Continuar Mantenimiento" : obsPreload ? "Reparación" : isService ? "Nuevo Service" : "Nueva Reparación"}
          </h1>
          {obsPreload?.maquinaria && (
            <p className="text-xs text-muted-foreground truncate">
              {obsPreload.maquinaria.codigo || obsPreload.maquinaria.nombre} · desde alerta de campo
            </p>
          )}
        </div>
        <Wrench className="w-5 h-5 text-primary shrink-0" />
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-32">

        {/* Banner alerta de campo */}
        {obsPreload && (
          <div className="rounded-lg border border-orange-500/50 bg-orange-500/10 p-4 space-y-1.5">
            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400">⚠️ Alerta de campo</p>
            <p className="text-sm text-foreground italic">"{obsPreload.observacion}"</p>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              {obsPreload.parte_diario?.personal && (
                <span>Reportado por: {[obsPreload.parte_diario.personal.nombre, obsPreload.parte_diario.personal.apellido].filter(Boolean).join(" ")}</span>
              )}
              <span>Fecha: {format(new Date(obsPreload.fecha_reporte), "dd/MM/yyyy")}</span>
            </div>
          </div>
        )}

        {/* Fecha */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Fecha *</Label>
          <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="h-12 text-base" />
        </div>

        {/* Máquina */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Máquina *</Label>
          <div className="relative">
            <Input
              placeholder="Buscar por código, nombre, patente..."
              value={maquinaSearch}
              onChange={e => { setMaquinaSearch(e.target.value); setMaquinariaId(""); setShowMaquinaDropdown(true); }}
              onFocus={() => setShowMaquinaDropdown(true)}
              className="h-12 text-base"
            />
            {showMaquinaDropdown && maquinariasFiltradas.length > 0 && !maquinariaId && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                {maquinariasFiltradas.map(m => (
                  <button key={m.id} className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border/50 last:border-0" onMouseDown={() => handleSelectMaquinaria(m)}>
                    <p className="font-semibold text-sm text-foreground">{m.codigo || m.nombre || m.tipo}</p>
                    <p className="text-xs text-muted-foreground">{[m.tipo, m.patente, m.marca].filter(Boolean).join(" · ")}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selectedMaquinaria && <p className="text-xs text-green-600 font-medium px-1">✓ {selectedMaquinaria.codigo || selectedMaquinaria.nombre} seleccionada</p>}
          {!maquinariaId && maquinaSearch && <p className="text-xs text-destructive px-1">Seleccioná una máquina de la lista</p>}
        </div>

        {/* Tipo */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Tipo *</Label>
          <div className="grid grid-cols-3 gap-2">
            {TIPOS.map(t => (
              <button key={t.value} onClick={() => setTipo(t.value)}
                className={`border-2 rounded-xl py-3 px-2 flex flex-col items-center gap-1 transition-all ${tipo === t.value ? t.color + " border-2" : "border-border bg-card text-muted-foreground"}`}>
                <span className="text-xl">{t.emoji}</span>
                <span className="text-xs font-semibold leading-tight text-center">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Estado */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Estado *</Label>
          <div className="grid grid-cols-3 gap-2">
            {ESTADOS.map(s => (
              <button key={s.value} onClick={() => setEstado(s.value)}
                className={`border-2 rounded-xl py-3 px-2 flex flex-col items-center gap-1 transition-all ${estado === s.value ? s.color + " border-2" : "border-border bg-card text-muted-foreground"}`}>
                <span className="text-xl">{s.emoji}</span>
                <span className="text-xs font-semibold leading-tight text-center">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ===== SERVICE: Checklists ===== */}
        {isService && (
          <>
            {/* Checklist Cambio */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">🔄 Checklist de Cambio</Label>
              <div className="grid grid-cols-1 gap-2">
                {CHECKLIST_CAMBIO_ITEMS.map(item => {
                  const val = checkCambio[item.key];
                  const checked = isChecked(val);
                  return (
                    <div key={item.key} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card">
                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            if (!!v && item.hasLitros) {
                              setCheckCambio(prev => ({ ...prev, [item.key]: { ok: true, litros: undefined } }));
                            } else {
                              setCheckCambio(prev => ({ ...prev, [item.key]: !!v }));
                            }
                          }}
                        />
                        <span className="text-xs leading-tight">{item.label}</span>
                      </label>
                      {checked && item.hasLitros && (
                        <Input
                          type="number"
                          placeholder="Lts"
                          value={getLitros(val) ?? ""}
                          onChange={e => {
                            const litros = e.target.value ? parseFloat(e.target.value) : undefined;
                            setCheckCambio(prev => ({ ...prev, [item.key]: { ok: true, litros } }));
                          }}
                          className="h-8 w-20 text-xs"
                          inputMode="decimal"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Checklist Chequeo */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">🔍 Checklist de Chequeo</Label>
              <div className="grid grid-cols-1 gap-1.5">
                {CHECKLIST_CHEQUEO_ITEMS.map(item => {
                  const val = checkChequeo[item.key];
                  const checked = isChecked(val);
                  return (
                    <div key={item.key} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card">
                      <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            if (!!v && item.hasLitros) {
                              setCheckChequeo(prev => ({ ...prev, [item.key]: { ok: true, litros: undefined } }));
                            } else {
                              setCheckChequeo(prev => ({ ...prev, [item.key]: !!v }));
                            }
                          }}
                        />
                        <span className="text-xs leading-tight">{item.label}</span>
                      </label>
                      {checked && item.hasLitros && (
                        <Input
                          type="number"
                          placeholder="Lts"
                          value={getLitros(val) ?? ""}
                          onChange={e => {
                            const litros = e.target.value ? parseFloat(e.target.value) : undefined;
                            setCheckChequeo(prev => ({ ...prev, [item.key]: { ok: true, litros } }));
                          }}
                          className="h-8 w-20 text-xs"
                          inputMode="decimal"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Informe técnico */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Informe técnico *</Label>
              <Textarea placeholder="Describí el informe del service..." value={informeTecnico} onChange={e => setInformeTecnico(e.target.value)} className="min-h-[100px] text-base resize-none" />
            </div>
          </>
        )}

        {/* ===== REPARACIÓN: Tareas ===== */}
        {!isService && (
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold">Tareas realizadas *</Label>
            <Textarea placeholder="Describí las tareas realizadas..." value={descripcion} onChange={e => setDescripcion(e.target.value)} className="min-h-[100px] text-base resize-none" />
          </div>
        )}

        {/* Repuestos */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Repuestos <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Textarea placeholder="Listá los repuestos usados..." value={repuestos} onChange={e => setRepuestos(e.target.value)} className="min-h-[80px] text-base resize-none" />
        </div>

        {/* Horas máquina + Kilómetros */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Horas máquina</Label>
            <Input type="number" placeholder="0" value={horasMaquina} onChange={e => setHorasMaquina(e.target.value)} className="h-12 text-base" inputMode="decimal" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Kilómetros</Label>
            <Input type="number" placeholder="0" value={kilometros} onChange={e => setKilometros(e.target.value)} className="h-12 text-base" inputMode="decimal" />
          </div>
        </div>

        {/* Próximo Service KM + HR */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Próx. Service KM</Label>
            <Input type="number" placeholder="0" value={proximoKm} onChange={e => setProximoKm(e.target.value)} className="h-12 text-base" inputMode="decimal" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Próx. Service HR</Label>
            <Input type="number" placeholder="0" value={proximoHr} onChange={e => setProximoHr(e.target.value)} className="h-12 text-base" inputMode="decimal" />
          </div>
        </div>

        {/* Costos */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Costos</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Repuestos ($)</p>
              <Input type="number" placeholder="0" value={costoRepuestos} onChange={e => setCostoRepuestos(e.target.value)} className="h-12 text-base" inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Mano de obra ($)</p>
              <Input type="number" placeholder="0" value={costoManoObra} onChange={e => setCostoManoObra(e.target.value)} className="h-12 text-base" inputMode="decimal" />
            </div>
          </div>
          {costoTotal > 0 && (
            <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-4 py-2.5">
              <Calculator className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Total: ${costoTotal.toLocaleString("es-AR")}</span>
            </div>
          )}
        </div>

        {/* Próximo mantenimiento */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Próximo mantenimiento <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Input type="date" value={proximoMantenimiento} onChange={e => setProximoMantenimiento(e.target.value)} className="h-12 text-base" />
        </div>

        {/* Alerta de campo */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Alerta de campo <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Textarea
            placeholder="Registrar alerta o advertencia..."
            value={alertaCampo}
            onChange={e => setAlertaCampo(e.target.value)}
            className={`min-h-[60px] text-base resize-none ${alertaCampo.trim() ? "border-destructive bg-destructive/5" : ""}`}
          />
        </div>

        {/* Observaciones */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Observaciones <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Textarea placeholder="Notas adicionales..." value={observaciones} onChange={e => setObservaciones(e.target.value)} className="min-h-[80px] text-base resize-none" />
        </div>

        {/* Técnico */}
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Técnico</Label>
          <Input value={tecnico} readOnly placeholder="Cargando nombre..." className="h-12 text-base bg-muted cursor-default" />
          <p className="text-xs text-muted-foreground px-1">✓ Completado automáticamente</p>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4 pb-safe">
        <div className="max-w-lg mx-auto flex gap-3">
          <Button variant="outline" onClick={onBack} className="shrink-0 h-13" disabled={isSaving}>Cancelar</Button>
          <Button variant="outline" onClick={handleSaveParcial} className="flex-1 h-13 text-sm font-semibold" disabled={!isValidParcial || isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />Guardar parcial</>}
          </Button>
          <Button onClick={handleFinalizar} className="flex-1 h-13 text-sm font-semibold" disabled={!isValidFull || isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wrench className="w-4 h-4 mr-1" />Finalizar</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

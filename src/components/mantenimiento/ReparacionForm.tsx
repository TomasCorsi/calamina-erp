import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { useMantenimientos, type MantenimientoForm, type MantenimientoWithRelations } from "@/hooks/useMantenimientos";
import { ESTADO_CONFIG } from "./mantenimientoConstants";

interface ReparacionFormProps {
  onClose: () => void;
  editData?: MantenimientoWithRelations | null;
  prefill?: {
    maquinaria_id?: string;
    observacion_reporte_id?: string;
    alerta_campo?: string;
  };
}

export function ReparacionForm({ onClose, editData, prefill }: ReparacionFormProps) {
  const { createMantenimiento, updateMantenimiento } = useMantenimientos();
  const { maquinarias } = useMaquinarias();
  const isEditing = !!editData;

  const [fecha, setFecha] = useState(editData?.fecha || new Date().toISOString().split("T")[0]);
  const [maquinariaId, setMaquinariaId] = useState(editData?.maquinaria_id || prefill?.maquinaria_id || "");
  const [tecnicoId, setTecnicoId] = useState(editData?.tecnico_id || "");
  const [tecnicoNombre, setTecnicoNombre] = useState(editData?.tecnico || "");
  const [estado, setEstado] = useState(editData?.estado || "pendiente");
  const [descripcion, setDescripcion] = useState(editData?.descripcion || "");
  const [repuestos, setRepuestos] = useState(editData?.repuestos || "");
  const [horasMaquina, setHorasMaquina] = useState(String(editData?.horas_maquina || ""));
  const [kilometros, setKilometros] = useState(String(editData?.kilometros || ""));
  const [proximoKm, setProximoKm] = useState(String(editData?.proximo_service_km || ""));
  const [proximoHr, setProximoHr] = useState(String(editData?.proximo_service_hr || ""));
  const [alertaCampo, setAlertaCampo] = useState(editData?.alerta_campo || prefill?.alerta_campo || "");
  const [observaciones, setObservaciones] = useState(editData?.observaciones || "");
  const [costoRepuestos, setCostoRepuestos] = useState(String(editData?.costo_repuestos || "0"));
  const [costoManoObra, setCostoManoObra] = useState(String(editData?.costo_mano_obra || "0"));
  const [isSaving, setIsSaving] = useState(false);

  const { data: tecnicosOptions = [] } = useQuery({
    queryKey: ["personal_tecnicos_reparacion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_selector" as any)
        .select("id, nombre, apellido, rol")
        .in("rol", ["mecanico", "ayudante"])
        .eq("activo", true)
        .order("apellido") as { data: { id: string; nombre: string | null; apellido: string | null; rol: string }[] | null; error: any };
      if (error) throw error;
      return (data || []).map((p): ComboboxOption => ({
        value: p.id,
        label: `${p.apellido || ""} ${p.nombre || ""}`.trim() + ` (${p.rol === "mecanico" ? "Mecánico" : "Ayudante"})`,
        searchValue: `${p.nombre || ""} ${p.apellido || ""}`.trim(),
      }));
    },
  });

  const maquinariaOptions: ComboboxOption[] = maquinarias.map(m => ({
    value: m.id,
    label: [m.codigo, m.nombre, m.patente].filter(Boolean).join(" · "),
    searchValue: [m.codigo, m.nombre, m.patente, m.tipo].filter(Boolean).join(" "),
  }));

  const handleTecnicoChange = (id: string) => {
    setTecnicoId(id);
    const opt = tecnicosOptions.find(t => t.value === id);
    setTecnicoNombre(opt?.searchValue || opt?.label || "");
  };

  const costoTotal = (parseFloat(costoRepuestos) || 0) + (parseFloat(costoManoObra) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!maquinariaId || !tecnicoId || !descripcion.trim()) return;

    setIsSaving(true);
    const payload: MantenimientoForm = {
      fecha,
      maquinaria_id: maquinariaId,
      tipo: "correctivo",
      descripcion: descripcion.trim(),
      repuestos: repuestos.trim() || undefined,
      horas_maquina: parseFloat(horasMaquina) || 0,
      kilometros: parseFloat(kilometros) || 0,
      tecnico: tecnicoNombre,
      tecnico_id: tecnicoId || undefined,
      estado: estado as any,
      costo_repuestos: parseFloat(costoRepuestos) || 0,
      costo_mano_obra: parseFloat(costoManoObra) || 0,
      costo_total: costoTotal,
      proximo_service_km: proximoKm ? parseFloat(proximoKm) : null,
      proximo_service_hr: proximoHr ? parseFloat(proximoHr) : null,
      alerta_campo: alertaCampo.trim() || undefined,
      observaciones: observaciones.trim() || undefined,
      observacion_reporte_id: prefill?.observacion_reporte_id,
    };

    if (isEditing && editData) {
      await updateMantenimiento(editData.id, payload);
    } else {
      await createMantenimiento(payload);
    }
    setIsSaving(false);
    onClose();
  };

  const isValid = maquinariaId && (tecnicoId || (isEditing && tecnicoNombre)) && descripcion.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fecha *</Label>
          <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="bg-muted border-border" required />
        </div>
        <div className="space-y-2">
          <Label>Estado *</Label>
          <Select value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
            <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(ESTADO_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Máquina *</Label>
          <Combobox
            options={maquinariaOptions}
            value={maquinariaId}
            onValueChange={setMaquinariaId}
            placeholder="Seleccionar máquina..."
            searchPlaceholder="Buscar por código, nombre..."
            emptyText="No se encontraron máquinas."
            className="bg-muted border-border"
          />
        </div>
        <div className="space-y-2">
          <Label>Técnico *</Label>
          <Combobox
            options={tecnicosOptions}
            value={tecnicoId}
            onValueChange={handleTecnicoChange}
            placeholder="Seleccionar técnico..."
            searchPlaceholder="Buscar mecánico o ayudante..."
            emptyText="No se encontraron técnicos."
            className="bg-muted border-border"
          />
        </div>
      </div>

      {/* Tareas realizadas */}
      <div className="space-y-2">
        <Label>Tareas realizadas *</Label>
        <Textarea
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          className="bg-muted border-border min-h-[120px]"
          placeholder="Describir las tareas de reparación realizadas..."
          required
        />
      </div>

      {/* Repuestos */}
      <div className="space-y-2">
        <Label>Repuestos utilizados</Label>
        <Textarea
          value={repuestos}
          onChange={e => setRepuestos(e.target.value)}
          className="bg-muted border-border"
          placeholder="Lista de repuestos..."
          rows={2}
        />
      </div>

      {/* Numeric fields - conditional based on machinery type */}
      {(() => {
        const selectedMaq = maquinarias.find(m => m.id === maquinariaId);
        const isVehiculo = selectedMaq?.tipo === "auto" || selectedMaq?.tipo === "camioneta";
        return (
          <div className="grid grid-cols-2 gap-4">
            {isVehiculo ? (
              <>
                <div className="space-y-2">
                  <Label>Kilómetros actual</Label>
                  <Input type="number" value={kilometros} onChange={e => setKilometros(e.target.value)} className="bg-muted border-border" inputMode="decimal" />
                </div>
                <div className="space-y-2">
                  <Label>Próximo service (KM)</Label>
                  <Input type="number" value={proximoKm} onChange={e => setProximoKm(e.target.value)} className="bg-muted border-border" inputMode="decimal" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Horas máquina</Label>
                  <Input type="number" value={horasMaquina} onChange={e => setHorasMaquina(e.target.value)} className="bg-muted border-border" inputMode="decimal" />
                </div>
                <div className="space-y-2">
                  <Label>Próximo service (HR)</Label>
                  <Input type="number" value={proximoHr} onChange={e => setProximoHr(e.target.value)} className="bg-muted border-border" inputMode="decimal" />
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* Costos */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Costo repuestos ($)</Label>
          <Input type="number" value={costoRepuestos} onChange={e => setCostoRepuestos(e.target.value)} className="bg-muted border-border" inputMode="decimal" />
        </div>
        <div className="space-y-2">
          <Label>Costo mano de obra ($)</Label>
          <Input type="number" value={costoManoObra} onChange={e => setCostoManoObra(e.target.value)} className="bg-muted border-border" inputMode="decimal" />
        </div>
        <div className="space-y-2">
          <Label>Costo total</Label>
          <Input value={`$${costoTotal.toLocaleString("es-AR")}`} disabled className="bg-muted border-border font-mono" />
        </div>
      </div>

      {/* Alerta de campo */}
      <div className="space-y-2">
        <Label>Observaciones de alerta de campo</Label>
        <Textarea
          value={alertaCampo}
          onChange={e => setAlertaCampo(e.target.value)}
          className={`bg-muted border-border min-h-[60px] ${alertaCampo.trim() ? "!border-destructive !bg-destructive/5" : ""}`}
          placeholder="Observaciones de campo si aplica..."
          rows={2}
        />
      </div>

      {/* Observaciones */}
      <div className="space-y-2">
        <Label>Observaciones generales</Label>
        <Textarea
          value={observaciones}
          onChange={e => setObservaciones(e.target.value)}
          className="bg-muted border-border"
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={!isValid || isSaving}>
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditing ? "Guardar Cambios" : "Registrar Reparación"}
        </Button>
      </div>
    </form>
  );
}

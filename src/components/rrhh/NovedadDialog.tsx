import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  NOVEDAD_LABEL, PERIODO_LABEL, MESES,
  type RrhhNovedad, type RrhhNovedadTipo, type RrhhPeriodo, type NovedadInput,
} from "@/hooks/useRrhh";
import type { PersonalMin } from "./planillaData";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  periodos: RrhhPeriodo[];
  periodoActual: RrhhPeriodo | null;
  personal: PersonalMin[];
  novedad: RrhhNovedad | null;
  onSave: (input: NovedadInput) => Promise<void> | void;
  saving?: boolean;
}

// Campos visibles según el tipo de novedad
const CAMPOS: Record<RrhhNovedadTipo, Array<"fecha" | "rango" | "horas" | "dias" | "monto">> = {
  inasistencia: ["fecha", "dias"],
  enfermedad: ["rango"],
  art: ["rango"],
  vacaciones: ["rango"],
  licencia: ["rango"],
  horas_extras: ["fecha", "horas"],
  feriado_trabajado: ["fecha", "horas"],
  premio: ["fecha", "monto"],
  adelanto: ["fecha", "monto"],
  alta: ["fecha"],
  baja: ["fecha"],
  cambio_sueldo: ["fecha", "monto"],
  otro: ["fecha", "horas", "dias", "monto"],
};

const TIPOS = Object.keys(NOVEDAD_LABEL) as RrhhNovedadTipo[];

export function NovedadDialog({
  open, onOpenChange, periodos, periodoActual, personal, novedad, onSave, saving,
}: Props) {
  const [personalId, setPersonalId] = useState("");
  const [tipo, setTipo] = useState<RrhhNovedadTipo>("inasistencia");
  const [periodoId, setPeriodoId] = useState("");
  const [fecha, setFecha] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [horas, setHoras] = useState("");
  const [dias, setDias] = useState("");
  const [monto, setMonto] = useState("");
  const [observacion, setObservacion] = useState("");

  useEffect(() => {
    if (!open) return;
    setPersonalId(novedad?.personal_id ?? "");
    setTipo(novedad?.tipo ?? "inasistencia");
    setPeriodoId(novedad?.periodo_id ?? periodoActual?.id ?? "");
    setFecha(novedad?.fecha ?? "");
    setDesde(novedad?.fecha_desde ?? "");
    setHasta(novedad?.fecha_hasta ?? "");
    setHoras(novedad?.horas != null ? String(novedad.horas) : "");
    setDias(novedad?.dias != null ? String(novedad.dias) : "");
    setMonto(novedad?.monto != null ? String(novedad.monto) : "");
    setObservacion(novedad?.observacion ?? "");
  }, [open, novedad, periodoActual]);

  const campos = CAMPOS[tipo];
  const num = (v: string) => (v.trim() === "" ? null : Number(v));

  const guardar = async () => {
    if (!personalId) return;
    await onSave({
      periodo_id: periodoId || null,
      personal_id: personalId,
      tipo,
      fecha: campos.includes("fecha") ? fecha || null : null,
      fecha_desde: campos.includes("rango") ? desde || null : null,
      fecha_hasta: campos.includes("rango") ? hasta || null : null,
      horas: campos.includes("horas") ? num(horas) : null,
      dias: campos.includes("dias") ? num(dias) : null,
      monto: campos.includes("monto") ? num(monto) : null,
      observacion: observacion || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{novedad ? "Editar novedad" : "Nueva novedad"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Empleado</Label>
            <Select value={personalId} onValueChange={setPersonalId}>
              <SelectTrigger><SelectValue placeholder="Elegir empleado" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {personal.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.legajo ? `${p.legajo} · ` : ""}{p.apellido || ""} {p.nombre || ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de novedad</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as RrhhNovedadTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {TIPOS.map((t) => (
                    <SelectItem key={t} value={t}>{NOVEDAD_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Se liquida en</Label>
              <Select value={periodoId} onValueChange={setPeriodoId}>
                <SelectTrigger><SelectValue placeholder="Período" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {periodos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {PERIODO_LABEL[p.tipo]} {MESES[p.mes - 1]} {p.anio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {campos.includes("fecha") && (
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          )}

          {campos.includes("rango") && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Desde</Label>
                <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Hasta</Label>
                <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {campos.includes("horas") && (
              <div className="space-y-1.5">
                <Label>Horas</Label>
                <Input type="number" step="0.5" value={horas} onChange={(e) => setHoras(e.target.value)} />
              </div>
            )}
            {campos.includes("dias") && (
              <div className="space-y-1.5">
                <Label>Días</Label>
                <Input type="number" step="0.5" value={dias} onChange={(e) => setDias(e.target.value)} />
              </div>
            )}
            {campos.includes("monto") && (
              <div className="space-y-1.5">
                <Label>Monto</Label>
                <Input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Observación</Label>
            <Textarea rows={2} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={guardar} disabled={!personalId || saving}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

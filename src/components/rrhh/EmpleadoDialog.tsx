import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/utils";
import {
  NOVEDAD_LABEL, useNovedadesPersonal, useSueldosHistorial, useCreateSueldo, useDeleteSueldo,
} from "@/hooks/useRrhh";
import type { PersonalMin } from "./planillaData";

const ESTADOS = ["activo", "vacaciones", "licencia", "art", "baja"];
const fmtARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  empleado: (PersonalMin & { observaciones?: string | null; fecha_alta?: string | null }) | null;
}

export function EmpleadoDialog({ open, onOpenChange, empleado }: Props) {
  const qc = useQueryClient();
  const { data: sueldos = [] } = useSueldosHistorial(empleado?.id ?? null);
  const { data: novedades = [] } = useNovedadesPersonal(empleado?.id ?? null);
  const crearSueldo = useCreateSueldo();
  const borrarSueldo = useDeleteSueldo();

  const [form, setForm] = useState({
    fecha_alta: "", fecha_baja: "", puesto: "", sector: "", estado_laboral: "activo", observaciones: "",
  });

  const [nuevo, setNuevo] = useState({
    vigencia_desde: new Date().toLocaleDateString("en-CA"),
    sueldo_acordado: "", sueldo_registrado: "", modalidad: "mensual", observacion: "",
  });

  useEffect(() => {
    if (!open || !empleado) return;
    const e = empleado as any;
    setForm({
      fecha_alta: e.fecha_alta || "",
      fecha_baja: e.fecha_baja || "",
      puesto: e.puesto || "",
      sector: e.sector || "",
      estado_laboral: e.estado_laboral || "activo",
      observaciones: e.observaciones || "",
    });
  }, [open, empleado]);

  const guardarFicha = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        fecha_alta: form.fecha_alta || null,
        fecha_baja: form.fecha_baja || null,
        puesto: form.puesto || null,
        sector: form.sector || null,
        estado_laboral: form.estado_laboral || null,
        observaciones: form.observaciones || null,
      };
      const { error } = await supabase.from("personal").update(payload as any).eq("id", empleado!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["personal"] });
      toast.success("Ficha actualizada");
    },
    onError: (e: any) => toast.error(e.message || "Error al guardar"),
  });

  const vigente = sueldos[0];
  const diferencia = vigente ? Number(vigente.sueldo_acordado) - Number(vigente.sueldo_registrado) : 0;

  const historial = useMemo(() => {
    const items: { fecha: string; titulo: string; detalle: string }[] = [];
    novedades.forEach((n) =>
      items.push({
        fecha: n.fecha || n.fecha_desde || n.created_at.slice(0, 10),
        titulo: NOVEDAD_LABEL[n.tipo],
        detalle: [
          n.fecha_desde && n.fecha_hasta ? `${formatDate(n.fecha_desde)} al ${formatDate(n.fecha_hasta)}` : "",
          n.horas ? `${n.horas} hs` : "",
          n.dias ? `${n.dias} días` : "",
          n.monto ? fmtARS(Number(n.monto)) : "",
          n.observacion || "",
        ].filter(Boolean).join(" · "),
      }),
    );
    sueldos.forEach((s) =>
      items.push({
        fecha: s.vigencia_desde,
        titulo: "Cambio de sueldo",
        detalle: `Acordado ${fmtARS(Number(s.sueldo_acordado))} · Registrado ${fmtARS(Number(s.sueldo_registrado))}`,
      }),
    );
    return items.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  }, [novedades, sueldos]);

  if (!empleado) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {empleado.apellido} {empleado.nombre}
            {empleado.legajo ? <span className="text-muted-foreground font-normal"> · Legajo {empleado.legajo}</span> : null}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="datos">
          <TabsList>
            <TabsTrigger value="datos">Datos</TabsTrigger>
            <TabsTrigger value="sueldo">Sueldo</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="datos" className="space-y-4 pt-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha de ingreso</Label>
                <Input value={empleado.fecha_ingreso ? formatDate(empleado.fecha_ingreso) : "-"} disabled />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de alta</Label>
                <Input type="date" value={form.fecha_alta} onChange={(e) => setForm({ ...form, fecha_alta: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de baja</Label>
                <Input type="date" value={form.fecha_baja} onChange={(e) => setForm({ ...form, fecha_baja: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={form.estado_laboral} onValueChange={(v) => setForm({ ...form, estado_laboral: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map((e) => (
                      <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Puesto</Label>
                <Input value={form.puesto} onChange={(e) => setForm({ ...form, puesto: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Sector / Obra</Label>
                <Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Textarea rows={2} value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
            </div>
            <Button className="gap-2" disabled={guardarFicha.isPending} onClick={() => guardarFicha.mutate()}>
              <Save className="w-4 h-4" /> Guardar ficha
            </Button>
          </TabsContent>

          <TabsContent value="sueldo" className="space-y-4 pt-4">
            {vigente && (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Acordado</p>
                  <p className="text-lg font-bold">{fmtARS(Number(vigente.sueldo_acordado))}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Registrado</p>
                  <p className="text-lg font-bold">{fmtARS(Number(vigente.sueldo_registrado))}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Diferencia</p>
                  <p className="text-lg font-bold text-primary">{fmtARS(diferencia)}</p>
                </div>
              </div>
            )}

            <div className="rounded-lg border p-3 space-y-3">
              <p className="text-sm font-semibold">Nuevo sueldo vigente</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Vigente desde</Label>
                  <Input type="date" value={nuevo.vigencia_desde}
                    onChange={(e) => setNuevo({ ...nuevo, vigencia_desde: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Modalidad</Label>
                  <Select value={nuevo.modalidad} onValueChange={(v) => setNuevo({ ...nuevo, modalidad: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensual">Mensual</SelectItem>
                      <SelectItem value="quincenal">Quincenal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Sueldo acordado</Label>
                  <Input type="number" step="0.01" value={nuevo.sueldo_acordado}
                    onChange={(e) => setNuevo({ ...nuevo, sueldo_acordado: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Sueldo registrado</Label>
                  <Input type="number" step="0.01" value={nuevo.sueldo_registrado}
                    onChange={(e) => setNuevo({ ...nuevo, sueldo_registrado: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Observación</Label>
                <Input value={nuevo.observacion} onChange={(e) => setNuevo({ ...nuevo, observacion: e.target.value })} />
              </div>
              <Button
                className="gap-2"
                disabled={crearSueldo.isPending || !nuevo.vigencia_desde}
                onClick={async () => {
                  await crearSueldo.mutateAsync({
                    personal_id: empleado.id,
                    vigencia_desde: nuevo.vigencia_desde,
                    sueldo_acordado: Number(nuevo.sueldo_acordado || 0),
                    sueldo_registrado: Number(nuevo.sueldo_registrado || 0),
                    modalidad: nuevo.modalidad,
                    observacion: nuevo.observacion,
                  });
                  setNuevo({ ...nuevo, sueldo_acordado: "", sueldo_registrado: "", observacion: "" });
                }}
              >
                <Plus className="w-4 h-4" /> Guardar sueldo
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Historial de sueldos</p>
              {sueldos.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay sueldos cargados.</p>}
              {sueldos.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="text-sm">
                    <p className="font-medium">Desde {formatDate(s.vigencia_desde)} · <span className="capitalize">{s.modalidad}</span></p>
                    <p className="text-muted-foreground">
                      Acordado {fmtARS(Number(s.sueldo_acordado))} · Registrado {fmtARS(Number(s.sueldo_registrado))} ·
                      Diferencia {fmtARS(Number(s.sueldo_acordado) - Number(s.sueldo_registrado))}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => borrarSueldo.mutate(s.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="historial" className="space-y-2 pt-4">
            {historial.length === 0 && <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>}
            {historial.map((h, i) => (
              <div key={i} className="flex items-start gap-3 border-b last:border-0 pb-2">
                <Badge variant="outline" className="shrink-0">{formatDate(h.fecha)}</Badge>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{h.titulo}</p>
                  {h.detalle && <p className="text-xs text-muted-foreground">{h.detalle}</p>}
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

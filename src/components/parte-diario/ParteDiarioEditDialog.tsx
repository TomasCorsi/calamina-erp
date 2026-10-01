import { useState, useEffect } from "react";
import { useDirtyDialog } from "@/hooks/useDirtyDialog";
import { UnsavedChangesAlert } from "@/components/shared/UnsavedChangesAlert";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { Loader2, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import type { ParteDiario } from "@/hooks/useParteDiario";

interface ParteDiarioEditDialogProps {
  parte: ParteDiario | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: Partial<ParteDiario>) => Promise<void>;
  isSaving?: boolean;
}

interface FormData {
  fecha: string;
  hora_entrada: string;
  hora_salida: string;
  obra_id: string;
  maquinaria_id: string;
  horometro_inicio: number;
  horometro_fin: number;
  combustible: number;
  cantidad_viajes: number;
  cantidad_movimiento_interno: number;
  estado_maquina: string;
  observacion_maquina: string;
  check_filtro_aire: boolean;
  check_aceite_hidraulico: boolean;
  check_aceite_motor: boolean;
  check_liquido_refrigerante: boolean;
  check_uria: boolean;
  novedades: string;
  tareas: string;
  observaciones_inconvenientes: string;
  estado: "borrador" | "completado";
}

const ROL_LABELS: Record<string, string> = {
  maquinista: "Maquinista",
  chofer: "Chofer",
  capataz: "Capataz",
  mecanico: "Mecánico",
  sereno: "Sereno",
  topografo: "Topógrafo",
  ayudante: "Ayudante",
  administrativo: "Administrativo",
};

export function ParteDiarioEditDialog({
  parte,
  open,
  onOpenChange,
  onSave,
  isSaving = false,
}: ParteDiarioEditDialogProps) {
  const { obras = [] } = useObras();
  const { maquinarias = [] } = useMaquinarias();

  const { register, handleSubmit, reset, setValue, watch, formState: { isDirty } } = useForm<FormData>();

  const { showAlert, setShowAlert, handleClose, handleDiscard, handleOpenChange, dirtyProps } =
    useDirtyDialog(onOpenChange, isDirty);

  const rol = parte?.personal?.rol || "";
  const isMaquinista = rol === "maquinista";
  const isChofer = rol === "chofer";
  const isCapataz = rol === "capataz";
  const isMecanico = rol === "mecanico";
  const isAyudante = rol === "ayudante";

  // Reset form when parte changes
  useEffect(() => {
    if (parte) {
      reset({
        fecha: parte.fecha,
        hora_entrada: parte.hora_entrada || "",
        hora_salida: parte.hora_salida || "",
        obra_id: parte.obra_id || "",
        maquinaria_id: parte.maquinaria_id || "",
        horometro_inicio: parte.horometro_inicio || 0,
        horometro_fin: parte.horometro_fin || 0,
        combustible: parte.combustible || 0,
        cantidad_viajes: parte.cantidad_viajes || 0,
        cantidad_movimiento_interno: parte.cantidad_movimiento_interno || 0,
        estado_maquina: parte.estado_maquina || "",
        observacion_maquina: parte.observacion_maquina || "",
        check_filtro_aire: parte.check_filtro_aire || false,
        check_aceite_hidraulico: parte.check_aceite_hidraulico || false,
        check_aceite_motor: parte.check_aceite_motor || false,
        check_liquido_refrigerante: parte.check_liquido_refrigerante || false,
        check_uria: parte.check_uria || false,
        novedades: parte.novedades || "",
        tareas: parte.tareas || "",
        observaciones_inconvenientes: parte.observaciones_inconvenientes || "",
        estado: parte.estado,
      });
    }
  }, [parte, reset]);

  const onSubmit = async (data: FormData) => {
    if (!parte) return;

    const updateData: Partial<ParteDiario> = {
      fecha: data.fecha,
      hora_entrada: data.hora_entrada || null,
      hora_salida: data.hora_salida || null,
      obra_id: data.obra_id || null,
      maquinaria_id: data.maquinaria_id || null,
      horometro_inicio: data.horometro_inicio,
      horometro_fin: data.horometro_fin,
      combustible: data.combustible,
      cantidad_viajes: data.cantidad_viajes,
      cantidad_movimiento_interno: data.cantidad_movimiento_interno,
      estado_maquina: (data.estado_maquina as "OK" | "OBSERVACION") || null,
      observacion_maquina: data.observacion_maquina || null,
      check_filtro_aire: data.check_filtro_aire,
      check_aceite_hidraulico: data.check_aceite_hidraulico,
      check_aceite_motor: data.check_aceite_motor,
      check_liquido_refrigerante: data.check_liquido_refrigerante,
      check_uria: data.check_uria,
      novedades: data.novedades || null,
      tareas: data.tareas || null,
      observaciones_inconvenientes: data.observaciones_inconvenientes || null,
      estado: data.estado,
    };

    await onSave(parte.id, updateData);
  };

  const getEmpleadoNombre = () => {
    if (!parte?.personal) return "Sin asignar";
    const { nombre, apellido } = parte.personal;
    return [nombre, apellido].filter(Boolean).join(" ") || "Sin nombre";
  };

  if (!parte) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0" {...dirtyProps}>
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>
            Editar Parte Diario - {getEmpleadoNombre()}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {ROL_LABELS[rol] || rol} • {format(new Date(parte.fecha), "dd/MM/yyyy")}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <form id="edit-parte-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha</Label>
                <Input type="date" {...register("fecha")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={watch("estado")}
                  onValueChange={(v) => setValue("estado", v as "borrador" | "completado")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="completado">Completado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hora_entrada">Hora Entrada</Label>
                <Input type="time" {...register("hora_entrada")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hora_salida">Hora Salida</Label>
                <Input type="time" {...register("hora_salida")} />
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="obra_id">Obra</Label>
                <Select
                  value={watch("obra_id") || "none"}
                  onValueChange={(v) => setValue("obra_id", v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar obra" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin obra</SelectItem>
                    {obras.map((obra) => (
                      <SelectItem key={obra.id} value={obra.id}>
                        {obra.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maquinaria_id">Maquinaria</Label>
                <Select
                  value={watch("maquinaria_id") || "none"}
                  onValueChange={(v) => setValue("maquinaria_id", v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar maquinaria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin maquinaria</SelectItem>
                    {maquinarias.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.codigo || m.tipo} {m.patente && `(${m.patente})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Horometers - for maquinista/chofer */}
            {(isMaquinista || isChofer) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horometro_inicio">Horómetro Inicio</Label>
                  <Input
                    type="number"
                    step="0.1"
                    {...register("horometro_inicio", { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horometro_fin">Horómetro Fin</Label>
                  <Input
                    type="number"
                    step="0.1"
                    {...register("horometro_fin", { valueAsNumber: true })}
                  />
                </div>
              </div>
            )}

            {/* Fuel and Trips */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="combustible">Combustible (L)</Label>
                <Input
                  type="number"
                  step="0.1"
                  {...register("combustible", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cantidad_viajes">Viajes</Label>
                <Input
                  type="number"
                  {...register("cantidad_viajes", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cantidad_movimiento_interno">Mov. Interno</Label>
                <Input
                  type="number"
                  {...register("cantidad_movimiento_interno", { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Machine Status */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Estado de Máquina</Label>
                <Select
                  value={watch("estado_maquina") || "none"}
                  onValueChange={(v) => setValue("estado_maquina", v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    <SelectItem value="OK">OK</SelectItem>
                    <SelectItem value="OBSERVACION">Con Observación</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {watch("estado_maquina") === "OBSERVACION" && (
                <div className="space-y-2">
                  <Label htmlFor="observacion_maquina">Observación de Máquina</Label>
                  <Textarea {...register("observacion_maquina")} />
                </div>
              )}
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              <Label>Checklist de Verificación</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="check_filtro_aire"
                    checked={watch("check_filtro_aire")}
                    onCheckedChange={(c) => setValue("check_filtro_aire", !!c)}
                  />
                  <label htmlFor="check_filtro_aire" className="text-sm">
                    Filtro de Aire
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="check_aceite_hidraulico"
                    checked={watch("check_aceite_hidraulico")}
                    onCheckedChange={(c) => setValue("check_aceite_hidraulico", !!c)}
                  />
                  <label htmlFor="check_aceite_hidraulico" className="text-sm">
                    Aceite Hidráulico
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="check_aceite_motor"
                    checked={watch("check_aceite_motor")}
                    onCheckedChange={(c) => setValue("check_aceite_motor", !!c)}
                  />
                  <label htmlFor="check_aceite_motor" className="text-sm">
                    Aceite Motor
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="check_liquido_refrigerante"
                    checked={watch("check_liquido_refrigerante")}
                    onCheckedChange={(c) => setValue("check_liquido_refrigerante", !!c)}
                  />
                  <label htmlFor="check_liquido_refrigerante" className="text-sm">
                    Líquido Refrigerante
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="check_uria"
                    checked={watch("check_uria")}
                    onCheckedChange={(c) => setValue("check_uria", !!c)}
                  />
                  <label htmlFor="check_uria" className="text-sm">
                    Urea
                  </label>
                </div>
              </div>
            </div>

            {/* Role-specific fields */}
            {isCapataz && (
              <div className="space-y-2">
                <Label htmlFor="novedades">Novedades</Label>
                <Textarea {...register("novedades")} placeholder="Novedades del día..." />
              </div>
            )}

            {(isMecanico || isAyudante) && (
              <div className="space-y-2">
                <Label htmlFor="tareas">Tareas Realizadas</Label>
                <Textarea {...register("tareas")} placeholder="Tareas realizadas..." />
              </div>
            )}

            {/* General observations */}
            <div className="space-y-2">
              <Label htmlFor="observaciones_inconvenientes">Observaciones / Inconvenientes</Label>
              <Textarea
                {...register("observaciones_inconvenientes")}
                placeholder="Observaciones o inconvenientes..."
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="p-6 pt-0">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button type="submit" form="edit-parte-form" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <UnsavedChangesAlert open={showAlert} onOpenChange={setShowAlert} onDiscard={handleDiscard} />
    </>
  );
}

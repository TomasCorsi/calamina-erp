import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { CargaRepartidor } from "@/hooks/useCargasRepartidor";
import { useDirtyDialog } from "@/hooks/useDirtyDialog";
import { UnsavedChangesAlert } from "@/components/shared/UnsavedChangesAlert";

interface PersonalItem {
  id: string;
  nombre: string | null;
  apellido: string | null;
  legajo: string | null;
}

interface MaquinariaItem {
  id: string;
  codigo: string | null;
  tipo: string;
  patente: string | null;
}

interface ObraItem {
  id: string;
  nombre: string;
  estado: string;
}

interface CargaCombustibleRepartidorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carga: CargaRepartidor | null;
  fechaParte: string;
  personal: PersonalItem[];
  maquinarias: MaquinariaItem[];
  obras: ObraItem[];
  onSave: (data: {
    fecha: string;
    operador_id: string | null;
    maquinaria_id: string | null;
    obra_id: string | null;
    litros: number;
    horas: number | null;
    km: number | null;
    tipo_operador: string;
    tipo_producto: string;
    observaciones: string | null;
    tipo_movimiento: string;
  }) => Promise<void>;
  isSaving: boolean;
}

export const CISTERNAS_CODIGOS = ['981', '982', '983', '984'];

export function CargaCombustibleRepartidorDialog({
  open,
  onOpenChange,
  carga,
  fechaParte,
  personal,
  maquinarias,
  obras,
  onSave,
  isSaving,
}: CargaCombustibleRepartidorDialogProps) {
  const emptyForm = {
    fecha: fechaParte,
    operador_id: '',
    maquinaria_id: '',
    obra_id: '',
    litros: '',
    horas: '',
    km: '',
    tipo_operador: 'interno',
    tipo_producto: 'combustible',
    observaciones: '',
    tipo_movimiento: 'egreso',
  };
  const [formData, setFormData] = useState(emptyForm);

  // Reset form when dialog opens/carga changes
  useEffect(() => {
    if (open) {
      if (carga) {
        setFormData({
          fecha: carga.fecha,
          operador_id: carga.operador_id || '',
          maquinaria_id: carga.maquinaria_id || '',
          obra_id: carga.obra_id || '',
          litros: carga.litros?.toString() || '',
          horas: carga.horas?.toString() || '',
          km: carga.km?.toString() || '',
          tipo_operador: carga.tipo_operador || 'interno',
          tipo_producto: carga.tipo_producto || 'combustible',
          observaciones: carga.observaciones || '',
          tipo_movimiento: carga.tipo_movimiento || 'egreso',
        });
      } else {
        setFormData({ ...emptyForm, fecha: fechaParte });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, carga, fechaParte]);

  const isIngreso = formData.tipo_movimiento === 'ingreso';

  const isDirty = useMemo(() => {
    const hasContent = formData.litros !== '' || formData.operador_id !== '' || 
      formData.maquinaria_id !== '' || formData.observaciones !== '';
    return hasContent;
  }, [formData]);

  const { showAlert, setShowAlert, handleClose, handleDiscard, handleOpenChange, dirtyProps } =
    useDirtyDialog(onOpenChange, isDirty);

  // Combobox options
  const operadorOptions: ComboboxOption[] = useMemo(() => {
    return personal.map(p => ({
      value: p.id,
      label: `${p.apellido || ''}, ${p.nombre || ''}${p.legajo ? ` (#${p.legajo})` : ''}`.trim(),
      searchValue: `${p.apellido} ${p.nombre} ${p.legajo}`.toLowerCase(),
    }));
  }, [personal]);

  const maquinariaOptions: ComboboxOption[] = useMemo(() => {
    return maquinarias.map(m => ({
      value: m.id,
      label: `${m.codigo || m.tipo}${m.patente ? ` - ${m.patente}` : ''}`,
      searchValue: `${m.codigo || ''} ${m.tipo} ${m.patente || ''}`.toLowerCase(),
    }));
  }, [maquinarias]);

  const cisternas = useMemo(
    () => maquinarias
      .filter(m => CISTERNAS_CODIGOS.includes((m.codigo || '').trim()))
      .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '')),
    [maquinarias]
  );

  const obraOptions: ComboboxOption[] = useMemo(() => {
    return obras
      .filter(o => o.estado === 'activa')
      .map(o => ({
        value: o.id,
        label: o.nombre,
        searchValue: o.nombre.toLowerCase(),
      }));
  }, [obras]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'tipo_movimiento') {
        // Al cambiar de tipo, limpiar la máquina para evitar mezclar cisterna/máquina
        next.maquinaria_id = '';
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    const litros = parseFloat(formData.litros) || 0;
    if (litros <= 0) {
      return; // Simple validation - litros is required
    }
    if (isIngreso && !formData.maquinaria_id) return;

    await onSave({
      fecha: formData.fecha,
      operador_id: isIngreso ? null : formData.operador_id || null,
      maquinaria_id: formData.maquinaria_id || null,
      obra_id: isIngreso ? null : formData.obra_id || null,
      litros,
      horas: !isIngreso && formData.horas ? parseFloat(formData.horas) : null,
      km: !isIngreso && formData.km ? parseFloat(formData.km) : null,
      tipo_operador: formData.tipo_operador,
      tipo_producto: formData.tipo_producto,
      observaciones: formData.observaciones || null,
      tipo_movimiento: formData.tipo_movimiento,
    });

    onOpenChange(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" {...dirtyProps}>
        <DialogHeader>
          <DialogTitle>
            {carga ? 'Editar Entrega' : 'Nueva Entrega'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Movimiento */}
          <div className="space-y-2">
            <Label>Movimiento *</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={!isIngreso ? 'default' : 'outline'}
                onClick={() => handleChange('tipo_movimiento', 'egreso')}
              >
                Egreso (a máquina)
              </Button>
              <Button
                type="button"
                variant={isIngreso ? 'default' : 'outline'}
                onClick={() => handleChange('tipo_movimiento', 'ingreso')}
              >
                Ingreso (a cisterna)
              </Button>
            </div>
          </div>

          {/* Fecha */}
          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha</Label>
            <Input
              id="fecha"
              type="date"
              value={formData.fecha}
              onChange={(e) => handleChange('fecha', e.target.value)}
            />
          </div>

          {/* Tipo de Producto */}
          <div className="space-y-2">
            <Label>Producto *</Label>
            <Select value={formData.tipo_producto} onValueChange={(v) => handleChange('tipo_producto', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar producto..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="combustible">🛢️ Combustible</SelectItem>
                <SelectItem value="grasa">🧴 Grasa</SelectItem>
                <SelectItem value="aceite">🫗 Aceite</SelectItem>
                <SelectItem value="uria">💧 Urea</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isIngreso ? (
            <div className="space-y-2">
              <Label>Cisterna *</Label>
              <div className="grid grid-cols-4 gap-2">
                {cisternas.map((c) => (
                  <Button
                    key={c.id}
                    type="button"
                    variant={formData.maquinaria_id === c.id ? 'default' : 'outline'}
                    onClick={() => handleChange('maquinaria_id', c.id)}
                  >
                    {c.codigo}
                  </Button>
                ))}
              </div>
              {cisternas.length === 0 && (
                <p className="text-xs text-muted-foreground">No se encontraron las cisternas 981–984.</p>
              )}
            </div>
          ) : (
            <>
          {/* Operador */}
          <div className="space-y-2">
            <Label>Operador</Label>
            <Combobox
              options={operadorOptions}
              value={formData.operador_id}
              onValueChange={(v) => handleChange('operador_id', v)}
              placeholder="Seleccionar operador..."
              searchPlaceholder="Buscar operador..."
              emptyText="No se encontró operador"
            />
          </div>

          {/* Tipo Operador */}
          <div className="space-y-2">
            <Label>Tipo Operador</Label>
            <Select value={formData.tipo_operador} onValueChange={(v) => handleChange('tipo_operador', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interno">Interno</SelectItem>
                <SelectItem value="externo">Externo</SelectItem>
                <SelectItem value="fletero">Fletero</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Maquinaria */}
          <div className="space-y-2">
            <Label>Maquinaria</Label>
            <Combobox
              options={maquinariaOptions}
              value={formData.maquinaria_id}
              onValueChange={(v) => handleChange('maquinaria_id', v)}
              placeholder="Seleccionar maquinaria..."
              searchPlaceholder="Buscar máquina..."
              emptyText="No se encontró máquina"
            />
          </div>
            </>
          )}

          {/* Cantidad */}
          <div className="space-y-2">
            <Label htmlFor="litros">
              {formData.tipo_producto === 'grasa' ? 'Cantidad (Kg) *' : 'Cantidad (Litros) *'}
            </Label>
            <Input
              id="litros"
              type="number"
              inputMode="decimal"
              placeholder="0"
              value={formData.litros}
              onChange={(e) => handleChange('litros', e.target.value)}
              className="text-lg"
            />
          </div>

          {!isIngreso && (
            <>
          {/* Horas y Km */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="horas">Horas</Label>
              <Input
                id="horas"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={formData.horas}
                onChange={(e) => handleChange('horas', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="km">Km</Label>
              <Input
                id="km"
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={formData.km}
                onChange={(e) => handleChange('km', e.target.value)}
              />
            </div>
          </div>

          {/* Obra */}
          <div className="space-y-2">
            <Label>Obra / Ubicación</Label>
            <Combobox
              options={obraOptions}
              value={formData.obra_id}
              onValueChange={(v) => handleChange('obra_id', v)}
              placeholder="Seleccionar obra..."
              searchPlaceholder="Buscar obra..."
              emptyText="No se encontró obra"
            />
          </div>
            </>
          )}

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              placeholder="Observaciones..."
              value={formData.observaciones}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              className="min-h-20"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !formData.litros || (isIngreso && !formData.maquinaria_id)}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {carga ? 'Actualizar' : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <UnsavedChangesAlert open={showAlert} onOpenChange={setShowAlert} onDiscard={handleDiscard} />
    </>
  );
}

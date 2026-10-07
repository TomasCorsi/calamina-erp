import { useEffect, useMemo, useState } from "react";
import { FormDialog } from "@/components/shared/FormDialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Sparkles } from "lucide-react";
import {
  OrdenCompraForm,
  OrdenCompraItemForm,
  OrdenCompraWithRelations,
  EstadoOrdenCompra,
  MonedaOrdenCompra,
} from "@/hooks/useOrdenesCompra";
import { useProveedores } from "@/hooks/useProveedores";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";

import { SECTORES } from "./sectores";
import { format } from "date-fns";
import { ImportFacturaProveedorDialog, ParsedOrdenCompra } from "./ImportFacturaProveedorDialog";
import { toast } from "sonner";
import { findBestProveedorMatch } from "@/utils/stringSimilarity";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (form: OrdenCompraForm) => Promise<void>;
  editing?: OrdenCompraWithRelations | null;
}

const emptyItem = (): OrdenCompraItemForm => ({
  articulo: "",
  descripcion: "",
  unidad: "un",
  cantidad: 1,
  precio_unitario: 0,
  subtotal: 0,
  orden: 0,
});

const emptyForm = (): OrdenCompraForm => ({
  numero: "",
  numero_factura: "",
  fecha: format(new Date(), "yyyy-MM-dd"),
  proveedor_id: "",
  obra_id: "",
  maquinaria_id: null,
  sector: "",
  estado: "borrador",
  incluir_iva: true,
  iva_porcentaje: 21,
  percepcion_iva: 0,
  percepcion_iibb: 0,
  moneda: "ARS",
  condiciones_pago: "",
  fecha_entrega_estimada: "",
  observaciones: "",
  items: [emptyItem()],
});

const monedaSymbol = (m: MonedaOrdenCompra) => (m === "USD" ? "US$" : "$");
const monedaLabel = (m: MonedaOrdenCompra) => (m === "USD" ? "Dólares (USD)" : "Pesos (ARS)");

function fmtMoney(n: number, moneda: MonedaOrdenCompra) {
  return `${monedaSymbol(moneda)} ${(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function OrdenCompraFormDialog({ open, onOpenChange, onSubmit, editing }: Props) {
  const { proveedores } = useProveedores(open);
  const { obras } = useObras({ enabled: open });
  const { maquinarias } = useMaquinarias(open);
  const [form, setForm] = useState<OrdenCompraForm>(emptyForm());
  const [importOpen, setImportOpen] = useState(false);

  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

  const handleImport = (parsed: ParsedOrdenCompra) => {
    setForm((f) => {
      const next: OrdenCompraForm = { ...f };

      // Matching de proveedor: CUIT exacto, luego similitud por nombre
      if (parsed.proveedor_nombre || parsed.proveedor_cuit) {
        const result = findBestProveedorMatch(
          parsed.proveedor_nombre || "",
          parsed.proveedor_cuit,
          proveedores.map((p) => ({ id: p.id, nombre: p.nombre, cuit: (p as any).cuit }))
        );
        if (result && (result.byCuit || result.score >= 0.5)) {
          next.proveedor_id = result.proveedor.id;
          if (result.byCuit) {
            toast.success(`Proveedor identificado por CUIT: ${result.proveedor.nombre}`);
          } else if (result.score >= 0.75) {
            toast.success(`Proveedor detectado: ${result.proveedor.nombre}`);
          } else {
            toast.warning(`Proveedor sugerido: ${result.proveedor.nombre} (verificá que sea correcto)`);
          }
        } else if (parsed.proveedor_nombre) {
          toast.warning(`No se encontró un proveedor similar a "${parsed.proveedor_nombre}", seleccionalo manualmente`);
        }
      }

      if (parsed.numero_factura && !f.numero_factura) {
        next.numero_factura = parsed.numero_factura.trim();
      }

      if (parsed.fecha && /^\d{4}-\d{2}-\d{2}$/.test(parsed.fecha)) next.fecha = parsed.fecha;
      if (parsed.moneda) next.moneda = parsed.moneda;
      if (typeof parsed.incluir_iva === "boolean") next.incluir_iva = parsed.incluir_iva;
      if (typeof parsed.iva_porcentaje === "number" && parsed.iva_porcentaje > 0) next.iva_porcentaje = parsed.iva_porcentaje;
      if (typeof parsed.percepcion_iva === "number" && parsed.percepcion_iva > 0) next.percepcion_iva = parsed.percepcion_iva;
      if (typeof parsed.percepcion_iibb === "number" && parsed.percepcion_iibb > 0) next.percepcion_iibb = parsed.percepcion_iibb;
      if (parsed.condiciones_pago && !f.condiciones_pago) next.condiciones_pago = parsed.condiciones_pago;
      if (parsed.observaciones && !f.observaciones) next.observaciones = parsed.observaciones;

      if (parsed.items && parsed.items.length > 0) {
        next.items = parsed.items.map((it, i) => {
          const cantidad = Number(it.cantidad) || 0;
          const precio = Number(it.precio_unitario) || 0;
          return {
            articulo: it.articulo || "",
            descripcion: it.descripcion || "",
            unidad: it.unidad || "un",
            cantidad,
            precio_unitario: precio,
            subtotal: cantidad * precio,
            orden: i,
          };
        });
      }

      return next;
    });
    toast.success(`Se importaron ${parsed.items?.length || 0} ítems desde la cotización`);
  };

  useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          numero: editing.numero || "",
          numero_factura: (editing as any).numero_factura || "",
          fecha: editing.fecha,
          proveedor_id: editing.proveedor_id || "",
          obra_id: editing.obra_id || "",
          maquinaria_id: editing.maquinaria_id || null,
          sector: editing.sector || "",
          estado: editing.estado,
          incluir_iva: editing.incluir_iva,
          iva_porcentaje: Number(editing.iva_porcentaje ?? 21),
          percepcion_iva: Number(editing.percepcion_iva ?? 0),
          percepcion_iibb: Number(editing.percepcion_iibb ?? 0),
          moneda: (editing.moneda as MonedaOrdenCompra) || "ARS",
          condiciones_pago: editing.condiciones_pago || "",
          fecha_entrega_estimada: editing.fecha_entrega_estimada || "",
          observaciones: editing.observaciones || "",
          items: (editing.items || [])
            .slice()
            .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
            .map((it, idx) => ({
              id: it.id,
              articulo: it.articulo || "",
              descripcion: it.descripcion,
              unidad: it.unidad,
              cantidad: Number(it.cantidad),
              precio_unitario: Number(it.precio_unitario),
              subtotal: Number(it.subtotal),
              orden: idx,
            })),
        });
      } else {
        setForm(emptyForm());
      }
    }
  }, [open, editing]);

  const proveedorOptions = useMemo(
    () => proveedores.filter((p) => p.activo).map((p) => ({ value: p.id, label: p.nombre })),
    [proveedores]
  );
  const obraOptions = useMemo(
    () => [{ value: "", label: "— Sin obra —" }, ...obras.map((o) => ({ value: o.id, label: `${o.numero ? `${o.numero} - ` : ""}${o.nombre}` }))],
    [obras]
  );
  const maquinariaOptions = useMemo(() => {
    const activas = maquinarias
      .filter((m: any) => m.estado !== "inactiva")
      .sort((a: any, b: any) => (a.codigo || "").localeCompare(b.codigo || ""))
      .map((m: any) => {
        const parts: string[] = [];
        if (m.codigo) parts.push(m.codigo);
        if (m.patente) parts.push(m.patente);
        if (m.nombre) parts.push(m.nombre);
        return { value: m.id, label: parts.length ? parts.join(" · ") : "Sin identificar" };
      });
    return [{ value: "__none__", label: "— Sin maquinaria —" }, ...activas];
  }, [maquinarias]);

  const totales = useMemo(() => {
    const subtotal = form.items.reduce((s, it) => s + (Number(it.cantidad) || 0) * (Number(it.precio_unitario) || 0), 0);
    const iva = form.incluir_iva ? subtotal * ((Number(form.iva_porcentaje) || 0) / 100) : 0;
    const percIva = Number(form.percepcion_iva) || 0;
    const percIibb = Number(form.percepcion_iibb) || 0;
    return { subtotal, iva, percIva, percIibb, total: subtotal + iva + percIva + percIibb };
  }, [form.items, form.incluir_iva, form.iva_porcentaje, form.percepcion_iva, form.percepcion_iibb]);

  const updateItem = (idx: number, patch: Partial<OrdenCompraItemForm>) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, ...patch };
        next.subtotal = (Number(next.cantidad) || 0) * (Number(next.precio_unitario) || 0);
        return next;
      }),
    }));
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { ...emptyItem(), orden: f.items.length }] }));
  const removeItem = (idx: number) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const handleSubmit = async () => {
    if (!form.proveedor_id) return;
    if (form.items.length === 0 || form.items.every((it) => !it.descripcion.trim())) return;
    const cleanedItems = form.items.filter((it) => it.descripcion.trim());
    await onSubmit({ ...form, items: cleanedItems });
    onOpenChange(false);
  };

  const sym = monedaSymbol(form.moneda);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? `Editar Orden ${editing.numero}` : "Nueva Orden de Compra"}
      onSubmit={handleSubmit}
      submitLabel={editing ? "Guardar" : "Crear"}
      size="2xl"
    >
      <div className="space-y-4">
        {!editing && (
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1">
              <Sparkles className="w-4 h-4 text-primary" /> Importar con IA
            </Button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Label>Proveedor *</Label>
            <Combobox
              options={proveedorOptions}
              value={form.proveedor_id}
              onValueChange={(v) => setForm({ ...form, proveedor_id: v })}
              placeholder="Seleccionar proveedor..."
            />
          </div>
          <div>
            <Label>Fecha</Label>
            <Input
              type="date"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </div>
          <div>
            <Label>Moneda</Label>
            <Select value={form.moneda} onValueChange={(v) => setForm({ ...form, moneda: v as MonedaOrdenCompra })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                <SelectItem value="USD">Dólares (USD)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {editing && (
            <div>
              <Label>N° Orden de Compra</Label>
              <Input
                value={form.numero || ""}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
                placeholder="OC-0001"
              />
            </div>
          )}
          <div className={editing ? "" : "md:col-span-2"}>
            <Label>N° Factura Proveedor (opcional)</Label>
            <Input
              value={form.numero_factura || ""}
              onChange={(e) => setForm({ ...form, numero_factura: e.target.value })}
              placeholder="Ej: 0001-00012345"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Obra destino</Label>
            <Combobox
              options={obraOptions}
              value={form.obra_id || ""}
              onValueChange={(v) => setForm({ ...form, obra_id: v })}
              placeholder="Sin obra"
            />
          </div>
          <div>
            <Label>Estado</Label>
            <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as EstadoOrdenCompra })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="emitida">Emitida</SelectItem>
                <SelectItem value="recibida">Recibida</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fecha entrega estimada</Label>
            <Input
              type="date"
              value={form.fecha_entrega_estimada || ""}
              onChange={(e) => setForm({ ...form, fecha_entrega_estimada: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Maquinaria (opcional)</Label>
            <Combobox
              options={maquinariaOptions}
              value={form.maquinaria_id || "__none__"}
              onValueChange={(v) => setForm({ ...form, maquinaria_id: v === "__none__" ? null : v })}
              placeholder="Sin maquinaria"
              searchPlaceholder="Buscar por código, patente o nombre..."
              emptyText="No se encontraron maquinarias"
            />
          </div>
          <div>
            <Label>Sector (opcional)</Label>
            <Select
              value={form.sector || "__none__"}
              onValueChange={(v) => setForm({ ...form, sector: v === "__none__" ? "" : v })}
            >
              <SelectTrigger><SelectValue placeholder="Sin sector" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Sin sector —</SelectItem>
                {SECTORES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Items */}
        <div className="border border-border rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Materiales / Ítems <span className="text-xs text-muted-foreground">({monedaLabel(form.moneda)})</span></h3>
            <Button type="button" size="sm" variant="outline" onClick={addItem} className="gap-1">
              <Plus className="w-4 h-4" /> Agregar ítem
            </Button>
          </div>

          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground px-1">
            <div className="col-span-2">Artículo</div>
            <div className="col-span-3">Descripción</div>
            <div className="col-span-1">Unidad</div>
            <div className="col-span-2 text-right">Cantidad</div>
            <div className="col-span-2 text-right">P. Unitario ({sym})</div>
            <div className="col-span-1 text-right">Subtotal</div>
            <div className="col-span-1"></div>
          </div>

          {form.items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <Input
                className="col-span-2"
                placeholder="Código / Art."
                value={it.articulo || ""}
                onChange={(e) => updateItem(idx, { articulo: e.target.value })}
              />
              <Input
                className="col-span-3"
                placeholder="Material o descripción"
                value={it.descripcion}
                onChange={(e) => updateItem(idx, { descripcion: e.target.value })}
              />
              <Input
                className="col-span-1"
                value={it.unidad}
                onChange={(e) => updateItem(idx, { unidad: e.target.value })}
              />
              <Input
                className="col-span-2 text-right"
                type="number"
                step="0.01"
                value={it.cantidad}
                onChange={(e) => updateItem(idx, { cantidad: parseFloat(e.target.value) || 0 })}
              />
              <Input
                className="col-span-2 text-right"
                type="number"
                step="0.01"
                value={it.precio_unitario}
                onChange={(e) => updateItem(idx, { precio_unitario: parseFloat(e.target.value) || 0 })}
              />
              <div className="col-span-1 text-right text-sm font-medium">
                {((it.cantidad || 0) * (it.precio_unitario || 0)).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="col-span-1"
                onClick={() => removeItem(idx)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        {/* Impuestos / percepciones */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-border rounded-md p-3">
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="incluir-iva"
                checked={form.incluir_iva}
                onCheckedChange={(v) => setForm({ ...form, incluir_iva: v })}
              />
              <Label htmlFor="incluir-iva">Incluye IVA</Label>
            </div>
            <div className="flex-1">
              <Label className="text-xs">% IVA</Label>
              <Input
                type="number"
                step="0.01"
                disabled={!form.incluir_iva}
                value={form.iva_porcentaje}
                onChange={(e) => setForm({ ...form, iva_porcentaje: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div>
            <Label>Percepción IVA ({sym})</Label>
            <Input
              type="number"
              step="0.01"
              value={form.percepcion_iva}
              onChange={(e) => setForm({ ...form, percepcion_iva: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label>Percepción IIBB ({sym})</Label>
            <Input
              type="number"
              step="0.01"
              value={form.percepcion_iibb}
              onChange={(e) => setForm({ ...form, percepcion_iibb: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>

        {/* Totales */}
        <div className="flex justify-end">
          <div className="w-full md:w-80 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{fmtMoney(totales.subtotal, form.moneda)}</span>
            </div>
            {form.incluir_iva && (
              <div className="flex justify-between">
                <span>IVA {form.iva_porcentaje}%:</span>
                <span>{fmtMoney(totales.iva, form.moneda)}</span>
              </div>
            )}
            {totales.percIva > 0 && (
              <div className="flex justify-between">
                <span>Percepción IVA:</span>
                <span>{fmtMoney(totales.percIva, form.moneda)}</span>
              </div>
            )}
            {totales.percIibb > 0 && (
              <div className="flex justify-between">
                <span>Percepción IIBB:</span>
                <span>{fmtMoney(totales.percIibb, form.moneda)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-border pt-1">
              <span>Total:</span>
              <span className="text-primary">{fmtMoney(totales.total, form.moneda)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label>Condiciones de pago</Label>
            <Textarea
              rows={2}
              value={form.condiciones_pago || ""}
              onChange={(e) => setForm({ ...form, condiciones_pago: e.target.value })}
              placeholder="Ej: 50% anticipo, 50% contra entrega"
            />
          </div>
          <div>
            <Label>Observaciones</Label>
            <Textarea
              rows={2}
              value={form.observaciones || ""}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            />
          </div>
        </div>
      </div>
      <ImportFacturaProveedorDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} />
    </FormDialog>
  );
}

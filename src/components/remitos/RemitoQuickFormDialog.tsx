import { useState, useEffect, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { RemitoForm } from "@/hooks/useRemitos";
import { useDirtyDialog } from "@/hooks/useDirtyDialog";
import { UnsavedChangesAlert } from "@/components/shared/UnsavedChangesAlert";
import { ObraWithRelations } from "@/hooks/useObras";
import { MaquinariaWithRelations } from "@/hooks/useMaquinarias";
import { ClienteDB } from "@/hooks/useClientes";
import { ProveedorDB } from "@/hooks/useProveedores";
import { useAuth } from "@/hooks/useAuth";
import { RemitoItemsEditor } from "@/components/remitos/RemitoItemsEditor";
import { fetchRemitoItems, RemitoItemInput, totalItems } from "@/hooks/useRemitoItems";

const FRANCO_USER_ID = "2184b0ef-3c4f-4ca7-bdbf-c7cc69fc4c3a";

const TIPO_MATERIAL_OPTIONS = [
  "Residuos", "Desmonte", "Cascote", "Escombro", "Tierra", "Piedra",
  "Movimiento interno", "Tosca", "Cemento", "Hormigon", "Traslado",
  "Cubiertas", "Frezado", "Cobertura de residuos", "Arena", "Hormigon H30",
  "Tierra negra", "Relleno", "Piedra 30/50", "Materiales varios",
  "Raices", "Traslado interno", "Barro", "Limpieza de obra", "Cal Vial",
  "Caños", "Suelo seleccionado",
];

const TIPO_TRANSPORTE_OPTIONS = [
  "Calamina Sur", "Geo hermanos", "Diaz Neiva", "japones", "Cato", "Tatu",
  "Patan", "Hormicret", "Lamacol", "Britcom", "Ramon romero gomez", "Duraez",
  "Ranelga", "San-vol", "Santino", "Acosta", "Meyer", "Bozzuto", "Legui",
  "Larraige", "Fidanza", "Transgom", "ARIDO EXPRESS S.A", "BERTONE", "NARDONI",
];

const UNIDAD_OPTIONS = ["TN", "KG", "M3", "M2", "U", "DIA"];

export interface RemitoEditData {
  id: string;
  fecha: string;
  remito_tercero: string;
  remito_local: string;
  desde: string;
  hasta: string;
  tipo_material: string;
  tipo_transporte: string;
  maquinaria_id: string;
  patente_tercero: string;
  cliente: string;
  cliente_destino: string;
  cantidad_viajes: number;
  cantidad_uni: number | null;
  cantidad: number;
  unidad: string;
  precio_unitario: number | null;
  precio_total: number;
  precio_calc_mode: string;
  proveedor: string;
  observaciones: string;
  forma_pago: string;
  cliente_cantera?: string;
}

interface RemitoQuickFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obras: ObraWithRelations[];
  maquinarias: MaquinariaWithRelations[];
  clientes: ClienteDB[];
  proveedores?: ProveedorDB[];
  generateNumero: () => string;
  onSubmit: (remito: RemitoForm & { id?: string; items?: RemitoItemInput[] }) => Promise<void>;
  editingRemito?: RemitoEditData | null;
}

const today = () => new Date().toISOString().split("T")[0];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-1 sm:col-span-2 md:col-span-3 pt-2 pb-1">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{children}</h4>
      <div className="border-b border-border mt-1" />
    </div>
  );
}

export function RemitoQuickFormDialog({
  open,
  onOpenChange,
  obras,
  maquinarias,
  clientes,
  proveedores = [],
  generateNumero,
  onSubmit,
  editingRemito,
}: RemitoQuickFormDialogProps) {
  const { user, hasRole } = useAuth();
  const isFranco = user?.id === FRANCO_USER_ID;
  const isAdmin = hasRole('admin');
  const showClienteCantera = isFranco || isAdmin;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => getInitialForm());

  function isObraExterna(numero: string | null): boolean {
    if (!numero) return false;
    const num = parseInt(numero, 10);
    return !isNaN(num) && num >= 300;
  }

  function getClienteForObra(obraNombre: string): string {
    const obra = obras.find(o => o.nombre === obraNombre);
    if (obra && isObraExterna(obra.numero)) {
      return obra.cliente?.nombre || "";
    }
    return "";
  }

  function getInitialForm() {
    return {
      fecha: today(),
      remito_tercero: "",
      remito_local: "",
      desde: isFranco ? "Cantera San Vicente" : "",
      hasta: "",
      tipo_material: isFranco ? "Tosca" : "",
      tipo_transporte: "",
      maquinaria_id: "",
      patente_tercero: "",
      cliente: "",
      cliente_destino: "",
      cantidad_viajes: 1,
      cantidad_uni: 0,
      cantidad: 0,
      unidad: "M3",
      precio_unitario: 0,
      precio_total: 0,
      precio_calc_mode: isFranco ? "cantidad" : "viajes",
      proveedor: "",
      observaciones: "",
      forma_pago: "",
      cliente_cantera: "",
    };
  }

  useEffect(() => {
    if (open) {
      if (editingRemito) {
        setForm({
          fecha: editingRemito.fecha,
          remito_tercero: editingRemito.remito_tercero || "",
          remito_local: editingRemito.remito_local || "",
          desde: editingRemito.desde || "",
          hasta: editingRemito.hasta || "",
          tipo_material: editingRemito.tipo_material || "",
          tipo_transporte: editingRemito.tipo_transporte || "",
          maquinaria_id: editingRemito.maquinaria_id || "",
          patente_tercero: editingRemito.patente_tercero || "",
          cliente: editingRemito.cliente || "",
          cliente_destino: editingRemito.cliente_destino || "",
          cantidad_viajes: editingRemito.cantidad_viajes || 1,
          cantidad_uni: editingRemito.cantidad_uni || 0,
          cantidad: editingRemito.cantidad || 0,
          unidad: editingRemito.unidad || "M3",
          precio_unitario: editingRemito.precio_unitario || 0,
          precio_total: editingRemito.precio_total || 0,
          precio_calc_mode: editingRemito.precio_calc_mode || "viajes",
          proveedor: editingRemito.proveedor || "",
          observaciones: editingRemito.observaciones || "",
          forma_pago: editingRemito.forma_pago || "",
          cliente_cantera: (editingRemito as any).cliente_cantera || "",
        });
      } else {
        setForm(getInitialForm());
      }
    }
  }, [open, editingRemito]);

  // Ítems adicionales del remito (jornadas de máquina, servicios)
  const [items, setItems] = useState<RemitoItemInput[]>([]);
  useEffect(() => {
    if (!open) return;
    if (editingRemito?.id) {
      let cancel = false;
      fetchRemitoItems(editingRemito.id)
        .then((data) => {
          if (!cancel) setItems(data.map(({ id, remito_id, orden, ...rest }) => rest));
        })
        .catch(() => setItems([]));
      return () => {
        cancel = true;
      };
    }
    setItems([]);
  }, [open, editingRemito]);

  // Buffers de texto para campos decimales (permite escribir "0.", "1,", ".5", etc.)
  const [cantUniStr, setCantUniStr] = useState<string>("");
  const [precioUniStr, setPrecioUniStr] = useState<string>("");

  useEffect(() => {
    if (open) {
      const cu = editingRemito?.cantidad_uni ?? 0;
      const pu = editingRemito?.precio_unitario ?? 0;
      setCantUniStr(cu ? String(cu) : "");
      setPrecioUniStr(pu ? String(pu) : "");
    }
  }, [open, editingRemito]);

  // NO rechaza input: filtra caracteres inválidos y normaliza coma->punto.
  // Acepta múltiples separadores temporalmente; al parsear toma el primero.
  const handleDecimalChange = (
    raw: string,
    setStr: (s: string) => void,
    field: string,
  ) => {
    // Quitar todo lo que no sea dígito, punto o coma
    let cleaned = raw.replace(/[^0-9.,]/g, "");
    // Unificar coma en punto para mostrar consistente (opcional: dejar lo que tipea)
    // Mantenemos el carácter original que tipeó el usuario para no sorprenderlo
    setStr(cleaned);
    // Para parsear: reemplazar coma por punto y dejar solo el primer separador
    const normalized = cleaned.replace(/,/g, ".");
    const firstDot = normalized.indexOf(".");
    const numericStr =
      firstDot === -1
        ? normalized
        : normalized.slice(0, firstDot + 1) + normalized.slice(firstDot + 1).replace(/\./g, "");
    const num = numericStr === "" || numericStr === "." ? 0 : parseFloat(numericStr);
    set(field, isNaN(num) ? 0 : num);
  };

  const isDirty = useMemo(() => {
    const initial = getInitialForm();
    return JSON.stringify(form) !== JSON.stringify(initial);
  }, [form]);

  const { showAlert, setShowAlert, handleClose, handleDiscard, handleOpenChange, dirtyProps } =
    useDirtyDialog(onOpenChange, isDirty);

  const set = (field: string, value: any) =>
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // Auto-fill cliente when "desde" changes
      if (field === "desde") {
        next.cliente = getClienteForObra(value as string);
      }
      // Auto-fill cliente_destino when "hasta" changes
      if (field === "hasta") {
        next.cliente_destino = getClienteForObra(value as string);
      }

      // Auto-calc cantidad = cantidad_uni × cantidad_viajes
      if (field === "cantidad_uni" || field === "cantidad_viajes") {
        next.cantidad = (next.cantidad_uni || 0) * (next.cantidad_viajes || 0);
      }

      // Auto-calc precio_total
      const mode = next.precio_calc_mode;
      if (mode === "viajes") {
        next.precio_total = (next.cantidad_viajes || 0) * (next.precio_unitario || 0);
      } else if (mode === "fijo") {
        next.precio_total = next.precio_unitario || 0;
      } else {
        next.precio_total = (next.cantidad || 0) * (next.precio_unitario || 0);
      }
      return next;
    });

  const obraOptions: ComboboxOption[] = obras.map((o) => ({
    value: o.nombre,
    label: o.numero ? `${o.numero} - ${o.nombre}` : o.nombre,
  }));

  const maquinariaOptions: ComboboxOption[] = maquinarias.map((m) => ({
    value: m.id,
    label: [m.codigo, m.patente].filter(Boolean).join(" - ") || m.id.slice(0, 8),
    searchValue: [m.codigo, m.patente, m.nombre, m.tipo].filter(Boolean).join(" "),
  }));

  const tipoMaterialOptions: ComboboxOption[] = TIPO_MATERIAL_OPTIONS.map((t) => ({
    value: t,
    label: t,
  }));

  const unidadOptions: ComboboxOption[] = UNIDAD_OPTIONS.map((u) => ({
    value: u,
    label: u,
  }));

  const handleSubmit = async () => {
    if (!form.fecha) return;
    setSaving(true);
    try {
      const cantidad = (form.cantidad_uni || 0) * (form.cantidad_viajes || 0);
      const remito: RemitoForm & { id?: string; items?: RemitoItemInput[] } = {
        items,
        numero: form.remito_local || generateNumero(),
        fecha: form.fecha,
        material: form.tipo_material || "-",
        cantidad,
        unidad: form.unidad,
        recibido_por: "-",
        firmado: false,
        remito_tercero: form.remito_tercero || undefined,
        remito_local: form.remito_local || undefined,
        desde: form.desde || undefined,
        hasta: form.hasta || undefined,
        tipo_material: form.tipo_material || undefined,
        tipo_transporte: form.tipo_transporte || undefined,
        maquinaria_id: form.maquinaria_id || undefined,
        patente_tercero: form.patente_tercero || undefined,
        cliente: form.cliente || undefined,
        cliente_destino: form.cliente_destino || undefined,
        cantidad_viajes: form.cantidad_viajes,
        cantidad_uni: form.cantidad_uni || null,
        precio_unitario: form.precio_unitario || null,
        precio_total: form.precio_total,
        precio_calc_mode: form.precio_calc_mode,
        proveedor: form.proveedor || undefined,
        observaciones: form.observaciones || undefined,
        forma_pago: form.forma_pago || null,
        cliente_cantera: form.cliente_cantera || null,
      };
      if (editingRemito) {
        remito.id = editingRemito.id;
      }
      await onSubmit(remito);
      onOpenChange(false);
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-card border-border" {...dirtyProps}>
        <DialogHeader>
          <DialogTitle className="text-foreground">{editingRemito ? "Editar Remito" : "Nuevo Remito"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {/* === DATOS GENERALES === */}
          <SectionTitle>Datos Generales</SectionTitle>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Fecha</Label>
            <Input type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} className="h-9 text-sm" />
          </div>
          {!isFranco && (
            <div className="space-y-1.5">
              <Label className="text-xs truncate block">Remito Tercero</Label>
              <Input value={form.remito_tercero} onChange={(e) => set("remito_tercero", e.target.value)} className="h-9 text-sm" placeholder="Nro..." />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Remito Local</Label>
            <Input value={form.remito_local} onChange={(e) => set("remito_local", e.target.value)} className="h-9 text-sm" placeholder="Nro..." />
          </div>

          {/* === CLIENTE CANTERA (solo Franco) === */}
          {showClienteCantera && (
            <>
              <SectionTitle>Cliente Cantera</SectionTitle>
              <div className="col-span-1 sm:col-span-2 md:col-span-3 space-y-1.5">
                <Label className="text-xs truncate block">Cliente</Label>
                <Combobox
                  options={clientes.filter((c) => c.activo).map((c) => ({ value: c.nombre, label: c.nombre }))}
                  value={form.cliente_cantera}
                  onValueChange={(v) => set("cliente_cantera", v)}
                  placeholder="Seleccionar cliente..."
                />
              </div>
            </>
          )}

          {/* === LOGÍSTICA === */}
          <SectionTitle>Logística</SectionTitle>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Desde (Obra)</Label>
            <Combobox options={obraOptions} value={form.desde} onValueChange={(v) => set("desde", v)} placeholder="Obra origen..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Hasta (Obra)</Label>
            <Combobox options={obraOptions} value={form.hasta} onValueChange={(v) => set("hasta", v)} placeholder="Obra destino..." />
          </div>
          {!isFranco && (
            <div className="space-y-1.5">
              <Label className="text-xs truncate block">Cliente Origen</Label>
              <Input value={form.cliente} readOnly className="h-9 text-sm bg-muted" placeholder="Auto" />
            </div>
          )}
          {!isFranco && (
            <div className="space-y-1.5">
              <Label className="text-xs truncate block">Cliente Destino</Label>
              <Input value={form.cliente_destino} readOnly className="h-9 text-sm bg-muted" placeholder="Auto" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Tipo Material</Label>
            <Combobox
              options={tipoMaterialOptions}
              value={form.tipo_material}
              onValueChange={(v) => set("tipo_material", v)}
              placeholder="Buscar material..."
              allowCustom
              customLabel="Agregar tipo"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Tipo Transporte</Label>
            <Combobox
              options={TIPO_TRANSPORTE_OPTIONS.map((t) => ({ value: t, label: t }))}
              value={form.tipo_transporte}
              onValueChange={(v) => set("tipo_transporte", v)}
              placeholder="Transporte..."
              allowCustom
              customLabel="Agregar transporte"
            />
          </div>

          {/* === VEHÍCULO === */}
          <SectionTitle>Vehículo</SectionTitle>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Maquinaria</Label>
            <Combobox options={maquinariaOptions} value={form.maquinaria_id} onValueChange={(v) => set("maquinaria_id", v)} placeholder="Maquinaria..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Patente Tercero</Label>
            <Input value={form.patente_tercero} onChange={(e) => set("patente_tercero", e.target.value)} className="h-9 text-sm" placeholder="Patente..." />
          </div>
          {!isFranco && (
            <div className="space-y-1.5">
              <Label className="text-xs truncate block">Proveedor</Label>
              <Combobox
                options={proveedores.filter(p => p.activo).map(p => ({ value: p.nombre, label: p.nombre }))}
                value={form.proveedor}
                onValueChange={(v) => set("proveedor", v)}
                placeholder="Proveedor..."
              />
            </div>
          )}

          {/* === CANTIDADES Y PRECIOS === */}
          <SectionTitle>Cantidades y Precios</SectionTitle>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Cant. Viajes</Label>
            <Input type="number" value={form.cantidad_viajes} onChange={(e) => set("cantidad_viajes", Number(e.target.value))} className="h-9 text-sm" min={0} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Cant. Unitaria</Label>
            <Input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              autoComplete="off"
              value={cantUniStr}
              onChange={(e) => handleDecimalChange(e.target.value, setCantUniStr, "cantidad_uni")}
              placeholder="0.00"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Unidad</Label>
            <Combobox
              options={unidadOptions}
              value={form.unidad}
              onValueChange={(v) => set("unidad", v)}
              placeholder="Buscar unidad..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Cantidad Total</Label>
            <Input type="number" value={form.cantidad} readOnly className="h-9 text-sm bg-muted" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Modo Cálculo</Label>
            <Select value={form.precio_calc_mode} onValueChange={(v) => set("precio_calc_mode", v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="viajes">Viajes × Precio</SelectItem>
                <SelectItem value="cantidad">Cantidad × Precio</SelectItem>
                <SelectItem value="fijo">Precio fijo por remito</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Precio Unitario</Label>
            <Input
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              autoComplete="off"
              value={precioUniStr}
              onChange={(e) => handleDecimalChange(e.target.value, setPrecioUniStr, "precio_unitario")}
              placeholder="0.00"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Precio Total</Label>
            <Input type="number" value={form.precio_total} readOnly className="h-9 text-sm bg-muted" />
          </div>
          <div />

          {/* === ÍTEMS ADICIONALES === */}
          <RemitoItemsEditor items={items} onChange={setItems} />

          {items.length > 0 && (
            <div className="col-span-1 sm:col-span-2 md:col-span-3 flex justify-end text-sm font-semibold text-foreground">
              Total del remito (viaje + ítems): $
              {((form.precio_total || 0) + totalItems(items)).toLocaleString("es-AR")}
            </div>
          )}

          {/* === FORMA DE PAGO === */}
          <div className="space-y-1.5">
            <Label className="text-xs truncate block">Forma de Pago</Label>
            <Select value={form.forma_pago || "__none__"} onValueChange={(v) => set("forma_pago", v === "__none__" ? "" : v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin especificar</SelectItem>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="cuenta_corriente">Cuenta Corriente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* === OBSERVACIONES === */}
          <div className="col-span-1 sm:col-span-2 md:col-span-3 space-y-1.5">
            <Label className="text-xs truncate block">Observaciones</Label>
            <Textarea value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} className="text-sm h-16 resize-none" placeholder="Observaciones..." />
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 bg-card pt-2">
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-primary hover:bg-primary/90">
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <UnsavedChangesAlert open={showAlert} onOpenChange={setShowAlert} onDiscard={handleDiscard} />
    </>
  );
}

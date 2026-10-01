import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronRight, FolderPlus, Sparkles, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { ImportComputoDialog } from "./ImportComputoDialog";
import {
  CotizacionForm,
  CotizacionCategoriaForm,
  CotizacionItemForm,
  CotizacionAnticipoForm,
  EstadoCotizacion,
  UNIDADES,
  calcularM3,
  calcularTotalItem,
} from "@/hooks/useCotizaciones";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const estadoConfig: Record<string, { label: string }> = {
  borrador: { label: "Borrador" },
  enviada: { label: "Enviada" },
  aprobada: { label: "Aprobada" },
  rechazada: { label: "Rechazada" },
  vencida: { label: "Vencida" },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

interface CotizacionFormContentProps {
  formData: CotizacionForm;
  setFormData: (data: CotizacionForm) => void;
  categorias: CotizacionCategoriaForm[];
  setCategorias: (cats: CotizacionCategoriaForm[]) => void;
  items: CotizacionItemForm[];
  setItems: (items: CotizacionItemForm[]) => void;
  anticipos: CotizacionAnticipoForm[];
  setAnticipos: (a: CotizacionAnticipoForm[]) => void;
  obras: { id: string; nombre: string }[];
  isEditing: boolean;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function CotizacionFormContent({
  formData,
  setFormData,
  categorias,
  setCategorias,
  items,
  setItems,
  anticipos,
  setAnticipos,
  obras,
  isEditing,
  isSubmitting,
  onSubmit,
  onCancel,
}: CotizacionFormContentProps) {
  const [openCategories, setOpenCategories] = useState<Record<number, boolean>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [draggedCat, setDraggedCat] = useState<number | null>(null);
  const [dragOverCat, setDragOverCat] = useState<number | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ cat: number; pos: number } | null>(null);

  // Anticipos (varios; cada uno por porcentaje o monto fijo)
  const calcMonto = (a: CotizacionAnticipoForm) =>
    a.tipo === "porcentaje" ? (formData.subtotal * (a.valor || 0)) / 100 : a.valor || 0;
  const anticiposCalc = anticipos.map((a) => ({ ...a, monto: calcMonto(a) }));
  const anticipoMonto = anticiposCalc.reduce((s, a) => s + a.monto, 0);
  // El anticipo se descuenta del subtotal (base imponible) antes del IVA
  const baseImponible = formData.subtotal - anticipoMonto;

  useEffect(() => {
    const iva = baseImponible * 0.21;
    const total = baseImponible + iva;
    const primero = anticiposCalc[0];
    const tipoLegacy = primero ? primero.tipo : "ninguno";
    const valorLegacy = primero ? primero.valor || 0 : 0;
    if (
      (formData.anticipo_monto ?? 0) !== anticipoMonto ||
      formData.iva !== iva ||
      formData.total !== total ||
      (formData.anticipo_tipo || "ninguno") !== tipoLegacy ||
      (formData.anticipo_valor ?? 0) !== valorLegacy
    ) {
      setFormData({
        ...formData,
        anticipo_monto: anticipoMonto,
        anticipo_tipo: tipoLegacy,
        anticipo_valor: valorLegacy,
        iva,
        total,
      });
    }
  }, [anticipoMonto, formData.subtotal, anticipos]);


  // Mantener sincronizados los montos calculados en el estado de anticipos
  useEffect(() => {
    const cambio = anticipos.some((a, i) => (a.monto || 0) !== anticiposCalc[i].monto);
    if (cambio) setAnticipos(anticiposCalc);
  }, [anticipoMonto, formData.subtotal]);

  const addAnticipo = () =>
    setAnticipos([...anticipos, { descripcion: "", tipo: "monto", valor: 0, monto: 0 }]);
  const updateAnticipo = (index: number, patch: Partial<CotizacionAnticipoForm>) =>
    setAnticipos(anticipos.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  const removeAnticipo = (index: number) =>
    setAnticipos(anticipos.filter((_, i) => i !== index));


  const handleImportComplete = (
    newCategorias: CotizacionCategoriaForm[],
    newItems: CotizacionItemForm[],
    descripcion?: string
  ) => {
    setCategorias(newCategorias);
    setItems(newItems);
    const openCats: Record<number, boolean> = {};
    newCategorias.forEach((_, i) => { openCats[i] = true; });
    setOpenCategories(openCats);
    const subtotal = newItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const iva = subtotal * 0.21;
    const total = subtotal + iva;
    setFormData({
      ...formData,
      subtotal, iva, total,
      ...(descripcion ? { descripcion } : {}),
    });
  };

  // Calculate totals whenever items change
  const calculateTotals = (itemsList: CotizacionItemForm[]) => {
    const subtotal = itemsList.reduce((sum, item) => sum + (item.total || 0), 0);
    const iva = subtotal * 0.21;
    const total = subtotal + iva;
    return { subtotal, iva, total };
  };

  // Add a new category
  const addCategoria = () => {
    const newNumero = categorias.length + 1;
    setCategorias([
      ...categorias,
      { numero: newNumero, nombre: "", orden: newNumero - 1 },
    ]);
    setOpenCategories({ ...openCategories, [categorias.length]: true });
  };

  // Remove a category and its items
  const removeCategoria = (index: number) => {
    const newCategorias = categorias.filter((_, i) => i !== index);
    // Re-number categories
    const renumberedCats = newCategorias.map((cat, i) => ({
      ...cat,
      numero: i + 1,
      orden: i,
    }));
    setCategorias(renumberedCats);
    
    // Remove items belonging to this category and update remaining items
    const newItems = items
      .filter(item => item.categoria_index !== index)
      .map(item => ({
        ...item,
        categoria_index: item.categoria_index !== undefined && item.categoria_index > index 
          ? item.categoria_index - 1 
          : item.categoria_index,
        numero: item.categoria_index !== undefined && item.categoria_index > index
          ? `${(item.categoria_index || 0)}.${items.filter(i => i.categoria_index === item.categoria_index).indexOf(item) + 1}`
          : item.numero,
      }));
    setItems(newItems);
    
    const totals = calculateTotals(newItems);
    setFormData({ ...formData, ...totals });
  };

  // Update category
  const updateCategoria = (index: number, field: keyof CotizacionCategoriaForm, value: any) => {
    const newCategorias = [...categorias];
    newCategorias[index] = { ...newCategorias[index], [field]: value };
    setCategorias(newCategorias);
  };

  // Add item to a category
  const addItem = (categoriaIndex: number) => {
    const categoryItems = items.filter(i => i.categoria_index === categoriaIndex);
    const newItemNumber = `${categorias[categoriaIndex].numero}.${categoryItems.length + 1}`;
    
    const newItem: CotizacionItemForm = {
      categoria_index: categoriaIndex,
      numero: newItemNumber,
      descripcion: "",
      unidad: "m³",
      cantidad: 0,
      cantidad_m2: 0,
      altura_promedio: 0,
      cantidad_m3: 0,
      precio_unitario: 0,
      subtotal: 0,
      total: 0,
    };
    
    setItems([...items, newItem]);
  };

  // Remove item
  const removeItem = (itemIndex: number) => {
    const newItems = items.filter((_, i) => i !== itemIndex);
    
    // Re-number items within their categories
    const renumberedItems = newItems.map((item, i) => {
      if (item.categoria_index !== undefined) {
        const categoryItems = newItems.filter(it => it.categoria_index === item.categoria_index);
        const indexInCategory = categoryItems.indexOf(item);
        return {
          ...item,
          numero: `${categorias[item.categoria_index]?.numero || 0}.${indexInCategory + 1}`,
        };
      }
      return item;
    });
    
    setItems(renumberedItems);
    const totals = calculateTotals(renumberedItems);
    setFormData({ ...formData, ...totals });
  };

  // Update item
  const updateItem = (itemIndex: number, field: keyof CotizacionItemForm, value: any) => {
    const newItems = [...items];
    newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
    
    // Recalculate M3 if M2 or height changes, BUT only if unit is NOT M³
    // (to preserve manual M³ input when unit is M³)
    if ((field === "cantidad_m2" || field === "altura_promedio") && newItems[itemIndex].unidad !== "m³") {
      newItems[itemIndex].cantidad_m3 = calcularM3(
        newItems[itemIndex].cantidad_m2,
        newItems[itemIndex].altura_promedio
      );
      // Also update cantidad for compatibility
      newItems[itemIndex].cantidad = newItems[itemIndex].cantidad_m3;
    }
    
    // If cantidad_m3 is manually edited, update cantidad as well
    if (field === "cantidad_m3") {
      newItems[itemIndex].cantidad = value;
    }
    
    // Recalculate total
    if (["cantidad", "cantidad_m2", "altura_promedio", "cantidad_m3", "precio_unitario", "unidad"].includes(field)) {
      newItems[itemIndex].total = calcularTotalItem(newItems[itemIndex]);
      newItems[itemIndex].subtotal = newItems[itemIndex].total;
    }
    
    setItems(newItems);
    const totals = calculateTotals(newItems);
    setFormData({ ...formData, ...totals });
  };

  // Get items for a specific category
  const getItemsForCategory = (categoriaIndex: number) => {
    return items
      .map((item, originalIndex) => ({ ...item, originalIndex }))
      .filter(item => item.categoria_index === categoriaIndex);
  };

  // Renumber categories (1., 2., ...) and their items (1.1, 1.2, ...)
  const renumber = (
    cats: CotizacionCategoriaForm[],
    its: CotizacionItemForm[]
  ): { cats: CotizacionCategoriaForm[]; its: CotizacionItemForm[] } => {
    const newCats = cats.map((cat, i) => ({ ...cat, numero: i + 1, orden: i }));
    const counters: Record<number, number> = {};
    const newIts = its.map((item) => {
      if (item.categoria_index === undefined || !newCats[item.categoria_index]) return item;
      const ci = item.categoria_index;
      counters[ci] = (counters[ci] || 0) + 1;
      return { ...item, numero: `${newCats[ci].numero}.${counters[ci]}` };
    });
    return { cats: newCats, its: newIts };
  };

  // Move a whole category (with its items) to another position
  const moveCategoria = (from: number, to: number) => {
    if (from === to || to < 0 || to >= categorias.length) return;

    const newCats = [...categorias];
    const [moved] = newCats.splice(from, 1);
    newCats.splice(to, 0, moved);

    // Map old category index -> new category index
    const indexMap: Record<number, number> = {};
    categorias.forEach((cat, oldIdx) => {
      indexMap[oldIdx] = newCats.indexOf(cat);
    });

    const remapped = items.map((item) =>
      item.categoria_index !== undefined
        ? { ...item, categoria_index: indexMap[item.categoria_index] ?? item.categoria_index }
        : item
    );

    // Reorder items array so it follows the new category order
    const ordered: CotizacionItemForm[] = [];
    newCats.forEach((_, newIdx) => {
      remapped.forEach((item) => {
        if (item.categoria_index === newIdx) ordered.push(item);
      });
    });
    remapped.forEach((item) => {
      if (item.categoria_index === undefined) ordered.push(item);
    });

    const { cats, its } = renumber(newCats, ordered);
    setCategorias(cats);
    setItems(its);

    // Remap collapsed/expanded state
    const newOpen: Record<number, boolean> = {};
    Object.entries(openCategories).forEach(([k, v]) => {
      const mapped = indexMap[Number(k)];
      if (mapped !== undefined) newOpen[mapped] = v;
    });
    setOpenCategories(newOpen);
  };

  // Move an item within its own category
  const moveItem = (categoriaIndex: number, fromPos: number, toPos: number) => {
    const positions = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.categoria_index === categoriaIndex)
      .map(({ idx }) => idx);

    if (fromPos === toPos || toPos < 0 || toPos >= positions.length) return;

    const groupItems = positions.map((idx) => items[idx]);
    const [moved] = groupItems.splice(fromPos, 1);
    groupItems.splice(toPos, 0, moved);

    const newItems = [...items];
    positions.forEach((idx, i) => {
      newItems[idx] = groupItems[i];
    });

    const { cats, its } = renumber(categorias, newItems);
    setCategorias(cats);
    setItems(its);
  };

  const toggleCategory = (index: number) => {
    setOpenCategories({ ...openCategories, [index]: !openCategories[index] });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* General Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="numero">Número</Label>
          <Input
            id="numero"
            value={formData.numero}
            onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
            className="bg-muted border-border font-mono"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="obra_id">Obra (opcional)</Label>
          <Select
            value={formData.obra_id || "none"}
            onValueChange={(value) => setFormData({ ...formData, obra_id: value === "none" ? undefined : value })}
          >
            <SelectTrigger className="bg-muted border-border">
              <SelectValue placeholder="Seleccionar obra" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="none">Sin asignar</SelectItem>
              {obras.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="responsable">Responsable</Label>
          <Input
            id="responsable"
            value={formData.responsable}
            onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
            className="bg-muted border-border"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_creacion">Fecha Creación</Label>
          <Input
            id="fecha_creacion"
            type="date"
            value={formData.fecha_creacion}
            onChange={(e) => setFormData({ ...formData, fecha_creacion: e.target.value })}
            className="bg-muted border-border"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fecha_vencimiento">Fecha Vencimiento</Label>
          <Input
            id="fecha_vencimiento"
            type="date"
            value={formData.fecha_vencimiento}
            onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
            className="bg-muted border-border"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="estado">Estado</Label>
          <Select
            value={formData.estado}
            onValueChange={(value) => setFormData({ ...formData, estado: value as EstadoCotizacion })}
          >
            <SelectTrigger className="bg-muted border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {Object.entries(estadoConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="moneda">Moneda</Label>
          <Select
            value={formData.moneda || "ARS"}
            onValueChange={(value) => setFormData({ ...formData, moneda: value })}
          >
            <SelectTrigger className="bg-muted border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="ARS">$ ARS (Pesos)</SelectItem>
              <SelectItem value="USD">US$ USD (Dólares)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3 space-y-2">
          <Label htmlFor="descripcion">Descripción</Label>
          <Textarea
            id="descripcion"
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            className="bg-muted border-border"
            rows={2}
          />
        </div>
      </div>

      {/* Categories and Items Section */}
      <div className="border border-border rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold">Rubros e Ítems</Label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <Sparkles className="w-4 h-4 mr-1" />
              Importar con IA
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addCategoria}>
              <FolderPlus className="w-4 h-4 mr-1" />
              Agregar Rubro
            </Button>
          </div>
        </div>

        <ImportComputoDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onImportComplete={handleImportComplete}
        />

        {categorias.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No hay rubros. Agrega uno para comenzar.
          </p>
        ) : (
          <div className="space-y-4">
            {categorias.map((categoria, catIndex) => (
              <Collapsible
                key={catIndex}
                open={openCategories[catIndex] !== false}
                onOpenChange={() => toggleCategory(catIndex)}
              >
                <div
                  className={`border rounded-lg overflow-hidden transition-colors ${
                    dragOverCat === catIndex && draggedCat !== null && draggedCat !== catIndex
                      ? "border-primary border-2"
                      : "border-border"
                  }`}
                  onDragOver={(e) => {
                    if (draggedCat === null) return;
                    e.preventDefault();
                    setDragOverCat(catIndex);
                  }}
                  onDrop={(e) => {
                    if (draggedCat === null) return;
                    e.preventDefault();
                    moveCategoria(draggedCat, catIndex);
                    setDraggedCat(null);
                    setDragOverCat(null);
                  }}
                >
                  {/* Category Header */}
                  <div className="bg-primary/10 p-3 flex items-center justify-between">
                    <div
                      draggable
                      onDragStart={() => setDraggedCat(catIndex)}
                      onDragEnd={() => { setDraggedCat(null); setDragOverCat(null); }}
                      title="Arrastrar para mover el rubro"
                      className="cursor-grab active:cursor-grabbing mr-1"
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col mr-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-5"
                        disabled={catIndex === 0}
                        onClick={() => moveCategoria(catIndex, catIndex - 1)}
                        title="Subir rubro"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-5"
                        disabled={catIndex === categorias.length - 1}
                        onClick={() => moveCategoria(catIndex, catIndex + 1)}
                        title="Bajar rubro"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent">
                        {openCategories[catIndex] !== false ? (
                          <ChevronDown className="w-4 h-4 mr-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-2" />
                        )}
                        <span className="font-bold text-primary mr-2">{categoria.numero}.</span>
                      </Button>
                    </CollapsibleTrigger>
                    <Input
                      value={categoria.nombre}
                      onChange={(e) => updateCategoria(catIndex, "nombre", e.target.value)}
                      placeholder="Nombre del rubro (ej: Movimiento de Suelo)"
                      className="flex-1 bg-background border-border mx-2 font-semibold uppercase"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCategoria(catIndex)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Category Items */}
                  <CollapsibleContent>
                    <div className="p-3 space-y-3">
                      {/* Table Header */}
                      <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-2 text-xs font-semibold text-muted-foreground border-b border-border pb-2">
                        <div className="col-span-1"></div>
                        <div className="col-span-1">Núm.</div>
                        <div className="col-span-3">Descripción</div>
                        <div className="col-span-1">Unidad</div>
                        <div className="col-span-1 text-right">M2</div>
                        <div className="col-span-1 text-right">Altura</div>
                        <div className="col-span-1 text-right">M3</div>
                        <div className="col-span-2 text-right">P. Unit.</div>
                        <div className="col-span-1 text-right">Total</div>
                        <div className="col-span-1"></div>
                      </div>

                      {/* Items */}
                      {getItemsForCategory(catIndex).map((item, itemPos, groupArr) => (
                        <div
                          key={item.originalIndex}
                          className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-2 items-center"
                          onDragOver={(e) => {
                            if (draggedItem?.cat !== catIndex) return;
                            e.preventDefault();
                          }}
                          onDrop={(e) => {
                            if (draggedItem?.cat !== catIndex) return;
                            e.preventDefault();
                            moveItem(catIndex, draggedItem.pos, itemPos);
                            setDraggedItem(null);
                          }}
                        >
                          <div className="col-span-1 flex items-center">
                            <div
                              draggable
                              onDragStart={() => setDraggedItem({ cat: catIndex, pos: itemPos })}
                              onDragEnd={() => setDraggedItem(null)}
                              title="Arrastrar para mover el ítem"
                              className="cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <div className="flex flex-col">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-4 w-5"
                                disabled={itemPos === 0}
                                onClick={() => moveItem(catIndex, itemPos, itemPos - 1)}
                                title="Subir ítem"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-4 w-5"
                                disabled={itemPos === groupArr.length - 1}
                                onClick={() => moveItem(catIndex, itemPos, itemPos + 1)}
                                title="Bajar ítem"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="col-span-1">
                            <Input
                              value={item.numero}
                              onChange={(e) => updateItem(item.originalIndex, "numero", e.target.value)}
                              className="bg-muted border-border text-xs font-mono p-1 h-8"
                            />
                          </div>
                          <div className="col-span-3">
                            <Textarea
                              value={item.descripcion}
                              onChange={(e) => updateItem(item.originalIndex, "descripcion", e.target.value)}
                              placeholder="Descripción del ítem"
                              className="bg-muted border-border text-sm p-2 min-h-[32px] resize-y"
                              rows={1}
                            />
                          </div>
                          <div className="col-span-1">
                            <Select
                              value={item.unidad}
                              onValueChange={(value) => updateItem(item.originalIndex, "unidad", value)}
                            >
                              <SelectTrigger className="bg-muted border-border h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                {UNIDADES.map((u) => (
                                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.cantidad_m2 || ""}
                              onChange={(e) => updateItem(item.originalIndex, "cantidad_m2", parseFloat(e.target.value) || 0)}
                              className="bg-muted border-border text-xs font-mono p-1 h-8 text-right disabled:opacity-50"
                              placeholder="0.00"
                              disabled={item.unidad === "m³"}
                            />
                          </div>
                          <div className="col-span-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.altura_promedio || ""}
                              onChange={(e) => updateItem(item.originalIndex, "altura_promedio", parseFloat(e.target.value) || 0)}
                              className="bg-muted border-border text-xs font-mono p-1 h-8 text-right disabled:opacity-50"
                              placeholder="0.00"
                              disabled={item.unidad === "m³"}
                            />
                          </div>
                          <div className="col-span-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.cantidad_m3 || item.cantidad || ""}
                              onChange={(e) => updateItem(item.originalIndex, "cantidad_m3", parseFloat(e.target.value) || 0)}
                              className="bg-muted border-border text-xs font-mono p-1 h-8 text-right"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={item.precio_unitario || ""}
                              onChange={(e) => updateItem(item.originalIndex, "precio_unitario", parseFloat(e.target.value) || 0)}
                              className="bg-muted border-border text-xs font-mono p-1 h-8 text-right"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="col-span-1">
                            <Input
                              value={formatCurrency(item.total || 0)}
                              readOnly
                              className="bg-muted/50 border-border text-xs font-mono p-1 h-8 text-right"
                            />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.originalIndex)}
                              className="text-destructive h-8 w-8"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* Add Item Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addItem(catIndex)}
                        className="w-full border-dashed"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar Ítem
                      </Button>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-mono">{formatCurrency(formData.subtotal)}</span>
          </div>
          {anticiposCalc.map((a, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {a.descripcion || "Anticipo"}
                {a.tipo === "porcentaje" ? ` (${a.valor}%)` : ""}:
              </span>
              <span className="font-mono font-semibold text-destructive">- {formatCurrency(a.monto)}</span>
            </div>
          ))}
          {anticipoMonto > 0 && (
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-muted-foreground">Subtotal - Anticipos:</span>
              <span className="font-mono">{formatCurrency(baseImponible)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">IVA (21%):</span>
            <span className="font-mono">{formatCurrency(formData.iva)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span className="font-mono text-primary">{formatCurrency(formData.total)}</span>
          </div>

          {/* Anticipos */}
          <div className="pt-3 border-t border-border space-y-2">
            <div className="flex items-center justify-between">
              <Label>Anticipos</Label>
              <Button type="button" size="sm" variant="outline" onClick={addAnticipo}>
                <Plus className="w-4 h-4 mr-1" /> Agregar anticipo
              </Button>
            </div>
            {anticipos.length === 0 && (
              <p className="text-xs text-muted-foreground">Sin anticipos cargados.</p>
            )}
            {anticipos.map((a, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_180px_auto] gap-2 items-center">
                <Input
                  value={a.descripcion}
                  onChange={(e) => updateAnticipo(i, { descripcion: e.target.value })}
                  className="bg-muted border-border"
                  placeholder="Descripción (ej: Lote entregado en pago)"
                />
                <Select value={a.tipo} onValueChange={(value) => updateAnticipo(i, { tipo: value })}>
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="porcentaje">Porcentaje (%)</SelectItem>
                    <SelectItem value="monto">Monto fijo ($)</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={a.valor || ""}
                  onChange={(e) => updateAnticipo(i, { valor: parseFloat(e.target.value) || 0 })}
                  className="bg-muted border-border font-mono"
                  placeholder={a.tipo === "porcentaje" ? "Ej: 30" : "Ej: 1500000.50"}
                />
                <Button type="button" size="icon" variant="ghost" onClick={() => removeAnticipo(i)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>


        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notas">Notas adicionales</Label>
        <Textarea
          id="notas"
          value={formData.notas}
          onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
          className="bg-muted border-border"
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
          {isSubmitting ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Cotización"}
        </Button>
      </div>
    </form>
  );
}

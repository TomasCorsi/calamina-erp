import { useCallback, useMemo, useState, useEffect } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Trash2, Plus, ChevronDown, Copy, GripVertical } from "lucide-react";
import { type CertificadoItemForm, type CertificadoConcepto } from "@/hooks/useCertificados";
import { cn } from "@/lib/utils";

const UNIDADES = ["HR", "DIA", "M3", "M2", "ML", "TN", "LT", "VJ", "UN", "GL"];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const CUSTOM_VALUE = "__custom__";

interface SubCategoria {
  nombre: string;
  open: boolean;
}

interface CertificadoServiceGridProps {
  items: CertificadoItemForm[];
  seccion: string | null;
  conceptos?: CertificadoConcepto[];
  onItemsChange: (items: CertificadoItemForm[]) => void;
}

export function CertificadoServiceGrid({ items, seccion, conceptos = [], onItemsChange }: CertificadoServiceGridProps) {
  const [customInputIndices, setCustomInputIndices] = useState<Set<number>>(new Set());
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  // Derive subcategories from items' etapa field, preserving first-seen order
  const [subCategorias, setSubCategorias] = useState<SubCategoria[]>(() => {
    const seen = new Set<string>();
    const ordered: SubCategoria[] = [];
    items.forEach((item) => {
      if (item.etapa && !seen.has(item.etapa)) {
        seen.add(item.etapa);
        ordered.push({ nombre: item.etapa, open: true });
      }
    });
    return ordered;
  });

  // Sync subcategories when items change externally (e.g. loading saved cert)
  useEffect(() => {
    const etapas = new Set<string>();
    items.forEach((item) => {
      if (item.etapa) etapas.add(item.etapa);
    });
    setSubCategorias((prev) => {
      const existingNames = new Set(prev.map((s) => s.nombre));
      const newOnes = Array.from(etapas)
        .filter((n) => !existingNames.has(n))
        .map((n) => ({ nombre: n, open: true }));
      // Remove subcats that have no items anymore
      const kept = prev;
      return [...kept, ...newOnes];
    });
  }, [items]);

  const conceptoOptions: ComboboxOption[] = useMemo(() => {
    const activos = conceptos.filter((c) => c.activo);
    const opts: ComboboxOption[] = activos.map((c) => ({
      value: c.id,
      label: c.nombre,
      searchValue: `${c.nombre} ${c.categoria} ${c.etapa || ""}`,
    }));
    opts.push({ value: CUSTOM_VALUE, label: "✏️ Personalizado (texto libre)" });
    return opts;
  }, [conceptos]);

  const conceptoMap = useMemo(() => {
    const map = new Map<string, CertificadoConcepto>();
    conceptos.forEach((c) => map.set(c.id, c));
    return map;
  }, [conceptos]);

  const getItemIndex = useCallback(
    (item: CertificadoItemForm) => items.indexOf(item),
    [items]
  );

  const updateField = useCallback(
    (index: number, field: string, value: string | number) => {
      const updated = items.map((item, i) => {
        if (i !== index) return item;
        const newItem = { ...item, [field]: value };
        if (field === "cantidad" || field === "precio_unitario") {
          newItem.subtotal = (newItem.cantidad || 0) * (newItem.precio_unitario || 0);
        }
        return newItem;
      });
      onItemsChange(updated);
    },
    [items, onItemsChange]
  );

  const handleConceptoSelect = useCallback(
    (index: number, conceptoId: string) => {
      if (conceptoId === CUSTOM_VALUE) {
        setCustomInputIndices((prev) => new Set(prev).add(index));
        const updated = items.map((item, i) => {
          if (i !== index) return item;
          return { ...item, concepto_id: null, descripcion: "" };
        });
        onItemsChange(updated);
        return;
      }
      setCustomInputIndices((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      const c = conceptoMap.get(conceptoId);
      if (!c) return;
      const updated = items.map((item, i) => {
        if (i !== index) return item;
        const subtotal = (item.cantidad || 0) * c.precio_unitario;
        return {
          ...item,
          concepto_id: c.id,
          descripcion: c.nombre,
          unidad: c.unidad,
          precio_unitario: c.precio_unitario,
          categoria: c.categoria,
          cantidad_total: c.cantidad_total,
          subtotal,
        };
      });
      onItemsChange(updated);
    },
    [items, onItemsChange, conceptoMap]
  );

  const deleteRow = useCallback(
    (index: number) => {
      setCustomInputIndices((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      onItemsChange(items.filter((_, i) => i !== index));
    },
    [items, onItemsChange]
  );

  const addConceptoToGroup = useCallback(
    (groupName: string) => {
      const newItem: CertificadoItemForm = {
        concepto_id: null,
        descripcion: "",
        unidad: "HR",
        cantidad: 0,
        precio_unitario: 0,
        subtotal: 0,
        categoria: "General",
        etapa: groupName,
        cantidad_total: 0,
        seccion,
        observaciones: "",
      };
      onItemsChange([...items, newItem]);
    },
    [items, seccion, onItemsChange]
  );

  const addSubCategoria = useCallback(() => {
    const num = subCategorias.length + 1;
    const nombre = `Sub categoría ${num}`;
    setSubCategorias((prev) => [...prev, { nombre, open: true }]);
  }, [subCategorias.length]);

  const renameSubCategoria = useCallback(
    (oldName: string, newName: string) => {
      if (!newName.trim()) return;
      setSubCategorias((prev) =>
        prev.map((s) => (s.nombre === oldName ? { ...s, nombre: newName } : s))
      );
      // Update all items with this etapa
      const updated = items.map((item) =>
        item.etapa === oldName ? { ...item, etapa: newName } : item
      );
      onItemsChange(updated);
    },
    [items, onItemsChange]
  );

  const deleteSubCategoria = useCallback(
    (nombre: string) => {
      setSubCategorias((prev) => prev.filter((s) => s.nombre !== nombre));
      onItemsChange(items.filter((item) => item.etapa !== nombre));
    },
    [items, onItemsChange]
  );

  const duplicateSubCategoria = useCallback(
    (nombre: string) => {
      const newName = `${nombre} (copia)`;
      setSubCategorias((prev) => [...prev, { nombre: newName, open: true }]);
      const groupItems = items.filter((item) => item.etapa === nombre);
      const duplicated = groupItems.map((item) => ({ ...item, etapa: newName }));
      onItemsChange([...items, ...duplicated]);
    },
    [items, onItemsChange]
  );

  const toggleSubCategoria = useCallback((nombre: string) => {
    setSubCategorias((prev) =>
      prev.map((s) => (s.nombre === nombre ? { ...s, open: !s.open } : s))
    );
  }, []);

  const handleDrop = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx) return;
      setSubCategorias((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        // Rebuild items array to match new subcategory order
        const reordered: CertificadoItemForm[] = [];
        const ungrouped: CertificadoItemForm[] = [];
        const grouped = new Map<string, CertificadoItemForm[]>();
        items.forEach((item) => {
          const key = item.etapa || "";
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key)!.push(item);
        });
        next.forEach((s) => {
          const g = grouped.get(s.nombre);
          if (g) reordered.push(...g);
        });
        // Add any items not in a subcategory
        items.forEach((item) => {
          if (!item.etapa || !next.some((s) => s.nombre === item.etapa)) {
            ungrouped.push(item);
          }
        });
        onItemsChange([...reordered, ...ungrouped]);
        return next;
      });
    },
    [items, onItemsChange]
  );

  const totalGeneral = items.reduce((s, i) => s + i.subtotal, 0);

  return (
    <div className="space-y-2">
      {subCategorias.map((subCat, groupIdx) => {
        const groupItems = items
          .map((item, idx) => ({ item, idx }))
          .filter(({ item }) => item.etapa === subCat.nombre);
        const groupSubtotal = groupItems.reduce((s, { item }) => s + item.subtotal, 0);

        return (
          <Collapsible key={groupIdx} open={subCat.open} onOpenChange={() => toggleSubCategoria(subCat.nombre)}>
            <div
              className={cn(
                "border rounded-md transition-all",
                dragOverIdx === groupIdx && draggedIdx !== groupIdx && "border-primary border-2"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOverIdx(groupIdx); }}
              onDrop={(e) => { e.preventDefault(); if (draggedIdx !== null) handleDrop(draggedIdx, groupIdx); setDraggedIdx(null); setDragOverIdx(null); }}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors">
                  <div
                    draggable
                    onDragStart={(e) => { e.stopPropagation(); setDraggedIdx(groupIdx); }}
                    onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null); }}
                    onClick={(e) => e.stopPropagation()}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", subCat.open && "rotate-0", !subCat.open && "-rotate-90")} />
                  <span className="text-xs font-semibold text-muted-foreground">{groupIdx + 1}.</span>
                  <Input
                    value={subCat.nombre}
                    onChange={(e) => renameSubCategoria(subCat.nombre, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-7 text-xs font-medium border-none bg-transparent shadow-none focus-visible:ring-1 flex-1"
                  />
                  <span className="text-xs font-medium whitespace-nowrap">{formatCurrency(groupSubtotal)}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); duplicateSubCategoria(subCat.nombre); }}>
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); deleteSubCategoria(subCat.nombre); }}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px] text-xs">Descripción</TableHead>
                        <TableHead className="min-w-[80px] text-xs">Unidad</TableHead>
                        <TableHead className="min-w-[80px] text-xs">Cantidad</TableHead>
                        <TableHead className="min-w-[90px] text-xs">P. Unit.</TableHead>
                        <TableHead className="min-w-[90px] text-xs text-right">Subtotal</TableHead>
                        <TableHead className="min-w-[120px] text-xs">Observaciones</TableHead>
                        <TableHead className="w-[40px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupItems.map(({ item, idx }) => (
                        <TableRow key={idx}>
                          <TableCell className="p-1">
                            {customInputIndices.has(idx) ? (
                              <Input
                                value={item.descripcion}
                                onChange={(e) => updateField(idx, "descripcion", e.target.value)}
                                className="h-7 text-xs"
                                placeholder="Descripción libre..."
                                autoFocus
                              />
                            ) : (
                              <Combobox
                                options={conceptoOptions}
                                value={item.concepto_id || ""}
                                onValueChange={(v) => handleConceptoSelect(idx, v)}
                                placeholder="Seleccionar concepto..."
                                searchPlaceholder="Buscar concepto..."
                                emptyText="No se encontraron conceptos."
                                className="h-7 text-xs"
                              />
                            )}
                          </TableCell>
                          <TableCell className="p-1">
                            <Select value={item.unidad} onValueChange={(v) => updateField(idx, "unidad", v)}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {UNIDADES.map((u) => (<SelectItem key={u} value={u}>{u}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="p-1">
                            <Input type="number" value={item.cantidad || ""} onChange={(e) => updateField(idx, "cantidad", parseFloat(e.target.value) || 0)} className="h-7 text-xs" min={0} />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input type="number" value={item.precio_unitario || ""} onChange={(e) => updateField(idx, "precio_unitario", parseFloat(e.target.value) || 0)} className="h-7 text-xs" min={0} />
                          </TableCell>
                          <TableCell className="p-1 text-right text-xs font-medium">
                            {formatCurrency(item.subtotal)}
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              value={item.observaciones || ""}
                              onChange={(e) => updateField(idx, "observaciones", e.target.value)}
                              className="h-7 text-xs"
                              placeholder="Obs..."
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteRow(idx)}>
                              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {groupItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground text-xs py-3">
                            Sin conceptos. Agregá uno para comenzar.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="px-3 py-1.5 border-t">
                  <Button type="button" variant="ghost" size="sm" onClick={() => addConceptoToGroup(subCat.nombre)} className="text-xs h-7">
                    <Plus className="h-3 w-3 mr-1" /> Agregar concepto
                  </Button>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}

      <div className="flex items-center justify-between pt-1">
        <Button type="button" variant="outline" size="sm" onClick={addSubCategoria} className="text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" /> Agregar Sub Categoría
        </Button>
        <div className="text-sm font-semibold pr-2">
          Total: {formatCurrency(totalGeneral)}
        </div>
      </div>
    </div>
  );
}

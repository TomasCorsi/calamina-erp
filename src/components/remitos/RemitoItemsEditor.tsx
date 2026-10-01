import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Plus, Trash2 } from "lucide-react";
import {
  CONCEPTO_SUGERENCIAS,
  UNIDAD_ITEM_OPTIONS,
  RemitoItemInput,
  totalItems,
} from "@/hooks/useRemitoItems";

interface Props {
  items: RemitoItemInput[];
  onChange: (items: RemitoItemInput[]) => void;
}

const parseDecimal = (raw: string): number => {
  const normalized = raw.replace(/,/g, ".");
  const first = normalized.indexOf(".");
  const numericStr =
    first === -1
      ? normalized
      : normalized.slice(0, first + 1) + normalized.slice(first + 1).replace(/\./g, "");
  const n = numericStr === "" || numericStr === "." ? 0 : parseFloat(numericStr);
  return isNaN(n) ? 0 : n;
};

const numToStr = (n: number): string => {
  if (!n) return "";
  return Number.isInteger(n) ? String(n) : String(n).replace(".", ",");
};

export function RemitoItemsEditor({ items, onChange }: Props) {
  // Raw string state per field so decimal separators don't disappear mid-typing
  const [cantidadStrs, setCantidadStrs] = useState<string[]>([]);
  const [precioStrs, setPrecioStrs] = useState<string[]>([]);

  // Sync string state when items change externally (load edit, add/remove rows)
  useEffect(() => {
    setCantidadStrs((prev) => {
      const next = items.map((it, i) => prev[i] ?? numToStr(Number(it.cantidad) || 0));
      return next.length === items.length ? next : items.map((it) => numToStr(Number(it.cantidad) || 0));
    });
    setPrecioStrs((prev) => {
      const next = items.map((it, i) => prev[i] ?? numToStr(Number(it.precio_unitario) || 0));
      return next.length === items.length ? next : items.map((it) => numToStr(Number(it.precio_unitario) || 0));
    });
  }, [items]);

  const update = (idx: number, patch: Partial<RemitoItemInput>) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    const row = next[idx];
    row.precio_total = (Number(row.cantidad) || 0) * (Number(row.precio_unitario) || 0);
    onChange(next);
  };

  const handleCantidadChange = (idx: number, raw: string) => {
    const cleaned = raw.replace(/[^0-9.,]/g, "");
    setCantidadStrs((prev) => {
      const next = [...prev];
      next[idx] = cleaned;
      return next;
    });
    update(idx, { cantidad: parseDecimal(cleaned) });
  };

  const handlePrecioChange = (idx: number, raw: string) => {
    const cleaned = raw.replace(/[^0-9.,]/g, "");
    setPrecioStrs((prev) => {
      const next = [...prev];
      next[idx] = cleaned;
      return next;
    });
    update(idx, { precio_unitario: parseDecimal(cleaned) });
  };

  const addItem = () => {
    onChange([
      ...items,
      { concepto: "", cantidad: 1, unidad: "DIA", precio_unitario: 0, precio_total: 0 },
    ]);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
    setCantidadStrs((prev) => prev.filter((_, i) => i !== idx));
    setPrecioStrs((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="col-span-1 sm:col-span-2 md:col-span-3 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Ítems adicionales (jornadas de máquina, servicios)
          </h4>
          <p className="text-[11px] text-muted-foreground">
            No suman viajes ni se imputan a los internos de máquinas. Usá 0,5 para medio día.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
          <Plus className="w-3.5 h-3.5" />
          Agregar ítem
        </Button>
      </div>
      <div className="border-b border-border" />

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">Sin ítems adicionales.</p>
      ) : (
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3 sm:col-span-2 space-y-1">
                {idx === 0 && <Label className="text-[11px]">Cantidad</Label>}
                <Input
                  inputMode="decimal"
                  value={cantidadStrs[idx] ?? numToStr(Number(it.cantidad) || 0)}
                  onChange={(e) => handleCantidadChange(idx, e.target.value)}
                  placeholder="1"
                  className="h-9 text-sm"
                />
              </div>
              <div className="col-span-3 sm:col-span-2 space-y-1">
                {idx === 0 && <Label className="text-[11px]">Unidad</Label>}
                <Combobox
                  options={UNIDAD_ITEM_OPTIONS.map((u) => ({ value: u, label: u }))}
                  value={it.unidad}
                  onValueChange={(v) => update(idx, { unidad: v })}
                  placeholder="DIA"
                  allowCustom
                  customLabel="Agregar unidad"
                />
              </div>
              <div className="col-span-6 sm:col-span-3 space-y-1">
                {idx === 0 && <Label className="text-[11px]">Concepto</Label>}
                <Combobox
                  options={CONCEPTO_SUGERENCIAS.map((c) => ({ value: c, label: c }))}
                  value={it.concepto}
                  onValueChange={(v) => update(idx, { concepto: v })}
                  placeholder="Día de retro..."
                  allowCustom
                  customLabel="Agregar concepto"
                />
              </div>
              <div className="col-span-5 sm:col-span-2 space-y-1">
                {idx === 0 && <Label className="text-[11px]">Precio unit.</Label>}
                <Input
                  inputMode="decimal"
                  value={precioStrs[idx] ?? numToStr(Number(it.precio_unitario) || 0)}
                  onChange={(e) => handlePrecioChange(idx, e.target.value)}
                  placeholder="0,00"
                  className="h-9 text-sm"
                />
              </div>
              <div className="col-span-5 sm:col-span-2 space-y-1">
                {idx === 0 && <Label className="text-[11px]">Importe</Label>}
                <Input
                  readOnly
                  value={`$${(it.precio_total || 0).toLocaleString("es-AR")}`}
                  className="h-9 text-sm bg-muted"
                />
              </div>
              <div className="col-span-2 sm:col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:text-destructive"
                  onClick={() => removeItem(idx)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          <div className="text-right text-xs font-medium text-foreground">
            Subtotal ítems: ${totalItems(items).toLocaleString("es-AR")}
          </div>
        </div>
      )}
    </div>
  );
}

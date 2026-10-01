import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RemitoWithRelations, RemitoForm } from "@/hooks/useRemitos";
import { toast } from "sonner";
import { Loader2, DollarSign } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remitos: RemitoWithRelations[];
  batchSave: (changes: {
    created: RemitoForm[];
    updated: { id: string; data: Partial<RemitoForm> }[];
    deleted: string[];
  }) => Promise<{ created: number; updated: number; deleted: number; errors: number }>;
}

interface TipoRow {
  tipo: string;
  count: number;
  totalViajes: number;
  totalCantidad: number;
  precio: string;
}

export function AsignarPreciosMasivosDialog({ open, onOpenChange, remitos, batchSave }: Props) {
  const [mode, setMode] = useState<"viajes" | "cantidad" | "fijo">("cantidad");
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const tiposData = useMemo<TipoRow[]>(() => {
    const map = new Map<string, { count: number; totalViajes: number; totalCantidad: number }>();
    for (const r of remitos) {
      const tipo = r.tipo_material || "(Sin tipo)";
      const existing = map.get(tipo) || { count: 0, totalViajes: 0, totalCantidad: 0 };
      existing.count++;
      existing.totalViajes += r.cantidad_viajes || 1;
      existing.totalCantidad += r.cantidad || 0;
      map.set(tipo, existing);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([tipo, data]) => ({
        tipo,
        ...data,
        precio: precios[tipo] || "",
      }));
  }, [remitos, precios]);

  const totalPreview = useMemo(() => {
    let total = 0;
    for (const row of tiposData) {
      const precio = parseFloat(row.precio) || 0;
      if (precio <= 0) continue;
      if (mode === "viajes") {
        total += precio * row.totalViajes;
      } else if (mode === "cantidad") {
        total += precio * row.totalCantidad;
      } else {
        // fijo: precio se aplica a cada remito de este tipo
        total += precio * row.count;
      }
    }
    return total;
  }, [tiposData, mode]);

  const handlePrecioChange = (tipo: string, value: string) => {
    setPrecios(prev => ({ ...prev, [tipo]: value }));
  };

  const handleApply = async () => {
    const updates: { id: string; data: Partial<RemitoForm> }[] = [];

    for (const r of remitos) {
      const tipo = r.tipo_material || "(Sin tipo)";
      const precioStr = precios[tipo];
      if (!precioStr) continue;
      const precioUnit = parseFloat(precioStr);
      if (isNaN(precioUnit) || precioUnit <= 0) continue;

      const multiplicador =
        mode === "viajes" ? (r.cantidad_viajes || 1)
        : mode === "cantidad" ? (r.cantidad || 0)
        : 1;
      const precioTotal = precioUnit * multiplicador;

      updates.push({
        id: r.id,
        data: {
          precio_unitario: precioUnit,
          precio_total: precioTotal,
          precio_calc_mode: mode,
        },
      });
    }

    if (updates.length === 0) {
      toast.info("No hay precios para aplicar");
      return;
    }

    setSaving(true);
    try {
      const results = await batchSave({ created: [], updated: updates, deleted: [] });
      toast.success(`${updates.length} remitos actualizados (${results.errors} errores)`);
      setPrecios({});
      onOpenChange(false);
    } catch {
      toast.error("Error al aplicar precios");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) setPrecios({});
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Asignar Precios por Tipo de Material
          </DialogTitle>
          <DialogDescription>
            Definí un precio unitario por tipo y se aplicará a todos los remitos filtrados ({remitos.length} remitos).
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
        <div className="space-y-4 pr-4">
          {/* Mode selector */}
          <div className="flex items-center gap-4">
            <Label className="text-sm font-medium">Calcular precio total:</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as "viajes" | "cantidad" | "fijo")} className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="viajes" id="mode-viajes" />
                <Label htmlFor="mode-viajes" className="cursor-pointer">Por viaje</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="cantidad" id="mode-cantidad" />
                <Label htmlFor="mode-cantidad" className="cursor-pointer">Por cantidad (m³/tn)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="fijo" id="mode-fijo" />
                <Label htmlFor="mode-fijo" className="cursor-pointer">Precio fijo por remito</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo Material</TableHead>
                  <TableHead className="text-center">Remitos</TableHead>
                  <TableHead className="text-center">{mode === "viajes" ? "Viajes" : mode === "cantidad" ? "Cantidad" : "—"}</TableHead>
                  <TableHead className="text-right">{mode === "fijo" ? "Precio Fijo" : "Precio Unitario"}</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiposData.map((row) => {
                  const precio = parseFloat(row.precio) || 0;
                  const multiplicador =
                    mode === "viajes" ? row.totalViajes
                    : mode === "cantidad" ? row.totalCantidad
                    : row.count;
                  const subtotal = precio * multiplicador;
                  return (
                    <TableRow key={row.tipo}>
                      <TableCell className="font-medium">{row.tipo}</TableCell>
                      <TableCell className="text-center">{row.count}</TableCell>
                      <TableCell className="text-center">
                        {mode === "viajes"
                          ? row.totalViajes
                          : mode === "cantidad"
                          ? row.totalCantidad.toLocaleString("es-AR")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={row.precio}
                          onChange={(e) => handlePrecioChange(row.tipo, e.target.value)}
                          className="w-32 ml-auto text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {precio > 0 ? `$${subtotal.toLocaleString("es-AR")}` : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {tiposData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No hay remitos con tipos de material en el filtro actual
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Total preview */}
          {totalPreview > 0 && (
            <div className="flex justify-end items-center gap-3 p-3 bg-muted rounded-md">
              <span className="text-sm font-medium text-muted-foreground">Total estimado:</span>
              <span className="text-xl font-bold text-foreground">
                ${totalPreview.toLocaleString("es-AR")}
              </span>
            </div>
          )}
        </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={saving || totalPreview === 0}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Aplicar Precios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

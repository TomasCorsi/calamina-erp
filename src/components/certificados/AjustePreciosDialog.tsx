import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIAS_CERTIFICADO, type CertificadoConcepto } from "@/hooks/useCertificados";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  conceptos: CertificadoConcepto[];
  onApply: (ids: string[], percent: number) => Promise<void>;
}

const ALL = "__ALL__";

export function AjustePreciosDialog({ open, onOpenChange, conceptos, onApply }: Props) {
  const [tipo, setTipo] = useState<"obra" | "servicio" | typeof ALL>(ALL);
  const [categoria, setCategoria] = useState<string>(ALL);
  const [percent, setPercent] = useState("");
  const [saving, setSaving] = useState(false);

  const targets = useMemo(() => {
    return conceptos.filter((c) =>
      c.activo &&
      (tipo === ALL || c.tipo === tipo) &&
      (categoria === ALL || c.categoria === categoria)
    );
  }, [conceptos, tipo, categoria]);

  const handleApply = async () => {
    const p = Number(percent);
    if (!p || targets.length === 0) return;
    setSaving(true);
    try {
      await onApply(targets.map((t) => t.id), p);
      onOpenChange(false);
      setPercent("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar precios por porcentaje</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos</SelectItem>
                  <SelectItem value="obra">Obra</SelectItem>
                  <SelectItem value="servicio">Servicio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoría</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas</SelectItem>
                  {CATEGORIAS_CERTIFICADO.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Porcentaje (%) — usá negativo para bajar</Label>
            <Input
              type="number"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              placeholder="Ej: 10 (sube 10%) ó -5 (baja 5%)"
            />
          </div>
          <div className="rounded-md bg-muted p-3 text-sm">
            Se ajustarán <strong>{targets.length}</strong> concepto(s) activos.
            {percent && !isNaN(Number(percent)) && (
              <span className="block text-muted-foreground text-xs mt-1">
                Factor: x{(1 + Number(percent) / 100).toFixed(4)}
              </span>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleApply} disabled={!percent || isNaN(Number(percent)) || targets.length === 0 || saving}>
            {saving ? "Aplicando..." : "Aplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

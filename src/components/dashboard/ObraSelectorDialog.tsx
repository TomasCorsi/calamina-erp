import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { useObras } from "@/hooks/useObras";
import { MAX_OBRAS } from "@/hooks/useObrasSeleccionadas";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seleccionadas: string[];
  onAplicar: (ids: string[]) => void;
}

export function ObraSelectorDialog({ open, onOpenChange, seleccionadas, onAplicar }: Props) {
  const { obras, loading } = useObras();
  const [search, setSearch] = useState("");
  const [incluirInactivas, setIncluirInactivas] = useState(false);
  const [sel, setSel] = useState<string[]>(seleccionadas);

  useEffect(() => {
    if (open) setSel(seleccionadas);
  }, [open, seleccionadas]);

  const lista = useMemo(() => {
    const term = search.trim().toLowerCase();
    return obras
      .filter((o) => (incluirInactivas ? true : o.estado === "activa") || sel.includes(o.id))
      .filter((o) => !term || o.nombre.toLowerCase().includes(term) || (o.ubicacion || "").toLowerCase().includes(term));
  }, [obras, search, incluirInactivas, sel]);

  const toggle = (id: string) => {
    setSel((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_OBRAS ? prev : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Seleccionar obras</DialogTitle>
          <DialogDescription>
            Elegí hasta {MAX_OBRAS} obras para mostrar en el tablero. La selección se guarda automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar obra por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch id="inactivas" checked={incluirInactivas} onCheckedChange={setIncluirInactivas} />
              <Label htmlFor="inactivas" className="text-sm text-muted-foreground">
                Incluir pausadas / finalizadas
              </Label>
            </div>
            <span className="text-sm text-muted-foreground">
              {sel.length} / {MAX_OBRAS} seleccionadas
            </span>
          </div>

          <ScrollArea className="h-[340px] rounded-md border border-border">
            <div className="p-2 space-y-1">
              {loading && <p className="p-4 text-sm text-muted-foreground">Cargando obras…</p>}
              {!loading && lista.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">No se encontraron obras.</p>
              )}
              {lista.map((obra) => {
                const checked = sel.includes(obra.id);
                const disabled = !checked && sel.length >= MAX_OBRAS;
                return (
                  <button
                    key={obra.id}
                    type="button"
                    onClick={() => !disabled && toggle(obra.id)}
                    disabled={disabled}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                      checked ? "bg-primary/10" : "hover:bg-muted/60",
                      disabled && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <Checkbox checked={checked} disabled={disabled} className="pointer-events-none" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{obra.nombre}</p>
                      {obra.ubicacion && (
                        <p className="text-xs text-muted-foreground truncate">{obra.ubicacion}</p>
                      )}
                    </div>
                    <Badge variant={obra.estado === "activa" ? "default" : "secondary"} className="capitalize">
                      {obra.estado}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          {sel.length >= MAX_OBRAS && (
            <p className="text-xs text-muted-foreground">
              Máximo alcanzado: destildá una obra para elegir otra.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setSel([])}>
            Limpiar
          </Button>
          <Button
            onClick={() => {
              onAplicar(sel);
              onOpenChange(false);
            }}
          >
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

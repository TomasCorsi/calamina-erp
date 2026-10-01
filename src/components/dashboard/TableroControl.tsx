import { useMemo, useState } from "react";
import { format, subMonths, parseISO, differenceInSeconds } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Monitor,
  RefreshCw,
  Tv,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ObraSelectorDialog } from "@/components/dashboard/ObraSelectorDialog";
import { TableroSesion } from "@/hooks/useTableroSesion";
import { MetricaSerie } from "@/hooks/useTableroSeries";
import { useObras } from "@/hooks/useObras";

const OPCIONES_METRICA: { key: MetricaSerie; label: string }[] = [
  { key: "m3", label: "m³" },
  { key: "movimientos", label: "Movimientos" },
  { key: "horas", label: "Horas" },
  { key: "litros", label: "Litros" },
];

const OPCIONES_ROTACION = [10, 20, 30, 60];

interface Props {
  sesion: TableroSesion;
  actualizar: (cambios: Partial<TableroSesion>) => void | Promise<void>;
}

export function TableroControl({ sesion, actualizar }: Props) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const { obras = [] } = useObras() as { obras?: { id: string; nombre: string }[] };

  const mesesDisponibles = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 24 }, (_, i) => {
      const d = subMonths(now, i);
      return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: es }) };
    });
  }, []);

  const nombrePorId = useMemo(() => {
    const m: Record<string, string> = {};
    obras.forEach((o) => (m[o.id] = o.nombre));
    return m;
  }, [obras]);

  const seleccionadas = sesion.obra_ids;
  const indiceActivo = Math.max(0, seleccionadas.indexOf(sesion.obra_activa || ""));

  const irA = (delta: number) => {
    if (seleccionadas.length === 0) return;
    const next = (indiceActivo + delta + seleccionadas.length) % seleccionadas.length;
    actualizar({ obra_activa: seleccionadas[next] });
  };

  const tvUrl = `${window.location.origin}/tablero/tv`;
  const segundosDesdePing = sesion.tv_ping_at
    ? differenceInSeconds(new Date(), new Date(sesion.tv_ping_at))
    : null;
  const tvViva = segundosDesdePing !== null && segundosDesdePing < 90;

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(tvUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
      toast({ title: "Link copiado", description: "Pegalo en la PC del televisor." });
    } catch {
      toast({ title: "No se pudo copiar", description: tvUrl });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Estado de la TV */}
      <Card className="card-industrial p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Tv className="w-5 h-5 text-muted-foreground" />
          <span className="font-semibold">Pantalla de TV</span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs rounded-md px-2 py-0.5",
              tvViva ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", tvViva ? "bg-success animate-pulse" : "bg-muted-foreground")} />
            {tvViva ? `Conectada hace ${segundosDesdePing}s` : "Sin conexión"}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={copiarLink}>
            {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copiar link de la TV
          </Button>
          <Button size="sm" className="gap-2" onClick={() => window.open(tvUrl, "_blank")}>
            <Monitor className="w-4 h-4" />
            Abrir pantalla TV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => actualizar({ refresh_token: (sesion.refresh_token || 0) + 1 })}
          >
            <RefreshCw className="w-4 h-4" />
            Refrescar TV
          </Button>
        </div>
      </Card>

      {/* Obras */}
      <Card className="card-industrial p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-semibold">Obras del tablero</p>
            <p className="text-xs text-muted-foreground">
              Tocá una obra para mostrarla ahora mismo en la TV.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setSelectorOpen(true)}>
            <ListFilter className="w-4 h-4" />
            Seleccionar obras
          </Button>
        </div>

        {seleccionadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no elegiste obras.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {seleccionadas.map((id, i) => (
              <button
                key={id}
                type="button"
                onClick={() => actualizar({ obra_activa: id })}
                className={cn(
                  "rounded-lg border px-4 py-3 text-left transition-colors min-h-[64px]",
                  sesion.obra_activa === id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted"
                )}
              >
                <span className="block text-[11px] text-muted-foreground">Obra {i + 1}</span>
                <span className="block font-semibold truncate">{nombrePorId[id] || "Obra"}</span>
                {sesion.obra_activa === id && (
                  <Badge className="mt-1" variant="default">
                    En pantalla
                  </Badge>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button variant="outline" size="lg" className="gap-2 flex-1" onClick={() => irA(-1)}>
            <ChevronLeft className="w-5 h-5" />
            Anterior
          </Button>
          <Button variant="outline" size="lg" className="gap-2 flex-1" onClick={() => irA(1)}>
            Siguiente
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </Card>

      {/* Métrica, mes y rotación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="card-industrial p-4 flex flex-col gap-3">
          <p className="font-semibold">Gráfico principal</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {OPCIONES_METRICA.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => actualizar({ metrica: o.key })}
                className={cn(
                  "rounded-lg border px-3 py-3 text-sm font-semibold transition-colors",
                  sesion.metrica === o.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground w-16">Período</Label>
            <Select value={sesion.mes} onValueChange={(v) => actualizar({ mes: v })}>
              <SelectTrigger className="bg-background capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-72">
                {mesesDisponibles.map((m) => (
                  <SelectItem key={m.value} value={m.value} className="capitalize">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="card-industrial p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">Rotación automática</p>
              <p className="text-xs text-muted-foreground">La TV va pasando de obra sola.</p>
            </div>
            <Switch
              checked={sesion.rotacion_activa}
              onCheckedChange={(v) => actualizar({ rotacion_activa: v })}
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {OPCIONES_ROTACION.map((s) => (
              <button
                key={s}
                type="button"
                disabled={!sesion.rotacion_activa}
                onClick={() => actualizar({ rotacion_segundos: s })}
                className={cn(
                  "rounded-lg border px-3 py-3 text-sm font-semibold transition-colors disabled:opacity-40",
                  sesion.rotacion_segundos === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                )}
              >
                {s}s
              </button>
            ))}
          </div>
        </Card>
      </div>

      <ObraSelectorDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        seleccionadas={seleccionadas}
        onAplicar={(ids) =>
          actualizar({
            obra_ids: ids,
            obra_activa: ids.includes(sesion.obra_activa || "") ? sesion.obra_activa : ids[0] || null,
          })
        }
      />
    </div>
  );
}

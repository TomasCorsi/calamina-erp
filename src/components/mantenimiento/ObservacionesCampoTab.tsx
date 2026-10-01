import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useObservacionesMaquina, ObservacionMaquina } from "@/hooks/useObservacionesMaquina";
import { useObras } from "@/hooks/useObras";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle,
  Search,
  Loader2,
  Wrench,
  Calendar,
  User,
  Clock,
  ChevronDown,
  MapPin,
  Plus,
  Layers,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

function getDaysAgo(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function AgeBadge({ days }: { days: number }) {
  if (days >= 7) {
    return (
      <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px] px-1.5">
        {days}d — Urgente
      </Badge>
    );
  }
  if (days >= 3) {
    return (
      <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px] px-1.5">
        {days}d
      </Badge>
    );
  }
  return null;
}

interface ObservacionCardProps {
  obs: ObservacionMaquina;
  isExpanded: boolean;
  isUpdating: boolean;
  tecnicosOptions: ComboboxOption[];
  resolucionData: Record<string, { atendida_por: string; notas: string }>;
  onToggle: (obs: ObservacionMaquina) => void;
  onConfirm: (obs: ObservacionMaquina) => void;
  onCancelExpand: () => void;
  onResolucionChange: (id: string, field: "atendida_por" | "notas", value: string) => void;
  onCreateMantenimiento?: (obs: ObservacionMaquina) => void;
}

function ObservacionCard({
  obs,
  isExpanded,
  isUpdating,
  tecnicosOptions,
  resolucionData,
  onToggle,
  onConfirm,
  onCancelExpand,
  onResolucionChange,
  onCreateMantenimiento,
}: ObservacionCardProps) {
  const operador = obs.parte_diario?.personal;
  const operadorName = operador
    ? `${operador.nombre || ""} ${operador.apellido || ""}`.trim()
    : "Desconocido";
  const obraName = obs.parte_diario?.obra?.nombre;
  const daysAgo = !obs.atendida ? getDaysAgo(obs.fecha_reporte) : 0;

  return (
    <Card
      className={cn(
        "card-industrial transition-all",
        obs.atendida && "opacity-70",
        !obs.atendida && daysAgo >= 7 && "border-l-4 border-l-destructive",
        !obs.atendida && daysAgo >= 3 && daysAgo < 7 && "border-l-4 border-l-warning",
        !obs.atendida && daysAgo < 3 && "border-l-4 border-l-primary"
      )}
    >
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="pt-0.5">
            <Checkbox
              checked={obs.atendida}
              onCheckedChange={() => onToggle(obs)}
              disabled={isUpdating}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={cn("font-semibold text-foreground", obs.atendida && "line-through opacity-60")}>
                {obs.maquinaria?.nombre || obs.maquinaria?.codigo || "Sin máquina"}
              </h4>
              {obs.atendida ? (
                <Badge className="status-badge status-active text-xs">Atendida</Badge>
              ) : (
                <Badge className="status-badge status-pending text-xs">Pendiente</Badge>
              )}
              {!obs.atendida && <AgeBadge days={daysAgo} />}
            </div>

            {obs.maquinaria?.patente && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Patente: {obs.maquinaria.patente}
              </p>
            )}

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(obs.fecha_reporte)}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {operadorName}
              </span>
              {obraName && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {obraName}
                </span>
              )}
            </div>

            <p className="mt-2 text-sm text-foreground/80">{obs.observacion || "Sin detalle"}</p>

            {/* Actions for pending */}
            {!obs.atendida && !isExpanded && onCreateMantenimiento && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 text-xs h-7"
                onClick={() => onCreateMantenimiento(obs)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Crear Mantenimiento
              </Button>
            )}

            {obs.atendida && obs.notas_resolucion && (
              <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs text-muted-foreground">
                <span className="font-medium">Resolución:</span> {obs.notas_resolucion}
                {obs.atendida_por && <> — <span className="font-medium">{obs.atendida_por}</span></>}
                {obs.fecha_atencion && (
                  <span className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(obs.fecha_atencion)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {isExpanded && !obs.atendida && (
          <div className="ml-8 space-y-3 p-3 bg-muted/30 rounded-lg border border-border">
            <div className="space-y-1">
              <Label className="text-xs">Atendida por</Label>
              <Combobox
                options={tecnicosOptions}
                value={resolucionData[obs.id]?.atendida_por || ""}
                onValueChange={(val) => onResolucionChange(obs.id, "atendida_por", val)}
                placeholder="Seleccionar técnico..."
                searchPlaceholder="Buscar mecánico o ayudante..."
                emptyText="No se encontraron técnicos."
                className="bg-card border-border h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notas de resolución</Label>
              <Textarea
                placeholder="¿Qué se hizo para resolver?"
                value={resolucionData[obs.id]?.notas || ""}
                onChange={(e) => onResolucionChange(obs.id, "notas", e.target.value)}
                className="bg-card border-border min-h-[60px] text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => onConfirm(obs)}
                disabled={isUpdating}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                Confirmar
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelExpand}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ObservacionesCampoTab() {
  const { observaciones, pendientes, atendidas, isLoading, toggleAtendida, isUpdating } =
    useObservacionesMaquina();
  const { obras } = useObras();

  const [filtro, setFiltro] = useState<"pendientes" | "atendidas" | "todas">("pendientes");
  const [searchTerm, setSearchTerm] = useState("");
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [maquinariaFiltro, setMaquinariaFiltro] = useState("");
  const [obraFiltro, setObraFiltro] = useState("");
  const [agrupar, setAgrupar] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolucionData, setResolucionData] = useState<Record<string, { atendida_por: string; notas: string }>>({});

  const { data: tecnicosOptions = [] } = useQuery({
    queryKey: ["personal_tecnicos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal_selector" as any)
        .select("id, nombre, apellido, rol")
        .in("rol", ["mecanico", "ayudante"])
        .eq("activo", true)
        .order("apellido") as { data: { id: string; nombre: string | null; apellido: string | null; rol: string }[] | null; error: any };
      if (error) throw error;
      return (data || []).map((p): ComboboxOption => {
        const fullName = `${p.apellido || ""} ${p.nombre || ""}`.trim();
        const rolLabel = p.rol === "mecanico" ? "Mecánico" : "Ayudante";
        return {
          value: `${p.nombre || ""} ${p.apellido || ""}`.trim(),
          label: `${fullName} (${rolLabel})`,
          searchValue: fullName,
        };
      });
    },
  });

  // Build unique maquinaria options from observaciones
  const maquinariaOptions = useMemo(() => {
    const map = new Map<string, string>();
    observaciones.forEach((o) => {
      if (o.maquinaria_id && o.maquinaria) {
        map.set(o.maquinaria_id, o.maquinaria.nombre || o.maquinaria.codigo || "Sin nombre");
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [observaciones]);

  // Build unique obra options from observaciones
  const obraOptions = useMemo(() => {
    const map = new Map<string, string>();
    observaciones.forEach((o) => {
      const obra = o.parte_diario?.obra;
      if (obra?.id) {
        map.set(obra.id, obra.nombre);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [observaciones]);

  const filtered = useMemo(() => {
    let list = observaciones;
    if (filtro === "pendientes") list = pendientes;
    else if (filtro === "atendidas") list = atendidas;

    if (fechaFiltro) {
      list = list.filter((o) => o.fecha_reporte === fechaFiltro);
    }
    if (maquinariaFiltro && maquinariaFiltro !== "all") {
      list = list.filter((o) => o.maquinaria_id === maquinariaFiltro);
    }
    if (obraFiltro && obraFiltro !== "all") {
      list = list.filter((o) => o.parte_diario?.obra?.id === obraFiltro);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (o) =>
          o.maquinaria?.nombre?.toLowerCase().includes(term) ||
          o.maquinaria?.codigo?.toLowerCase().includes(term) ||
          o.observacion.toLowerCase().includes(term)
      );
    }
    return list;
  }, [observaciones, pendientes, atendidas, filtro, searchTerm, fechaFiltro, maquinariaFiltro, obraFiltro]);

  // Group by maquinaria
  const grouped = useMemo(() => {
    if (!agrupar) return null;
    const groups = new Map<string, { name: string; patente: string | null; items: ObservacionMaquina[] }>();
    filtered.forEach((obs) => {
      const key = obs.maquinaria_id || "sin-maquina";
      if (!groups.has(key)) {
        groups.set(key, {
          name: obs.maquinaria?.nombre || obs.maquinaria?.codigo || "Sin máquina",
          patente: obs.maquinaria?.patente || null,
          items: [],
        });
      }
      groups.get(key)!.items.push(obs);
    });
    return Array.from(groups.entries()).sort((a, b) => {
      const aPending = a[1].items.filter((i) => !i.atendida).length;
      const bPending = b[1].items.filter((i) => !i.atendida).length;
      return bPending - aPending;
    });
  }, [filtered, agrupar]);

  // KPIs
  const atendidasHoy = atendidas.filter(
    (o) => o.fecha_atencion && new Date(o.fecha_atencion).toDateString() === new Date().toDateString()
  ).length;

  const maquinasAfectadas = useMemo(() => {
    const ids = new Set<string>();
    pendientes.forEach((o) => { if (o.maquinaria_id) ids.add(o.maquinaria_id); });
    return ids.size;
  }, [pendientes]);

  const urgentes = useMemo(() => pendientes.filter((o) => getDaysAgo(o.fecha_reporte) >= 7).length, [pendientes]);

  const handleToggle = async (obs: ObservacionMaquina) => {
    if (!obs.atendida) {
      setExpandedId(obs.id);
      if (!resolucionData[obs.id]) {
        setResolucionData((prev) => ({ ...prev, [obs.id]: { atendida_por: "", notas: "" } }));
      }
    } else {
      await toggleAtendida({ id: obs.id, atendida: false });
    }
  };

  const handleConfirmAtendida = async (obs: ObservacionMaquina) => {
    const data = resolucionData[obs.id];
    await toggleAtendida({
      id: obs.id,
      atendida: true,
      atendida_por: data?.atendida_por || undefined,
      notas_resolucion: data?.notas || undefined,
    });
    setExpandedId(null);
  };

  const handleResolucionChange = (id: string, field: "atendida_por" | "notas", value: string) => {
    setResolucionData((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleCreateMantenimiento = (obs: ObservacionMaquina) => {
    // Navigate to mantenimientos tab with pre-fill params
    const params = new URLSearchParams();
    if (obs.maquinaria_id) params.set("maquinaria_id", obs.maquinaria_id);
    params.set("descripcion", `Reporte de campo: ${obs.observacion}`);
    params.set("tipo", "correctivo");
    params.set("tab", "mantenimientos");
    params.set("action", "new");
    window.location.hash = `#crear-mantenimiento?${params.toString()}`;
    // Dispatch event so MantenimientoPage can pick it up
    window.dispatchEvent(new CustomEvent("crear-mantenimiento-desde-reporte", {
      detail: {
        maquinaria_id: obs.maquinaria_id,
        alerta_campo: `Reporte de campo (${formatDate(obs.fecha_reporte)}): ${obs.observacion}`,
        tipo: "correctivo",
        observacion_reporte_id: obs.id,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderCards = (items: ObservacionMaquina[]) =>
    items.map((obs) => (
      <ObservacionCard
        key={obs.id}
        obs={obs}
        isExpanded={expandedId === obs.id}
        isUpdating={isUpdating}
        tecnicosOptions={tecnicosOptions}
        resolucionData={resolucionData}
        onToggle={handleToggle}
        onConfirm={handleConfirmAtendida}
        onCancelExpand={() => setExpandedId(null)}
        onResolucionChange={handleResolucionChange}
        onCreateMantenimiento={handleCreateMantenimiento}
      />
    ));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{pendientes.length}</p>
            <p className="text-sm text-muted-foreground">Pendientes</p>
          </div>
          <AlertTriangle className="w-8 h-8 text-warning" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{atendidasHoy}</p>
            <p className="text-sm text-muted-foreground">Atendidas hoy</p>
          </div>
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{maquinasAfectadas}</p>
            <p className="text-sm text-muted-foreground">Máquinas afectadas</p>
          </div>
          <Wrench className="w-8 h-8 text-destructive" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{urgentes}</p>
            <p className="text-sm text-muted-foreground">Urgentes (+7d)</p>
          </div>
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por máquina u observación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-card border-border"
            />
          </div>
          <Input
            type="date"
            value={fechaFiltro}
            onChange={(e) => setFechaFiltro(e.target.value)}
            className="w-full sm:w-44 bg-card border-border"
          />
          <Select value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
            <SelectTrigger className="w-full sm:w-44 bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="pendientes">Pendientes</SelectItem>
              <SelectItem value="atendidas">Atendidas</SelectItem>
              <SelectItem value="todas">Todas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={maquinariaFiltro} onValueChange={setMaquinariaFiltro}>
            <SelectTrigger className="w-full sm:w-52 bg-card border-border">
              <Wrench className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Todas las máquinas" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">Todas las máquinas</SelectItem>
              {maquinariaOptions.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={obraFiltro} onValueChange={setObraFiltro}>
            <SelectTrigger className="w-full sm:w-52 bg-card border-border">
              <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Todas las obras" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all">Todas las obras</SelectItem>
              {obraOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={agrupar ? "default" : "outline"}
            size="sm"
            className="h-10"
            onClick={() => setAgrupar(!agrupar)}
          >
            <Layers className="w-4 h-4 mr-2" />
            Agrupar por máquina
          </Button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wrench className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No hay observaciones {filtro === "pendientes" ? "pendientes" : filtro === "atendidas" ? "atendidas" : ""}</p>
        </div>
      ) : agrupar && grouped ? (
        <div className="space-y-4">
          {grouped.map(([key, group]) => {
            const pendingCount = group.items.filter((i) => !i.atendida).length;
            return (
              <Collapsible key={key} defaultOpen={pendingCount > 0}>
                <CollapsibleTrigger className="flex items-center gap-3 w-full p-3 card-industrial rounded-lg hover:bg-muted/50 transition-colors">
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                  <Wrench className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-foreground">{group.name}</span>
                  {group.patente && (
                    <span className="text-xs text-muted-foreground">({group.patente})</span>
                  )}
                  <div className="ml-auto flex items-center gap-2">
                    {pendingCount > 0 && (
                      <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">
                        {pendingCount} pendiente{pendingCount > 1 ? "s" : ""}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {group.items.length} total
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-3 pl-4">
                  {renderCards(group.items)}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">{renderCards(filtered)}</div>
      )}
    </div>
  );
}

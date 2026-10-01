import { useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { Fuel, Truck, Wrench, ChevronDown, ChevronUp, Cog, AlertTriangle, CalendarIcon, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { MaquinariaWithRelations, TipoMaquinaria } from "@/hooks/useMaquinarias";

interface CargaRow {
  fecha: string;
  litros: number;
  maquinaria_id: string | null;
  tipo_producto: string | null;
}
interface RemitoRow {
  fecha: string;
  maquinaria_id: string | null;
  precio_total: number | null;
  cantidad_viajes: number | null;
}
interface MantRow {
  fecha: string;
  maquinaria_id: string;
  costo_total: number;
  estado: string;
}

interface Props {
  maquinarias: MaquinariaWithRelations[];
  cargas: CargaRow[];
  remitos: RemitoRow[];
  mantenimientos: MantRow[];
  preciosPorMesProducto: Record<string, number>;
  selectedId: string;
  onSelect: (id: string, mesYYYYMM: string) => void;
  /** Mes controlado (YYYY-MM). Si se pasa, el panel usa este valor. */
  mes?: string;
  onMesChange?: (mesYYYYMM: string) => void;
  desdeCustom?: Date;
  hastaCustom?: Date;
  onDesdeCustomChange?: (d: Date | undefined) => void;
  onHastaCustomChange?: (d: Date | undefined) => void;
}

const TIPOS_VEHICULO: TipoMaquinaria[] = [
  "camion", "auto", "camioneta", "cisterna", "tanque_cisterna", "carreton", "batea", "acoplado",
];

const tipoLabel: Partial<Record<TipoMaquinaria, string>> = {
  camion: "Camión", auto: "Auto", camioneta: "Camioneta", cisterna: "Cisterna",
  tanque_cisterna: "Tanque Cisterna", carreton: "Carretón", batea: "Batea", acoplado: "Acoplado",
};

export function VehiculosActivosMesPanel({
  maquinarias, cargas, remitos, mantenimientos, preciosPorMesProducto,
  selectedId, onSelect,
  mes, onMesChange, desdeCustom: desdeCustomProp, hastaCustom: hastaCustomProp,
  onDesdeCustomChange, onHastaCustomChange,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const mesesDisponibles = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(now, i);
      return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy", { locale: es }) };
    });
  }, []);
  const [mesInterno, setMesInterno] = useState<string>(mesesDisponibles[0].value);
  const [desdeInterno, setDesdeInterno] = useState<Date | undefined>(undefined);
  const [hastaInterno, setHastaInterno] = useState<Date | undefined>(undefined);
  const mesSeleccionado = mes ?? mesInterno;
  const setMesSeleccionado = (v: string) => { setMesInterno(v); onMesChange?.(v); };
  const desdeCustom = onDesdeCustomChange ? desdeCustomProp : desdeInterno;
  const hastaCustom = onHastaCustomChange ? hastaCustomProp : hastaInterno;
  const setDesdeCustom = (d: Date | undefined) => { setDesdeInterno(d); onDesdeCustomChange?.(d); };
  const setHastaCustom = (d: Date | undefined) => { setHastaInterno(d); onHastaCustomChange?.(d); };
  const mesDate = useMemo(() => parseISO(mesSeleccionado + "-01"), [mesSeleccionado]);
  const mesDesde = startOfMonth(mesDate);
  const mesHasta = endOfMonth(mesDate);
  // Rango efectivo: si Desde > Hasta, ignorar custom y volver al mes
  const rangoInvalido = !!(desdeCustom && hastaCustom && desdeCustom > hastaCustom);
  const desde = !rangoInvalido && desdeCustom ? desdeCustom : mesDesde;
  const hasta = !rangoInvalido && hastaCustom ? hastaCustom : mesHasta;
  const desdeStr = format(desde, "yyyy-MM-dd");
  const hastaStr = format(hasta, "yyyy-MM-dd");
  const hayRangoCustom = !rangoInvalido && (!!desdeCustom || !!hastaCustom);
  const mesLabel = hayRangoCustom
    ? `${format(desde, "dd/MM/yyyy")} → ${format(hasta, "dd/MM/yyyy")}`
    : format(mesDate, "MMMM yyyy", { locale: es });

  // Active vehicles this month from partes_diarios
  const { data: partesMes = [], isLoading } = useQuery({
    queryKey: ["partes_mes_vehiculos_activos", desdeStr, hastaStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partes_diarios")
        .select("maquinaria_id, fecha, personal:personal_id(nombre, apellido)")
        .gte("fecha", desdeStr)
        .lte("fecha", hastaStr)
        .eq("estado", "completado")
        .not("maquinaria_id", "is", null);
      if (error) throw error;
      return (data || []) as Array<{
        maquinaria_id: string;
        fecha: string;
        personal: { nombre: string | null; apellido: string | null } | null;
      }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const inMonth = (f?: string | null) => !!f && f >= desdeStr && f <= hastaStr;

  const vehiculosActivos = useMemo(() => {
    const maqMap = new Map(maquinarias.map((m) => [m.id, m]));
    const activos = new Map<string, { dias: Set<string>; ultimoOperador?: string; ultimaFecha?: string }>();

    for (const p of partesMes) {
      if (!p.maquinaria_id) continue;
      const m = maqMap.get(p.maquinaria_id);
      if (!m || !TIPOS_VEHICULO.includes(m.tipo)) continue;
      let entry = activos.get(p.maquinaria_id);
      if (!entry) {
        entry = { dias: new Set() };
        activos.set(p.maquinaria_id, entry);
      }
      entry.dias.add(p.fecha);
      if (!entry.ultimaFecha || p.fecha > entry.ultimaFecha) {
        entry.ultimaFecha = p.fecha;
        const nom = [p.personal?.nombre, p.personal?.apellido].filter(Boolean).join(" ");
        if (nom) entry.ultimoOperador = nom;
      }
    }

    const result = Array.from(activos.entries()).map(([id, info]) => {
      const m = maqMap.get(id)!;
      const cargasV = cargas.filter((c) => c.maquinaria_id === id && inMonth(c.fecha));
      const litros = cargasV.reduce((s, c) => s + (c.litros || 0), 0);
      const costoComb = cargasV.reduce((s, c) => {
        const mes = parseInt(c.fecha.split("-")[1], 10);
        const producto = c.tipo_producto || "combustible";
        const precio = preciosPorMesProducto[`${mes}-${producto}`];
        return s + (precio ? c.litros * precio : 0);
      }, 0);

      const remitosV = remitos.filter((r) => r.maquinaria_id === id && inMonth(r.fecha));
      const cantViajes = remitosV.reduce((s, r) => s + (r.cantidad_viajes || 0), 0);
      const costoRem = remitosV.reduce((s, r) => s + (r.precio_total || 0), 0);

      const mantsV = mantenimientos.filter((mn) => mn.maquinaria_id === id && inMonth(mn.fecha));
      const costoMant = mantsV.reduce((s, mn) => s + (mn.costo_total || 0), 0);
      const tienePendiente = mantenimientos.some(
        (mn) => mn.maquinaria_id === id && mn.estado === "pendiente"
      );

      return {
        id,
        codigo: m.codigo || "S/C",
        tipo: m.tipo,
        patente: m.patente || "",
        nombre: m.nombre || "",
        marca: m.marca || "",
        diasActivos: info.dias.size,
        ultimoOperador: info.ultimoOperador,
        litros,
        costoComb,
        cantCargas: cargasV.length,
        cantRemitos: remitosV.length,
        cantViajes,
        costoRem,
        cantMant: mantsV.length,
        costoMant,
        total: costoComb + costoRem + costoMant,
        tienePendiente,
      };
    });

    return result.sort((a, b) => b.total - a.total);
  }, [partesMes, maquinarias, cargas, remitos, mantenimientos, preciosPorMesProducto, desdeStr, hastaStr]);

  if (isLoading) {
    return (
      <Card className="card-industrial">
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Cargando vehículos activos del mes…
        </CardContent>
      </Card>
    );
  }

  if (vehiculosActivos.length === 0 && !hayRangoCustom) {
    return null;
  }

  const datePickerBtn = (label: string, value: Date | undefined, onChange: (d: Date | undefined) => void) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 px-2 gap-1 text-xs bg-background",
            !value && "text-muted-foreground",
            rangoInvalido && value && "border-destructive text-destructive"
          )}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          {value ? format(value, "dd/MM/yyyy") : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Vehículos activos · <span className={cn(!hayRangoCustom && "capitalize")}>{mesLabel}</span>
          </h3>
          <Badge variant="outline" className="text-xs">
            {vehiculosActivos.length}
          </Badge>
          {rangoInvalido && (
            <span className="text-[11px] text-destructive">Rango inválido</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={mesSeleccionado} onValueChange={setMesSeleccionado}>
            <SelectTrigger className="h-8 w-44 bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {mesesDisponibles.map((m) => (
                <SelectItem key={m.value} value={m.value} className="capitalize text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {datePickerBtn("Desde", desdeCustom, setDesdeCustom)}
          {datePickerBtn("Hasta", hastaCustom, setHastaCustom)}
          {(desdeCustom || hastaCustom) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setDesdeCustom(undefined); setHastaCustom(undefined); }}
              className="h-8 px-2 text-muted-foreground"
              title="Limpiar fechas"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setCollapsed((v) => !v)} className="text-muted-foreground gap-1">
            {collapsed ? <><ChevronDown className="w-4 h-4" /> Mostrar</> : <><ChevronUp className="w-4 h-4" /> Ocultar</>}
          </Button>
        </div>
      </div>

      {!collapsed && vehiculosActivos.length === 0 && (
        <Card className="card-industrial">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Sin vehículos activos en el rango seleccionado.
          </CardContent>
        </Card>
      )}

      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {vehiculosActivos.map((v) => {
            const isSelected = v.id === selectedId;
            return (
              <button
                key={v.id}
                onClick={() => onSelect(v.id, mesSeleccionado)}
                className={cn(
                  "text-left rounded-lg border bg-card transition-all p-3 hover:border-primary/60 hover:shadow-md",
                  isSelected ? "border-primary ring-2 ring-primary/40" : "border-border",
                  v.tienePendiente && !isSelected && "border-amber-500/50",
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <Cog className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold">
                          {v.codigo}
                        </span>
                        {v.patente && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                            {v.patente}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {tipoLabel[v.tipo] || v.tipo}{v.marca ? ` · ${v.marca}` : ""}
                      </p>
                    </div>
                  </div>
                  {v.tienePendiente && (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                </div>

                {/* Operador y días */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                  <span className="truncate max-w-[140px]">{v.ultimoOperador || "Sin operador"}</span>
                  <span className="font-mono">{v.diasActivos} {v.diasActivos === 1 ? "día" : "días"}</span>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  <div className="rounded bg-amber-500/10 border border-amber-500/20 p-1.5">
                    <div className="flex items-center gap-1 text-[10px] text-amber-400 mb-0.5">
                      <Fuel className="w-3 h-3" /> Comb
                    </div>
                    <div className="text-xs font-semibold text-foreground font-mono">
                      ${Math.round(v.costoComb).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {v.litros.toLocaleString()} L
                    </div>
                  </div>
                  <div className="rounded bg-blue-500/10 border border-blue-500/20 p-1.5">
                    <div className="flex items-center gap-1 text-[10px] text-blue-400 mb-0.5">
                      <Truck className="w-3 h-3" /> Remitos
                    </div>
                    <div className="text-xs font-semibold text-foreground font-mono">
                      ${Math.round(v.costoRem).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {v.cantRemitos}r · {v.cantViajes}v
                    </div>
                  </div>
                  <div className="rounded bg-purple-500/10 border border-purple-500/20 p-1.5">
                    <div className="flex items-center gap-1 text-[10px] text-purple-400 mb-0.5">
                      <Wrench className="w-3 h-3" /> Mant
                    </div>
                    <div className="text-xs font-semibold text-foreground font-mono">
                      ${Math.round(v.costoMant).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {v.cantMant} serv
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Total mes</span>
                  <span className="text-sm font-bold text-primary font-mono">
                    ${Math.round(v.total).toLocaleString()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { ObraTableroData } from "@/hooks/useTableroObras";
import { MetricaSerie, SeriePunto, SERIE_COLORS } from "@/hooks/useTableroSeries";
import { HistoricoObra } from "@/hooks/useTableroHistorico";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Truck, Clock, Users, DollarSign, Boxes, Activity, Fuel } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${Math.round(value)}`;
}

const nf = (v: number, d = 0) =>
  v.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

interface MetricProps {
  icon: typeof Truck;
  label: string;
  value: string;
  sub?: string;
  tv?: boolean;
  grande?: boolean;
}

function Metric({ icon: Icon, label, value, sub, tv, grande }: MetricProps) {
  return (
    <div className="rounded-lg border border-border bg-card/60 px-2 py-1.5 min-w-0">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className={cn("w-3.5 h-3.5 shrink-0", (tv || grande) && "w-4 h-4")} />
        <span className={cn("truncate uppercase tracking-wide", tv || grande ? "text-xs" : "text-[10px]")}>
          {label}
        </span>
      </div>
      <p
        className={cn(
          "font-bold font-mono-numbers text-foreground leading-tight",
          tv ? "text-2xl" : grande ? "text-xl" : "text-base"
        )}
      >
        {value}
      </p>
      {sub !== undefined && (
        <p className={cn("text-muted-foreground font-mono-numbers leading-tight", tv ? "text-sm" : "text-[10px]")}>
          Hist. {sub}
        </p>
      )}
    </div>
  );
}

const METRICA_LABEL: Record<MetricaSerie, string> = {
  m3: "m³",
  movimientos: "Movimientos",
  horas: "Horas",
  litros: "Litros",
};

interface Props {
  obra: ObraTableroData;
  index: number;
  tv?: boolean;
  periodoLabel?: string;
  metrica: MetricaSerie;
  serie: SeriePunto[];
  loadingSerie?: boolean;
  destacada?: boolean;
  columnas?: number;
  historico?: HistoricoObra;
}

export function ObraPanel({
  obra,
  index,
  tv,
  periodoLabel = "hoy",
  metrica,
  serie,
  loadingSerie,
  destacada,
  columnas = 3,
  historico,
}: Props) {
  const color = SERIE_COLORS[index % SERIE_COLORS.length];
  const data = serie.map((p) => ({ label: p.label, valor: Number(p[obra.obraId]) || 0 }));
  const totalSerie = data.reduce((s, d) => s + d.valor, 0);
  const decimales = metrica === "movimientos" ? 0 : 1;
  const grande = columnas < 3;
  const gridMetricas =
    columnas === 1 ? "grid-cols-4 xl:grid-cols-8" : columnas === 2 ? "grid-cols-4" : "grid-cols-4";

  return (
    <Card
      className={cn(
        "card-industrial p-3 flex flex-col gap-2 h-full min-h-0 transition-all duration-500",
        tv && "p-4 gap-3",
        destacada && "ring-2 ring-primary shadow-lg shadow-primary/20 scale-[1.01]",
        destacada === false && "opacity-70"
      )}
    >

      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="min-w-0">
          <p className={cn("text-muted-foreground", tv ? "text-sm" : "text-[10px]")}>OBRA {index + 1}</p>
          <h2 className={cn("font-bold text-foreground truncate", tv ? "text-2xl" : "text-base")}>
            {obra.nombre}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {obra.alertas.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-destructive text-xs font-semibold">
                    <AlertTriangle className={cn("w-3.5 h-3.5", tv && "w-4 h-4")} />
                    {obra.alertas.length}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {obra.alertas.map((a, i) => (
                    <p key={i} className="text-xs">• {a}</p>
                  ))}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Badge variant={obra.estado === "activa" ? "default" : "secondary"} className="capitalize">
            {obra.estado}
          </Badge>
        </div>
      </div>

      {/* Gráfico diario de la obra */}
      <div className="flex flex-col min-h-0 flex-1">
        <div className="flex items-center justify-between">
          <span className={cn("text-muted-foreground uppercase tracking-wide", tv ? "text-xs" : "text-[10px]")}>
            {METRICA_LABEL[metrica]} por día
          </span>
          <span className={cn("font-mono-numbers font-semibold text-foreground", tv ? "text-base" : "text-xs")}>
            {nf(totalSerie, decimales)}
          </span>
        </div>
        <div className={cn("flex-1", grande ? "min-h-[140px]" : "min-h-[70px]")}>
          {loadingSerie ? (
            <div className="h-full bg-muted/40 rounded animate-pulse" />
          ) : totalSerie === 0 ? (
            <div className="h-full flex items-center justify-center text-[11px] text-muted-foreground">
              Sin datos en el período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: tv ? 12 : grande ? 11 : 9 }}
                  interval="preserveStartEnd"
                  minTickGap={12}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: tv ? 12 : 9 }} width={38} />
                <RTooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: tv ? 14 : 12,
                  }}
                  formatter={(v: number) => [nf(v, decimales), METRICA_LABEL[metrica]]}
                />
                <Bar dataKey="valor" fill={color} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className={cn("grid gap-2 shrink-0", gridMetricas, tv && "gap-3")}>
        <Metric
          icon={Activity}
          label={`Movim. ${periodoLabel}`}
          value={nf(obra.movimientosHoy)}
          sub={historico && nf(historico.movimientos)}
          tv={tv}
          grande={grande}
        />
        <Metric
          icon={Boxes}
          label="m³ período"
          value={nf(obra.m3Mes, 1)}
          sub={historico && nf(historico.m3, 1)}
          tv={tv}
          grande={grande}
        />
        <Metric
          icon={Clock}
          label="Horas período"
          value={nf(obra.horasMes, 1)}
          sub={historico && nf(historico.horas, 1)}
          tv={tv}
          grande={grande}
        />
        <Metric
          icon={Fuel}
          label="Litros"
          value={nf(obra.litrosMes)}
          sub={historico && nf(historico.litros)}
          tv={tv}
          grande={grande}
        />
        <Metric
          icon={Truck}
          label="Maquinaria"
          value={`${nf(obra.maquinariasEnUso)}/${nf(obra.maquinariasTotal)}`}
          sub={historico && nf(historico.maquinarias)}
          tv={tv}
          grande={grande}
        />
        <Metric
          icon={Users}
          label={`Personal ${periodoLabel}`}
          value={nf(obra.personalHoy)}
          sub={historico && nf(historico.personal)}
          tv={tv}
          grande={grande}
        />
        <Metric
          icon={Activity}
          label="Viajes remitos"
          value={nf(obra.viajesMes)}
          sub={historico && nf(historico.viajes)}
          tv={tv}
          grande={grande}
        />
        <Metric
          icon={DollarSign}
          label="Gastos período"
          value={formatCurrency(obra.gastosMes)}
          sub={historico && formatCurrency(historico.gastos)}
          tv={tv}
          grande={grande}
        />
      </div>
    </Card>
  );
}

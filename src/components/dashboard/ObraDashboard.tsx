import { ObraTableroData } from "@/hooks/useTableroObras";
import { MetricaSerie, SeriePunto } from "@/hooks/useTableroSeries";
import { HistoricoObra } from "@/hooks/useTableroHistorico";
import { AvanceObra } from "@/hooks/useAvanceObra";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Truck, Users, DollarSign, Activity, Fuel } from "lucide-react";


import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";

const nf = (v: number, d = 0) =>
  v.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

/** Importe completo con separador de miles (para datos clave que deben leerse enteros). */
function formatCurrencyFull(value: number): string {
  const signo = value < 0 ? "-" : "";
  return `${signo}$${Math.round(Math.abs(value)).toLocaleString("es-AR")}`;
}

function formatMillones(value: number): string {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)} millones`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)} mil`;
  return "";
}


const METRICA_LABEL: Record<MetricaSerie, string> = {
  m3: "m³",
  movimientos: "Movimientos",
  horas: "Horas",
  litros: "Litros",
};

const GASTO_COLORS = ["#B00020", "#E4A11B", "#6B7280", "#2563EB", "#16A34A", "#9333EA"];

const CATEGORIA_LABEL: Record<string, string> = {
  combustible: "Combustible",
  mantenimiento: "Mantenimiento",
  servicios: "Servicios",
  materiales: "Materiales",
  repuestos: "Repuestos",
  herramientas: "Herramientas",
  fletes: "Fletes",
  varios: "Varios",
};

const nombreCategoria = (c: string) =>
  CATEGORIA_LABEL[c.toLowerCase()] || c.charAt(0).toUpperCase() + c.slice(1);

/** Agrupa las categorías chicas para que el gráfico siga siendo legible en la TV. */
function armarGastos(items: { categoria: string; monto: number }[]) {
  const orden = [...items].filter((g) => g.monto > 0).sort((a, b) => b.monto - a.monto);
  const top = orden.slice(0, 5).map((g) => ({ name: nombreCategoria(g.categoria), value: Math.round(g.monto) }));
  const resto = orden.slice(5).reduce((s, g) => s + g.monto, 0);
  if (resto > 0) top.push({ name: "Otras", value: Math.round(resto) });
  return top;
}

/** Deja los materiales principales y agrupa el resto en "Otros". */
function armarMateriales(items: { nombre: string; cantidad: number; viajes: number }[]) {
  const orden = items.filter((m) => m.cantidad > 0).sort((a, b) => b.cantidad - a.cantidad);
  const top = orden.slice(0, 6).map((m) => ({ ...m, cantidad: Number(m.cantidad.toFixed(1)) }));
  const resto = orden.slice(6);
  if (resto.length > 0) {
    top.push({
      nombre: "Otros",
      cantidad: Number(resto.reduce((s, m) => s + m.cantidad, 0).toFixed(1)),
      viajes: resto.reduce((s, m) => s + m.viajes, 0),
    });
  }
  return top;
}

interface KPIProps {
  icon: typeof Truck;
  label: string;
  value: string;
  sub?: string;
  tv?: boolean;
  destacado?: boolean;
}

function KPI({ icon: Icon, label, value, sub, tv, destacado }: KPIProps) {
  return (
    <Card
      className={cn(
        "card-industrial px-3 py-2 flex flex-col justify-center min-w-0",
        destacado && "border-primary/40 bg-primary/5"
      )}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className={cn("shrink-0", tv ? "w-5 h-5" : "w-4 h-4")} />
        <span className={cn("uppercase tracking-wide truncate", tv ? "text-sm" : "text-[11px]")}>
          {label}
        </span>
      </div>
      <p
        className={cn(
          "font-bold font-mono-numbers text-foreground leading-none mt-1",
          tv ? "text-4xl" : destacado ? "text-3xl" : "text-2xl"
        )}
      >
        {value}
      </p>
      {sub !== undefined && (
        <div
          className={cn(
            "mt-1.5 flex items-center justify-between gap-2 rounded-md border border-border bg-muted/60 px-2",
            tv ? "py-1" : "py-0.5"
          )}
        >
          <span
            className={cn(
              "uppercase tracking-widest text-muted-foreground font-semibold",
              tv ? "text-xs" : "text-[9px]"
            )}
          >
            Histórico
          </span>
          <span
            className={cn("font-bold font-mono-numbers text-foreground", tv ? "text-2xl" : "text-base")}
          >
            {sub}
          </span>
        </div>
      )}
    </Card>
  );
}

function ChartCard({
  titulo,
  extra,
  tv,
  children,
}: {
  titulo: string;
  extra?: string;
  tv?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("card-industrial p-2 flex flex-col min-h-0", tv ? "min-h-[180px]" : "min-h-[150px]")}>
      <div className="flex items-center justify-between px-1 pb-1 shrink-0">
        <span
          className={cn("uppercase tracking-wide text-muted-foreground", tv ? "text-sm" : "text-[11px]")}
        >
          {titulo}
        </span>
        {extra && (
          <span className={cn("font-mono-numbers font-semibold", tv ? "text-base" : "text-xs")}>
            {extra}
          </span>
        )}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </Card>
  );
}

const tooltipStyle = (tv?: boolean) => ({
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: tv ? 14 : 12,
});

interface Props {
  obra: ObraTableroData;
  metrica: MetricaSerie;
  serie: SeriePunto[];
  loadingSerie?: boolean;
  historico?: HistoricoObra;
  periodoLabel?: string;
  mesLabel?: string;
  tv?: boolean;
  posicion?: { actual: number; total: number };
  avance?: AvanceObra;
}

export function ObraDashboard({
  obra,
  metrica,
  serie,
  loadingSerie,
  historico,
  periodoLabel = "hoy",
  mesLabel,
  tv,
  posicion,
  avance,
}: Props) {
  const decimales = metrica === "movimientos" ? 0 : 1;
  const data = serie.map((p) => ({ label: p.label, valor: Number(p[obra.obraId]) || 0 }));
  const total = data.reduce((s, d) => s + d.valor, 0);

  let acumulado = 0;
  const dataAcum = data.map((d) => {
    acumulado += d.valor;
    return { label: d.label, acumulado: Number(acumulado.toFixed(1)) };
  });

  const materiales = armarMateriales(obra.materiales || []);
  const materialesHist: Record<string, number> = {};
  (historico?.materiales || []).forEach((m) => {
    materialesHist[m.nombre.toLowerCase()] = m.cantidad;
  });
  const totalMateriales = materiales.reduce((s, m) => s + m.cantidad, 0);

  const gastos = armarGastos(obra.gastosPorCategoria || []);
  const totalGastos = gastos.reduce((s, g) => s + g.value, 0);

  // Rentabilidad: lo cotizado (aprobado) contra el gasto acumulado histórico de la obra
  const cotizado = obra.montoCotizado || 0;
  const gastadoHistorico = historico?.gastos ?? obra.gastosMes;
  const beneficio = cotizado - gastadoHistorico;
  const margen = cotizado > 0 ? (beneficio / cotizado) * 100 : 0;
  const consumido = cotizado > 0 ? Math.min(100, (gastadoHistorico / cotizado) * 100) : 0;

  // Cobranzas: anticipo de la cotización + pagos de certificados
  const anticipoCobrado = obra.anticipoCobrado || 0;
  const cobradoTotal = anticipoCobrado + (avance?.totalCobrado || 0);
  const saldoPendiente = Math.max(0, (avance?.totalCertificado || 0) - (avance?.totalCobrado || 0));

  // En la TV no hay mouse: los valores se dibujan sobre el gráfico y se ocultan los tooltips.
  const mostrarTooltip = !tv;
  const pasoEtiquetas = data.length > 16 ? 2 : 1;

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-3 shrink-0 border-b border-border pb-2">
        <div className="min-w-0">
          <p className={cn("text-muted-foreground uppercase tracking-wide", tv ? "text-sm" : "text-[11px]")}>
            Obra en pantalla {mesLabel ? `· ${mesLabel}` : ""}
          </p>
          <h2 className={cn("font-bold text-foreground truncate", tv ? "text-5xl" : "text-2xl")}>
            {obra.nombre}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant={obra.estado === "activa" ? "default" : "secondary"}
            className={cn("capitalize", tv && "text-base px-3 py-1")}
          >
            {obra.estado}
          </Badge>
          {posicion && posicion.total > 1 && (
            <div className="flex items-center gap-2">
              <span className={cn("text-muted-foreground", tv ? "text-base" : "text-xs")}>
                {posicion.actual + 1}/{posicion.total}
              </span>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(posicion.total, 10) }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "rounded-full",
                      tv ? "w-2.5 h-2.5" : "w-2 h-2",
                      i === posicion.actual ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPIs secundarios */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 shrink-0">
        <KPI icon={Fuel} label="Litros" value={nf(obra.litrosMes)} sub={historico && nf(historico.litros)} tv={tv} />
        <KPI
          icon={Truck}
          label="Maquinaria en uso"
          value={`${nf(obra.maquinariasEnUso)}/${nf(obra.maquinariasTotal)}`}
          tv={tv}
        />
        <KPI
          icon={Users}
          label={`Personal ${periodoLabel}`}
          value={nf(obra.personalHoy)}
          sub={historico && nf(historico.personal)}
          tv={tv}
        />
        <KPI
          icon={Activity}
          label="Viajes de remitos"
          value={nf(obra.viajesMes)}
          sub={historico && nf(historico.viajes)}
          tv={tv}
        />
      </div>

      {/* Rentabilidad: dato clave, ancho completo y con importes enteros */}
      <Card className="card-industrial p-3 shrink-0 border-2 border-primary/50 bg-primary/[0.04]">
        <div className="flex items-center justify-between px-1 pb-2">
          <span
            className={cn(
              "uppercase tracking-wide text-primary font-bold flex items-center gap-2",
              tv ? "text-lg" : "text-sm"
            )}
          >
            <DollarSign className={cn(tv ? "w-6 h-6" : "w-4 h-4")} />
            Rentabilidad de la obra
          </span>
          {cotizado > 0 && (
            <span
              className={cn(
                "font-mono-numbers font-bold rounded-md px-3 py-1",
                beneficio >= 0
                  ? "text-success bg-success/15 border border-success/40"
                  : "text-destructive bg-destructive/15 border border-destructive/40",
                tv ? "text-3xl" : "text-xl"
              )}
            >
              {beneficio >= 0 ? "+" : ""}
              {margen.toFixed(0)}%
            </span>
          )}
        </div>

        {cotizado === 0 ? (
          <p className={cn("px-1 py-2 text-muted-foreground", tv ? "text-lg" : "text-sm")}>
            Sin cotización aprobada
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 px-1">
              {[
                {
                  label: "Cotizado",
                  valor: cotizado,
                  tone: "text-primary",
                  box: "bg-primary/10 border-primary/40",
                },
                {
                  label: "Gastado",
                  valor: gastadoHistorico,
                  tone: "text-warning",
                  box: "bg-warning/10 border-warning/40",
                },
                {
                  label: "Beneficio",
                  valor: beneficio,
                  tone: beneficio >= 0 ? "text-success" : "text-destructive",
                  box:
                    beneficio >= 0
                      ? "bg-success/10 border-success/40"
                      : "bg-destructive/10 border-destructive/40",
                },
              ].map((b) => (
                <div key={b.label} className={cn("rounded-md border px-2 py-1", b.box)}>
                  <p
                    className={cn(
                      "uppercase tracking-wide font-semibold leading-none",
                      b.tone,
                      tv ? "text-sm" : "text-[10px]"
                    )}
                  >
                    {b.label}
                  </p>
                  <p
                    className={cn(
                      "font-bold font-mono-numbers leading-tight flex items-baseline gap-1.5 flex-wrap",
                      b.tone,
                      tv ? "text-3xl" : "text-lg"
                    )}
                  >
                    {formatCurrencyFull(b.valor)}
                    {formatMillones(b.valor) && (
                      <span className={cn("font-normal text-muted-foreground", tv ? "text-sm" : "text-[10px]")}>
                        {formatMillones(b.valor)}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>

            <div className="px-1 mt-1.5 flex items-center gap-2">
              <div
                className={cn(
                  "flex-1 rounded-full bg-muted/80 border border-border overflow-hidden",
                  tv ? "h-3" : "h-2"
                )}
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    consumido >= 100 ? "bg-destructive" : consumido >= 80 ? "bg-warning" : "bg-success"
                  )}
                  style={{ width: `${consumido}%` }}
                />
              </div>
              <p className={cn("shrink-0 text-muted-foreground", tv ? "text-sm" : "text-[10px]")}>
                <span className="font-bold font-mono-numbers text-foreground">{consumido.toFixed(0)}%</span>{" "}
                consumido
              </p>
            </div>

            {/* Avance y cobranzas (desde certificados + anticipo de la cotización) */}
            {(cobradoTotal > 0 || (avance?.totalCertificado ?? 0) > 0) && (
              <div className="px-1 mt-2 grid grid-cols-1 lg:grid-cols-2 gap-2">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Anticipo",
                      valor: anticipoCobrado,
                      tone: "text-primary",
                      box: "bg-primary/10 border-primary/40",
                      mostrar: anticipoCobrado > 0,
                    },
                    {
                      label: "Certificado",
                      valor: avance?.totalCertificado || 0,
                      tone: "text-foreground",
                      box: "bg-muted/50 border-border",
                      mostrar: (avance?.totalCertificado ?? 0) > 0,
                    },
                    {
                      label: "Cobrado",
                      valor: cobradoTotal,
                      tone: "text-success",
                      box: "bg-success/10 border-success/40",
                      mostrar: true,
                    },
                  ]
                    .filter((b) => b.mostrar)
                    .map((b) => (
                      <div key={b.label} className={cn("rounded-md border px-2 py-1", b.box)}>
                        <p
                          className={cn(
                            "uppercase tracking-wide font-semibold leading-none",
                            b.tone,
                            tv ? "text-sm" : "text-[10px]"
                          )}
                        >
                          {b.label}
                        </p>
                        <p
                          className={cn(
                            "font-bold font-mono-numbers leading-tight flex items-baseline gap-1.5 flex-wrap",
                            b.tone,
                            tv ? "text-3xl" : "text-lg"
                          )}
                        >
                          {formatCurrencyFull(b.valor)}
                          {formatMillones(b.valor) && (
                            <span
                              className={cn(
                                "font-normal text-muted-foreground",
                                tv ? "text-sm" : "text-[10px]"
                              )}
                            >
                              {formatMillones(b.valor)}
                            </span>
                          )}
                        </p>
                        {b.label === "Cobrado" && saldoPendiente > 0 && (
                          <p
                            className={cn(
                              "font-semibold text-destructive font-mono-numbers leading-none",
                              tv ? "text-sm" : "text-[10px]"
                            )}
                          >
                            saldo {formatCurrencyFull(saldoPendiente)}
                          </p>
                        )}
                      </div>
                    ))}
                </div>

                {avance && avance.montoContratado > 0 && (
                  <div className="rounded-md border-2 border-primary/40 bg-primary/[0.07] px-3 py-2 flex items-center gap-3">
                    <p
                      className={cn(
                        "font-bold font-mono-numbers text-primary leading-none shrink-0",
                        tv ? "text-6xl" : "text-4xl"
                      )}
                    >
                      {avance.avanceGeneral.toFixed(0)}%
                    </p>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "uppercase tracking-wide text-primary font-bold leading-none mb-1.5",
                          tv ? "text-base" : "text-xs"
                        )}
                      >
                        Avance de obra
                      </p>
                      <div
                        className={cn(
                          "w-full rounded-full bg-muted/80 border border-border overflow-hidden",
                          tv ? "h-6" : "h-4"
                        )}
                      >
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(100, avance.avanceGeneral)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </>
        )}
      </Card>

      {/* Gráficos */}
      <div
        className={cn(
          "grid grid-cols-1 lg:grid-cols-3 gap-2 min-h-0",
          tv ? "flex-1" : "min-h-[460px] lg:flex-1"
        )}
      >
        <div className={cn("lg:col-span-2 grid grid-rows-2 auto-rows-fr gap-2 min-h-0")}>
          <ChartCard titulo={`${METRICA_LABEL[metrica]} por día`} extra={nf(total, decimales)} tv={tv}>
            {loadingSerie ? (
              <div className="h-full bg-muted/40 rounded animate-pulse" />
            ) : total === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Sin datos en el período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: tv ? 13 : 10 }}
                    interval="preserveStartEnd"
                    minTickGap={10}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: tv ? 13 : 10 }} width={42} />
                  {mostrarTooltip && (
                    <RTooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                      contentStyle={tooltipStyle(tv)}
                      formatter={(v: number) => [nf(v, decimales), METRICA_LABEL[metrica]]}
                    />
                  )}
                  <Bar dataKey="valor" fill="#B00020" radius={[3, 3, 0, 0]}>
                    <LabelList
                      dataKey="valor"
                      position="top"
                      fontSize={tv ? 13 : 10}
                      fill="hsl(var(--foreground))"
                      formatter={(v: number, _e?: unknown, i?: number) =>
                        !v || (typeof i === "number" && i % pasoEtiquetas !== 0) ? "" : nf(v, decimales)
                      }
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard titulo={`${METRICA_LABEL[metrica]} acumulado del período`} tv={tv}>
            {total === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Sin datos en el período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataAcum} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#E4A11B" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#E4A11B" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: tv ? 13 : 10 }}
                    interval="preserveStartEnd"
                    minTickGap={10}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: tv ? 13 : 10 }} width={42} />
                  {mostrarTooltip && (
                    <RTooltip
                      contentStyle={tooltipStyle(tv)}
                      formatter={(v: number) => [nf(v, decimales), "Acumulado"]}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="acumulado"
                    stroke="#E4A11B"
                    strokeWidth={2}
                    fill="url(#gradAcum)"
                  >
                    <LabelList
                      dataKey="acumulado"
                      position="top"
                      fontSize={tv ? 13 : 10}
                      fill="hsl(var(--foreground))"
                      formatter={(v: number, _e?: unknown, i?: number) =>
                        typeof i === "number" && i === dataAcum.length - 1 ? nf(v, decimales) : ""
                      }
                    />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <div className="grid grid-rows-3 auto-rows-fr gap-2 min-h-0">
          <ChartCard
            titulo="Materiales movidos"
            extra={totalMateriales > 0 ? `${nf(totalMateriales, 1)} m³` : undefined}
            tv={tv}
          >
            {materiales.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Sin materiales registrados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={materiales}
                  layout="vertical"
                  margin={{ top: 2, right: 46, left: 4, bottom: 2 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: tv ? 13 : 10 }} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={tv ? 140 : 96}
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: tv ? 13 : 10 }}
                  />
                  {mostrarTooltip && (
                    <RTooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                      contentStyle={tooltipStyle(tv)}
                      formatter={(v: number, _n: string, p: any) => [
                        `${nf(v, 1)} · ${nf(p?.payload?.viajes || 0)} viajes`,
                        p?.payload?.nombre,
                      ]}
                    />
                  )}
                  <Bar dataKey="cantidad" fill="#2563EB" radius={[0, 3, 3, 0]}>
                    <LabelList
                      dataKey="cantidad"
                      position="right"
                      fontSize={tv ? 13 : 10}
                      fill="hsl(var(--foreground))"
                      formatter={(v: number, _e?: unknown, i?: number) => {
                        const m = typeof i === "number" ? materiales[i] : undefined;
                        const hist = m ? materialesHist[m.nombre.toLowerCase()] : undefined;
                        return hist ? `${nf(v, 1)}  (H ${nf(hist, 0)})` : nf(v, 1);
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard titulo="Horas por tipo de máquina" tv={tv}>
            {(obra.horasPorTipoMaquina || []).length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                Sin horas registradas
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(obra.horasPorTipoMaquina || []).map((t) => ({
                    ...t,
                    nombre: `${t.tipo} (${t.maquinas})`,
                  }))}
                  layout="vertical"
                  margin={{ top: 2, right: 12, left: 4, bottom: 2 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: tv ? 13 : 10 }} />
                  <YAxis
                    type="category"
                    dataKey="nombre"
                    width={tv ? 130 : 90}
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: tv ? 13 : 10 }}
                  />
                  {mostrarTooltip && (
                    <RTooltip
                      cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                      contentStyle={tooltipStyle(tv)}
                      formatter={(v: number) => [nf(v, 1), "Horas"]}
                    />
                  )}
                  <Bar dataKey="horas" fill="#6B7280" radius={[0, 3, 3, 0]}>
                    <LabelList
                      dataKey="horas"
                      position="right"
                      fontSize={tv ? 13 : 10}
                      fill="hsl(var(--foreground))"
                      formatter={(v: number) => nf(v, 1)}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>

    </div>
  );
}

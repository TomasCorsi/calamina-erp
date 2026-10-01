import { useState } from "react";
import { useAvanceObra, AvanceConcepto } from "@/hooks/useAvanceObra";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const money = (v: number) =>
  `$${Math.round(v).toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
const nf = (v: number, d = 2) =>
  v.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: d });

function Barra({ valor }: { valor: number }) {
  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          valor >= 100 ? "bg-success" : valor >= 50 ? "bg-warning" : "bg-primary"
        )}
        style={{ width: `${Math.min(100, valor)}%` }}
      />
    </div>
  );
}

function KPI({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <Card className="card-industrial p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-2xl font-bold font-mono-numbers mt-1", tone)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </Card>
  );
}

function FilaConcepto({
  c,
  onGuardar,
}: {
  c: AvanceConcepto;
  onGuardar: (cantidad: number) => void;
}) {
  const [valor, setValor] = useState<string>(c.cantidadTotal ? String(c.cantidadTotal) : "");
  const editable = !c.id.startsWith("libre-");

  return (
    <div className="grid grid-cols-12 gap-2 items-center px-3 py-2 border-b border-border last:border-0">
      <div className="col-span-12 md:col-span-4 min-w-0">
        <p className="font-medium text-foreground truncate">{c.nombre}</p>
        <p className="text-xs text-muted-foreground">
          {c.unidad || "-"} · {money(c.precioUnitario)} c/u
        </p>
      </div>

      <div className="col-span-4 md:col-span-2">
        <p className="text-[10px] uppercase text-muted-foreground">Certificado</p>
        <p className="font-mono-numbers text-sm">{nf(c.cantidadCertificada)}</p>
      </div>

      <div className="col-span-4 md:col-span-2">
        <p className="text-[10px] uppercase text-muted-foreground">Total contratado</p>
        {editable ? (
          <Input
            type="number"
            inputMode="decimal"
            value={valor}
            placeholder="Cargar"
            onChange={(e) => setValor(e.target.value)}
            onBlur={() => {
              const n = Number(valor);
              if (!Number.isNaN(n) && n !== c.cantidadTotal) onGuardar(n);
            }}
            className="h-8 text-sm font-mono-numbers"
          />
        ) : (
          <p className="text-sm text-muted-foreground">Fuera de plan</p>
        )}
      </div>

      <div className="col-span-4 md:col-span-2">
        <p className="text-[10px] uppercase text-muted-foreground">Monto</p>
        <p className="font-mono-numbers text-sm">{money(c.montoCertificado)}</p>
      </div>

      <div className="col-span-12 md:col-span-2 flex items-center gap-2">
        <Barra valor={c.avance} />
        <span className="font-mono-numbers text-sm w-11 text-right">
          {c.cantidadTotal > 0 ? `${c.avance.toFixed(0)}%` : "—"}
        </span>
      </div>
    </div>
  );
}

export function AvanceObraTab({ obraId }: { obraId: string }) {
  const { avance, loading, setCantidadTotal } = useAvanceObra(obraId);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const sinDatos = avance.conceptos.length === 0 && avance.certificados.length === 0;
  if (sinDatos) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Esta obra todavía no tiene conceptos ni certificados cargados.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI
          label="Avance general"
          value={`${avance.avanceGeneral.toFixed(1)}%`}
          sub={`${money(avance.montoCertificado)} de ${money(avance.montoContratado)}`}
          tone="text-primary"
        />
        <KPI label="Total certificado" value={money(avance.totalCertificado)} sub={`${avance.certificados.length} certificados`} />
        <KPI
          label="Cobrado"
          value={money(avance.totalCobrado)}
          sub={`${avance.porcentajeCobrado.toFixed(0)}% del certificado`}
          tone="text-success"
        />
        <KPI
          label="Saldo pendiente"
          value={money(avance.saldoPendiente)}
          tone={avance.saldoPendiente > 0 ? "text-destructive" : undefined}
        />
      </div>

      <Card className="card-industrial p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Avance general de la obra</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${avance.avanceGeneral}%` }} />
          </div>
          <span className="font-mono-numbers font-bold text-xl">{avance.avanceGeneral.toFixed(1)}%</span>
        </div>
      </Card>

      {/* Avance por trabajos */}
      <Card className="card-industrial overflow-hidden">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-sm font-semibold">Avance por trabajo</span>
          <span className="text-xs text-muted-foreground">
            Cargá la cantidad total contratada para ver el porcentaje real
          </span>
        </div>
        {avance.categorias.map((cat) => (
          <div key={cat.categoria}>
            <div className="flex items-center justify-between gap-3 px-3 py-2 bg-muted/50 border-b border-border">
              <span className="text-sm font-semibold text-foreground">{cat.categoria}</span>
              <div className="flex items-center gap-2 w-48">
                <Barra valor={cat.avance} />
                <span className="font-mono-numbers text-xs w-11 text-right">
                  {cat.montoContratado > 0 ? `${cat.avance.toFixed(0)}%` : "—"}
                </span>
              </div>
            </div>
            {cat.conceptos.map((c) => (
              <FilaConcepto
                key={c.id}
                c={c}
                onGuardar={(cantidad) => setCantidadTotal.mutate({ conceptoId: c.id, cantidad })}
              />
            ))}
          </div>
        ))}
      </Card>

      {/* Certificado vs cobrado por mes */}
      <Card className="card-industrial p-3">
        <p className="text-sm font-semibold mb-2">Certificado vs cobrado por mes</p>
        {avance.serieMensual.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sin certificados en el período</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avance.serieMensual} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => (v >= 1000000 ? `${(v / 1000000).toFixed(0)}M` : `${v / 1000}K`)}
                />
                <RTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number, n: string) => [money(v), n]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="certificado" name="Certificado" fill="#B00020" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cobrado" name="Cobrado" fill="#16A34A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Detalle de certificados */}
      <Card className="card-industrial overflow-hidden">
        <div className="px-3 py-2 border-b border-border text-sm font-semibold">Certificados de la obra</div>
        <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[10px] uppercase text-muted-foreground border-b border-border">
          <span className="col-span-3">Número</span>
          <span className="col-span-2">Período</span>
          <span className="col-span-2 text-right">Total</span>
          <span className="col-span-2 text-right">Cobrado</span>
          <span className="col-span-2 text-right">Saldo</span>
          <span className="col-span-1 text-right">Estado</span>
        </div>
        {avance.certificados.map((c) => (
          <div key={c.id} className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-border last:border-0 text-sm">
            <span className="col-span-3 truncate">{c.numero}</span>
            <span className="col-span-2 text-muted-foreground truncate">{c.periodo || "-"}</span>
            <span className="col-span-2 text-right font-mono-numbers">{money(c.total)}</span>
            <span className="col-span-2 text-right font-mono-numbers text-success">{money(c.pagado)}</span>
            <span
              className={cn(
                "col-span-2 text-right font-mono-numbers",
                c.saldo > 0 ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {money(c.saldo)}
            </span>
            <span className="col-span-1 flex justify-end">
              <Badge variant="secondary" className="capitalize text-[10px]">
                {c.estado}
              </Badge>
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}

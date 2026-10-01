import { useMemo } from "react";
import { Users, Plane, HeartPulse, CalendarClock, Clock, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { NOVEDAD_LABEL, useRrhhNovedades, type RrhhPeriodo } from "@/hooks/useRrhh";
import type { PersonalMin } from "./planillaData";

interface Props {
  periodo: RrhhPeriodo | null;
  personal: PersonalMin[];
}

const fmtARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

function Kpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string | number; tone: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`rounded-lg p-2 ${tone}`}><Icon className="w-5 h-5" /></div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function PanelTab({ periodo, personal }: Props) {
  const { data: novedades = [] } = useRrhhNovedades(periodo?.id ?? null);

  const stats = useMemo(() => {
    const activos = personal.filter((p) => p.activo).length;
    const estado = (e?: string | null) => personal.filter((p) => (p.estado_laboral || "").toLowerCase() === e).length;
    const horasExtras = novedades.filter((n) => n.tipo === "horas_extras").reduce((s, n) => s + Number(n.horas || 0), 0);
    const inasistencias = novedades.filter((n) => n.tipo === "inasistencia").length;
    const adelantos = novedades.filter((n) => n.tipo === "adelanto").reduce((s, n) => s + Number(n.monto || 0), 0);
    const premios = novedades.filter((n) => n.tipo === "premio").reduce((s, n) => s + Number(n.monto || 0), 0);
    return {
      activos,
      vacaciones: estado("vacaciones"),
      art: estado("art"),
      horasExtras,
      inasistencias,
      adelantos,
      premios,
      novedades: novedades.length,
    };
  }, [personal, novedades]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Users} label="Empleados activos" value={stats.activos} tone="bg-primary/15 text-primary" />
        <Kpi icon={Plane} label="De vacaciones" value={stats.vacaciones} tone="bg-blue-500/15 text-blue-600" />
        <Kpi icon={HeartPulse} label="Con ART" value={stats.art} tone="bg-amber-500/15 text-amber-600" />
        <Kpi icon={CalendarClock} label="Novedades del período" value={stats.novedades} tone="bg-emerald-500/15 text-emerald-600" />
        <Kpi icon={Clock} label="Horas extras" value={`${stats.horasExtras} hs`} tone="bg-indigo-500/15 text-indigo-600" />
        <Kpi icon={CalendarClock} label="Inasistencias" value={stats.inasistencias} tone="bg-destructive/15 text-destructive" />
        <Kpi icon={Wallet} label="Adelantos del período" value={fmtARS(stats.adelantos)} tone="bg-amber-500/15 text-amber-600" />
        <Kpi icon={Wallet} label="Premios del período" value={fmtARS(stats.premios)} tone="bg-emerald-500/15 text-emerald-600" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Últimas novedades</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {novedades.length === 0 && <p className="text-sm text-muted-foreground">Sin novedades en este período.</p>}
          {novedades.slice(0, 10).map((n) => (
            <div key={n.id} className="flex items-center justify-between gap-2 border-b last:border-0 pb-2 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {n.personal?.apellido} {n.personal?.nombre}
                </p>
                <p className="text-xs text-muted-foreground">
                  {n.fecha ? formatDate(n.fecha) : n.fecha_desde ? `${formatDate(n.fecha_desde)} al ${formatDate(n.fecha_hasta)}` : ""}
                </p>
              </div>
              <Badge variant="outline">{NOVEDAD_LABEL[n.tipo]}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import {
  Loader2,
  Building2,
  Users,
  Clock,
  Truck,
  Fuel,
  ChevronDown,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useRendimientoObras, type ObraRendimiento } from "@/hooks/useRendimientoObras";

const ROL_LABELS: Record<string, string> = {
  maquinista: "Maquinista",
  chofer: "Chofer",
  capataz: "Capataz",
  mecanico: "Mecánico",
  sereno: "Sereno",
  topografo: "Topógrafo",
  ayudante: "Ayudante",
  administrativo: "Administrativo",
};

type PeriodoPreset = "hoy" | "semana" | "mes" | "mes_anterior" | "custom";

function getDateRange(preset: PeriodoPreset): { desde: string; hasta: string } {
  const now = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");

  switch (preset) {
    case "hoy":
      return { desde: fmt(now), hasta: fmt(now) };
    case "semana":
      return { desde: fmt(startOfWeek(now, { weekStartsOn: 1 })), hasta: fmt(endOfWeek(now, { weekStartsOn: 1 })) };
    case "mes":
      return { desde: fmt(startOfMonth(now)), hasta: fmt(endOfMonth(now)) };
    case "mes_anterior": {
      const prev = subMonths(now, 1);
      return { desde: fmt(startOfMonth(prev)), hasta: fmt(endOfMonth(prev)) };
    }
    default:
      return { desde: fmt(startOfMonth(now)), hasta: fmt(endOfMonth(now)) };
  }
}

function KPICard({ icon: Icon, label, value, className }: { icon: any; label: string; value: string | number; className?: string }) {
  return (
    <Card>
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${className || "bg-primary/10"}`}>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ObraRow({ obra }: { obra: ObraRendimiento }) {
  const [open, setOpen] = useState(false);
  const empleadosList = Array.from(obra.empleados.values()).sort((a, b) => b.partes - a.partes);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <TableRow className="cursor-pointer hover:bg-muted/50">
          <TableCell>
            <div className="flex items-center gap-2">
              {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <div>
                <span className="font-medium">{obra.obraNombre}</span>
                {obra.obraNumero && (
                  <Badge variant="outline" className="ml-2 text-xs">{obra.obraNumero}</Badge>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell className="text-center font-medium">{obra.totalPartes}</TableCell>
          <TableCell className="text-center">{obra.empleadosUnicos.size}</TableCell>
          <TableCell className="text-center font-medium">{obra.horasMaquina.toFixed(1)}</TableCell>
          <TableCell className="text-center">{obra.viajesTotal}</TableCell>
          <TableCell className="text-center">{obra.movimientoInterno}</TableCell>
          <TableCell className="text-center">{obra.combustibleTotal.toFixed(0)}</TableCell>
        </TableRow>
      </CollapsibleTrigger>
      <CollapsibleContent asChild>
        <tr>
          <td colSpan={7} className="p-0">
            <div className="bg-muted/30 border-t px-6 py-3">
              <p className="text-sm font-medium mb-2 text-muted-foreground">Detalle por empleado</p>
              <div className="rounded-md border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead className="text-center">Partes</TableHead>
                      <TableHead className="text-center">Hs Máq.</TableHead>
                      <TableHead className="text-center">Viajes</TableHead>
                      <TableHead className="text-center">Mov. Int.</TableHead>
                      <TableHead className="text-center">Comb.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {empleadosList.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">
                          {[emp.nombre, emp.apellido].filter(Boolean).join(" ") || "Sin nombre"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ROL_LABELS[emp.rol] || emp.rol}
                        </TableCell>
                        <TableCell className="text-center">{emp.partes}</TableCell>
                        <TableCell className="text-center">{emp.horasMaquina.toFixed(1)}</TableCell>
                        <TableCell className="text-center">{emp.viajes}</TableCell>
                        <TableCell className="text-center">{emp.movimientoInterno}</TableCell>
                        <TableCell className="text-center">{emp.combustible.toFixed(0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </td>
        </tr>
      </CollapsibleContent>
    </Collapsible>
  );
}

export const ParteDiarioRendimientoObras = () => {
  const [periodoPreset, setPeriodoPreset] = useState<PeriodoPreset>("mes");
  const [customDesde, setCustomDesde] = useState("");
  const [customHasta, setCustomHasta] = useState("");

  const { desde, hasta } = useMemo(() => {
    if (periodoPreset === "custom" && customDesde && customHasta) {
      return { desde: customDesde, hasta: customHasta };
    }
    return getDateRange(periodoPreset);
  }, [periodoPreset, customDesde, customHasta]);

  const { data, isLoading } = useRendimientoObras(desde, hasta);

  const periodoLabel = useMemo(() => {
    if (!desde || !hasta) return "";
    const d = new Date(desde + "T12:00:00");
    const h = new Date(hasta + "T12:00:00");
    if (desde === hasta) return format(d, "d 'de' MMMM yyyy", { locale: es });
    return `${format(d, "d MMM", { locale: es })} – ${format(h, "d MMM yyyy", { locale: es })}`;
  }, [desde, hasta]);

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={periodoPreset} onValueChange={(v) => setPeriodoPreset(v as PeriodoPreset)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoy">Hoy</SelectItem>
                <SelectItem value="semana">Esta semana</SelectItem>
                <SelectItem value="mes">Este mes</SelectItem>
                <SelectItem value="mes_anterior">Mes anterior</SelectItem>
                <SelectItem value="custom">Rango personalizado</SelectItem>
              </SelectContent>
            </Select>

            {periodoPreset === "custom" && (
              <>
                <Input
                  type="date"
                  value={customDesde}
                  onChange={(e) => setCustomDesde(e.target.value)}
                  className="w-[160px]"
                />
                <span className="text-muted-foreground">a</span>
                <Input
                  type="date"
                  value={customHasta}
                  onChange={(e) => setCustomHasta(e.target.value)}
                  className="w-[160px]"
                />
              </>
            )}

            <span className="text-sm text-muted-foreground ml-auto">{periodoLabel}</span>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : data ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard icon={Building2} label="Total Partes" value={data.totales.partes} className="bg-primary/10" />
            <KPICard icon={Clock} label="Hs Máquina" value={data.totales.horasMaquina.toFixed(1)} className="bg-chart-1/10" />
            <KPICard icon={Truck} label="Viajes" value={data.totales.viajes} className="bg-chart-2/10" />
            <KPICard icon={Fuel} label="Combustible (L)" value={data.totales.combustible.toFixed(0)} className="bg-chart-3/10" />
          </div>

          {/* Obras table */}
          {data.porObra.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay partes diarios en este período</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Obra</TableHead>
                        <TableHead className="text-center">Partes</TableHead>
                        <TableHead className="text-center">Empleados</TableHead>
                        <TableHead className="text-center">Hs Máq.</TableHead>
                        <TableHead className="text-center">Viajes</TableHead>
                        <TableHead className="text-center">Mov. Int.</TableHead>
                        <TableHead className="text-center">Comb. (L)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.porObra.map((obra) => (
                        <ObraRow key={obra.obraId} obra={obra} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
};

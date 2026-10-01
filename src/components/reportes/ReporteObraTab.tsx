import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Download,
  Users,
  Clock,
  Wrench,
  Fuel,
  Truck,
  ShoppingCart,
  Receipt,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Filter,
  X,
} from "lucide-react";
import { useObras } from "@/hooks/useObras";
import { useReporteObra } from "@/hooks/useReporteObra";
import { exportReporteObraExcel } from "@/utils/exportReporteObraExcel";
import { toast } from "sonner";

function fmt$(n: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function fmtN(n: number, d = 2): string {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: d }).format(n || 0);
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  total?: React.ReactNode;
  children: React.ReactNode;
}

function Section({ title, icon, total, children }: SectionProps) {
  return (
    <Card className="card-industrial">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </div>
          {total && <div className="text-sm font-mono font-bold">{total}</div>}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyRow({ msg = "Sin datos" }: { msg?: string }) {
  return <p className="text-sm text-muted-foreground py-4 text-center">{msg}</p>;
}

export function ReporteObraTab() {
  const { obras = [], loading: loadingObras } = useObras();
  const [obraId, setObraId] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const options = useMemo(
    () =>
      [...obras]
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((o) => ({ value: o.id, label: o.numero ? `${o.numero} — ${o.nombre}` : o.nombre })),
    [obras]
  );

  const { data, isLoading, isFetching } = useReporteObra({
    obraId: obraId || null,
    fechaDesde: fechaDesde || undefined,
    fechaHasta: fechaHasta || undefined,
  });

  const hasFilters = fechaDesde || fechaHasta;
  const clearFilters = () => {
    setFechaDesde("");
    setFechaHasta("");
  };

  const handleExport = async () => {
    if (!data) return;
    try {
      await exportReporteObraExcel(data, fechaDesde || undefined, fechaHasta || undefined);
      toast.success("Reporte exportado");
    } catch (e: any) {
      console.error(e);
      toast.error("Error al exportar: " + (e?.message || ""));
    }
  };

  return (
    <div className="space-y-6">
      {/* Controles */}
      <Card className="card-industrial">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-muted-foreground w-full lg:w-auto">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filtros</span>
            </div>

            <div className="flex flex-col gap-1.5 min-w-[280px] flex-1">
              <Label className="text-xs text-muted-foreground">Obra</Label>
              <Combobox
                options={options}
                value={obraId}
                onValueChange={setObraId}
                placeholder={loadingObras ? "Cargando obras..." : "Seleccionar obra..."}
                searchPlaceholder="Buscar obra..."
                emptyText="Sin resultados"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Desde</Label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="w-40" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Hasta</Label>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="w-40" />
            </div>

            {hasFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="w-3 h-3 mr-1" /> Limpiar
              </Button>
            )}

            <Button onClick={handleExport} disabled={!data || isLoading} className="ml-auto">
              <Download className="w-4 h-4 mr-2" /> Exportar a Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {!obraId && (
        <Card className="card-industrial">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Seleccioná una obra para ver su reporte integral</p>
          </CardContent>
        </Card>
      )}

      {obraId && (isLoading || isFetching) && !data && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {data && (
        <>
          {/* Header obra */}
          <Card className="card-industrial">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-primary" />
                    {data.obra?.nombre}
                  </h2>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                    {data.obra?.numero && <span>N° {data.obra.numero}</span>}
                    {data.obra?.cliente && <span>· {data.obra.cliente}</span>}
                    {data.obra?.ubicacion && <span>· {data.obra.ubicacion}</span>}
                    {data.obra?.estado && <Badge variant="outline">{data.obra.estado}</Badge>}
                    {data.esCantera && <Badge className="bg-primary text-primary-foreground">Cantera</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="card-industrial">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">
                  {data.esCantera ? "Ingresos (Remitos)" : "Cotizado"}
                </p>
                <p className="text-2xl font-bold text-success">
                  {fmt$(data.esCantera ? data.totales.ingresosRemitos : data.cotizado)}
                </p>
                <DollarSign className="w-5 h-5 text-success mt-2" />
              </CardContent>
            </Card>
            <Card className="card-industrial">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Total Gastos</p>
                <p className="text-2xl font-bold text-destructive">{fmt$(data.totales.gastosTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.esCantera ? "Personal + Comb + OC + Otros" : "Combustible + OC + Otros"}
                </p>
              </CardContent>
            </Card>
            <Card className="card-industrial">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p
                  className={`text-2xl font-bold ${
                    data.totales.balance >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {fmt$(data.totales.balance)}
                </p>
                {data.totales.balance >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-success mt-2" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-destructive mt-2" />
                )}
              </CardContent>
            </Card>
            <Card className="card-industrial">
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground">
                  {data.esCantera ? "Margen" : "Rentabilidad"}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    data.totales.rentabilidad >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {fmtN(data.totales.rentabilidad, 1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Personal */}
          <Section
            title="Personal — Partes Diarios"
            icon={<Users className="w-4 h-4 text-primary" />}
            total={
              <span>
                {data.personal.length} personas · {data.totales.personalDias} días · {fmtN(data.totales.personalHoras)} hs
                {data.esCantera && <> · {fmt$(data.totales.personalCosto)}</>}
              </span>
            }
          >
            {data.personal.length === 0 ? (
              <EmptyRow />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-2">Empleado</th>
                      <th className="text-left py-2 px-2">Rol</th>
                      <th className="text-right py-2 px-2">Días</th>
                      <th className="text-right py-2 px-2">Horas</th>
                      <th className="text-right py-2 px-2">Viajes</th>
                      <th className="text-right py-2 px-2">Ausencias</th>
                      {data.esCantera && <th className="text-right py-2 px-2">Costo estimado</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.personal.map((p) => (
                      <tr key={p.personal_id} className="border-b border-border/40 hover:bg-muted/30">
                        <td className="py-2 px-2 font-medium">{p.nombre}</td>
                        <td className="py-2 px-2 text-muted-foreground">{p.rol || "-"}</td>
                        <td className="py-2 px-2 text-right font-mono">{p.dias}</td>
                        <td className="py-2 px-2 text-right font-mono">{fmtN(p.horas)}</td>
                        <td className="py-2 px-2 text-right font-mono">{p.viajes}</td>
                        <td className="py-2 px-2 text-right font-mono">{p.ausencias}</td>
                        {data.esCantera && (
                          <td className="py-2 px-2 text-right font-mono">{fmt$(p.costoEstimado)}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/20 font-bold">
                      <td className="py-2 px-2" colSpan={2}>TOTAL</td>
                      <td className="py-2 px-2 text-right font-mono">{data.totales.personalDias}</td>
                      <td className="py-2 px-2 text-right font-mono">{fmtN(data.totales.personalHoras)}</td>
                      <td className="py-2 px-2 text-right font-mono">{data.personal.reduce((s, p) => s + p.viajes, 0)}</td>
                      <td className="py-2 px-2 text-right font-mono">{data.personal.reduce((s, p) => s + p.ausencias, 0)}</td>
                      {data.esCantera && (
                        <td className="py-2 px-2 text-right font-mono">{fmt$(data.totales.personalCosto)}</td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Section>

          {/* Horas Máquina */}
          <Section
            title="Horas Máquina"
            icon={<Clock className="w-4 h-4 text-primary" />}
            total={<span>{fmtN(data.totales.horasMaquinaTotal)} hs totales</span>}
          >
            {data.horasMaquina.length === 0 ? (
              <EmptyRow />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-2">Código</th>
                      <th className="text-left py-2 px-2">Nombre</th>
                      <th className="text-left py-2 px-2">Patente</th>
                      <th className="text-left py-2 px-2">Tipo</th>
                      <th className="text-right py-2 px-2">Días</th>
                      <th className="text-right py-2 px-2">Horas</th>
                      <th className="text-right py-2 px-2">Operadores</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.horasMaquina.map((m) => (
                      <tr key={m.maquinaria_id} className="border-b border-border/40 hover:bg-muted/30">
                        <td className="py-2 px-2 font-mono">{m.codigo || "-"}</td>
                        <td className="py-2 px-2">{m.nombre || "-"}</td>
                        <td className="py-2 px-2 font-mono text-xs">{m.patente || "-"}</td>
                        <td className="py-2 px-2 text-muted-foreground">{m.tipo || "-"}</td>
                        <td className="py-2 px-2 text-right font-mono">{m.dias}</td>
                        <td className="py-2 px-2 text-right font-mono">{fmtN(m.horas)}</td>
                        <td className="py-2 px-2 text-right font-mono">{m.operadores}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/20 font-bold">
                      <td className="py-2 px-2" colSpan={4}>TOTAL</td>
                      <td className="py-2 px-2 text-right font-mono">{data.horasMaquina.reduce((s, m) => s + m.dias, 0)}</td>
                      <td className="py-2 px-2 text-right font-mono">{fmtN(data.totales.horasMaquinaTotal)}</td>
                      <td className="py-2 px-2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Section>

          {/* Maquinarias */}
          <Section
            title="Maquinarias Utilizadas"
            icon={<Wrench className="w-4 h-4 text-primary" />}
            total={<span>{data.maquinarias.length} máquinas</span>}
          >
            {data.maquinarias.length === 0 ? (
              <EmptyRow />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-2">Código</th>
                      <th className="text-left py-2 px-2">Nombre</th>
                      <th className="text-left py-2 px-2">Patente</th>
                      <th className="text-left py-2 px-2">Tipo</th>
                      <th className="text-right py-2 px-2">Horas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.maquinarias.map((m) => (
                      <tr key={m.maquinaria_id} className="border-b border-border/40 hover:bg-muted/30">
                        <td className="py-2 px-2 font-mono">{m.codigo || "-"}</td>
                        <td className="py-2 px-2">{m.nombre || "-"}</td>
                        <td className="py-2 px-2 font-mono text-xs">{m.patente || "-"}</td>
                        <td className="py-2 px-2 text-muted-foreground">{m.tipo || "-"}</td>
                        <td className="py-2 px-2 text-right font-mono">{fmtN(m.horas)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Combustible */}
          <Section
            title="Gastos de Combustible"
            icon={<Fuel className="w-4 h-4 text-primary" />}
            total={
              <span>
                {fmtN(data.totales.combustibleLitros)} L · {fmt$(data.totales.combustibleCosto)}
              </span>
            }
          >
            {data.combustible.length === 0 ? (
              <EmptyRow />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-2">Código</th>
                      <th className="text-left py-2 px-2">Maquinaria</th>
                      <th className="text-left py-2 px-2">Patente</th>
                      <th className="text-right py-2 px-2">Litros</th>
                      <th className="text-right py-2 px-2">Costo</th>
                      <th className="text-right py-2 px-2">Cargas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.combustible.map((c, i) => (
                      <tr key={c.maquinaria_id || i} className="border-b border-border/40 hover:bg-muted/30">
                        <td className="py-2 px-2 font-mono">{c.codigo || "-"}</td>
                        <td className="py-2 px-2">{c.nombre || "-"}</td>
                        <td className="py-2 px-2 font-mono text-xs">{c.patente || "-"}</td>
                        <td className="py-2 px-2 text-right font-mono">{fmtN(c.litros)}</td>
                        <td className="py-2 px-2 text-right font-mono">{fmt$(c.costo)}</td>
                        <td className="py-2 px-2 text-right font-mono">{c.cargas}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/20 font-bold">
                      <td className="py-2 px-2" colSpan={3}>TOTAL</td>
                      <td className="py-2 px-2 text-right font-mono">{fmtN(data.totales.combustibleLitros)}</td>
                      <td className="py-2 px-2 text-right font-mono">{fmt$(data.totales.combustibleCosto)}</td>
                      <td className="py-2 px-2 text-right font-mono">
                        {data.combustible.reduce((s, c) => s + c.cargas, 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Section>

          {/* Remitos */}
          <Section
            title={data.esCantera ? "Ingresos por Remitos (ventas de material)" : "Remitos"}
            icon={<Truck className="w-4 h-4 text-primary" />}
            total={<span>{fmt$(data.totales.remitosTotal)}</span>}
          >
            {data.remitos.length === 0 ? (
              <EmptyRow />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-2">Tipo Material</th>
                      <th className="text-left py-2 px-2">Material</th>
                      <th className="text-right py-2 px-2">Remitos</th>
                      <th className="text-right py-2 px-2">Viajes</th>
                      <th className="text-right py-2 px-2">Cantidad</th>
                      <th className="text-left py-2 px-2">Unidad</th>
                      <th className="text-right py-2 px-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.remitos.map((r, i) => (
                      <tr key={i} className="border-b border-border/40 hover:bg-muted/30">
                        <td className="py-2 px-2">{r.tipo}</td>
                        <td className="py-2 px-2 text-muted-foreground">{r.material}</td>
                        <td className="py-2 px-2 text-right font-mono">{r.remitos}</td>
                        <td className="py-2 px-2 text-right font-mono">{r.viajes}</td>
                        <td className="py-2 px-2 text-right font-mono">{fmtN(r.cantidad)}</td>
                        <td className="py-2 px-2">{r.unidad}</td>
                        <td className="py-2 px-2 text-right font-mono">{fmt$(r.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/20 font-bold">
                      <td className="py-2 px-2" colSpan={2}>TOTAL</td>
                      <td className="py-2 px-2 text-right font-mono">
                        {data.remitos.reduce((s, r) => s + r.remitos, 0)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">
                        {data.remitos.reduce((s, r) => s + r.viajes, 0)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">
                        {fmtN(data.remitos.reduce((s, r) => s + r.cantidad, 0))}
                      </td>
                      <td></td>
                      <td className="py-2 px-2 text-right font-mono">{fmt$(data.totales.remitosTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Section>

          {/* Órdenes de Compra */}
          <Section
            title="Órdenes de Compra"
            icon={<ShoppingCart className="w-4 h-4 text-primary" />}
            total={<span>{fmt$(data.totales.ordenesCompraTotal)}</span>}
          >
            {data.ordenesCompra.length === 0 ? (
              <EmptyRow />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-2">Número</th>
                      <th className="text-left py-2 px-2">Fecha</th>
                      <th className="text-left py-2 px-2">Proveedor</th>
                      <th className="text-left py-2 px-2">Descripción</th>
                      <th className="text-left py-2 px-2">Estado</th>
                      <th className="text-right py-2 px-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ordenesCompra.map((o) => (
                      <tr key={o.id} className="border-b border-border/40 hover:bg-muted/30">
                        <td className="py-2 px-2 font-mono">{o.numero}</td>
                        <td className="py-2 px-2 font-mono text-xs">
                          {o.fecha ? new Date(o.fecha).toLocaleDateString("es-AR") : "-"}
                        </td>
                        <td className="py-2 px-2">{o.proveedor}</td>
                        <td className="py-2 px-2 text-muted-foreground max-w-xs truncate" title={o.descripcion}>
                          {o.descripcion}
                        </td>
                        <td className="py-2 px-2">
                          <Badge variant="outline" className="text-xs">
                            {o.estado}
                          </Badge>
                        </td>
                        <td className="py-2 px-2 text-right font-mono">{fmt$(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/20 font-bold">
                      <td className="py-2 px-2" colSpan={5}>TOTAL</td>
                      <td className="py-2 px-2 text-right font-mono">{fmt$(data.totales.ordenesCompraTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Section>

          {/* Otros Gastos */}
          <Section
            title="Gastos Generales"
            icon={<Receipt className="w-4 h-4 text-primary" />}
            total={<span>{fmt$(data.totales.otrosGastosTotal)}</span>}
          >
            {data.otrosGastos.length === 0 ? (
              <EmptyRow />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-2">Categoría</th>
                      <th className="text-left py-2 px-2">Sector</th>
                      <th className="text-right py-2 px-2">Ítems</th>
                      <th className="text-right py-2 px-2">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.otrosGastos.map((g, i) => (
                      <tr key={i} className="border-b border-border/40 hover:bg-muted/30">
                        <td className="py-2 px-2">{g.categoria}</td>
                        <td className="py-2 px-2 text-muted-foreground">{g.sector || "-"}</td>
                        <td className="py-2 px-2 text-right font-mono">{g.items}</td>
                        <td className="py-2 px-2 text-right font-mono">{fmt$(g.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/20 font-bold">
                      <td className="py-2 px-2" colSpan={2}>TOTAL</td>
                      <td className="py-2 px-2 text-right font-mono">
                        {data.otrosGastos.reduce((s, g) => s + g.items, 0)}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">{fmt$(data.totales.otrosGastosTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Section>

          {/* Resumen Final */}
          <Card className="card-industrial border-primary/40">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Resumen Final
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody>
                  {data.esCantera && (
                    <tr className="border-b">
                      <td className="py-2 px-2">Personal (costo estimado)</td>
                      <td className="py-2 px-2 text-right font-mono">{fmt$(data.totales.personalCosto)}</td>
                    </tr>
                  )}
                  <tr className="border-b">
                    <td className="py-2 px-2">Combustible</td>
                    <td className="py-2 px-2 text-right font-mono">{fmt$(data.totales.combustibleCosto)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2">Órdenes de Compra</td>
                    <td className="py-2 px-2 text-right font-mono">{fmt$(data.totales.ordenesCompraTotal)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 px-2">Gastos Generales</td>
                    <td className="py-2 px-2 text-right font-mono">{fmt$(data.totales.otrosGastosTotal)}</td>
                  </tr>
                  <tr className="border-b-2 bg-muted/30 font-bold">
                    <td className="py-2 px-2">TOTAL GASTOS</td>
                    <td className="py-2 px-2 text-right font-mono text-destructive">{fmt$(data.totales.gastosTotal)}</td>
                  </tr>
                  {data.esCantera ? (
                    <tr className="border-b">
                      <td className="py-2 px-2">Ingresos por Remitos</td>
                      <td className="py-2 px-2 text-right font-mono text-success">{fmt$(data.totales.ingresosRemitos)}</td>
                    </tr>
                  ) : (
                    <>
                      <tr className="border-b">
                        <td className="py-2 px-2">Remitos facturados</td>
                        <td className="py-2 px-2 text-right font-mono">{fmt$(data.totales.remitosTotal)}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 px-2">Cotizado (aprobado)</td>
                        <td className="py-2 px-2 text-right font-mono text-success">{fmt$(data.cotizado)}</td>
                      </tr>
                    </>
                  )}
                  <tr className="font-bold text-base">
                    <td className="py-3 px-2">BALANCE</td>
                    <td
                      className={`py-3 px-2 text-right font-mono ${
                        data.totales.balance >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {fmt$(data.totales.balance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

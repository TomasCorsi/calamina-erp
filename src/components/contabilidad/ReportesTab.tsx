import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIvaMes, useContabComprobantes, type CbteTipo } from "@/hooks/useContabilidad";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n || 0));
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const toCSV = (rows: any[][]) =>
  rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");

const download = (filename: string, content: string) => {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
};

export function ReportesTab() {
  return (
    <Tabs defaultValue="iva" className="w-full">
      <TabsList>
        <TabsTrigger value="iva">Libro IVA</TabsTrigger>
        <TabsTrigger value="obras">Rentabilidad por Obra</TabsTrigger>
        <TabsTrigger value="maquinas">Costo por Máquina</TabsTrigger>
      </TabsList>
      <TabsContent value="iva" className="mt-4"><IvaReport /></TabsContent>
      <TabsContent value="obras" className="mt-4"><RentabilidadObra /></TabsContent>
      <TabsContent value="maquinas" className="mt-4"><CostoMaquina /></TabsContent>
    </Tabs>
  );
}

function IvaReport() {
  const now = new Date();
  const [anio, setAnio] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [tipo, setTipo] = useState<"ventas" | "compras">("ventas");
  const { data = [] } = useIvaMes(anio, mes, tipo === "ventas");

  const totales = useMemo(() => {
    const t = { neto: 0, iva: 0, perc: 0, total: 0 };
    data.forEach((c) => {
      t.neto += +c.neto_21 + +c.neto_105 + +c.neto_27 + +c.neto_0 + +c.exento + +c.no_gravado;
      t.iva += +c.iva_21 + +c.iva_105 + +c.iva_27;
      t.perc += +c.perc_iva + +c.perc_iibb + +c.perc_otras;
      t.total += +c.total;
    });
    return t;
  }, [data]);

  const exportar = () => {
    const rows: any[][] = [
      ["Fecha","Tipo","PV","Número","CUIT","Razón social","Neto 21","IVA 21","Neto 10.5","IVA 10.5","Neto 27","IVA 27","Exento","No gravado","Perc.","Total"],
      ...data.map((c) => [
        c.fecha, c.tipo, c.punto_venta, c.numero,
        c.tercero?.cuit ?? "", c.tercero?.razon_social ?? "",
        c.neto_21, c.iva_21, c.neto_105, c.iva_105, c.neto_27, c.iva_27,
        c.exento, c.no_gravado, (+c.perc_iva + +c.perc_iibb + +c.perc_otras), c.total,
      ]),
    ];
    download(`IVA_${tipo}_${anio}_${String(mes).padStart(2,"0")}.csv`, toCSV(rows));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Subdiario IVA</span>
          <Button size="sm" onClick={exportar}><Download className="w-4 h-4 mr-2" />Exportar CSV</Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 mb-4 items-end">
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ventas">Ventas</SelectItem>
                <SelectItem value="compras">Compras</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mes</Label>
            <Select value={String(mes)} onValueChange={(v) => setMes(+v)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MESES.map((m, i) => <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Año</Label>
            <Input type="number" value={anio} onChange={(e) => setAnio(+e.target.value)} className="w-28" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-2 py-1">Fecha</th>
                <th className="px-2 py-1">Cbte</th>
                <th className="px-2 py-1">CUIT</th>
                <th className="px-2 py-1">Razón Social</th>
                <th className="px-2 py-1 text-right">Neto</th>
                <th className="px-2 py-1 text-right">IVA</th>
                <th className="px-2 py-1 text-right">Perc.</th>
                <th className="px-2 py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => {
                const neto = +c.neto_21 + +c.neto_105 + +c.neto_27 + +c.neto_0 + +c.exento + +c.no_gravado;
                const iva = +c.iva_21 + +c.iva_105 + +c.iva_27;
                const perc = +c.perc_iva + +c.perc_iibb + +c.perc_otras;
                return (
                  <tr key={c.id} className="border-t">
                    <td className="px-2 py-1">{c.fecha}</td>
                    <td className="px-2 py-1 font-mono">{c.tipo} {String(c.punto_venta).padStart(5,"0")}-{String(c.numero).padStart(8,"0")}</td>
                    <td className="px-2 py-1">{c.tercero?.cuit ?? ""}</td>
                    <td className="px-2 py-1">{c.tercero?.razon_social ?? ""}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmt(neto)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmt(iva)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmt(perc)}</td>
                    <td className="px-2 py-1 text-right tabular-nums font-semibold">{fmt(c.total)}</td>
                  </tr>
                );
              })}
              <tr className="border-t font-bold bg-muted/30">
                <td colSpan={4} className="px-2 py-2 text-right">Totales</td>
                <td className="px-2 py-2 text-right tabular-nums">{fmt(totales.neto)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{fmt(totales.iva)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{fmt(totales.perc)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{fmt(totales.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function RentabilidadObra() {
  const { obras = [] } = useObras();
  const { data: ventas = [] } = useContabComprobantes({ esVenta: true });
  const { data: compras = [] } = useContabComprobantes({ esVenta: false });

  const rows = useMemo(() => {
    const acc: Record<string, { obra: string; ventas: number; compras: number }> = {};
    obras.forEach((o: any) => { acc[o.id] = { obra: o.nombre, ventas: 0, compras: 0 }; });
    const sum = (cbtes: any[], esVenta: boolean) => {
      cbtes.filter((c) => c.estado !== "anulado").forEach((c) => {
        const neto = +c.neto_21 + +c.neto_105 + +c.neto_27 + +c.neto_0 + +c.exento + +c.no_gravado;
        if (c.obra_id && acc[c.obra_id]) {
          if (esVenta) acc[c.obra_id].ventas += neto;
          else acc[c.obra_id].compras += neto;
        }
      });
    };
    sum(ventas, true);
    sum(compras, false);
    return Object.values(acc).filter((r) => r.ventas > 0 || r.compras > 0);
  }, [obras, ventas, compras]);

  return (
    <Card>
      <CardHeader><CardTitle>Rentabilidad por Obra</CardTitle></CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-2 py-1">Obra</th>
              <th className="px-2 py-1 text-right">Ventas (neto)</th>
              <th className="px-2 py-1 text-right">Compras (neto)</th>
              <th className="px-2 py-1 text-right">Margen</th>
              <th className="px-2 py-1 text-right">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">Sin datos contables imputados aún</td></tr>}
            {rows.map((r) => {
              const m = r.ventas - r.compras;
              const p = r.ventas > 0 ? (m / r.ventas) * 100 : 0;
              return (
                <tr key={r.obra} className="border-t">
                  <td className="px-2 py-1">{r.obra}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{fmt(r.ventas)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{fmt(r.compras)}</td>
                  <td className={`px-2 py-1 text-right tabular-nums font-semibold ${m >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(m)}</td>
                  <td className="px-2 py-1 text-right tabular-nums">{p.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function CostoMaquina() {
  const { maquinarias = [] } = useMaquinarias();
  const { data: compras = [] } = useContabComprobantes({ esVenta: false });

  const rows = useMemo(() => {
    const acc: Record<string, { nombre: string; total: number }> = {};
    maquinarias.forEach((m: any) => { acc[m.id] = { nombre: m.codigo || m.nombre, total: 0 }; });
    compras.filter((c) => c.estado !== "anulado").forEach((c) => {
      const neto = +c.neto_21 + +c.neto_105 + +c.neto_27 + +c.neto_0 + +c.exento + +c.no_gravado;
      if (c.maquinaria_id && acc[c.maquinaria_id]) acc[c.maquinaria_id].total += neto;
    });
    return Object.values(acc).filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
  }, [maquinarias, compras]);

  return (
    <Card>
      <CardHeader><CardTitle>Costo por Máquina</CardTitle></CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-2 py-1">Máquina</th>
              <th className="px-2 py-1 text-right">Compras imputadas (neto)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={2} className="px-2 py-6 text-center text-muted-foreground">Sin datos imputados aún</td></tr>}
            {rows.map((r) => (
              <tr key={r.nombre} className="border-t">
                <td className="px-2 py-1">{r.nombre}</td>
                <td className="px-2 py-1 text-right tabular-nums font-semibold">{fmt(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

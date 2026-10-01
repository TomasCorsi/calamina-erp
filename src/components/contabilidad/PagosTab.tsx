import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useContabPagos, useSavePago, useDeletePago, useContabTerceros, useContabPlanCuentas, useContabComprobantes,
  type PagoMedio,
} from "@/hooks/useContabilidad";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";

const MEDIOS: PagoMedio[] = ["efectivo", "transferencia", "cheque", "tarjeta", "deposito", "otro"];
const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n || 0));
const fmtDate = (s: string) => { const [y,m,d]=s.split("-"); return `${d}/${m}/${y}`; };

export function PagosTab() {
  const [tab, setTab] = useState<"cobros" | "pagos">("cobros");
  const esCobro = tab === "cobros";
  const { data = [] } = useContabPagos({ esCobro });
  const del = useDeletePago();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="cobros">Cobranzas</TabsTrigger>
            <TabsTrigger value="pagos">Pagos</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo {esCobro ? "cobro" : "pago"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Tercero</th>
                  <th className="px-3 py-2">Comprobante</th>
                  <th className="px-3 py-2">Medio</th>
                  <th className="px-3 py-2">Referencia</th>
                  <th className="px-3 py-2 text-right">Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Sin movimientos</td></tr>
                )}
                {data.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2">{fmtDate(p.fecha)}</td>
                    <td className="px-3 py-2">{p.tercero?.razon_social ?? "—"}</td>
                    <td className="px-3 py-2 text-xs font-mono">
                      {p.comprobante ? `${p.comprobante.tipo} ${String(p.comprobante.punto_venta).padStart(5,"0")}-${String(p.comprobante.numero).padStart(8,"0")}` : "—"}
                    </td>
                    <td className="px-3 py-2 capitalize">{p.medio}</td>
                    <td className="px-3 py-2 text-xs">{p.referencia ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(p.monto)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(p.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {open && <PagoDialog open={open} onClose={() => setOpen(false)} esCobro={esCobro} />}
    </div>
  );
}

function PagoDialog({ open, onClose, esCobro }: { open: boolean; onClose: () => void; esCobro: boolean }) {
  const { data: terceros = [] } = useContabTerceros();
  const { data: cuentas = [] } = useContabPlanCuentas();
  const { obras = [] } = useObras();
  const { maquinarias: maquinas = [] } = useMaquinarias();
  const save = useSavePago();

  const [tercero, setTercero] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [medio, setMedio] = useState<PagoMedio>("transferencia");
  const [monto, setMonto] = useState(0);
  const [cuenta, setCuenta] = useState("");
  const [referencia, setReferencia] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [obra, setObra] = useState("");
  const [maq, setMaq] = useState("");
  const [cbteId, setCbteId] = useState("");

  const { data: comprobantes = [] } = useContabComprobantes({ esVenta: esCobro });

  const cbtesDisponibles = useMemo(
    () => comprobantes.filter((c) => c.tercero_id === tercero && (c.estado === "confirmado" || c.estado === "parcial")),
    [comprobantes, tercero]
  );

  const cuentasCaja = useMemo(() => cuentas.filter((c) => c.imputable && (c.codigo.startsWith("1.1.1"))), [cuentas]);

  const handleSave = async () => {
    if (!tercero || monto <= 0) return;
    await save.mutateAsync({
      es_cobro: esCobro,
      fecha,
      tercero_id: tercero,
      medio,
      monto,
      cuenta_id: cuenta || null,
      referencia: referencia || null,
      observaciones: observaciones || null,
      obra_id: obra || null,
      maquinaria_id: maq || null,
      comprobante_id: cbteId || null,
    } as any);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nuevo {esCobro ? "cobro" : "pago"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div>
            <Label>Medio de pago</Label>
            <Select value={medio} onValueChange={(v) => setMedio(v as PagoMedio)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MEDIOS.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>{esCobro ? "Cliente" : "Proveedor"}</Label>
            <Select value={tercero} onValueChange={setTercero}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {terceros.map((t) => <SelectItem key={t.id} value={t.id}>{t.razon_social}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Comprobante asociado (opcional)</Label>
            <Select value={cbteId || "_"} onValueChange={(v) => setCbteId(v === "_" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">— sin asociar —</SelectItem>
                {cbtesDisponibles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.tipo} {String(c.punto_venta).padStart(5,"0")}-{String(c.numero).padStart(8,"0")} · {fmt(c.total)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Monto</Label>
            <Input type="number" value={monto} onChange={(e) => setMonto(+e.target.value)} />
          </div>
          <div>
            <Label>Cuenta (caja/banco)</Label>
            <Select value={cuenta || "_"} onValueChange={(v) => setCuenta(v === "_" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Auto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Automática</SelectItem>
                {cuentasCaja.map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo} · {c.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Obra</Label>
            <Select value={obra || "_"} onValueChange={(v) => setObra(v === "_" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">—</SelectItem>
                {obras.map((o) => <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Máquina</Label>
            <Select value={maq || "_"} onValueChange={(v) => setMaq(v === "_" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_">—</SelectItem>
                {maquinas.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.codigo || m.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Referencia</Label>
            <Input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Nº cheque, transferencia…" />
          </div>
          <div className="col-span-2">
            <Label>Observaciones</Label>
            <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={save.isPending || !tercero || monto <= 0}>Registrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

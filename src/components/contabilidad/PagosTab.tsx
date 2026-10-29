import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useContabPagos, useSavePago, useDeletePago, useContabTerceros, useAccountingOpenItems, useTreasuryBalances, type PagoMedio } from "@/hooks/useContabilidad";

const MEDIOS: PagoMedio[] = ["efectivo", "transferencia", "cheque", "tarjeta", "deposito", "otro"];
const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n || 0));
const fmtDate = (s: string) => { const [y,m,d]=s.split("-"); return `${d}/${m}/${y}`; };

export function PagosTab({ esCobro }: { esCobro: boolean }) {
  const { data = [] } = useContabPagos({ esCobro });
  const del = useDeletePago();
  const [open, setOpen] = useState(false);
  return <div className="space-y-3">
    <div className="flex justify-end"><Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuevo {esCobro ? "cobro" : "pago"}</Button></div>
    <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50 text-left"><tr><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Tercero</th><th className="px-3 py-2">Medio</th><th className="px-3 py-2">Referencia</th><th className="px-3 py-2 text-right">Monto</th><th /></tr></thead><tbody>
      {data.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Sin movimientos</td></tr>}
      {data.map((p) => <tr key={p.id} className="border-t"><td className="px-3 py-2">{fmtDate(p.fecha)}</td><td className="px-3 py-2">{p.tercero?.razon_social ?? "—"}</td><td className="px-3 py-2 capitalize">{p.medio}</td><td className="px-3 py-2 text-xs">{p.referencia ?? "—"}</td><td className="px-3 py-2 text-right tabular-nums">{fmt(p.monto)}</td><td className="px-3 py-2 text-right"><Button size="icon" variant="ghost" onClick={() => del.mutate(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></td></tr>)}
    </tbody></table></div></CardContent></Card>
    {open && <SettlementDialog open={open} onClose={() => setOpen(false)} esCobro={esCobro} />}
  </div>;
}

function SettlementDialog({ open, onClose, esCobro }: { open: boolean; onClose: () => void; esCobro: boolean }) {
  const { data: terceros = [] } = useContabTerceros();
  const { data: treasury = [] } = useTreasuryBalances();
  const save = useSavePago();
  const [tercero, setTercero] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [medio, setMedio] = useState<PagoMedio>("transferencia");
  const [monto, setMonto] = useState(0);
  const [treasuryId, setTreasuryId] = useState("");
  const [referencia, setReferencia] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const { data: openItems = [] } = useAccountingOpenItems(esCobro ? "receivable" : "payable", tercero || null);
  const partyOptions = useMemo(() => terceros.filter((t) => esCobro ? t.tipo === "cliente" : t.tipo === "proveedor"), [terceros, esCobro]);
  const allocated = Object.values(allocations).reduce((sum, value) => sum + (+value || 0), 0);
  const handleSave = async () => {
    if (!tercero || !treasuryId || monto <= 0 || allocated > monto) return;
    await save.mutateAsync({ es_cobro: esCobro, fecha, tercero_id: tercero, medio, monto, treasury_account_id: treasuryId, referencia: referencia || null, observaciones: observaciones || null, allocations: Object.entries(allocations).filter(([, amount]) => amount > 0).map(([document_id, amount]) => ({ document_id, amount })) } as any);
    onClose();
  };
  return <Dialog open={open} onOpenChange={(v) => !v && onClose()}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Nuevo {esCobro ? "cobro" : "pago"}</DialogTitle></DialogHeader><div className="grid grid-cols-2 gap-3">
    <div><Label>Fecha</Label><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
    <div><Label>Medio</Label><Select value={medio} onValueChange={(v) => setMedio(v as PagoMedio)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{MEDIOS.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}</SelectContent></Select></div>
    <div className="col-span-2"><Label>{esCobro ? "Cliente" : "Proveedor"}</Label><Select value={tercero} onValueChange={(v) => { setTercero(v); setAllocations({}); }}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{partyOptions.map((t) => <SelectItem key={t.id} value={t.id}>{t.razon_social}</SelectItem>)}</SelectContent></Select></div>
    <div><Label>Monto</Label><Input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(+e.target.value)} /></div>
    <div><Label>Caja / Banco</Label><Select value={treasuryId} onValueChange={setTreasuryId}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{treasury.filter((a) => a.is_active).map((a) => <SelectItem key={a.account_id} value={a.account_id}>{a.name} · {fmt(a.balance)}</SelectItem>)}</SelectContent></Select></div>
    <div className="col-span-2"><Label>Aplicar a documentos</Label><div className="border rounded-md max-h-56 overflow-y-auto divide-y">{!tercero && <p className="p-3 text-sm text-muted-foreground">Seleccione un tercero.</p>}{tercero && openItems.filter((d) => d.document_kind === "charge").length === 0 && <p className="p-3 text-sm text-muted-foreground">No hay documentos pendientes.</p>}{openItems.filter((d) => d.document_kind === "charge").map((d) => <div key={d.document_id} className="grid grid-cols-[1fr_140px] gap-3 p-3 items-center"><div><p className="text-sm font-medium">{d.source_type} · {d.issue_date}</p><p className="text-xs text-muted-foreground">Vence {d.due_date ?? "—"} · Saldo {fmt(d.balance)}</p></div><Input type="number" min="0" max={d.balance} step="0.01" value={allocations[d.document_id] ?? 0} onChange={(e) => setAllocations((old) => ({ ...old, [d.document_id]: Math.min(+e.target.value || 0, +d.balance) }))} /></div>)}</div><p className="text-xs text-muted-foreground mt-1">Aplicado: {fmt(allocated)} · Sin aplicar: {fmt(Math.max(0, monto - allocated))}</p></div>
    <div className="col-span-2"><Label>Referencia</Label><Input value={referencia} onChange={(e) => setReferencia(e.target.value)} /></div>
    <div className="col-span-2"><Label>Observaciones</Label><Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} /></div>
  </div><DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={handleSave} disabled={save.isPending || !tercero || !treasuryId || monto <= 0 || allocated > monto}>Registrar</Button></DialogFooter></DialogContent></Dialog>;
}

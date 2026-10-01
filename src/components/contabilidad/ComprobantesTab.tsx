import { useMemo, useState } from "react";
import { Plus, FileText, Trash2, CheckCircle2, Ban, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useContabComprobantes, useDeleteComprobante, useConfirmarComprobante, useAnularComprobante,
  type ContabComprobante, type CbteEstado, type CbteTipo,
} from "@/hooks/useContabilidad";
import { ComprobanteDialog } from "./ComprobanteDialog";

const TIPO_LABEL: Record<CbteTipo, string> = {
  FA_A: "Factura A", FA_B: "Factura B", FA_C: "Factura C",
  NC_A: "N. Crédito A", NC_B: "N. Crédito B", NC_C: "N. Crédito C",
  ND_A: "N. Débito A", ND_B: "N. Débito B", ND_C: "N. Débito C",
  RECIBO: "Recibo", TICKET: "Ticket",
  FA_CPA_A: "Factura Compra A", FA_CPA_B: "Factura Compra B", FA_CPA_C: "Factura Compra C",
  NC_CPA: "NC Compra", ND_CPA: "ND Compra", OTRO: "Otro",
};

const estadoBadge = (e: CbteEstado) => {
  const map: Record<CbteEstado, { label: string; cls: string }> = {
    borrador: { label: "Borrador", cls: "bg-muted text-foreground" },
    confirmado: { label: "Confirmado", cls: "bg-blue-600 text-white" },
    parcial: { label: "Parcial", cls: "bg-amber-600 text-white" },
    pagado: { label: "Pagado", cls: "bg-green-600 text-white" },
    anulado: { label: "Anulado", cls: "bg-destructive text-destructive-foreground" },
  };
  const v = map[e];
  return <Badge className={v.cls}>{v.label}</Badge>;
};

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n || 0));
const fmtDate = (s: string) => {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

export function ComprobantesTab({ esVenta }: { esVenta: boolean }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);

  const { data = [], isLoading } = useContabComprobantes({ esVenta });
  const del = useDeleteComprobante();
  const confirmar = useConfirmarComprobante();
  const anular = useAnularComprobante();

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return data;
    return data.filter((c) =>
      [c.tercero?.razon_social, c.numero?.toString(), c.tercero?.cuit, TIPO_LABEL[c.tipo]]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(s))
    );
  }, [data, search]);

  const handleEdit = (c: ContabComprobante) => {
    setEditId(c.id);
    setOpen(true);
  };
  const handleNew = () => {
    setEditId(null);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Input
          placeholder="Buscar por tercero, número, CUIT…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleNew}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo {esVenta ? "comprobante de venta" : "comprobante de compra"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Nº</th>
                  <th className="px-3 py-2">Tercero</th>
                  <th className="px-3 py-2">Obra</th>
                  <th className="px-3 py-2">Máquina</th>
                  <th className="px-3 py-2 text-right">Neto</th>
                  <th className="px-3 py-2 text-right">IVA</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">Cargando…</td></tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">
                    <FileText className="inline w-4 h-4 mr-2" />Sin comprobantes
                  </td></tr>
                )}
                {filtered.map((c) => {
                  const neto = +c.neto_21 + +c.neto_105 + +c.neto_27 + +c.neto_0 + +c.exento + +c.no_gravado;
                  const iva = +c.iva_21 + +c.iva_105 + +c.iva_27;
                  return (
                    <tr key={c.id} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 whitespace-nowrap">{fmtDate(c.fecha)}</td>
                      <td className="px-3 py-2">{TIPO_LABEL[c.tipo]}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono">
                        {String(c.punto_venta).padStart(5, "0")}-{String(c.numero).padStart(8, "0")}
                      </td>
                      <td className="px-3 py-2">{c.tercero?.razon_social ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">{c.obra?.nombre ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">{c.maquinaria ? (c.maquinaria.codigo || c.maquinaria.nombre) : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(neto)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmt(iva)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmt(c.total)}</td>
                      <td className="px-3 py-2">{estadoBadge(c.estado)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(c)} title="Ver / editar">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        {c.estado === "borrador" && (
                          <Button size="icon" variant="ghost" onClick={() => confirmar.mutate(c.id)} title="Confirmar">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </Button>
                        )}
                        {(c.estado === "confirmado" || c.estado === "parcial") && (
                          <Button size="icon" variant="ghost" onClick={() => anular.mutate(c.id)} title="Anular">
                            <Ban className="w-4 h-4 text-amber-600" />
                          </Button>
                        )}
                        {c.estado === "borrador" && (
                          <Button size="icon" variant="ghost" onClick={() => setDelId(c.id)} title="Eliminar">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {open && (
        <ComprobanteDialog
          open={open}
          onClose={() => { setOpen(false); setEditId(null); }}
          comprobanteId={editId}
          esVenta={esVenta}
        />
      )}

      <AlertDialog open={!!delId} onOpenChange={(v) => !v && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar comprobante</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (delId) { del.mutate(delId); setDelId(null); } }}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

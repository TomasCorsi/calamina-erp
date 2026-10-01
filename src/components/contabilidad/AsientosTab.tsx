import { useState } from "react";
import { ChevronRight, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useContabAsientos, useContabAsientoLineas } from "@/hooks/useContabilidad";

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n || 0));
const fmtDate = (s: string) => { const [y,m,d]=s.split("-"); return `${d}/${m}/${y}`; };

export function AsientosTab() {
  const { data = [] } = useContabAsientos();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 w-16">N°</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Descripción</th>
                  <th className="px-3 py-2">Origen</th>
                  <th className="px-3 py-2 text-right">Debe</th>
                  <th className="px-3 py-2 text-right">Haber</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                    <BookOpen className="inline w-4 h-4 mr-2" />No hay asientos
                  </td></tr>
                )}
                {data.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono">{a.numero}</td>
                    <td className="px-3 py-2">{fmtDate(a.fecha)}</td>
                    <td className="px-3 py-2">{a.descripcion}</td>
                    <td className="px-3 py-2 text-xs">{a.origen ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(a.total_debe)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmt(a.total_haber)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="icon" variant="ghost" onClick={() => setOpenId(a.id)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {openId && <AsientoDetalle id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function AsientoDetalle({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: lineas = [] } = useContabAsientoLineas(id);
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Detalle del asiento</DialogTitle></DialogHeader>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-2 py-1">Cuenta</th>
              <th className="px-2 py-1">Descripción</th>
              <th className="px-2 py-1">Obra</th>
              <th className="px-2 py-1">Máquina</th>
              <th className="px-2 py-1 text-right">Debe</th>
              <th className="px-2 py-1 text-right">Haber</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-2 py-1 text-xs">{l.cuenta ? `${l.cuenta.codigo} · ${l.cuenta.nombre}` : "—"}</td>
                <td className="px-2 py-1">{l.descripcion}</td>
                <td className="px-2 py-1 text-xs">{l.obra?.nombre ?? "—"}</td>
                <td className="px-2 py-1 text-xs">{l.maquinaria ? (l.maquinaria.codigo || l.maquinaria.nombre) : "—"}</td>
                <td className="px-2 py-1 text-right tabular-nums">{l.debe > 0 ? fmt(l.debe) : ""}</td>
                <td className="px-2 py-1 text-right tabular-nums">{l.haber > 0 ? fmt(l.haber) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
}

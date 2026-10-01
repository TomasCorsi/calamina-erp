import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { usePrestamos, useCreatePrestamo, useDeletePrestamo } from "@/hooks/useLiquidaciones";
import { formatDate } from "@/lib/utils";

const formatARS = (n: number | string) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(n || 0));

export function PrestamosTab() {
  const { data: prestamos = [] } = usePrestamos();
  const create = useCreatePrestamo();
  const del = useDeletePrestamo();
  const [open, setOpen] = useState(false);

  const { data: personal = [] } = useQuery({
    queryKey: ["personal-activo-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("personal")
        .select("id, nombre, apellido, legajo")
        .eq("activo", true)
        .order("apellido");
      if (error) throw error;
      return data || [];
    },
  });

  const [form, setForm] = useState({
    personal_id: "",
    fecha: new Date().toISOString().slice(0, 10),
    monto_total: "",
    cantidad_cuotas: "1",
    motivo: "",
  });

  const submit = async () => {
    if (!form.personal_id || !form.monto_total || !form.cantidad_cuotas) return;
    await create.mutateAsync({
      personal_id: form.personal_id,
      fecha: form.fecha,
      monto_total: Number(form.monto_total),
      cantidad_cuotas: Number(form.cantidad_cuotas),
      motivo: form.motivo || undefined,
    });
    setForm({ personal_id: "", fecha: new Date().toISOString().slice(0, 10), monto_total: "", cantidad_cuotas: "1", motivo: "" });
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Préstamos con plan de cuotas. Cada cuota se descuenta automáticamente en la liquidación.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Nuevo préstamo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo préstamo</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Empleado</Label>
                <Select value={form.personal_id} onValueChange={(v) => setForm((f) => ({ ...f, personal_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                  <SelectContent>
                    {personal.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.apellido}, {p.nombre} ({p.legajo || "—"})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Fecha</Label>
                  <Input type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} />
                </div>
                <div>
                  <Label>Monto total</Label>
                  <Input type="number" value={form.monto_total} onChange={(e) => setForm((f) => ({ ...f, monto_total: e.target.value }))} />
                </div>
                <div>
                  <Label>Cuotas</Label>
                  <Input type="number" min="1" value={form.cantidad_cuotas} onChange={(e) => setForm((f) => ({ ...f, cantidad_cuotas: e.target.value }))} />
                </div>
              </div>
              {form.monto_total && form.cantidad_cuotas && (
                <p className="text-xs text-muted-foreground">
                  Cuota: <b>{formatARS(Number(form.monto_total) / Number(form.cantidad_cuotas))}</b>
                </p>
              )}
              <div>
                <Label>Motivo</Label>
                <Input value={form.motivo} onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={submit}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Empleado</TableHead>
              <TableHead className="text-right">Monto total</TableHead>
              <TableHead className="text-right">Cuotas</TableHead>
              <TableHead className="text-right">Cuota</TableHead>
              <TableHead>Pagadas / Restantes</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prestamos.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Sin préstamos registrados.</TableCell></TableRow>
            ) : prestamos.map((p) => {
              const cuotas = p.prestamo_cuotas || [];
              const pagadas = cuotas.filter((c: any) => c.estado === "aplicada").length;
              return (
                <TableRow key={p.id}>
                  <TableCell>{formatDate(p.fecha)}</TableCell>
                  <TableCell>{p.personal?.apellido}, {p.personal?.nombre}</TableCell>
                  <TableCell className="text-right">{formatARS(p.monto_total)}</TableCell>
                  <TableCell className="text-right">{p.cantidad_cuotas}</TableCell>
                  <TableCell className="text-right">{formatARS(p.monto_cuota)}</TableCell>
                  <TableCell className="text-xs">{pagadas} / {p.cantidad_cuotas - pagadas}</TableCell>
                  <TableCell>
                    {p.estado === "activo" && <Badge className="bg-amber-600">Activo</Badge>}
                    {p.estado === "saldado" && <Badge className="bg-green-600">Saldado</Badge>}
                    {p.estado === "cancelado" && <Badge variant="secondary">Cancelado</Badge>}
                  </TableCell>
                  <TableCell>
                    {p.estado === "activo" && pagadas === 0 && (
                      <Button size="icon" variant="ghost" onClick={() => del.mutate(p.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

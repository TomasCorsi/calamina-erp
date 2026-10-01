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
import { useAdelantos, useCreateAdelanto, useDeleteAdelanto } from "@/hooks/useLiquidaciones";
import { formatDate } from "@/lib/utils";

const formatARS = (n: number | string) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(n || 0));

export function AdelantosTab() {
  const { data: adelantos = [] } = useAdelantos();
  const create = useCreateAdelanto();
  const del = useDeleteAdelanto();
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
    monto: "",
    motivo: "",
  });

  const submit = async () => {
    if (!form.personal_id || !form.monto) return;
    await create.mutateAsync({
      personal_id: form.personal_id,
      fecha: form.fecha,
      monto: Number(form.monto),
      motivo: form.motivo || undefined,
    });
    setForm({ personal_id: "", fecha: new Date().toISOString().slice(0, 10), monto: "", motivo: "" });
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Adelantos puntuales que se descuentan en la próxima liquidación del empleado.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Nuevo adelanto</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo adelanto</DialogTitle></DialogHeader>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fecha</Label>
                  <Input type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} />
                </div>
                <div>
                  <Label>Monto</Label>
                  <Input type="number" value={form.monto} onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))} />
                </div>
              </div>
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
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {adelantos.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sin adelantos registrados.</TableCell></TableRow>
            ) : adelantos.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{formatDate(a.fecha)}</TableCell>
                <TableCell>{a.personal?.apellido}, {a.personal?.nombre}</TableCell>
                <TableCell className="text-right font-medium">{formatARS(a.monto)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{a.motivo || "—"}</TableCell>
                <TableCell>
                  {a.estado === "aplicado"
                    ? <Badge className="bg-green-600">Aplicado</Badge>
                    : <Badge variant="secondary">Pendiente</Badge>}
                </TableCell>
                <TableCell>
                  {a.estado === "pendiente" && (
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(a.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

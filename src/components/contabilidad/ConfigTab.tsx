import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Building2, BookOpen, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useContabEmpresa, useSaveContabEmpresa, useContabPlanCuentas, useSaveCuenta, useDeleteCuenta,
  useContabTerceros, useSaveTercero, useDeleteTercero,
  type ContabEmpresa, type CondIva, type CuentaTipo, type ContabTercero, type TerceroTipo,
} from "@/hooks/useContabilidad";

const COND_IVA: { v: CondIva; l: string }[] = [
  { v: "RI", l: "Responsable Inscripto" },
  { v: "MT", l: "Monotributista" },
  { v: "EX", l: "Exento" },
  { v: "CF", l: "Consumidor Final" },
  { v: "NR", l: "No Responsable" },
];

const TIPOS_CUENTA: CuentaTipo[] = ["activo", "pasivo", "patrimonio", "ingreso", "egreso", "resultado"];

export function ConfigTab() {
  return (
    <Tabs defaultValue="empresa" className="w-full">
      <TabsList>
        <TabsTrigger value="empresa"><Building2 className="w-4 h-4 mr-2" />Empresa</TabsTrigger>
        <TabsTrigger value="plan"><BookOpen className="w-4 h-4 mr-2" />Plan de cuentas</TabsTrigger>
        <TabsTrigger value="terceros"><Users className="w-4 h-4 mr-2" />Terceros</TabsTrigger>
      </TabsList>
      <TabsContent value="empresa" className="mt-4"><EmpresaForm /></TabsContent>
      <TabsContent value="plan" className="mt-4"><PlanCuentas /></TabsContent>
      <TabsContent value="terceros" className="mt-4"><Terceros /></TabsContent>
    </Tabs>
  );
}

function EmpresaForm() {
  const { data } = useContabEmpresa();
  const save = useSaveContabEmpresa();
  const [form, setForm] = useState<Partial<ContabEmpresa>>({ condicion_iva: "RI" });
  useEffect(() => { if (data) setForm(data); }, [data]);
  const set = (k: keyof ContabEmpresa, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card>
      <CardHeader><CardTitle>Datos fiscales</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>CUIT *</Label><Input value={form.cuit ?? ""} onChange={(e) => set("cuit", e.target.value)} /></div>
          <div className="col-span-2"><Label>Razón social *</Label><Input value={form.razon_social ?? ""} onChange={(e) => set("razon_social", e.target.value)} /></div>
          <div><Label>Nombre fantasía</Label><Input value={form.nombre_fantasia ?? ""} onChange={(e) => set("nombre_fantasia", e.target.value)} /></div>
          <div>
            <Label>Condición IVA</Label>
            <Select value={form.condicion_iva ?? "RI"} onValueChange={(v) => set("condicion_iva", v as CondIva)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{COND_IVA.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>IIBB</Label><Input value={form.iibb ?? ""} onChange={(e) => set("iibb", e.target.value)} /></div>
          <div><Label>Inicio actividades</Label><Input type="date" value={form.inicio_actividades ?? ""} onChange={(e) => set("inicio_actividades", e.target.value)} /></div>
          <div className="col-span-2"><Label>Domicilio fiscal</Label><Input value={form.domicilio_fiscal ?? ""} onChange={(e) => set("domicilio_fiscal", e.target.value)} /></div>
          <div><Label>Localidad</Label><Input value={form.localidad ?? ""} onChange={(e) => set("localidad", e.target.value)} /></div>
          <div><Label>Provincia</Label><Input value={form.provincia ?? ""} onChange={(e) => set("provincia", e.target.value)} /></div>
          <div><Label>CP</Label><Input value={form.cp ?? ""} onChange={(e) => set("cp", e.target.value)} /></div>
          <div><Label>Teléfono</Label><Input value={form.telefono ?? ""} onChange={(e) => set("telefono", e.target.value)} /></div>
          <div className="col-span-2"><Label>Email</Label><Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
          <div className="col-span-3"><Label>Pie de factura</Label><Textarea value={form.pie_factura ?? ""} onChange={(e) => set("pie_factura", e.target.value)} rows={2} /></div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.cuit || !form.razon_social}>
            {save.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanCuentas() {
  const { data: cuentas = [] } = useContabPlanCuentas();
  const save = useSaveCuenta();
  const del = useDeleteCuenta();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ codigo: "", nombre: "", tipo: "activo" as CuentaTipo, imputable: true, parent_id: null as string | null });
  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    await save.mutateAsync(form as any);
    setOpen(false);
    setForm({ codigo: "", nombre: "", tipo: "activo", imputable: true, parent_id: null });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Plan de cuentas ({cuentas.length})</span>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Nueva cuenta</Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left sticky top-0">
              <tr>
                <th className="px-2 py-1 w-32">Código</th>
                <th className="px-2 py-1">Nombre</th>
                <th className="px-2 py-1">Tipo</th>
                <th className="px-2 py-1">Imputable</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cuentas.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-2 py-1 font-mono">{c.codigo}</td>
                  <td className="px-2 py-1" style={{ paddingLeft: `${(c.codigo.split(".").length - 1) * 12 + 8}px` }}>{c.nombre}</td>
                  <td className="px-2 py-1 capitalize text-xs">{c.tipo}</td>
                  <td className="px-2 py-1 text-xs">{c.imputable ? "Sí" : "—"}</td>
                  <td className="px-2 py-1 text-right">
                    <Button size="icon" variant="ghost" onClick={() => del.mutate(c.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva cuenta</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Código *</Label><Input value={form.codigo} onChange={(e) => set("codigo", e.target.value)} placeholder="Ej: 5.2.1.99" /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => set("tipo", v as CuentaTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS_CUENTA.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Nombre *</Label><Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} /></div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.imputable} onChange={(e) => set("imputable", e.target.checked)} />
                Imputable (puede recibir movimientos)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={save.isPending || !form.codigo || !form.nombre}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Terceros() {
  const { data: terceros = [] } = useContabTerceros();
  const save = useSaveTercero();
  const del = useDeleteTercero();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ContabTercero> | null>(null);

  const empty: Partial<ContabTercero> = { tipo: "cliente", condicion_iva: "RI", razon_social: "", activo: true };

  const handleEdit = (t: ContabTercero) => { setEditing(t); setOpen(true); };
  const handleNew = () => { setEditing(empty); setOpen(true); };

  const handleSave = async () => {
    if (!editing) return;
    await save.mutateAsync(editing);
    setOpen(false);
    setEditing(null);
  };

  const set = (k: keyof ContabTercero, v: any) => setEditing((e) => ({ ...(e ?? empty), [k]: v }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Clientes / Proveedores ({terceros.length})</span>
          <Button size="sm" onClick={handleNew}><Plus className="w-4 h-4 mr-1" />Nuevo</Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-2 py-1">Tipo</th>
              <th className="px-2 py-1">CUIT</th>
              <th className="px-2 py-1">Razón social</th>
              <th className="px-2 py-1">Cond. IVA</th>
              <th className="px-2 py-1">Email</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {terceros.map((t) => (
              <tr key={t.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => handleEdit(t)}>
                <td className="px-2 py-1 capitalize">{t.tipo}</td>
                <td className="px-2 py-1 font-mono">{t.cuit ?? "—"}</td>
                <td className="px-2 py-1">{t.razon_social}</td>
                <td className="px-2 py-1">{t.condicion_iva}</td>
                <td className="px-2 py-1 text-xs">{t.email ?? "—"}</td>
                <td className="px-2 py-1 text-right">
                  <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); del.mutate(t.id); }}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => { if (!v) { setOpen(false); setEditing(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nuevo"} tercero</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={editing.tipo} onValueChange={(v) => set("tipo", v as TerceroTipo)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cliente">Cliente</SelectItem>
                    <SelectItem value="proveedor">Proveedor</SelectItem>
                    <SelectItem value="ambos">Ambos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Condición IVA</Label>
                <Select value={editing.condicion_iva} onValueChange={(v) => set("condicion_iva", v as CondIva)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COND_IVA.map((c) => <SelectItem key={c.v} value={c.v}>{c.l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>CUIT</Label><Input value={editing.cuit ?? ""} onChange={(e) => set("cuit", e.target.value)} /></div>
              <div><Label>Razón social *</Label><Input value={editing.razon_social ?? ""} onChange={(e) => set("razon_social", e.target.value)} /></div>
              <div className="col-span-2"><Label>Domicilio</Label><Input value={editing.domicilio ?? ""} onChange={(e) => set("domicilio", e.target.value)} /></div>
              <div><Label>Localidad</Label><Input value={editing.localidad ?? ""} onChange={(e) => set("localidad", e.target.value)} /></div>
              <div><Label>Provincia</Label><Input value={editing.provincia ?? ""} onChange={(e) => set("provincia", e.target.value)} /></div>
              <div><Label>Email</Label><Input value={editing.email ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
              <div><Label>Teléfono</Label><Input value={editing.telefono ?? ""} onChange={(e) => set("telefono", e.target.value)} /></div>
              <div><Label>CBU</Label><Input value={editing.cbu ?? ""} onChange={(e) => set("cbu", e.target.value)} /></div>
              <div><Label>Banco</Label><Input value={editing.banco ?? ""} onChange={(e) => set("banco", e.target.value)} /></div>
              <div className="col-span-2"><Label>Notas</Label><Textarea value={editing.notas ?? ""} onChange={(e) => set("notas", e.target.value)} rows={2} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={save.isPending || !editing?.razon_social}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

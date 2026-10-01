import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useProveedores, ProveedorDB, ProveedorForm } from "@/hooks/useProveedores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormDialog } from "@/components/shared/FormDialog";
import { DetailDialog } from "@/components/shared/DetailDialog";
import { DetailRow } from "@/components/shared/DetailRow";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Search, Eye, Pencil, Trash2, Truck, FileText, Receipt } from "lucide-react";
import { LoadingScreen } from "@/components/shared/LoadingScreen";
import { OrdenesCompraTab } from "@/components/proveedores/OrdenesCompraTab";
import { GastosGeneralesTab } from "@/components/proveedores/GastosGeneralesTab";
import { useUrlTab } from "@/hooks/useUrlState";

const emptyForm: ProveedorForm = {
  nombre: "",
  cuit: "",
  direccion: "",
  localidad: "",
  telefono: "",
  email: "",
  contacto: "",
  rubro: "",
  observaciones: "",
  activo: true,
};

export default function Proveedores() {
  const { proveedores, loading, createProveedor, updateProveedor, deleteProveedor } = useProveedores();

  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<ProveedorDB | null>(null);
  const [form, setForm] = useState<ProveedorForm>(emptyForm);

  const filtered = useMemo(() => {
    return proveedores.filter((p) => {
      if (!showInactive && !p.activo) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.nombre.toLowerCase().includes(q) ||
          (p.cuit && p.cuit.toLowerCase().includes(q)) ||
          (p.rubro && p.rubro.toLowerCase().includes(q)) ||
          (p.localidad && p.localidad.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [proveedores, search, showInactive]);

  const openCreate = () => {
    setForm(emptyForm);
    setIsEditing(false);
    setFormOpen(true);
  };

  const openEdit = (p: ProveedorDB) => {
    setForm({
      nombre: p.nombre,
      cuit: p.cuit || "",
      direccion: p.direccion || "",
      localidad: p.localidad || "",
      telefono: p.telefono || "",
      email: p.email || "",
      contacto: p.contacto || "",
      rubro: p.rubro || "",
      observaciones: p.observaciones || "",
      activo: p.activo,
    });
    setSelectedProveedor(p);
    setIsEditing(true);
    setFormOpen(true);
  };

  const openDetail = (p: ProveedorDB) => {
    setSelectedProveedor(p);
    setDetailOpen(true);
  };

  const openDelete = (p: ProveedorDB) => {
    setSelectedProveedor(p);
    setDeleteOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return;
    if (isEditing && selectedProveedor) {
      await updateProveedor(selectedProveedor.id, form);
    } else {
      await createProveedor(form);
    }
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (selectedProveedor) {
      await deleteProveedor(selectedProveedor.id);
      setDeleteOpen(false);
    }
  };

  const [tab, setTab] = useUrlTab("proveedores");

  if (loading) return <MainLayout title="Proveedores"><LoadingScreen /></MainLayout>;


  return (
    <MainLayout title="Proveedores">
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="proveedores" className="gap-2">
            <Truck className="w-4 h-4" /> Proveedores
          </TabsTrigger>
          <TabsTrigger value="ordenes" className="gap-2">
            <FileText className="w-4 h-4" /> Órdenes de Compra
          </TabsTrigger>
          <TabsTrigger value="gastos" className="gap-2">
            <Receipt className="w-4 h-4" /> Gastos Generales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proveedores" className="space-y-6 mt-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Truck className="w-7 h-7 text-primary" />
                Proveedores
              </h1>
              <p className="text-muted-foreground text-sm">{filtered.length} proveedores</p>
            </div>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" /> Nuevo Proveedor
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, CUIT, rubro..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showInactive} onCheckedChange={setShowInactive} id="show-inactive" />
              <Label htmlFor="show-inactive" className="text-sm text-muted-foreground">Mostrar inactivos</Label>
            </div>
          </div>

          <Card className="border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden md:table-cell">CUIT</TableHead>
                    <TableHead className="hidden md:table-cell">Rubro</TableHead>
                    <TableHead className="hidden lg:table-cell">Localidad</TableHead>
                    <TableHead className="hidden lg:table-cell">Teléfono</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No se encontraron proveedores
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nombre}</TableCell>
                        <TableCell className="hidden md:table-cell">{p.cuit || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell">{p.rubro || "-"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{p.localidad || "-"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{p.telefono || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={p.activo ? "default" : "secondary"}>
                            {p.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openDetail(p)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openDelete(p)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ordenes" className="mt-0">
          <OrdenesCompraTab />
        </TabsContent>

        <TabsContent value="gastos" className="mt-0">
          <GastosGeneralesTab />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isEditing ? "Editar Proveedor" : "Nuevo Proveedor"}
        onSubmit={handleSubmit}
        submitLabel={isEditing ? "Guardar" : "Crear"}
      >
        <div className="space-y-4">
          <div>
            <Label>Nombre *</Label>
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>CUIT</Label>
              <Input value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} />
            </div>
            <div>
              <Label>Rubro</Label>
              <Input value={form.rubro} onChange={(e) => setForm({ ...form, rubro: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Dirección</Label>
              <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </div>
            <div>
              <Label>Localidad</Label>
              <Input value={form.localidad} onChange={(e) => setForm({ ...form, localidad: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Teléfono</Label>
              <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Contacto</Label>
            <Input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} />
          </div>
          <div>
            <Label>Observaciones</Label>
            <Textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} id="activo" />
            <Label htmlFor="activo">Activo</Label>
          </div>
        </div>
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog open={detailOpen} onOpenChange={setDetailOpen} title="Detalle del Proveedor">
        {selectedProveedor && (
          <div className="space-y-2">
            <DetailRow label="Nombre" value={selectedProveedor.nombre} />
            <DetailRow label="CUIT" value={selectedProveedor.cuit} />
            <DetailRow label="Rubro" value={selectedProveedor.rubro} />
            <DetailRow label="Dirección" value={selectedProveedor.direccion} />
            <DetailRow label="Localidad" value={selectedProveedor.localidad} />
            <DetailRow label="Teléfono" value={selectedProveedor.telefono} />
            <DetailRow label="Email" value={selectedProveedor.email} />
            <DetailRow label="Contacto" value={selectedProveedor.contacto} />
            <DetailRow label="Observaciones" value={selectedProveedor.observaciones} />
            <DetailRow label="Estado" value={selectedProveedor.activo ? "Activo" : "Inactivo"} />
          </div>
        )}
      </DetailDialog>

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Eliminar Proveedor"
        description={`¿Estás seguro de eliminar a "${selectedProveedor?.nombre}"? Esta acción no se puede deshacer.`}
      />
    </MainLayout>
  );
}

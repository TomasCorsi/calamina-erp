import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Filter,
  ContactRound,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  Building2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormDialog } from "@/components/shared/FormDialog";
import { DetailDialog } from "@/components/shared/DetailDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { DetailRow, DetailSection } from "@/components/shared/DetailRow";
import { useClientes, ClienteDB, ClienteForm } from "@/hooks/useClientes";
import { useObras } from "@/hooks/useObras";
import { cn } from "@/lib/utils";

export default function Clientes() {
  const { clientes, loading, createCliente, updateCliente, deleteCliente } = useClientes();
  const { obras } = useObras();

  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteDB | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ClienteForm>({
    nombre: "",
    cuit: "",
    direccion: "",
    localidad: "",
    telefono: "",
    email: "",
    contacto: "",
    observaciones: "",
  });

  const getObrasCount = (clienteId: string) => {
    return obras.filter((o: any) => o.cliente_id === clienteId).length;
  };

  const filteredClientes = clientes.filter((cliente) => {
    const matchesSearch =
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (cliente.cuit?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (cliente.contacto?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesEstado =
      estadoFilter === "todos" ||
      (estadoFilter === "activo" && cliente.activo) ||
      (estadoFilter === "inactivo" && !cliente.activo);
    return matchesSearch && matchesEstado;
  });

  const handleNew = () => {
    setIsEditing(false);
    setFormData({
      nombre: "",
      cuit: "",
      direccion: "",
      localidad: "",
      telefono: "",
      email: "",
      contacto: "",
      observaciones: "",
    });
    setFormOpen(true);
  };

  const handleEdit = (cliente: ClienteDB) => {
    setIsEditing(true);
    setSelectedCliente(cliente);
    setFormData({
      nombre: cliente.nombre,
      cuit: cliente.cuit || "",
      direccion: cliente.direccion || "",
      localidad: cliente.localidad || "",
      telefono: cliente.telefono || "",
      email: cliente.email || "",
      contacto: cliente.contacto || "",
      observaciones: cliente.observaciones || "",
      activo: cliente.activo,
    });
    setFormOpen(true);
  };

  const handleView = (cliente: ClienteDB) => {
    setSelectedCliente(cliente);
    setDetailOpen(true);
  };

  const handleDelete = (cliente: ClienteDB) => {
    setSelectedCliente(cliente);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedCliente) {
      await deleteCliente(selectedCliente.id);
    }
    setDeleteOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (isEditing && selectedCliente) {
      await updateCliente(selectedCliente.id, formData);
    } else {
      await createCliente(formData);
    }

    setIsSubmitting(false);
    setFormOpen(false);
  };

  if (loading) {
    return (
      <MainLayout title="Clientes" subtitle="Gestión de clientes">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  const activos = clientes.filter((c) => c.activo).length;
  const inactivos = clientes.filter((c) => !c.activo).length;

  return (
    <MainLayout title="Clientes" subtitle="Gestión de clientes">
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, CUIT o contacto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex gap-2">
          <Select value={estadoFilter} onValueChange={setEstadoFilter}>
            <SelectTrigger className="w-40 bg-card border-border">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activo">Activos</SelectItem>
              <SelectItem value="inactivo">Inactivos</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleNew} className="bg-primary hover:bg-primary/90 text-primary-foreground btn-industrial">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{clientes.length}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
          <ContactRound className="w-8 h-8 text-primary opacity-50" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{activos}</p>
            <p className="text-sm text-muted-foreground">Activos</p>
          </div>
          <Badge className="status-badge status-active">activo</Badge>
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{inactivos}</p>
            <p className="text-sm text-muted-foreground">Inactivos</p>
          </div>
          <Badge className="status-badge status-inactive">inactivo</Badge>
        </div>
      </div>

      {/* Table */}
      <div className="card-industrial overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">Cliente</TableHead>
              <TableHead className="text-muted-foreground font-medium">CUIT</TableHead>
              <TableHead className="text-muted-foreground font-medium hidden md:table-cell">Contacto</TableHead>
              <TableHead className="text-muted-foreground font-medium hidden md:table-cell">Teléfono</TableHead>
              <TableHead className="text-muted-foreground font-medium hidden lg:table-cell">Email</TableHead>
              <TableHead className="text-muted-foreground font-medium text-center">Obras</TableHead>
              <TableHead className="text-muted-foreground font-medium">Estado</TableHead>
              <TableHead className="text-muted-foreground font-medium w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClientes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {searchTerm || estadoFilter !== "todos"
                    ? "No se encontraron clientes"
                    : "No hay clientes registrados"}
                </TableCell>
              </TableRow>
            ) : (
              filteredClientes.map((cliente, index) => (
                <TableRow
                  key={cliente.id}
                  className="border-border table-row-hover animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                        <ContactRound className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{cliente.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {cliente.cuit || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {cliente.contacto || "-"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {cliente.telefono ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {cliente.telefono}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {cliente.email ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        {cliente.email}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-foreground">
                      <Building2 className="w-3 h-3 mr-1" />
                      {getObrasCount(cliente.id)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("status-badge", cliente.activo ? "status-active" : "status-inactive")}>
                      {cliente.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border">
                        <DropdownMenuItem onClick={() => handleView(cliente)} className="text-foreground cursor-pointer">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(cliente)} className="text-foreground cursor-pointer">
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(cliente)} className="text-destructive cursor-pointer">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isEditing ? "Editar Cliente" : "Nuevo Cliente"}
        description={isEditing ? "Modifica los datos del cliente" : "Ingresa los datos del nuevo cliente"}
        size="lg"
        isDirty
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="nombre">Nombre / Razón Social *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="bg-muted border-border"
                required
                placeholder="Nombre del cliente"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cuit">CUIT</Label>
              <Input
                id="cuit"
                value={formData.cuit}
                onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                className="bg-muted border-border"
                placeholder="XX-XXXXXXXX-X"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contacto">Persona de contacto</Label>
              <Input
                id="contacto"
                value={formData.contacto}
                onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                className="bg-muted border-border"
                placeholder="Nombre del referente"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="bg-muted border-border"
                placeholder="Teléfono de contacto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-muted border-border"
                placeholder="email@ejemplo.com"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="bg-muted border-border"
                placeholder="Dirección del cliente"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="localidad">Localidad</Label>
              <Input
                id="localidad"
                value={formData.localidad}
                onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                className="bg-muted border-border"
                placeholder="Ciudad / Localidad"
              />
            </div>
            {isEditing && (
              <div className="space-y-2">
                <Label htmlFor="activo">Estado</Label>
                <Select
                  value={formData.activo === false ? "inactivo" : "activo"}
                  onValueChange={(value) => setFormData({ ...formData, activo: value === "activo" })}
                >
                  <SelectTrigger className="bg-muted border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                className="bg-muted border-border"
                rows={2}
                placeholder="Notas adicionales"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-primary hover:bg-primary/90">
              {isSubmitting ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Cliente"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title="Detalle de Cliente"
      >
        {selectedCliente && (
          <div className="space-y-4">
            <DetailSection title="Información General">
              <DetailRow label="Nombre" value={selectedCliente.nombre} />
              <DetailRow label="CUIT" value={selectedCliente.cuit || "-"} />
              <DetailRow label="Estado" value={selectedCliente.activo ? "Activo" : "Inactivo"} />
            </DetailSection>
            <DetailSection title="Contacto">
              <DetailRow label="Persona de contacto" value={selectedCliente.contacto || "-"} />
              <DetailRow label="Teléfono" value={selectedCliente.telefono || "-"} />
              <DetailRow label="Email" value={selectedCliente.email || "-"} />
            </DetailSection>
            <DetailSection title="Ubicación">
              <DetailRow label="Dirección" value={selectedCliente.direccion || "-"} />
              <DetailRow label="Localidad" value={selectedCliente.localidad || "-"} />
            </DetailSection>
            {selectedCliente.observaciones && (
              <DetailSection title="Observaciones">
                <p className="text-sm text-muted-foreground">{selectedCliente.observaciones}</p>
              </DetailSection>
            )}
            <DetailSection title="Obras asignadas">
              {obras.filter((o: any) => o.cliente_id === selectedCliente.id).length > 0 ? (
                <div className="space-y-1">
                  {obras
                    .filter((o: any) => o.cliente_id === selectedCliente.id)
                    .map((obra) => (
                      <div key={obra.id} className="flex items-center gap-2 text-sm">
                        <Building2 className="w-3 h-3 text-muted-foreground" />
                        <span className="text-foreground">{obra.nombre}</span>
                        {obra.ubicacion && (
                          <span className="text-muted-foreground">- {obra.ubicacion}</span>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin obras asignadas</p>
              )}
            </DetailSection>
          </div>
        )}
      </DetailDialog>

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Eliminar Cliente"
        description={`¿Estás seguro de que deseas eliminar el cliente "${selectedCliente?.nombre}"? Las obras asociadas quedarán sin cliente asignado.`}
      />
    </MainLayout>
  );
}

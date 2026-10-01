import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  MapPin,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Filter,
  User,
  Calendar,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
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
import { FilterBar, FilterState, filterByDateAndObra } from "@/components/shared/FilterBar";
import { useUrlSearch } from "@/hooks/useUrlState";
import { useViajes, ViajeWithRelations, ViajeForm, EstadoViaje } from "@/hooks/useViajes";
import { useObras } from "@/hooks/useObras";
import { usePersonal } from "@/hooks/usePersonal";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { cn, formatDate } from "@/lib/utils";

const estadoConfig: Record<string, { label: string; icon: any; className: string }> = {
  programado: { label: "Programado", icon: Calendar, className: "status-pending" },
  en_curso: { label: "En Curso", icon: Play, className: "bg-primary/20 text-primary border-primary/30" },
  completado: { label: "Completado", icon: CheckCircle, className: "status-active" },
  cancelado: { label: "Cancelado", icon: XCircle, className: "status-error" },
};

export default function Viajes() {
  const { viajes, loading, createViaje, updateViaje, deleteViaje } = useViajes();
  const { obras } = useObras();
  const { personal } = usePersonal();
  const { maquinarias } = useMaquinarias();
  
  const [searchTerm, setSearchTerm] = useUrlSearch("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [filters, setFilters] = useState<FilterState>({
    fechaDesde: undefined,
    fechaHasta: undefined,
    mes: undefined,
    obraId: undefined,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedViaje, setSelectedViaje] = useState<ViajeWithRelations | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const choferes = personal.filter(p => p.rol === "chofer" && p.activo);
  const camiones = maquinarias.filter(m => m.tipo === "camion");
  const obrasActivas = obras.filter(o => o.estado === "activa");

  const [formData, setFormData] = useState<ViajeForm>({
    fecha: new Date().toISOString().split("T")[0],
    obra_id: "",
    chofer_id: "",
    camion_id: "",
    origen: "",
    destino: "",
    material: "",
    volumen: 0,
    estado: "programado",
    hora_inicio: "",
    hora_fin: "",
    km_recorridos: 0,
    observaciones: "",
  });

  const filteredViajes = useMemo(() => {
    // Apply date and obra filters first
    const dateFiltered = filterByDateAndObra(
      viajes.map(v => ({ ...v, fecha: v.fecha, obra_id: v.obra_id })),
      filters
    );
    
    // Then apply search and status filters
    return dateFiltered.filter((v) => {
      const matchesSearch =
        v.obra?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.chofer?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.material.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEstado = estadoFilter === "todos" || v.estado === estadoFilter;
      return matchesSearch && matchesEstado;
    });
  }, [viajes, filters, searchTerm, estadoFilter]);

  const handleNew = () => {
    setIsEditing(false);
    setFormData({
      fecha: new Date().toISOString().split("T")[0],
      obra_id: "",
      chofer_id: "",
      camion_id: "",
      origen: "",
      destino: "",
      material: "Tosca",
      volumen: 18,
      estado: "programado",
      hora_inicio: "",
      hora_fin: "",
      km_recorridos: 0,
      observaciones: "",
    });
    setFormOpen(true);
  };

  const handleEdit = (viaje: ViajeWithRelations) => {
    setIsEditing(true);
    setSelectedViaje(viaje);
    setFormData({
      fecha: viaje.fecha,
      obra_id: viaje.obra_id,
      chofer_id: viaje.chofer_id,
      camion_id: viaje.camion_id,
      origen: viaje.origen,
      destino: viaje.destino,
      material: viaje.material,
      volumen: viaje.volumen,
      estado: viaje.estado,
      hora_inicio: viaje.hora_inicio || "",
      hora_fin: viaje.hora_fin || "",
      km_recorridos: viaje.km_recorridos || 0,
      observaciones: viaje.observaciones || "",
    });
    setFormOpen(true);
  };

  const handleView = (viaje: ViajeWithRelations) => {
    setSelectedViaje(viaje);
    setDetailOpen(true);
  };

  const handleDelete = (viaje: ViajeWithRelations) => {
    setSelectedViaje(viaje);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedViaje) {
      await deleteViaje(selectedViaje.id);
    }
    setDeleteOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (isEditing && selectedViaje) {
      await updateViaje(selectedViaje.id, formData);
    } else {
      await createViaje(formData);
    }
    
    setIsSubmitting(false);
    setFormOpen(false);
  };

  const updateStatus = async (viaje: ViajeWithRelations, newStatus: EstadoViaje) => {
    await updateViaje(viaje.id, { estado: newStatus });
  };

  if (loading) {
    return (
      <MainLayout title="Viajes" subtitle="Registro de viajes y transporte">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Viajes" subtitle="Registro de viajes y transporte">
      {/* Filter Bar */}
      <div className="mb-4">
        <FilterBar obras={obras} onFilterChange={setFilters} />
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por obra, chofer o material..."
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
              {Object.entries(estadoConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleNew}
            className="bg-primary hover:bg-primary/90 text-primary-foreground btn-industrial"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Viaje
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Object.entries(estadoConfig).map(([key, config]) => {
          const count = viajes.filter((v) => v.estado === key).length;
          const Icon = config.icon;
          return (
            <div key={key} className="card-industrial p-4 flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">{count}</p>
                <p className="text-sm text-muted-foreground">{config.label}</p>
              </div>
              <Icon className="w-6 h-6 text-muted-foreground" />
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="card-industrial overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">Fecha</TableHead>
              <TableHead className="text-muted-foreground font-medium">Obra</TableHead>
              <TableHead className="text-muted-foreground font-medium">Chofer</TableHead>
              <TableHead className="text-muted-foreground font-medium">Ruta</TableHead>
              <TableHead className="text-muted-foreground font-medium">Material</TableHead>
              <TableHead className="text-muted-foreground font-medium">Volumen</TableHead>
              <TableHead className="text-muted-foreground font-medium">Estado</TableHead>
              <TableHead className="text-muted-foreground font-medium w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredViajes.map((viaje, index) => {
              const config = estadoConfig[viaje.estado];
              return (
                <TableRow
                  key={viaje.id}
                  className="border-border table-row-hover animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <span className="flex items-center gap-1 text-foreground">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      {formatDate(viaje.fecha)}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {viaje.obra?.nombre || "-"}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <User className="w-3 h-3" />
                      {viaje.chofer ? `${viaje.chofer.nombre} ${viaje.chofer.apellido}` : "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {viaje.origen} → {viaje.destino}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{viaje.material}</TableCell>
                  <TableCell className="font-mono text-foreground">{viaje.volumen} m³</TableCell>
                  <TableCell>
                    <Badge className={cn("status-badge", config.className)}>
                      {config.label}
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
                        <DropdownMenuItem onClick={() => handleView(viaje)} className="cursor-pointer">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver detalle
                        </DropdownMenuItem>
                        {viaje.estado === "programado" && (
                          <DropdownMenuItem onClick={() => updateStatus(viaje, "en_curso")} className="cursor-pointer text-primary">
                            <Play className="w-4 h-4 mr-2" />
                            Iniciar Viaje
                          </DropdownMenuItem>
                        )}
                        {viaje.estado === "en_curso" && (
                          <DropdownMenuItem onClick={() => updateStatus(viaje, "completado")} className="cursor-pointer text-success">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Completar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleEdit(viaje)} className="cursor-pointer">
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(viaje)} className="text-destructive cursor-pointer">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isEditing ? "Editar Viaje" : "Nuevo Viaje"}
        size="lg"
        isDirty
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado *</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => setFormData({ ...formData, estado: value as EstadoViaje })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {Object.entries(estadoConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="obra_id">Obra *</Label>
              <Select
                value={formData.obra_id}
                onValueChange={(value) => setFormData({ ...formData, obra_id: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar obra" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {obrasActivas.map((obra) => (
                    <SelectItem key={obra.id} value={obra.id}>{obra.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="chofer_id">Chofer *</Label>
              <Select
                value={formData.chofer_id}
                onValueChange={(value) => setFormData({ ...formData, chofer_id: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar chofer" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {choferes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre} {c.apellido}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="camion_id">Camión *</Label>
              <Select
                value={formData.camion_id}
                onValueChange={(value) => setFormData({ ...formData, camion_id: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar camión" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {camiones.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="material">Material *</Label>
              <Input
                id="material"
                value={formData.material}
                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                placeholder="Ej: Tosca, Tierra"
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="origen">Origen *</Label>
              <Input
                id="origen"
                value={formData.origen}
                onChange={(e) => setFormData({ ...formData, origen: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destino">Destino *</Label>
              <Input
                id="destino"
                value={formData.destino}
                onChange={(e) => setFormData({ ...formData, destino: e.target.value })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="volumen">Volumen (m³) *</Label>
              <Input
                id="volumen"
                type="number"
                value={formData.volumen}
                onChange={(e) => setFormData({ ...formData, volumen: parseFloat(e.target.value) || 0 })}
                className="bg-muted border-border"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="km_recorridos">Km Recorridos</Label>
              <Input
                id="km_recorridos"
                type="number"
                value={formData.km_recorridos}
                onChange={(e) => setFormData({ ...formData, km_recorridos: parseFloat(e.target.value) || 0 })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora_inicio">Hora Inicio</Label>
              <Input
                id="hora_inicio"
                type="time"
                value={formData.hora_inicio}
                onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hora_fin">Hora Fin</Label>
              <Input
                id="hora_fin"
                type="time"
                value={formData.hora_fin}
                onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                className="bg-muted border-border"
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Guardar Cambios" : "Crear Viaje"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={`Viaje - ${selectedViaje?.obra?.nombre || ""}`}
      >
        {selectedViaje && (
          <>
            <DetailSection title="Información General">
              <DetailRow label="Fecha" value={formatDate(selectedViaje.fecha)} />
              <DetailRow label="Obra" value={selectedViaje.obra?.nombre} />
              <DetailRow
                label="Estado"
                value={
                  <Badge className={cn("status-badge", estadoConfig[selectedViaje.estado]?.className)}>
                    {estadoConfig[selectedViaje.estado]?.label}
                  </Badge>
                }
              />
            </DetailSection>
            <DetailSection title="Transporte">
              <DetailRow 
                label="Chofer" 
                value={selectedViaje.chofer ? `${selectedViaje.chofer.nombre} ${selectedViaje.chofer.apellido}` : "-"} 
              />
              <DetailRow label="Camión" value={selectedViaje.camion?.nombre} />
              <DetailRow label="Origen" value={selectedViaje.origen} />
              <DetailRow label="Destino" value={selectedViaje.destino} />
            </DetailSection>
            <DetailSection title="Carga">
              <DetailRow label="Material" value={selectedViaje.material} />
              <DetailRow label="Volumen" value={`${selectedViaje.volumen} m³`} />
              <DetailRow label="Km Recorridos" value={selectedViaje.km_recorridos ? `${selectedViaje.km_recorridos} km` : "-"} />
            </DetailSection>
            <DetailSection title="Tiempos">
              <DetailRow label="Hora Inicio" value={selectedViaje.hora_inicio || "-"} />
              <DetailRow label="Hora Fin" value={selectedViaje.hora_fin || "-"} />
            </DetailSection>
            {selectedViaje.observaciones && (
              <DetailSection title="Observaciones">
                <p className="text-muted-foreground">{selectedViaje.observaciones}</p>
              </DetailSection>
            )}
          </>
        )}
      </DetailDialog>

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Eliminar Viaje"
        description={`¿Estás seguro de eliminar el viaje a ${selectedViaje?.destino}? Esta acción no se puede deshacer.`}
      />
    </MainLayout>
  );
}

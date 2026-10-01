import { useState, useMemo } from "react";
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
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormDialog } from "@/components/shared/FormDialog";
import { DetailDialog } from "@/components/shared/DetailDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { DetailRow, DetailSection } from "@/components/shared/DetailRow";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Calendar,
  User,
  ListTodo,
  CalendarDays,
  Calculator,
  DollarSign,
  Download,
} from "lucide-react";
import { ExportVacacionesDialog } from "./ExportVacacionesDialog";
import { useVacaciones, VacacionDB, VacacionForm } from "@/hooks/useVacaciones";
import { usePersonal } from "@/hooks/usePersonal";
import { cn, formatDate } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";
import { CalendarioVacaciones } from "./CalendarioVacaciones";
import { SaldoVacacionesTable } from "./SaldoVacacionesTable";

const motivoConfig: Record<string, string> = {
  vacaciones: "Vacaciones",
  licencia_medica: "Licencia Médica",
  permiso_personal: "Permiso Personal",
  otro: "Otro",
};

export function VacacionesTab() {
  const { vacaciones, loading, createVacacion, updateVacacion, deleteVacacion, togglePagada } = useVacaciones();
  const { personal } = usePersonal();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [pagoFilter, setPagoFilter] = useState<string>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedVacacion, setSelectedVacacion] = useState<VacacionDB | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<VacacionForm>({
    personal_id: "",
    fecha_inicio: new Date().toISOString().split("T")[0],
    fecha_fin: new Date().toISOString().split("T")[0],
    dias_totales: 1,
    motivo: "vacaciones",
    observaciones: "",
  });

  const personalActivo = personal.filter((p) => p.activo);

  // Opciones para el combobox con búsqueda por legajo y nombre
  const personalOptions = useMemo(() => {
    return personalActivo
      .map((p) => ({
        value: p.id,
        label: `${p.legajo ? `${p.legajo} - ` : ""}${p.apellido || ""}, ${p.nombre || ""}`.trim(),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [personalActivo]);

  const filteredVacaciones = vacaciones.filter((v) => {
    const nombreEmpleado = `${v.personal?.nombre || ""} ${v.personal?.apellido || ""}`.toLowerCase();
    const matchesSearch = nombreEmpleado.includes(searchTerm.toLowerCase());
    const matchesPago = pagoFilter === "todos" || 
      (pagoFilter === "pagada" && v.pagada) || 
      (pagoFilter === "no_pagada" && !v.pagada);
    return matchesSearch && matchesPago;
  });

  // Stats
  const pagadas = vacaciones.filter((v) => v.pagada).length;
  const noPagadas = vacaciones.filter((v) => !v.pagada).length;

  const calculateDays = (inicio: string, fin: string) => {
    try {
      const startDate = parseISO(inicio);
      const endDate = parseISO(fin);
      return Math.max(1, differenceInDays(endDate, startDate) + 1);
    } catch {
      return 1;
    }
  };

  const handleDateChange = (field: "fecha_inicio" | "fecha_fin", value: string) => {
    const newFormData = { ...formData, [field]: value };
    newFormData.dias_totales = calculateDays(
      field === "fecha_inicio" ? value : formData.fecha_inicio,
      field === "fecha_fin" ? value : formData.fecha_fin
    );
    setFormData(newFormData);
  };

  const handleNew = () => {
    setIsEditing(false);
    setFormData({
      personal_id: "",
      fecha_inicio: new Date().toISOString().split("T")[0],
      fecha_fin: new Date().toISOString().split("T")[0],
      dias_totales: 1,
      motivo: "vacaciones",
      observaciones: "",
    });
    setFormOpen(true);
  };

  const handleEdit = (vacacion: VacacionDB) => {
    setIsEditing(true);
    setSelectedVacacion(vacacion);
    setFormData({
      personal_id: vacacion.personal_id,
      fecha_inicio: vacacion.fecha_inicio,
      fecha_fin: vacacion.fecha_fin,
      dias_totales: vacacion.dias_totales,
      motivo: vacacion.motivo,
      observaciones: vacacion.observaciones || "",
    });
    setFormOpen(true);
  };

  const handleView = (vacacion: VacacionDB) => {
    setSelectedVacacion(vacacion);
    setDetailOpen(true);
  };

  const handleDelete = (vacacion: VacacionDB) => {
    setSelectedVacacion(vacacion);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedVacacion) {
      await deleteVacacion(selectedVacacion.id);
    }
    setDeleteOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (isEditing && selectedVacacion) {
      await updateVacacion(selectedVacacion.id, formData);
    } else {
      await createVacacion(formData);
    }

    setIsSubmitting(false);
    setFormOpen(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-tabs para las diferentes vistas */}
      <Tabs defaultValue="solicitudes" className="w-full">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="solicitudes" className="flex items-center gap-2 data-[state=active]:bg-background">
            <ListTodo className="w-4 h-4" />
            Solicitudes
          </TabsTrigger>
          <TabsTrigger value="calendario" className="flex items-center gap-2 data-[state=active]:bg-background">
            <CalendarDays className="w-4 h-4" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="saldo" className="flex items-center gap-2 data-[state=active]:bg-background">
            <Calculator className="w-4 h-4" />
            Saldo por Empleado
          </TabsTrigger>
        </TabsList>

        {/* Tab Solicitudes - Contenido original */}
        <TabsContent value="solicitudes" className="space-y-6 mt-6">
          {/* Actions Bar */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-card border-border"
              />
            </div>
            <div className="flex gap-2">
              <Select value={pagoFilter} onValueChange={setPagoFilter}>
                <SelectTrigger className="w-40 bg-card border-border">
                  <DollarSign className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Pago" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pagada">Pagadas</SelectItem>
                  <SelectItem value="no_pagada">No pagadas</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => setExportDialogOpen(true)}
                disabled={noPagadas === 0}
                className="border-border"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar No Pagadas
              </Button>
              <Button
                onClick={handleNew}
                className="bg-primary hover:bg-primary/90 text-primary-foreground btn-industrial"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Solicitud
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card-industrial p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <p className="text-2xl font-bold text-foreground">{pagadas}</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Pagadas</p>
            </div>
            <div className="card-industrial p-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <DollarSign className="w-5 h-5 text-muted-foreground" />
                <p className="text-2xl font-bold text-foreground">{noPagadas}</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">No pagadas</p>
            </div>
          </div>

          {/* Table */}
          <div className="card-industrial overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-medium">Empleado</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Desde</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Hasta</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Días</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Motivo</TableHead>
                  
                  <TableHead className="text-muted-foreground font-medium">Pago</TableHead>
                  <TableHead className="text-muted-foreground font-medium w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVacaciones.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm || pagoFilter !== "todos" ? "No se encontraron vacaciones" : "No hay solicitudes de vacaciones"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVacaciones.map((vacacion, index) => (
                    <TableRow
                      key={vacacion.id}
                      className="border-border table-row-hover animate-fade-in"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-medium text-foreground">
                            {vacacion.personal?.nombre || ""} {vacacion.personal?.apellido || ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(vacacion.fecha_inicio)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(vacacion.fecha_fin)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">{vacacion.dias_totales}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {motivoConfig[vacacion.motivo] || vacacion.motivo}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePagada(vacacion.id)}
                          className={cn(
                            "h-8 px-2 gap-1 font-medium transition-colors",
                            vacacion.pagada
                              ? "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          <DollarSign className="w-4 h-4" />
                          {vacacion.pagada ? "Pagada" : "No pagada"}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border-border">
                            <DropdownMenuItem
                              onClick={() => handleView(vacacion)}
                              className="text-foreground cursor-pointer"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleEdit(vacacion)}
                              className="text-foreground cursor-pointer"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(vacacion)}
                              className="text-destructive cursor-pointer"
                            >
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
        </TabsContent>

        {/* Tab Calendario */}
        <TabsContent value="calendario" className="mt-6">
          <CalendarioVacaciones vacaciones={vacaciones} />
        </TabsContent>

        {/* Tab Saldo por Empleado */}
        <TabsContent value="saldo" className="mt-6">
          <SaldoVacacionesTable vacaciones={vacaciones} personal={personal} />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <FormDialog
        isDirty
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isEditing ? "Editar Vacaciones" : "Nueva Solicitud de Vacaciones"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="personal_id">Empleado *</Label>
            <Combobox
              options={personalOptions}
              value={formData.personal_id}
              onValueChange={(value) => setFormData({ ...formData, personal_id: value })}
              placeholder="Seleccionar empleado"
              searchPlaceholder="Buscar por legajo o nombre..."
              emptyText="No se encontró el empleado"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Fecha Inicio *</Label>
              <Input
                id="fecha_inicio"
                type="date"
                value={formData.fecha_inicio}
                onChange={(e) => handleDateChange("fecha_inicio", e.target.value)}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_fin">Fecha Fin *</Label>
              <Input
                id="fecha_fin"
                type="date"
                value={formData.fecha_fin}
                onChange={(e) => handleDateChange("fecha_fin", e.target.value)}
                className="bg-muted border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Días Totales</Label>
              <div className="flex items-center h-10 px-3 bg-muted border border-border rounded-md">
                <span className="text-foreground font-medium">{formData.dias_totales}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo *</Label>
              <Select
                value={formData.motivo}
                onValueChange={(value) => setFormData({ ...formData, motivo: value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar motivo" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {Object.entries(motivoConfig).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              placeholder="Notas adicionales..."
              className="bg-muted border-border"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-primary hover:bg-primary/90" 
              disabled={isSubmitting || !formData.personal_id}
            >
              {isSubmitting ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Solicitud"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title="Detalle de Vacaciones"
      >
        {selectedVacacion && (
          <div className="space-y-4">
            <DetailSection title="Empleado">
              <DetailRow 
                label="Nombre" 
                value={`${selectedVacacion.personal?.nombre || ""} ${selectedVacacion.personal?.apellido || ""}`} 
              />
            </DetailSection>
            <DetailSection title="Período">
              <DetailRow label="Fecha Inicio" value={formatDate(selectedVacacion.fecha_inicio)} />
              <DetailRow label="Fecha Fin" value={formatDate(selectedVacacion.fecha_fin)} />
              <DetailRow label="Días Totales" value={selectedVacacion.dias_totales.toString()} />
            </DetailSection>
            <DetailSection title="Solicitud">
              <DetailRow label="Motivo" value={motivoConfig[selectedVacacion.motivo] || selectedVacacion.motivo} />
              <DetailRow
                label="Pago"
                value={
                  <Badge className={cn(
                    "status-badge flex items-center gap-1 w-fit",
                    selectedVacacion.pagada 
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : "bg-muted text-muted-foreground"
                  )}>
                    <DollarSign className="w-3 h-3" />
                    {selectedVacacion.pagada ? "Pagada" : "No pagada"}
                  </Badge>
                }
              />
              <DetailRow label="Observaciones" value={selectedVacacion.observaciones || "-"} />
            </DetailSection>
          </div>
        )}
      </DetailDialog>

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Eliminar Vacaciones"
        description={`¿Estás seguro de que deseas eliminar esta solicitud de vacaciones? Esta acción no se puede deshacer.`}
      />

      {/* Export Dialog */}
      <ExportVacacionesDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        vacaciones={vacaciones}
      />
    </div>
  );
}

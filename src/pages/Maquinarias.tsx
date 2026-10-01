import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useUrlSearch, useUrlTab } from "@/hooks/useUrlState";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Plus,
  Search,
  Truck,
  Clock,
  Upload,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Filter,
  Wrench,
  CheckCircle,
  Building2,
  User,
  DollarSign,
  LayoutGrid,
  Table,
} from "lucide-react";
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
import { GastosMaquinaria } from "@/components/maquinarias/GastosMaquinaria";
import { MaquinariasDataGrid } from "@/components/maquinarias/MaquinariasDataGrid";
import { useMaquinarias, MaquinariaWithRelations, MaquinariaForm, TipoMaquinaria, EstadoMaquinaria } from "@/hooks/useMaquinarias";
import { usePersonal } from "@/hooks/usePersonal";
import { useObras } from "@/hooks/useObras";
import { cn } from "@/lib/utils";
import { CSVImportDialog } from "@/components/maquinarias/CSVImportDialog";
import { Separator } from "@/components/ui/separator";

const tiposConfig: Record<TipoMaquinaria, string> = {
  cargadora: "Cargadora",
  compactador: "Compactador",
  retroexcavadora: "Retroexcavadora",
  minicargadora: "Minicargadora",
  motoniveladora: "Motoniveladora",
  topador: "Topador",
  pala_retro: "Pala Retro",
  batea: "Batea",
  acoplado: "Acoplado",
  camion: "Camión",
  carreton: "Carretón",
  cisterna: "Cisterna",
  tanque_cisterna: "Tanque Cisterna",
  tanque_regador_tractor: "Tanque Regador con Tractor",
  soplador: "Soplador",
  zanjeadora: "Zanjeadora",
  rastra: "Rastra",
  tractor: "Tractor",
  rastra_grosspal: "Rastra Grosspal",
  auto: "Auto",
  camioneta: "Camioneta",
  grupo_electrogeno: "Grupo Electrógeno",
};

const TIPOS_KM: TipoMaquinaria[] = ["auto", "camioneta", "camion", "carreton", "cisterna", "tanque_cisterna", "tanque_regador_tractor", "batea", "acoplado"];
const esVehiculoKm = (tipo: TipoMaquinaria) => TIPOS_KM.includes(tipo);

const estadoConfig: Record<EstadoMaquinaria, { label: string; icon: any; className: string }> = {
  operativa: { label: "Operativa", icon: CheckCircle, className: "status-active" },
  mantenimiento: { label: "Mantenimiento", icon: Wrench, className: "status-pending" },
  inactiva: { label: "Inactiva", icon: Clock, className: "status-inactive" },
  en_uso: { label: "En Uso", icon: Truck, className: "bg-primary/20 text-primary border-primary/30" },
};

export default function Maquinarias() {
  const { maquinarias, loading, createMaquinaria, updateMaquinaria, deleteMaquinaria, batchSave } = useMaquinarias();
  const { personal } = usePersonal();
  const { obras } = useObras();
  
  const [searchTerm, setSearchTerm] = useUrlSearch("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [selectedMaquinaria, setSelectedMaquinaria] = useState<MaquinariaWithRelations | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "grid">("cards");

  const operadores = personal.filter(p => p.rol === "maquinista" && p.activo);

  const [formData, setFormData] = useState<MaquinariaForm>({
    codigo: "",
    nombre: "",
    tipo: "cargadora",
    marca: "",
    anio: new Date().getFullYear(),
    patente: "",
    estado: "operativa",
    horas_acumuladas: 0,
  });

  const filteredMaquinarias = maquinarias.filter((m) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      (m.nombre?.toLowerCase() || "").includes(searchLower) ||
      (m.codigo?.toLowerCase() || "").includes(searchLower) ||
      (m.patente?.toLowerCase() || "").includes(searchLower);
    const matchesEstado = estadoFilter === "todos" || m.estado === estadoFilter;
    return matchesSearch && matchesEstado;
  });

  const handleNew = () => {
    setIsEditing(false);
    setFormData({
      codigo: "",
      nombre: "",
      tipo: "cargadora",
      marca: "",
      anio: new Date().getFullYear(),
      patente: "",
      estado: "operativa",
      horas_acumuladas: 0,
    });
    setFormOpen(true);
  };

  const handleEdit = (maq: MaquinariaWithRelations) => {
    setIsEditing(true);
    setSelectedMaquinaria(maq);
    setFormData({
      codigo: maq.codigo,
      nombre: maq.nombre,
      tipo: maq.tipo,
      marca: maq.marca,
      anio: maq.anio,
      patente: maq.patente || "",
      estado: maq.estado,
      horas_acumuladas: maq.horas_acumuladas,
      operador_asignado_id: maq.operador_asignado_id || undefined,
      obra_id: maq.obra_id || undefined,
    });
    setFormOpen(true);
  };

  const handleView = (maq: MaquinariaWithRelations) => {
    setSelectedMaquinaria(maq);
    setDetailOpen(true);
  };

  const handleDelete = (maq: MaquinariaWithRelations) => {
    setSelectedMaquinaria(maq);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedMaquinaria) {
      await deleteMaquinaria(selectedMaquinaria.id);
    }
    setDeleteOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (isEditing && selectedMaquinaria) {
      await updateMaquinaria(selectedMaquinaria.id, formData);
    } else {
      await createMaquinaria(formData);
    }
    
    setIsSubmitting(false);
    setFormOpen(false);
  };

  const handleCSVImport = async (maquinarias: MaquinariaForm[]) => {
    for (const maq of maquinarias) {
      await createMaquinaria(maq);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Maquinarias" subtitle="Control de equipos y flota">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Maquinarias" subtitle="Control de equipos y flota">
      <Tabs defaultValue="inventario" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="inventario" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="gastos" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Gastos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventario" className="space-y-6">
          {/* View Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("cards")}
                className="h-8"
              >
                <LayoutGrid className="w-4 h-4 mr-1" />
                Tarjetas
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="h-8"
              >
                <Table className="w-4 h-4 mr-1" />
                Grilla
              </Button>
            </div>
            
            {viewMode === "cards" && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCsvImportOpen(true)}
                  className="border-border"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Importar CSV
                </Button>
                <Button
                  onClick={handleNew}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground btn-industrial"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Maquinaria
                </Button>
              </div>
            )}
          </div>

          {viewMode === "grid" ? (
            <MaquinariasDataGrid
              maquinarias={maquinarias}
              onSave={batchSave}
            />
          ) : (
            <>
          {/* Actions Bar */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, código o patente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-card border-border"
              />
            </div>
            <div className="flex gap-2">
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="w-44 bg-card border-border">
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
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(estadoConfig).map(([key, config]) => {
              const count = maquinarias.filter((m) => m.estado === key).length;
              const Icon = config.icon;
              return (
                <div key={key} className="card-industrial p-4 flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{count}</p>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                  </div>
                  <Icon className={cn("w-8 h-8", config.className.includes("primary") ? "text-primary" : "")} />
                </div>
              );
            })}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMaquinarias.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                {searchTerm || estadoFilter !== "todos" ? "No se encontraron maquinarias" : "No hay maquinarias registradas"}
              </div>
            ) : (
              filteredMaquinarias.map((maq, index) => {
                const config = estadoConfig[maq.estado];
                const Icon = config.icon;
                return (
                  <Card
                    key={maq.id}
                    className="card-industrial animate-fade-in hover:border-primary/30 transition-all"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Truck className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <span className="text-xs font-mono text-primary">{maq.codigo}</span>
                            <h3 className="font-semibold text-foreground">{maq.nombre}</h3>
                            <p className="text-xs text-muted-foreground">{tiposConfig[maq.tipo]}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover border-border">
                            <DropdownMenuItem onClick={() => handleView(maq)} className="cursor-pointer">
                              <Eye className="w-4 h-4 mr-2" />
                              Ver detalle
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(maq)} className="cursor-pointer">
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(maq)} className="text-destructive cursor-pointer">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Badge className={cn("status-badge", config.className)}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {maq.marca} • {maq.anio}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        {maq.obra && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="w-4 h-4" />
                            {maq.obra.nombre}
                          </div>
                        )}
                        {maq.operador && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="w-4 h-4" />
                            {maq.operador.nombre} {maq.operador.apellido}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {esVehiculoKm(maq.tipo)
                            ? `${(maq.km_acumulados ?? 0).toLocaleString()} km`
                            : `${maq.horas_acumuladas.toLocaleString()} horas`}
                        </div>
                      </div>

                      {maq.patente && (
                        <div className="text-xs text-muted-foreground">
                          Patente: <span className="font-mono">{maq.patente}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="gastos">
          <GastosMaquinaria />
        </TabsContent>
      </Tabs>

      <FormDialog
        isDirty
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isEditing ? "Editar Maquinaria" : "Nueva Maquinaria"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="EXC-001"
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value as TipoMaquinaria })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {Object.entries(tiposConfig).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="obra_id">Obra</Label>
              <Select
                value={formData.obra_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, obra_id: value === "none" ? undefined : value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {obras.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => setFormData({ ...formData, estado: value as EstadoMaquinaria })}
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
              <Label htmlFor="marca">Marca</Label>
              <Input
                id="marca"
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patente">Patente</Label>
              <Input
                id="patente"
                value={formData.patente}
                onChange={(e) => setFormData({ ...formData, patente: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anio">Año</Label>
              <Input
                id="anio"
                type="number"
                value={formData.anio || ""}
                onChange={(e) => setFormData({ ...formData, anio: e.target.value ? parseInt(e.target.value) : 0 })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="operador_asignado_id">Operador Asignado</Label>
              <Select
                value={formData.operador_asignado_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, operador_asignado_id: value === "none" ? undefined : value })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {operadores.map((op) => (
                    <SelectItem key={op.id} value={op.id}>{op.nombre} {op.apellido}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="horas_acumuladas">{formData.tipo && esVehiculoKm(formData.tipo) ? "Kilómetros Actual" : "Horómetro Actual"}</Label>
              <Input
                id="horas_acumuladas"
                type="number"
                value={formData.horas_acumuladas}
                readOnly
                disabled
                className="bg-muted border-border opacity-60"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : isEditing ? "Guardar Cambios" : "Crear Maquinaria"}
            </Button>
          </div>
        </form>
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={selectedMaquinaria?.nombre || ""}
      >
        {selectedMaquinaria && (
          <div className="space-y-4">
            <DetailSection title="Información General">
              <DetailRow label="Código" value={selectedMaquinaria.codigo} />
              <DetailRow label="Nombre" value={selectedMaquinaria.nombre} />
              <DetailRow label="Tipo" value={tiposConfig[selectedMaquinaria.tipo]} />
              <DetailRow
                label="Estado"
                value={
                  <Badge className={cn("status-badge", estadoConfig[selectedMaquinaria.estado].className)}>
                    {estadoConfig[selectedMaquinaria.estado].label}
                  </Badge>
                }
              />
            </DetailSection>
            <DetailSection title="Detalles">
              <DetailRow label="Marca" value={selectedMaquinaria.marca} />
              <DetailRow label="Año" value={selectedMaquinaria.anio?.toString() || "-"} />
              <DetailRow label="Patente" value={selectedMaquinaria.patente || "-"} />
            </DetailSection>
            <DetailSection title="Asignación">
              <DetailRow label="Obra" value={selectedMaquinaria.obra?.nombre || "Sin asignar"} />
              <DetailRow 
                label="Operador" 
                value={selectedMaquinaria.operador ? `${selectedMaquinaria.operador.nombre} ${selectedMaquinaria.operador.apellido}` : "Sin asignar"} 
              />
              <DetailRow 
                label={esVehiculoKm(selectedMaquinaria.tipo) ? "Kilómetros Actual" : "Horómetro Actual"} 
                value={esVehiculoKm(selectedMaquinaria.tipo)
                  ? `${(selectedMaquinaria.km_acumulados ?? 0).toLocaleString()} km`
                  : `${selectedMaquinaria.horas_acumuladas.toLocaleString()} h`} 
              />
            </DetailSection>
          </div>
        )}
      </DetailDialog>

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Eliminar Maquinaria"
        description={`¿Estás seguro de que deseas eliminar "${selectedMaquinaria?.nombre}"? Esta acción no se puede deshacer.`}
      />

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        onImport={handleCSVImport}
      />
    </MainLayout>
  );
}

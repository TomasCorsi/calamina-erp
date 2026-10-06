import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ServiceForm } from "@/components/mantenimiento/ServiceForm";
import { ReparacionForm } from "@/components/mantenimiento/ReparacionForm";
import { MantenimientoDetail } from "@/components/mantenimiento/MantenimientoDetail";
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
  Wrench,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Filter,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  Play,
  Loader2,
  ShieldCheck,
  FileSpreadsheet,
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
import { FilterBar, FilterState } from "@/components/shared/FilterBar";
import { useMantenimientos, MantenimientoWithRelations, EstadoMantenimiento } from "@/hooks/useMantenimientos";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { useObras } from "@/hooks/useObras";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn, formatDate } from "@/lib/utils";
import { ESTADO_CONFIG, TIPO_CONFIG, formatCurrency } from "@/components/mantenimiento/mantenimientoConstants";
import * as XLSX from "xlsx";
import { HistoricoBanner } from "@/components/shared/HistoricoBanner";

export default function MantenimientoPage() {
  const { mantenimientos, loading, updateMantenimiento, deleteMantenimiento, loadAll, cargarHistorico } = useMantenimientos();
  const { maquinarias } = useMaquinarias();
  const { obras } = useObras();
  const serviceAlerts: Array<{
    maquinaria: string;
    maquinariaId: string;
    unidad: "h" | "km";
    actual: number;
    limite: number;
    diff: number;
    pct: number;
    estado: "vencido" | "proximo";
  }> = [];
  const vencidosCount: number = 0;
  const proximosCount: number = 0;


  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [activeTab, setActiveTab] = useState("services");
  const [filters, setFilters] = useState<FilterState>({ fechaDesde: undefined, fechaHasta: undefined, mes: undefined, obraId: undefined });
  const [formOpen, setFormOpen] = useState(false);
  const [formType, setFormType] = useState<"service" | "reparacion">("service");
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedMant, setSelectedMant] = useState<MantenimientoWithRelations | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [reparacionPrefill, setReparacionPrefill] = useState<{ maquinaria_id?: string; observacion_reporte_id?: string; alerta_campo?: string } | undefined>();

  const filterItems = useCallback((items: MantenimientoWithRelations[]) => {
    return items.filter((m) => {
      if (filters.fechaDesde && new Date(m.fecha) < filters.fechaDesde) return false;
      if (filters.fechaHasta && new Date(m.fecha) > filters.fechaHasta) return false;
      const matchesSearch =
        m.maquinaria?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.maquinaria?.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.tecnico.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEstado = estadoFilter === "todos" || m.estado === estadoFilter;
      return matchesSearch && matchesEstado;
    });
  }, [filters, searchTerm, estadoFilter]);

  const services = useMemo(() => filterItems(mantenimientos.filter(m => m.tipo === "preventivo")), [mantenimientos, filterItems]);
  const reparaciones = useMemo(() => filterItems(mantenimientos.filter(m => m.tipo === "correctivo" || m.tipo === "emergencia")), [mantenimientos, filterItems]);




  const handleNew = (type: "service" | "reparacion") => {
    setFormType(type);
    setIsEditing(false);
    setSelectedMant(null);
    setReparacionPrefill(undefined);
    setFormOpen(true);
  };

  const handleEdit = (mant: MantenimientoWithRelations) => {
    setFormType(mant.tipo === "preventivo" ? "service" : "reparacion");
    setIsEditing(true);
    setSelectedMant(mant);
    setReparacionPrefill(undefined);
    setFormOpen(true);
  };

  const handleView = (mant: MantenimientoWithRelations) => { setSelectedMant(mant); setDetailOpen(true); };
  const handleDelete = (mant: MantenimientoWithRelations) => { setSelectedMant(mant); setDeleteOpen(true); };
  const confirmDelete = async () => { if (selectedMant) await deleteMantenimiento(selectedMant.id); setDeleteOpen(false); };

  const updateStatus = async (mant: MantenimientoWithRelations, newStatus: EstadoMantenimiento) => {
    await updateMantenimiento(mant.id, { estado: newStatus });
  };

  const handleExportExcel = (items: MantenimientoWithRelations[], filename: string) => {
    const rows = items.map(m => ({
      Fecha: m.fecha,
      Máquina: [m.maquinaria?.codigo, m.maquinaria?.nombre].filter(Boolean).join(" - "),
      Tipo: TIPO_CONFIG[m.tipo as keyof typeof TIPO_CONFIG]?.label || m.tipo,
      Estado: ESTADO_CONFIG[m.estado as keyof typeof ESTADO_CONFIG]?.label || m.estado,
      Descripción: m.descripcion,
      Técnico: m.tecnico,
      "Horas Máquina": m.horas_maquina,
      Kilómetros: m.kilometros,
      "Costo Total": m.costo_total,
      Repuestos: m.repuestos || "",
      Observaciones: m.observaciones || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mantenimientos");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const renderStats = (items: MantenimientoWithRelations[], showAlerts = false) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="card-industrial p-4 flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-foreground">{items.length}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </div>
        <Wrench className="w-8 h-8 text-primary" />
      </div>
      {Object.entries(ESTADO_CONFIG).map(([key, config]) => {
        const count = items.filter(m => m.estado === key).length;
        return (
          <div key={key} className="card-industrial p-4 flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <p className="text-sm text-muted-foreground">{config.label}</p>
            </div>
            <span className="text-2xl">{config.emoji}</span>
          </div>
        );
      })}
      {showAlerts && vencidosCount > 0 && (
        <div className="card-industrial p-4 flex items-center justify-between border-destructive/50">
          <div>
            <p className="text-2xl font-bold text-destructive">{vencidosCount}</p>
            <p className="text-sm text-destructive">Service vencido</p>
          </div>
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
      )}
      {showAlerts && proximosCount > 0 && (
        <div className="card-industrial p-4 flex items-center justify-between border-orange-500/50">
          <div>
            <p className="text-2xl font-bold text-orange-500">{proximosCount}</p>
            <p className="text-sm text-orange-500">Service próximo</p>
          </div>
          <Clock className="w-8 h-8 text-orange-500" />
        </div>
      )}
    </div>
  );

  const renderCard = (mant: MantenimientoWithRelations, index: number) => {
    const estadoCfg = ESTADO_CONFIG[mant.estado as keyof typeof ESTADO_CONFIG];
    const tipoCfg = TIPO_CONFIG[mant.tipo as keyof typeof TIPO_CONFIG];
    const isOverdue = serviceAlerts.some(a => a.maquinariaId === mant.maquinaria_id && a.estado === "vencido");

    return (
      <Card
        key={mant.id}
        className={cn("card-industrial animate-fade-in hover:border-primary/30 transition-all", isOverdue && "border-destructive/50")}
        style={{ animationDelay: `${index * 30}ms` }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center",
                mant.tipo === "preventivo" ? "bg-blue-500/20" : "bg-orange-500/20"
              )}>
                {mant.tipo === "preventivo" ? <ShieldCheck className="w-6 h-6 text-blue-500" /> : <Wrench className="w-6 h-6 text-orange-500" />}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{mant.maquinaria?.codigo || mant.maquinaria?.nombre || "-"}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(mant.fecha)}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-border">
                <DropdownMenuItem onClick={() => handleView(mant)} className="cursor-pointer">
                  <Eye className="w-4 h-4 mr-2" /> Ver detalle
                </DropdownMenuItem>
                {mant.estado === "pendiente" && (
                  <DropdownMenuItem onClick={() => updateStatus(mant, "en_proceso")} className="cursor-pointer text-primary">
                    <Play className="w-4 h-4 mr-2" /> Iniciar
                  </DropdownMenuItem>
                )}
                {mant.estado === "en_proceso" && (
                  <DropdownMenuItem onClick={() => updateStatus(mant, "completado")} className="cursor-pointer text-green-600">
                    <CheckCircle className="w-4 h-4 mr-2" /> Finalizar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleEdit(mant)} className="cursor-pointer">
                  <Edit className="w-4 h-4 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDelete(mant)} className="text-destructive cursor-pointer">
                  <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn("status-badge", tipoCfg?.className)}>{tipoCfg?.label}</Badge>
            <Badge className={cn("status-badge", estadoCfg?.className)}>{estadoCfg?.emoji} {estadoCfg?.label}</Badge>
            {isOverdue && <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">Service vencido</Badge>}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{mant.descripcion}</p>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> {mant.horas_maquina} h
              {mant.kilometros > 0 && <> · {mant.kilometros} km</>}
            </span>
            {mant.costo_total > 0 && (
              <span className="font-bold text-foreground flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-primary" />
                {formatCurrency(mant.costo_total)}
              </span>
            )}
          </div>
          {mant.alerta_campo && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-xs text-destructive line-clamp-1">{mant.alerta_campo}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderFiltersAndActions = (type: "service" | "reparacion") => (
    <>
      <HistoricoBanner
        loadAll={loadAll}
        onCargarHistorico={cargarHistorico}
        diasMostrados={180}
        label="mantenimientos"
      />
      <div className="mb-4">
        <FilterBar obras={obras} onFilterChange={setFilters} showObraFilter={false} />
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por máquina, descripción, técnico..."
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
              {Object.entries(ESTADO_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.emoji} {config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => handleExportExcel(type === "service" ? services : reparaciones, type === "service" ? "services" : "reparaciones")}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button onClick={() => handleNew(type)}>
            <Plus className="w-4 h-4 mr-2" />
            {type === "service" ? "Nuevo Service" : "Nueva Reparación"}
          </Button>
        </div>
      </div>
    </>
  );

  if (loading) {
    return (
      <MainLayout title="Mantenimiento" subtitle="Services y Reparaciones">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Mantenimiento" subtitle="Services y Reparaciones">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="services" className="gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Services
          </TabsTrigger>
          <TabsTrigger value="reparaciones" className="gap-1.5">
            <Wrench className="w-4 h-4" /> Reparaciones
          </TabsTrigger>
          <TabsTrigger value="reportes" className="relative gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Reportes
          </TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services">
          {renderFiltersAndActions("service")}
          {serviceAlerts.length > 0 && (
            <div className={cn(
              "mb-4 rounded-lg border overflow-hidden",
              vencidosCount > 0 ? "border-destructive/30 bg-destructive/5" : "border-orange-500/30 bg-orange-500/5"
            )}>
              <div className={cn(
                "flex items-center gap-2 px-4 py-2.5 border-b",
                vencidosCount > 0 ? "bg-destructive/10 border-destructive/20" : "bg-orange-500/10 border-orange-500/20"
              )}>
                <AlertTriangle className={cn("w-4 h-4", vencidosCount > 0 ? "text-destructive" : "text-orange-500")} />
                <p className={cn("text-sm font-semibold", vencidosCount > 0 ? "text-destructive" : "text-orange-500")}>
                  Services vencidos o próximos ({serviceAlerts.length})
                  {vencidosCount > 0 && ` — ${vencidosCount} vencido${vencidosCount === 1 ? "" : "s"}`}
                  {proximosCount > 0 && ` · ${proximosCount} próximo${proximosCount === 1 ? "" : "s"}`}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-muted-foreground border-b border-border/50">
                      <th className="px-4 py-2 font-medium">Máquina</th>
                      <th className="px-4 py-2 font-medium">Unidad</th>
                      <th className="px-4 py-2 font-medium text-right">Actual</th>
                      <th className="px-4 py-2 font-medium text-right">Próximo service</th>
                      <th className="px-4 py-2 font-medium text-right">Diferencia</th>
                      <th className="px-4 py-2 font-medium w-[25%]">Progreso</th>
                      <th className="px-4 py-2 font-medium text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceAlerts.map((a, i) => {
                      const pct = Math.min(150, a.pct);
                      const vencido = a.estado === "vencido";
                      const barColor = vencido ? "bg-destructive" : pct >= 90 ? "bg-orange-500" : "bg-green-500";
                      const maq = maquinarias.find(m => m.id === a.maquinariaId);
                      const unidadLabel = a.unidad === "h" ? "Horas" : "KM";
                      const sufijo = a.unidad === "h" ? "h" : "km";
                      return (
                        <tr key={`${a.maquinariaId}-${a.unidad}`} className="border-b border-border/30 last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-2.5 font-semibold text-foreground">{a.maquinaria}</td>
                          <td className="px-4 py-2.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                vencido ? "border-destructive/40 text-destructive" : "border-orange-500/40 text-orange-500"
                              )}
                            >
                              {unidadLabel} · {vencido ? "Vencido" : "Próximo"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums text-foreground">
                            {a.actual.toLocaleString()} {sufijo}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums text-muted-foreground">
                            {a.limite.toLocaleString()} {sufijo}
                          </td>
                          <td className={cn(
                            "px-4 py-2.5 text-right font-mono tabular-nums font-semibold",
                            vencido ? "text-destructive" : "text-orange-500"
                          )}>
                            {vencido ? "+" : ""}{a.diff.toLocaleString()} {sufijo}
                            {!vencido && <span className="ml-1 text-[10px] text-muted-foreground">restantes</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn("h-full transition-all", barColor)}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                              <span className="text-xs font-mono tabular-nums text-muted-foreground w-12 text-right">
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                setFormType("service");
                                setIsEditing(false);
                                setSelectedMant(maq ? ({ maquinaria_id: maq.id } as any) : null);
                                setReparacionPrefill(undefined);
                                setFormOpen(true);
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Registrar service
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="px-4 py-2 text-[11px] text-muted-foreground bg-muted/30 border-t border-border/50">
                <strong>Actual</strong>: horas o kilómetros acumulados (sincronizados con partes diarios).{" "}
                <strong>Próximo service</strong>: valor previsto en el último service registrado.{" "}
                Un vehículo aparece por HR, por KM o por ambos según cómo se controle.
              </p>
            </div>
          )}
          {renderStats(services, true)}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((m, i) => renderCard(m, i))}
          </div>
          {services.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay services registrados</p>
            </div>
          )}
        </TabsContent>

        {/* Reparaciones Tab */}
        <TabsContent value="reparaciones">
          {renderFiltersAndActions("reparacion")}
          {renderStats(reparaciones)}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reparaciones.map((m, i) => renderCard(m, i))}
          </div>
          {reparaciones.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay reparaciones registradas</p>
            </div>
          )}
        </TabsContent>

        {/* Reportes de Campo */}
        <TabsContent value="reportes">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Reportes de campo pendientes de migración</AlertTitle>
            <AlertDescription>
              Services y reparaciones ya operan sobre Supabase v2. Esta pestaña conserva su lugar sin consultar el backend legacy.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isEditing
          ? (formType === "service" ? "Editar Service" : "Editar Reparación")
          : (formType === "service" ? "Nuevo Service" : "Nueva Reparación")}
        size="xl"
        isDirty
      >
        {formType === "service" ? (
          <ServiceForm
            onClose={() => setFormOpen(false)}
            editData={isEditing ? selectedMant : null}
          />
        ) : (
          <ReparacionForm
            onClose={() => setFormOpen(false)}
            editData={isEditing ? selectedMant : null}
            prefill={reparacionPrefill}
          />
        )}
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={selectedMant?.tipo === "preventivo" ? "Detalle de Service" : "Detalle de Reparación"}
      >
        {selectedMant && <MantenimientoDetail mant={selectedMant} />}
      </DetailDialog>

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Eliminar Registro"
        description="¿Estás seguro de eliminar este registro de mantenimiento? Esta acción no se puede deshacer."
      />
    </MainLayout>
  );
}

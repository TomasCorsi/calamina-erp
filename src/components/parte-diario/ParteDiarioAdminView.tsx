import { useState, useMemo, useCallback, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { useUrlTab, useUrlSearch, useUrlFilters, useUrlState } from "@/hooks/useUrlState";
import { 
  Loader2, 
  Eye, 
  Clock, 
  AlertCircle,
  CheckCircle,
  FileText,
  ArrowLeft,
  BarChart3,
  List,
  Trash2,
  Pencil,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Download,
  UserX,
  Building2,
  ShieldCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useParteDiarioAdmin, type ParteDiarioAdminFilters } from "@/hooks/useParteDiarioAdmin";
import { ParteDiarioDetailDialog } from "./ParteDiarioDetailDialog";
import { ParteDiarioKPIs } from "./ParteDiarioKPIs";
import { ParteDiarioQuickFilters } from "./ParteDiarioQuickFilters";
import { ParteDiarioCardView } from "./ParteDiarioCardView";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { ParteDiarioEditDialog } from "./ParteDiarioEditDialog";
import type { ParteDiario } from "@/hooks/useParteDiario";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";
import { mapParteDiario, PARTE_DIARIO_SELECT } from "@/hooks/parteDiarioAdapter";
import { useParteDiarioCatalogs } from "@/hooks/useParteDiarioCatalogs";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROL_LABELS: Record<string, string> = {
  maquinista: 'Maquinista',
  chofer: 'Chofer',
  capataz: 'Capataz',
  mecanico: 'Mecánico',
  sereno: 'Sereno',
  topografo: 'Topógrafo',
  ayudante: 'Ayudante',
  administrativo: 'Administrativo',
};

const PAGE_SIZE_OPTIONS = [25, 50, 100];

interface ParteDiarioAdminViewProps {
  onBack?: () => void;
}

export const ParteDiarioAdminView = ({ onBack }: ParteDiarioAdminViewProps) => {
  // Persistent state (URL + sessionStorage)
  const [activeTab, setActiveTab] = useUrlTab("listado");
  const [searchTerm, setSearchTerm] = useUrlSearch("");
  const [viewMode, setViewMode] = useUrlState<"tabla" | "tarjetas">({
    key: "vista",
    defaultValue: "tabla",
    serialize: (v) => v,
    deserialize: (v) => v as "tabla" | "tarjetas",
  });
  const [urlFilters, setUrlFilters] = useUrlFilters({});
  
  // Local state (not persisted)
  const [selectedParte, setSelectedParte] = useState<ParteDiario | null>(null);
  const [parteToEdit, setParteToEdit] = useState<ParteDiario | null>(null);
  const [parteToDelete, setParteToDelete] = useState<ParteDiario | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isExportingAll, setIsExportingAll] = useState(false);

  
  // Convert URL filters to ParteDiarioAdminFilters format
  const filters: ParteDiarioAdminFilters = useMemo(() => ({
    fechaDesde: urlFilters.fechaDesde,
    fechaHasta: urlFilters.fechaHasta,
    obraId: urlFilters.obraId,
    estado: (urlFilters.estado as 'borrador' | 'completado' | '') || '',
  }), [urlFilters]);
  
  // Wrapper to convert ParteDiarioAdminFilters back to UrlFilterState
  const handleFiltersChange = useCallback((newFilters: ParteDiarioAdminFilters) => {
    setUrlFilters({
      fechaDesde: newFilters.fechaDesde,
      fechaHasta: newFilters.fechaHasta,
      obraId: newFilters.obraId,
      estado: newFilters.estado || undefined,
    });
    setCurrentPage(1); // Reset page on filter change
  }, [setUrlFilters]);
  
  const { partes, isLoading, updateParte, isUpdating, deleteParte, isDeleting } = useParteDiarioAdmin(filters);
  const { personal, obras, maquinarias } = useParteDiarioCatalogs();


  // Filter partes by search term (employee name)
  const filteredPartes = useMemo(() => {
    if (!searchTerm.trim()) return partes;
    const term = searchTerm.toLowerCase();
    return partes.filter((parte) => {
      const nombre = parte.personal?.nombre?.toLowerCase() || "";
      const apellido = parte.personal?.apellido?.toLowerCase() || "";
      return nombre.includes(term) || apellido.includes(term) || `${nombre} ${apellido}`.includes(term);
    });
  }, [partes, searchTerm]);

  // KPIs calculations
  const kpis = useMemo(() => ({
    total: filteredPartes.length,
    completados: filteredPartes.filter(p => p.estado === 'completado').length,
    borradores: filteredPartes.filter(p => p.estado === 'borrador').length,
    empleadosUnicos: new Set(filteredPartes.map(p => p.personal_id)).size,
  }), [filteredPartes]);

  // Pagination
  const totalPages = Math.ceil(filteredPartes.length / pageSize);
  const paginatedPartes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPartes.slice(start, start + pageSize);
  }, [filteredPartes, currentPage, pageSize]);

  // Reset page when search/pageSize changes (useEffect, not useMemo)
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize]);


  const formatTime = (time: string | null) => {
    if (!time) return "-";
    return time.slice(0, 5);
  };

  const getEmpleadoNombre = (parte: ParteDiario) => {
    if (!parte.personal) return "Sin asignar";
    const { nombre, apellido } = parte.personal;
    return [nombre, apellido].filter(Boolean).join(" ") || "Sin nombre";
  };

  const getEmpleadoRol = (parte: ParteDiario) => {
    if (!parte.personal) return "";
    return ROL_LABELS[parte.personal.rol] || parte.personal.rol;
  };

  const getMaquinariaLabel = (parte: ParteDiario) => {
    if (!parte.maquinarias) return "-";
    const { codigo, tipo, patente } = parte.maquinarias;
    return codigo || tipo + (patente ? ` (${patente})` : "");
  };

  const buildExportRows = (rows: ParteDiario[]) =>
    rows.map((p) => ({
      Fecha: format(parseISO(p.fecha), "dd/MM/yyyy"),
      Empleado: getEmpleadoNombre(p),
      Rol: getEmpleadoRol(p),
      Obra: p.obras?.nombre || "-",
      Máquina: getMaquinariaLabel(p),
      "Hora Entrada": p.hora_entrada || "-",
      "Hora Salida": p.hora_salida || "-",
      "Horómetro Inicio": p.horometro_inicio ?? "-",
      "Horómetro Fin": p.horometro_fin ?? "-",
      Combustible: p.combustible ?? "-",
      "Cantidad Viajes": p.cantidad_viajes ?? "-",
      "Mov. Interno": p.cantidad_movimiento_interno ?? "-",
      "Estado Máquina": p.estado_maquina || "-",
      "Obs. Máquina": p.observacion_maquina || "-",
      "Filtro Aire": p.check_filtro_aire ? "Si" : "No",
      "Aceite Motor": p.check_aceite_motor ? "Si" : "No",
      "Aceite Hidráulico": p.check_aceite_hidraulico ? "Si" : "No",
      "Líq. Refrigerante": p.check_liquido_refrigerante ? "Si" : "No",
      "Uría": p.check_uria ? "Si" : "No",
      Estado: p.estado === 'completado' ? 'Completado' : 'Borrador',
      Novedades: p.novedades || "-",
      Tareas: p.tareas || "-",
      "Ausencias": p.ausencias?.length
        ? p.ausencias.map(id => {
            const emp = personal.find(e => e.id === id);
            return emp ? `${emp.apellido}, ${emp.nombre}` : id;
          }).join("; ")
        : "-",
      "Obs./Inconvenientes": p.observaciones_inconvenientes || "-",
    }));

  const downloadExcel = async (rows: ParteDiario[], fileName: string) => {
    const XLSX = await import("xlsx");
    const exportData = buildExportRows(rows);


    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-adjust column widths
    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
      wch: Math.max(
        key.length,
        ...exportData.map((row) => String(row[key as keyof typeof row] || "").length)
      ),
    }));
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Partes Diarios");
    XLSX.writeFile(wb, fileName);
  };

  const handleExportExcel = () =>
    downloadExcel(filteredPartes, `partes_diarios_${new Date().toISOString().split("T")[0]}.xlsx`);

  const handleExportHistorico = async () => {
    setIsExportingAll(true);
    try {
      const all: ParteDiario[] = [];
      const step = 1000;
      for (let from = 0; ; from += step) {
        const { data, error } = await supabase
          .from("partes_diarios")
          .select(PARTE_DIARIO_SELECT)
          .order("fecha", { ascending: false })
          .range(from, from + step - 1);
        if (error) throw error;
        const batch = (data ?? []).map((row) => mapParteDiario(row as Record<string, unknown>));
        all.push(...batch);
        if (batch.length < step) break;
      }
      if (all.length === 0) {
        toast.error("No hay partes diarios para exportar");
        return;
      }
      await downloadExcel(all, `partes_diarios_historico_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success(`Histórico exportado (${all.length} partes)`);
    } catch (e) {
      console.error(e);
      toast.error("Error al exportar el histórico completo");
    } finally {
      setIsExportingAll(false);
    }
  };


  if (isLoading && activeTab === "listado") {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header with back button */}
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Partes Diarios - Administración</h2>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="listado" className="gap-2">
              <List className="h-4 w-4" />
              Listado
            </TabsTrigger>
            <TabsTrigger value="rendimiento" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Rendimiento
            </TabsTrigger>
            <TabsTrigger value="por_obra" className="gap-2">
              <Building2 className="h-4 w-4" />
              Por Obra
            </TabsTrigger>
            <TabsTrigger value="faltantes" className="gap-2">
              <UserX className="h-4 w-4" />
              Faltantes
            </TabsTrigger>
          </TabsList>

          {/* Listado Tab */}
          <TabsContent value="listado" className="mt-4 space-y-4">
            {/* KPIs Panel */}
            <ParteDiarioKPIs 
              total={kpis.total}
              completados={kpis.completados}
              borradores={kpis.borradores}
              empleadosUnicos={kpis.empleadosUnicos}
              sinParteHoy={0}
            />

            <Card>
              <CardHeader className="pb-4">
                {/* Toolbar with Quick Filters */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
                    <CardTitle className="text-base">Listado de Partes</CardTitle>
                    <div className="flex items-center gap-2">
                      {/* View Toggle */}
                      <ToggleGroup 
                        type="single" 
                        value={viewMode} 
                        onValueChange={(v) => v && setViewMode(v as "tabla" | "tarjetas")}
                        className="border rounded-md"
                      >
                        <ToggleGroupItem value="tabla" size="sm" aria-label="Vista tabla">
                          <TableIcon className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="tarjetas" size="sm" aria-label="Vista tarjetas">
                          <LayoutGrid className="h-4 w-4" />
                        </ToggleGroupItem>
                      </ToggleGroup>

                      {/* Export Excel */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" disabled={isExportingAll}>
                            {isExportingAll ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-1" />
                            )}
                            Excel
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={handleExportExcel}
                            disabled={filteredPartes.length === 0}
                          >
                            Vista actual ({filteredPartes.length})
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleExportHistorico}>
                            Histórico completo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                    </div>
                  </div>

                  {/* Quick Filters Row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <ParteDiarioQuickFilters
                      filters={filters}
                      onFiltersChange={handleFiltersChange}
                      obras={obras}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {viewMode === "tabla" ? (
                  <>
                    {paginatedPartes.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No hay partes diarios que coincidan con los filtros</p>
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha / Empleado</TableHead>
                              <TableHead>Ubicación</TableHead>
                              <TableHead>Horario</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead className="w-[80px]">Acción</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedPartes.map((parte) => (
                              <TableRow 
                                key={parte.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => setSelectedParte(parte)}
                              >
                                <TableCell>
                                  <div>
                                    <div className="font-medium">
                                      {format(parseISO(parte.fecha), "dd/MM")} - {getEmpleadoNombre(parte)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {getEmpleadoRol(parte)}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="truncate max-w-[200px]">{parte.obras?.nombre || "-"}</div>
                                    <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                      {getMaquinariaLabel(parte)}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="flex items-center gap-1 text-sm">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(parte.hora_entrada)} → {formatTime(parte.hora_salida)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "text-xs",
                                      parte.estado === "borrador"
                                        ? "border-chart-3 text-chart-3 bg-chart-3/10"
                                        : "bg-chart-1/10 text-chart-1 border-chart-1/30"
                                    )}
                                  >
                                    {parte.estado === "borrador" ? (
                                      <><AlertCircle className="w-3 h-3 mr-1" /> Borrador</>
                                    ) : (
                                      <><CheckCircle className="w-3 h-3 mr-1" /> Completado</>
                                    )}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedParte(parte);
                                      }}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setParteToEdit(parte);
                                      }}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setParteToDelete(parte);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </>
                ) : (
                  <ParteDiarioCardView
                    partes={filteredPartes}
                    onView={setSelectedParte}
                    onEdit={setParteToEdit}
                    onDelete={setParteToDelete}
                  />
                )}
                
                {/* Pagination & Info */}
                {filteredPartes.length > 0 && viewMode === "tabla" && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        Mostrando {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredPartes.length)} de {filteredPartes.length}
                      </span>
                      <Select 
                        value={String(pageSize)} 
                        onValueChange={(v) => setPageSize(Number(v))}
                      >
                        <SelectTrigger className="w-[80px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAGE_SIZE_OPTIONS.map((size) => (
                            <SelectItem key={size} value={String(size)}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span>por página</span>
                    </div>

                    {totalPages > 1 && (
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                            />
                          </PaginationItem>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(pageNum)}
                                  isActive={currentPage === pageNum}
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </div>
                )}

                {filteredPartes.length > 0 && viewMode === "tarjetas" && (
                  <p className="text-sm text-muted-foreground mt-4">
                    Mostrando {filteredPartes.length} parte{filteredPartes.length !== 1 ? 's' : ''} diario{filteredPartes.length !== 1 ? 's' : ''}
                    {searchTerm && ` (filtrado de ${partes.length})`}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rendimiento Tab */}
          <TabsContent value="rendimiento" className="mt-4">
            <Alert><ShieldCheck className="h-4 w-4" /><AlertTitle>Rendimiento pendiente de migración</AlertTitle><AlertDescription>Esta sección conserva su ubicación visual, pero no ejecuta consultas legacy.</AlertDescription></Alert>
          </TabsContent>

          {/* Por Obra Tab */}
          <TabsContent value="por_obra" className="mt-4">
            <Alert><ShieldCheck className="h-4 w-4" /><AlertTitle>Rendimiento por obra pendiente de migración</AlertTitle><AlertDescription>La vista será habilitada cuando sus agregaciones v2 estén verificadas.</AlertDescription></Alert>
          </TabsContent>

          {/* Faltantes Tab */}
          <TabsContent value="faltantes" className="mt-4">
            <Alert><ShieldCheck className="h-4 w-4" /><AlertTitle>Faltantes pendiente de migración</AlertTitle><AlertDescription>La sección está aislada y no consulta el backend legacy.</AlertDescription></Alert>
          </TabsContent>
        </Tabs>
      </div>

      <ParteDiarioDetailDialog
        parte={selectedParte}
        open={!!selectedParte}
        onOpenChange={(open) => !open && setSelectedParte(null)}
        showEmpleado
        personalList={personal}
      />

      <ParteDiarioEditDialog
        parte={parteToEdit}
        open={!!parteToEdit}
        onOpenChange={(open) => !open && setParteToEdit(null)}
        onSave={async (id, data) => {
          await updateParte({ id, data });
          setParteToEdit(null);
        }}
        isSaving={isUpdating}
        obras={obras}
        maquinarias={maquinarias}
      />

      <DeleteConfirmDialog
        open={!!parteToDelete}
        onOpenChange={(open) => !open && setParteToDelete(null)}
        onConfirm={async () => {
          if (parteToDelete) {
            await deleteParte(parteToDelete.id);
            setParteToDelete(null);
          }
        }}
        title="¿Eliminar parte diario?"
        description={parteToDelete ? 
          `Se eliminará permanentemente el parte de ${parteToDelete.personal?.nombre || ''} ${parteToDelete.personal?.apellido || ''} del ${format(parseISO(parteToDelete.fecha), "dd/MM/yyyy")}.` 
          : "Esta acción no se puede deshacer."
        }
      />
    </>
  );
};

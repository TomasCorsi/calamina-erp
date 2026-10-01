import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
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
  FileText,
  Clock,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Send,
  MoreVertical,
  Trash2,
  Eye,
  Edit,
  Loader2,
  Download,
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
import { 
  useCotizaciones, 
  CotizacionWithRelations, 
  CotizacionForm, 
  CotizacionItemForm, 
  CotizacionCategoriaForm,
  CotizacionAnticipoForm,
  EstadoCotizacion 
} from "@/hooks/useCotizaciones";
import { useObras } from "@/hooks/useObras";
import { cn, formatDate } from "@/lib/utils";
import { CotizacionFormContent } from "@/components/cotizaciones/CotizacionFormContent";
import { CotizacionTable } from "@/components/cotizaciones/CotizacionTable";
import { generateCotizacionPDF } from "@/utils/generateCotizacionPDF";
import { toast } from "sonner";

const estadoConfig: Record<string, { label: string; icon: any; className: string }> = {
  borrador: { label: "Borrador", icon: FileText, className: "bg-muted/50 text-muted-foreground border-muted" },
  enviada: { label: "Enviada", icon: Send, className: "status-pending" },
  aprobada: { label: "Aprobada", icon: CheckCircle, className: "status-active" },
  rechazada: { label: "Rechazada", icon: XCircle, className: "status-error" },
  vencida: { label: "Vencida", icon: Clock, className: "status-inactive" },
};

function formatCurrency(value: number, moneda: string = "ARS"): string {
  if (moneda === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      currencyDisplay: "symbol",
      maximumFractionDigits: 0,
    }).format(value);
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Cotizaciones() {
  const { cotizaciones, loading, createCotizacion, updateCotizacion, deleteCotizacion } = useCotizaciones();
  const { obras } = useObras();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedCot, setSelectedCot] = useState<CotizacionWithRelations | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<CotizacionForm>({
    numero: "",
    obra_id: "",
    descripcion: "",
    fecha_creacion: new Date().toISOString().split("T")[0],
    fecha_vencimiento: "",
    responsable: "",
    subtotal: 0,
    iva: 0,
    total: 0,
    estado: "borrador",
    notas: "",
    anticipo_tipo: "ninguno",
    anticipo_valor: 0,
    anticipo_monto: 0,
  });

  const [categorias, setCategorias] = useState<CotizacionCategoriaForm[]>([]);
  const [items, setItems] = useState<CotizacionItemForm[]>([]);
  const [anticipos, setAnticipos] = useState<CotizacionAnticipoForm[]>([]);

  const filteredCotizaciones = cotizaciones.filter((cot) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (cot.numero ?? "").toLowerCase().includes(term) ||
      (cot.obra?.nombre ?? "").toLowerCase().includes(term) ||
      (cot.descripcion ?? "").toLowerCase().includes(term);
    const matchesEstado = estadoFilter === "todos" || cot.estado === estadoFilter;
    return matchesSearch && matchesEstado;
  });

  const generateNumero = () => {
    const year = new Date().getFullYear();
    let maxNum = 21; // Start from 022 minimum
    cotizaciones.forEach((c) => {
      const match = c.numero?.match(/^\d{4}-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `${year}-${(maxNum + 1).toString().padStart(3, "0")}`;
  };

  const handleNew = () => {
    setIsEditing(false);
    const vencimiento = new Date();
    vencimiento.setDate(vencimiento.getDate() + 15);
    
    setFormData({
      numero: generateNumero(),
      obra_id: "",
      descripcion: "",
      fecha_creacion: new Date().toISOString().split("T")[0],
      fecha_vencimiento: vencimiento.toISOString().split("T")[0],
      responsable: "",
      subtotal: 0,
      iva: 0,
      total: 0,
      estado: "borrador",
      notas: "",
      anticipo_tipo: "ninguno",
      anticipo_valor: 0,
      anticipo_monto: 0,
    });
    setCategorias([]);
    setItems([]);
    setAnticipos([]);
    setFormOpen(true);
  };

  const handleEdit = (cot: CotizacionWithRelations) => {
    setIsEditing(true);
    setSelectedCot(cot);
    setFormData({
      numero: cot.numero,
      obra_id: cot.obra_id || "",
      descripcion: cot.descripcion,
      fecha_creacion: cot.fecha_creacion,
      fecha_vencimiento: cot.fecha_vencimiento,
      responsable: cot.responsable,
      subtotal: cot.subtotal,
      iva: cot.iva,
      total: cot.total,
      estado: cot.estado,
      notas: cot.notas || "",
      moneda: cot.moneda || "ARS",
      anticipo_tipo: cot.anticipo_tipo || "ninguno",
      anticipo_valor: cot.anticipo_valor ?? 0,
      anticipo_monto: cot.anticipo_monto ?? 0,
    });
    
    // Map categories
    const catMap = new Map<string, number>();
    const mappedCategorias: CotizacionCategoriaForm[] = (cot.categorias || [])
      .sort((a, b) => a.numero - b.numero)
      .map((cat, index) => {
        catMap.set(cat.id, index);
        return {
          numero: cat.numero,
          nombre: cat.nombre,
          orden: cat.orden,
        };
      });
    
    // Map items (sorted by numero so the saved order is preserved: 1.1, 1.2, 2.1...)
    const numeroKey = (n: string) =>
      (n || "").split(".").map((p) => parseInt(p, 10) || 0);
    const mappedItems: CotizacionItemForm[] = [...(cot.items || [])]
      .sort((a, b) => {
        const na = numeroKey(a.numero || "");
        const nb = numeroKey(b.numero || "");
        for (let i = 0; i < Math.max(na.length, nb.length); i++) {
          const diff = (na[i] || 0) - (nb[i] || 0);
          if (diff !== 0) return diff;
        }
        return 0;
      })
      .map(item => ({
        categoria_index: item.categoria_id ? catMap.get(item.categoria_id) : undefined,
        numero: item.numero || "",
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidad: item.cantidad,
        cantidad_m2: item.cantidad_m2 || 0,
        altura_promedio: item.altura_promedio || 0,
        cantidad_m3: item.cantidad_m3 || 0,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
        total: item.total || item.subtotal,
      }));

    
    setCategorias(mappedCategorias);
    setItems(mappedItems);
    setAnticipos(
      [...(cot.anticipos || [])]
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
        .map((a) => ({
          descripcion: a.descripcion || "",
          tipo: a.tipo || "monto",
          valor: Number(a.valor) || 0,
          monto: Number(a.monto) || 0,
        }))
    );
    setFormOpen(true);
  };

  const handleView = (cot: CotizacionWithRelations) => {
    setSelectedCot(cot);
    setDetailOpen(true);
  };

  const handleDelete = (cot: CotizacionWithRelations) => {
    setSelectedCot(cot);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedCot) {
      await deleteCotizacion(selectedCot.id);
    }
    setDeleteOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (isEditing && selectedCot) {
      await updateCotizacion(selectedCot.id, formData, categorias, items, anticipos);
    } else {
      await createCotizacion(formData, categorias, items, anticipos);
    }
    
    setIsSubmitting(false);
    setFormOpen(false);
  };

  const updateStatus = async (cot: CotizacionWithRelations, newStatus: EstadoCotizacion) => {
    await updateCotizacion(cot.id, { estado: newStatus });
  };

  const handleDownloadPDF = async (cot: CotizacionWithRelations) => {
    try {
      await generateCotizacionPDF(cot, cot.obra?.nombre);
      toast.success("PDF generado correctamente");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Error al generar el PDF");
    }
  };

  if (loading) {
    return (
      <MainLayout title="Cotizaciones" subtitle="Presupuestos y propuestas comerciales">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Cotizaciones" subtitle="Presupuestos y propuestas comerciales">
      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, obra o descripción..."
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
            Nueva Cotización
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(estadoConfig).map(([key, config]) => {
          const count = cotizaciones.filter((c) => c.estado === key).length;
          const total = cotizaciones
            .filter((c) => c.estado === key)
            .reduce((sum, c) => sum + c.total, 0);
          return (
            <div key={key} className="card-industrial p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={cn("status-badge", config.className)}>
                  {config.label}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(total)}</p>
            </div>
          );
        })}
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCotizaciones.map((cot, index) => {
          const config = estadoConfig[cot.estado];
          const Icon = config.icon;
          return (
            <Card
              key={cot.id}
              className="card-industrial animate-fade-in hover:border-primary/30 transition-all cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => handleView(cot)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono text-primary">{cot.numero}</span>
                    <h3 className="font-semibold text-foreground mt-1">{cot.obra?.nombre || "Sin obra asignada"}</h3>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover border-border">
                      <DropdownMenuItem onClick={() => handleView(cot)} className="cursor-pointer">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver detalle
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownloadPDF(cot)} className="cursor-pointer">
                        <Download className="w-4 h-4 mr-2" />
                        Descargar PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(cot)} className="cursor-pointer">
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {cot.estado === "borrador" && (
                        <DropdownMenuItem onClick={() => updateStatus(cot, "enviada")} className="cursor-pointer">
                          <Send className="w-4 h-4 mr-2" />
                          Enviar
                        </DropdownMenuItem>
                      )}
                      {cot.estado === "enviada" && (
                        <>
                          <DropdownMenuItem onClick={() => updateStatus(cot, "aprobada")} className="cursor-pointer text-success">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Aprobar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(cot, "rechazada")} className="cursor-pointer text-destructive">
                            <XCircle className="w-4 h-4 mr-2" />
                            Rechazar
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem onClick={() => handleDelete(cot)} className="cursor-pointer text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {cot.descripcion}
                </p>

                <div className="flex items-center justify-between mb-3">
                  <Badge className={cn("status-badge", config.className)}>
                    <Icon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {cot.moneda || "ARS"}
                    </p>
                    <span className="text-lg font-bold text-foreground">
                      {formatCurrency(cot.total, cot.moneda)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Creación: {formatDate(cot.fecha_creacion)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Vence: {formatDate(cot.fecha_vencimiento)}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t border-border">
                <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {cot.responsable}
                  </span>
                  <span>
                    {cot.categorias?.length || 0} rubros · {cot.items?.length || 0} ítems
                  </span>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Form Dialog */}
      <FormDialog
        isDirty
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isEditing ? "Editar Cotización" : "Nueva Cotización"}
        size="full"
      >
        <CotizacionFormContent
          formData={formData}
          setFormData={setFormData}
          categorias={categorias}
          setCategorias={setCategorias}
          items={items}
          setItems={setItems}
          anticipos={anticipos}
          setAnticipos={setAnticipos}
          obras={obras}
          isEditing={isEditing}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </FormDialog>

      {/* Detail Dialog */}
      <DetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title="Detalle de Cotización"
        size="2xl"
      >
        {selectedCot && (
          <div className="space-y-6">
            {/* Header Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Número</p>
                <p className="font-mono font-bold text-primary text-lg">{selectedCot.numero}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Obra</p>
                <p className="font-semibold text-foreground">{selectedCot.obra?.nombre || "Sin asignar"}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Estado</p>
                <Badge className={cn("status-badge mt-1", estadoConfig[selectedCot.estado].className)}>
                  {estadoConfig[selectedCot.estado].label}
                </Badge>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{selectedCot.moneda || "ARS"}</p>
                <p className="font-bold text-primary text-xl">{formatCurrency(selectedCot.total, selectedCot.moneda)}</p>
              </div>
            </div>

            {/* Secondary Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span>Responsable: <span className="text-foreground font-medium">{selectedCot.responsable}</span></span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Creación: <span className="text-foreground font-medium">{selectedCot.fecha_creacion}</span></span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Vencimiento: <span className="text-foreground font-medium">{selectedCot.fecha_vencimiento}</span></span>
              </div>
            </div>

            {/* Description */}
            {selectedCot.descripcion && (
              <div className="bg-muted/20 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase">Descripción</p>
                <p className="text-sm text-foreground">{selectedCot.descripcion}</p>
              </div>
            )}
            
            {/* Items Table */}
            {selectedCot.items && selectedCot.items.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase">Detalle de Ítems</p>
                <CotizacionTable
                  items={selectedCot.items}
                  categorias={selectedCot.categorias || []}
                  subtotal={selectedCot.subtotal}
                  iva={selectedCot.iva}
                  total={selectedCot.total}
                  anticipoMonto={selectedCot.anticipo_monto}
                  anticipoTipo={selectedCot.anticipo_tipo}
                  anticipoValor={selectedCot.anticipo_valor}
                  anticipos={selectedCot.anticipos}
                />
              </div>
            )}

            {/* Notes */}
            {selectedCot.notas && (
              <div className="bg-muted/20 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase">Notas</p>
                <p className="text-sm text-foreground whitespace-pre-line">{selectedCot.notas}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-border">
              <Button 
                onClick={() => handleDownloadPDF(selectedCot)}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setDetailOpen(false);
                  handleEdit(selectedCot);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>
        )}
      </DetailDialog>

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Eliminar Cotización"
        description={`¿Estás seguro de que deseas eliminar la cotización "${selectedCot?.numero}"? Esta acción no se puede deshacer.`}
      />
    </MainLayout>
  );
}

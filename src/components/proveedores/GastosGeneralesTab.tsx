import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  Receipt,
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
import {
  useOtrosGastos,
  OtroGastoWithRelations,
  OtroGastoForm,
  categoriasGasto,
  CategoriaGasto,
} from "@/hooks/useOtrosGastos";
import { useObras } from "@/hooks/useObras";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { Combobox } from "@/components/ui/combobox";
import { SECTORES } from "./sectores";
import { cn, formatDate } from "@/lib/utils";


function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function GastosGeneralesTab() {
  const { gastos, createGasto, updateGasto, deleteGasto } = useOtrosGastos();
  const { obras } = useObras();
  const { maquinarias } = useMaquinarias();

  const proveedorOptions = useMemo(() => {
    const existentes = Array.from(new Set(gastos.map((g) => g.proveedor).filter(Boolean)))
      .sort()
      .map((nombre) => ({ value: nombre!, label: nombre! }));
    return [{ value: "__none__", label: "Sin proveedor" }, ...existentes];
  }, [gastos]);

  const maquinariaLabel = (m: { codigo?: string | null; nombre?: string | null; patente?: string | null }) => {
    const parts: string[] = [];
    if (m.codigo) parts.push(m.codigo);
    if (m.patente) parts.push(m.patente);
    if (m.nombre) parts.push(m.nombre);
    return parts.length ? parts.join(" · ") : "Sin identificar";
  };

  const maquinariaOptions = useMemo(() => {
    const activas = maquinarias
      .filter((m) => m.estado !== "inactiva")
      .sort((a, b) => (a.codigo || "").localeCompare(b.codigo || ""))
      .map((m) => ({
        value: m.id,
        label: maquinariaLabel(m),
      }));
    return [{ value: "__none__", label: "Sin maquinaria" }, ...activas];
  }, [maquinarias]);

  const [searchTerm, setSearchTerm] = useState("");
  const [maquinariaFiltro, setMaquinariaFiltro] = useState<string>("__all__");
  const [filters, setFilters] = useState<FilterState>({
    fechaDesde: undefined,
    fechaHasta: undefined,
    mes: undefined,
    obraId: undefined,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<OtroGastoWithRelations | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const [formData, setFormData] = useState<OtroGastoForm>({
    fecha: new Date().toISOString().split("T")[0],
    obra_id: null,
    maquinaria_id: null,
    sector: null,
    categoria: "varios",
    descripcion: "",
    monto: 0,
    comprobante: "",
    proveedor: "",
    observaciones: "",
  });


  const activeObras = useMemo(() => obras.filter((o) => o.estado !== "finalizada"), [obras]);


  const filtered = useMemo(() => {
    const dateFiltered = filterByDateAndObra(
      gastos.map((g) => ({ ...g, fecha: g.fecha, obra_id: g.obra_id })),
      filters
    );
    const q = searchTerm.toLowerCase();
    return dateFiltered.filter((g) => {
      if (maquinariaFiltro !== "__all__") {
        if (maquinariaFiltro === "__none__" ? !!g.maquinaria_id : g.maquinaria_id !== maquinariaFiltro) {
          return false;
        }
      }
      if (!q) return true;
      return (
        g.descripcion?.toLowerCase().includes(q) ||
        g.proveedor?.toLowerCase().includes(q) ||
        g.obra?.nombre?.toLowerCase().includes(q) ||
        g.maquinaria?.codigo?.toLowerCase().includes(q) ||
        g.maquinaria?.patente?.toLowerCase().includes(q) ||
        g.maquinaria?.nombre?.toLowerCase().includes(q)
      );
    });
  }, [gastos, filters, searchTerm, maquinariaFiltro]);

  // Reset page when filters/search change
  useEffect(() => {
    setPage(0);
  }, [filters, searchTerm, maquinariaFiltro]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = useMemo(
    () => filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [filtered, currentPage]
  );



  const totalCosto = filtered.reduce((sum, g) => sum + g.monto, 0);

  const handleNew = () => {
    setIsEditing(false);
    setFormData({
      fecha: new Date().toISOString().split("T")[0],
      obra_id: null,
      maquinaria_id: null,
      sector: null,
      categoria: "varios",
      descripcion: "",
      monto: 0,
      comprobante: "",
      proveedor: "",
      observaciones: "",
    });
    setFormOpen(true);
  };

  const handleEdit = (g: OtroGastoWithRelations) => {
    setIsEditing(true);
    setSelected(g);
    setFormData({
      fecha: g.fecha,
      obra_id: g.obra_id,
      maquinaria_id: g.maquinaria_id,
      sector: g.sector || null,
      categoria: g.categoria,
      descripcion: g.descripcion,
      monto: g.monto,
      comprobante: g.comprobante || "",
      proveedor: g.proveedor || "",
      observaciones: g.observaciones || "",
    });
    setFormOpen(true);
  };

  const handleView = (g: OtroGastoWithRelations) => {
    setSelected(g);
    setDetailOpen(true);
  };

  const handleDelete = (g: OtroGastoWithRelations) => {
    setSelected(g);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selected) await deleteGasto(selected.id);
    setDeleteOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const data = {
      fecha: formData.fecha || null,
      obra_id: formData.obra_id || null,
      maquinaria_id: formData.maquinaria_id || null,
      sector: formData.sector || null,
      categoria: formData.categoria || "varios",
      descripcion: formData.descripcion || "",
      monto: formData.monto || 0,
      comprobante: formData.comprobante || null,
      proveedor: formData.proveedor || null,
      observaciones: formData.observaciones || null,
    };
    if (isEditing && selected) {
      await updateGasto(selected.id, data);
    } else {
      await createGasto(data);
    }
    setIsSubmitting(false);
    setFormOpen(false);
  };


  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            Gastos Generales
          </h2>
          <p className="text-sm text-muted-foreground">
            Gastos informales sin OC (proveedor opcional, sin IVA)
          </p>
        </div>
      </div>

      <div className="mb-4">
        <FilterBar obras={obras} onFilterChange={setFilters} />
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por descripción, proveedor, obra o maquinaria (código/patente)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="w-full md:w-72">
          <Combobox
            options={[{ value: "__all__", label: "Todas las maquinarias" }, ...maquinariaOptions]}
            value={maquinariaFiltro}
            onValueChange={setMaquinariaFiltro}
            placeholder="Filtrar por maquinaria"
            searchPlaceholder="Buscar por código o patente..."
            emptyText="Sin resultados"
          />
        </div>
        <Button onClick={handleNew} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Gasto
        </Button>
      </div>


      {/* Stats by category */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {Object.entries(categoriasGasto).map(([key, config]) => {
          const total = filtered
            .filter((g) => g.categoria === key)
            .reduce((sum, g) => sum + g.monto, 0);
          return (
            <div key={key} className="card-industrial p-3 text-center">
              <p className="text-lg font-bold text-foreground">{formatCurrency(total)}</p>
              <Badge className={cn("status-badge text-[10px] mt-1", config.color)}>
                {config.label}
              </Badge>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="card-industrial p-4 flex items-center justify-between mb-6">
        <div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalCosto)}</p>
          <p className="text-sm text-muted-foreground">Total Gastos Generales</p>
        </div>
        <DollarSign className="w-8 h-8 text-warning" />
      </div>

      {/* Table */}
      <div className="card-industrial overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">Fecha</TableHead>
              <TableHead className="text-muted-foreground font-medium">Obra</TableHead>
              <TableHead className="text-muted-foreground font-medium">Maquinaria</TableHead>
              <TableHead className="text-muted-foreground font-medium">Sector</TableHead>
              <TableHead className="text-muted-foreground font-medium">Categoría</TableHead>
              <TableHead className="text-muted-foreground font-medium">Descripción</TableHead>
              <TableHead className="text-muted-foreground font-medium">Proveedor</TableHead>
              <TableHead className="text-muted-foreground font-medium">Monto</TableHead>
              <TableHead className="text-muted-foreground font-medium w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No hay gastos registrados
                </TableCell>
              </TableRow>

            ) : (
              paginated.map((gasto) => (
                <TableRow
                  key={gasto.id}
                  className="border-border table-row-hover"
                >

                  <TableCell>
                    <span className="flex items-center gap-1 text-foreground">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      {formatDate(gasto.fecha)}
                    </span>
                  </TableCell>
                  <TableCell className="text-foreground font-medium">
                    {gasto.obra?.nombre || "-"}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {gasto.maquinaria ? (
                      <span className="font-mono text-xs">
                        {gasto.maquinaria.codigo || gasto.maquinaria.nombre || "—"}
                        {gasto.maquinaria.patente ? ` · ${gasto.maquinaria.patente}` : ""}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-foreground">
                    {gasto.sector ? (
                      <Badge variant="outline" className="text-xs">{gasto.sector}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>

                    <Badge
                      className={cn(
                        "status-badge",
                        categoriasGasto[gasto.categoria as CategoriaGasto]?.color
                      )}
                    >
                      {categoriasGasto[gasto.categoria as CategoriaGasto]?.label ||
                        gasto.categoria}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-foreground">
                    {gasto.descripcion}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{gasto.proveedor || "-"}</TableCell>
                  <TableCell className="font-mono font-medium text-foreground">
                    {formatCurrency(gasto.monto)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border-border">
                        <DropdownMenuItem onClick={() => handleView(gasto)} className="cursor-pointer">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(gasto)} className="cursor-pointer">
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(gasto)}
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

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {currentPage * PAGE_SIZE + 1}-
            {Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {currentPage + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}



      {/* Form Dialog */}
      <FormDialog
        isDirty
        open={formOpen}
        onOpenChange={setFormOpen}
        title={isEditing ? "Editar Gasto" : "Nuevo Gasto"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_gg">Fecha</Label>
              <Input
                id="fecha_gg"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="obra_gg">Obra</Label>
              <Select
                value={formData.obra_id || "none"}
                onValueChange={(v) =>
                  setFormData({ ...formData, obra_id: v === "none" ? null : v })
                }
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar obra" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {activeObras.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maquinaria_gg">Maquinaria (opcional)</Label>
              <Combobox
                options={maquinariaOptions}
                value={formData.maquinaria_id || "__none__"}
                onValueChange={(v) =>
                  setFormData({ ...formData, maquinaria_id: v === "__none__" ? null : v })
                }
                placeholder="Seleccionar por código o patente..."
                searchPlaceholder="Buscar por código, patente o nombre..."
                emptyText="No se encontraron maquinarias"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sector_gg">Sector (opcional)</Label>
              <Select
                value={formData.sector || "__none__"}
                onValueChange={(v) =>
                  setFormData({ ...formData, sector: v === "__none__" ? null : v })
                }
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Sin sector" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="__none__">— Sin sector —</SelectItem>
                  {SECTORES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria_gg">Categoría</Label>
              <Select
                value={formData.categoria}
                onValueChange={(v) => setFormData({ ...formData, categoria: v })}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {Object.entries(categoriasGasto).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monto_gg">Monto</Label>
              <Input
                id="monto_gg"
                type="number"
                min="0"
                step="0.01"
                value={formData.monto}
                onChange={(e) =>
                  setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })
                }
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="descripcion_gg">Descripción</Label>
              <Input
                id="descripcion_gg"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción del gasto..."
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="proveedor_gg">Proveedor</Label>
              <Combobox
                options={proveedorOptions}
                value={formData.proveedor || "__none__"}
                onValueChange={(v) =>
                  setFormData({ ...formData, proveedor: v === "__none__" ? "" : v })
                }
                placeholder="Seleccionar proveedor (opcional)"
                searchPlaceholder="Buscar proveedor..."
                emptyText="No se encontraron proveedores"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="comprobante_gg">Comprobante</Label>
              <Input
                id="comprobante_gg"
                value={formData.comprobante}
                onChange={(e) => setFormData({ ...formData, comprobante: e.target.value })}
                placeholder="Nº de factura/recibo (opcional)"
                className="bg-muted border-border"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observaciones_gg">Observaciones</Label>
              <Input
                id="observaciones_gg"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Notas adicionales..."
                className="bg-muted border-border"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : isEditing ? "Actualizar" : "Registrar"}
            </Button>
          </div>
        </form>
      </FormDialog>

      <DetailDialog open={detailOpen} onOpenChange={setDetailOpen} title="Detalle del Gasto">
        {selected && (
          <div className="space-y-4">
            <DetailSection title="Información General">
              <DetailRow label="Fecha" value={formatDate(selected.fecha)} />
              <DetailRow label="Obra" value={selected.obra?.nombre || "-"} />
              <DetailRow
                label="Maquinaria"
                value={
                  selected.maquinaria
                    ? `${selected.maquinaria.codigo || selected.maquinaria.nombre || "—"}${selected.maquinaria.patente ? ` · ${selected.maquinaria.patente}` : ""}${selected.maquinaria.tipo ? ` (${selected.maquinaria.tipo})` : ""}`
                    : "-"
                }
              />
              <DetailRow label="Sector" value={selected.sector || "-"} />


              <DetailRow
                label="Categoría"
                value={
                  categoriasGasto[selected.categoria as CategoriaGasto]?.label ||
                  selected.categoria
                }
              />
              <DetailRow label="Descripción" value={selected.descripcion} />
            </DetailSection>
            <DetailSection title="Detalle Financiero">
              <DetailRow label="Monto" value={formatCurrency(selected.monto)} />
              <DetailRow label="Proveedor" value={selected.proveedor || "-"} />
              <DetailRow label="Comprobante" value={selected.comprobante || "-"} />
              <DetailRow label="Observaciones" value={selected.observaciones || "-"} />
            </DetailSection>
          </div>
        )}
      </DetailDialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Eliminar Gasto"
        description="¿Estás seguro de eliminar este gasto? Esta acción no se puede deshacer."
      />
    </div>
  );
}

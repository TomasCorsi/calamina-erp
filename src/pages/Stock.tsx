import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { FormDialog } from "@/components/shared/FormDialog";
import { DetailDialog } from "@/components/shared/DetailDialog";
import { DetailRow } from "@/components/shared/DetailRow";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { Plus, Search, Eye, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useStock, StockItemDB, StockItemForm, MovimientoStockForm, CategoriaStock, TipoMovimientoStock } from "@/hooks/useStock";
import { formatDate } from "@/lib/utils";
import { useObras } from "@/hooks/useObras";
import { useOperationalPersonal } from "@/hooks/useOperationalPersonal";

const categoriaLabels: Record<string, string> = {
  material: "Material",
  repuesto: "Repuesto",
  herramienta: "Herramienta",
  consumible: "Consumible",
};

const tipoMovimientoLabels: Record<string, string> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
};

export default function Stock() {
  const { items, movimientos, loading, createItem, updateItem, deleteItem, createMovimiento } = useStock();
  const { obras } = useObras();
  const { personal } = useOperationalPersonal();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("all");
  const [stockBajoFilter, setStockBajoFilter] = useState(false);
  
  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMovFormOpen, setIsMovFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItemDB | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<StockItemForm>({
    codigo: "",
    nombre: "",
    categoria: "material",
    unidad: "",
    stock_actual: 0,
    stock_minimo: 0,
    stock_maximo: undefined,
    ubicacion: "",
    precio_unitario: 0,
    activo: true,
  });
  
  const [movFormData, setMovFormData] = useState<MovimientoStockForm>({
    fecha: new Date().toISOString().split("T")[0],
    item_id: "",
    tipo: "entrada",
    cantidad: 0,
    stock_anterior: 0,
    stock_nuevo: 0,
    obra_id: "none",
    motivo: "",
    responsable_id: "",
    comprobante: "",
    observaciones: "",
  });

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.codigo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = categoriaFilter === "all" || item.categoria === categoriaFilter;
    const matchesStockBajo = !stockBajoFilter || item.stock_actual < item.stock_minimo;
    return matchesSearch && matchesCategoria && matchesStockBajo;
  });

  // Filtered movements
  const filteredMovimientos = movimientos.filter((mov) =>
    mov.item?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mov.motivo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Stats
  const totalItems = items.length;
  const itemsBajoStock = items.filter(i => i.stock_actual < i.stock_minimo).length;
  const valorInventario = items.reduce((acc, i) => acc + (i.stock_actual * i.precio_unitario), 0);

  // Item CRUD
  const handleNewItem = () => {
    setSelectedItem(null);
    setFormData({
      codigo: "",
      nombre: "",
      categoria: "material",
      unidad: "",
      stock_actual: 0,
      stock_minimo: 0,
      stock_maximo: undefined,
      ubicacion: "",
      precio_unitario: 0,
      activo: true,
    });
    setIsFormOpen(true);
  };

  const handleEditItem = (item: StockItemDB) => {
    setSelectedItem(item);
    setFormData({
      codigo: item.codigo,
      nombre: item.nombre,
      categoria: item.categoria,
      unidad: item.unidad,
      stock_actual: item.stock_actual,
      stock_minimo: item.stock_minimo,
      stock_maximo: item.stock_maximo || undefined,
      ubicacion: item.ubicacion,
      precio_unitario: item.precio_unitario,
      activo: item.activo,
    });
    setIsFormOpen(true);
  };

  const handleViewItem = (item: StockItemDB) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handleDeleteItem = (item: StockItemDB) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  const handleSubmitItem = async () => {
    setIsSubmitting(true);
    if (selectedItem) {
      await updateItem(selectedItem.id, formData);
    } else {
      await createItem(formData);
    }
    setIsSubmitting(false);
    setIsFormOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (selectedItem) {
      await deleteItem(selectedItem.id);
    }
    setIsDeleteOpen(false);
  };

  // Movimiento CRUD
  const handleNewMovimiento = () => {
    setMovFormData({
      fecha: new Date().toISOString().split("T")[0],
      item_id: "",
      tipo: "entrada",
      cantidad: 0,
      stock_anterior: 0,
      stock_nuevo: 0,
      obra_id: "none",
      motivo: "",
      responsable_id: "",
      comprobante: "",
      observaciones: "",
    });
    setIsMovFormOpen(true);
  };

  const handleSubmitMovimiento = async () => {
    const item = items.find(i => i.id === movFormData.item_id);
    if (!item) return;

    const cantidad = movFormData.cantidad;
    const stockAnterior = item.stock_actual;
    let stockNuevo = stockAnterior;

    if (movFormData.tipo === "entrada") {
      stockNuevo = stockAnterior + cantidad;
    } else if (movFormData.tipo === "salida") {
      if (cantidad > stockAnterior) {
        return; // Stock insuficiente - handled by hook
      }
      stockNuevo = stockAnterior - cantidad;
    } else {
      stockNuevo = cantidad; // ajuste
    }

    setIsSubmitting(true);
    await createMovimiento({
      ...movFormData,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      obra_id: movFormData.obra_id === "none" ? undefined : movFormData.obra_id || undefined,
    });
    setIsSubmitting(false);
    setIsMovFormOpen(false);
  };

  if (loading) {
    return (
      <MainLayout title="Stock e Inventario" subtitle="Gestión de materiales, repuestos y herramientas">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Stock e Inventario" subtitle="Gestión de materiales, repuestos y herramientas">
      <div className="space-y-6 animate-fade-in">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-muted-foreground">Total Items</div>
            <div className="text-2xl font-bold text-foreground">{totalItems}</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-muted-foreground">Items Bajo Stock</div>
            <div className="text-2xl font-bold text-destructive flex items-center gap-2">
              {itemsBajoStock}
              {itemsBajoStock > 0 && <AlertTriangle className="w-5 h-5" />}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="text-sm text-muted-foreground">Valor Inventario</div>
            <div className="text-2xl font-bold text-foreground">
              ${valorInventario.toLocaleString("es-AR")}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="inventario" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="inventario">Inventario</TabsTrigger>
            <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          </TabsList>

          {/* Inventario Tab */}
          <TabsContent value="inventario" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar item..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="repuesto">Repuesto</SelectItem>
                    <SelectItem value="herramienta">Herramienta</SelectItem>
                    <SelectItem value="consumible">Consumible</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={stockBajoFilter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStockBajoFilter(!stockBajoFilter)}
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Stock Bajo
                </Button>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleNewMovimiento} variant="outline">
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Registrar Movimiento
                </Button>
                <Button onClick={handleNewItem} className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Item
                </Button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Precio Unit.</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id} className="border-border">
                      <TableCell className="font-mono text-sm">{item.codigo}</TableCell>
                      <TableCell className="font-medium">{item.nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{categoriaLabels[item.categoria]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={item.stock_actual < item.stock_minimo ? "text-destructive font-semibold" : ""}>
                            {item.stock_actual} {item.unidad}
                          </span>
                          {item.stock_actual < item.stock_minimo && (
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.ubicacion}</TableCell>
                      <TableCell>${item.precio_unitario.toLocaleString("es-AR")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleViewItem(item)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Movimientos Tab */}
          <TabsContent value="movimientos" className="space-y-4">
            <div className="flex gap-4 items-center justify-between">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar movimiento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button onClick={handleNewMovimiento} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Movimiento
              </Button>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Stock Anterior</TableHead>
                    <TableHead>Stock Nuevo</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Responsable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovimientos.map((mov) => (
                    <TableRow key={mov.id} className="border-border">
                      <TableCell>{formatDate(mov.fecha)}</TableCell>
                      <TableCell className="font-medium">{mov.item?.nombre || "-"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={mov.tipo === "entrada" ? "default" : mov.tipo === "salida" ? "destructive" : "secondary"}
                          className="flex items-center gap-1 w-fit"
                        >
                          {mov.tipo === "entrada" ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />}
                          {tipoMovimientoLabels[mov.tipo]}
                        </Badge>
                      </TableCell>
                      <TableCell>{mov.cantidad}</TableCell>
                      <TableCell>{mov.stock_anterior}</TableCell>
                      <TableCell>{mov.stock_nuevo}</TableCell>
                      <TableCell>{mov.obra?.nombre || "-"}</TableCell>
                      <TableCell>
                        {mov.responsable ? `${mov.responsable.nombre} ${mov.responsable.apellido}` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Item Form Dialog */}
        <FormDialog
          isDirty
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          title={selectedItem ? "Editar Item" : "Nuevo Item"}
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="MAT-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre del item"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select
                value={formData.categoria}
                onValueChange={(v) => setFormData({ ...formData, categoria: v as CategoriaStock })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="repuesto">Repuesto</SelectItem>
                  <SelectItem value="herramienta">Herramienta</SelectItem>
                  <SelectItem value="consumible">Consumible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unidad</Label>
              <Input
                value={formData.unidad}
                onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                placeholder="m³, unidad, litro..."
              />
            </div>
            <div className="space-y-2">
              <Label>Stock Actual</Label>
              <Input
                type="number"
                value={formData.stock_actual}
                onChange={(e) => setFormData({ ...formData, stock_actual: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Stock Mínimo</Label>
              <Input
                type="number"
                value={formData.stock_minimo}
                onChange={(e) => setFormData({ ...formData, stock_minimo: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Ubicación</Label>
              <Input
                value={formData.ubicacion}
                onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                placeholder="Depósito, estante..."
              />
            </div>
            <div className="space-y-2">
              <Label>Precio Unitario</Label>
              <Input
                type="number"
                value={formData.precio_unitario}
                onChange={(e) => setFormData({ ...formData, precio_unitario: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitItem} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {selectedItem ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </FormDialog>

        {/* Movimiento Form Dialog */}
        <FormDialog
          isDirty
          open={isMovFormOpen}
          onOpenChange={setIsMovFormOpen}
          title="Registrar Movimiento"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={movFormData.fecha}
                onChange={(e) => setMovFormData({ ...movFormData, fecha: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={movFormData.tipo}
                onValueChange={(v) => setMovFormData({ ...movFormData, tipo: v as TipoMovimientoStock })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="salida">Salida</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>Item</Label>
              <Select
                value={movFormData.item_id}
                onValueChange={(v) => setMovFormData({ ...movFormData, item_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar item" /></SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nombre} (Stock: {item.stock_actual})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cantidad</Label>
              <Input
                type="number"
                value={movFormData.cantidad}
                onChange={(e) => setMovFormData({ ...movFormData, cantidad: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Obra (opcional)</Label>
              <Select
                value={movFormData.obra_id}
                onValueChange={(v) => setMovFormData({ ...movFormData, obra_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar obra" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin obra</SelectItem>
                  {obras.filter(o => o.estado === "activa").map((obra) => (
                    <SelectItem key={obra.id} value={obra.id}>{obra.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select
                value={movFormData.responsable_id}
                onValueChange={(v) => setMovFormData({ ...movFormData, responsable_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {personal.filter(p => p.activo).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre} {p.apellido}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Input
                value={movFormData.motivo}
                onChange={(e) => setMovFormData({ ...movFormData, motivo: e.target.value })}
                placeholder="Razón del movimiento"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsMovFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmitMovimiento} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Registrar
            </Button>
          </div>
        </FormDialog>

        {/* Detail Dialog */}
        <DetailDialog
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          title={selectedItem?.nombre || "Detalle de Item"}
        >
          {selectedItem && (
            <div className="space-y-4">
              <DetailRow label="Código" value={selectedItem.codigo} />
              <DetailRow label="Nombre" value={selectedItem.nombre} />
              <DetailRow label="Categoría" value={categoriaLabels[selectedItem.categoria]} />
              <DetailRow label="Unidad" value={selectedItem.unidad} />
              <DetailRow label="Stock Actual" value={`${selectedItem.stock_actual}`} />
              <DetailRow label="Stock Mínimo" value={`${selectedItem.stock_minimo}`} />
              <DetailRow label="Ubicación" value={selectedItem.ubicacion} />
              <DetailRow label="Precio Unitario" value={`$${selectedItem.precio_unitario.toLocaleString("es-AR")}`} />
              <DetailRow label="Estado" value={selectedItem.activo ? "Activo" : "Inactivo"} />
            </div>
          )}
        </DetailDialog>

        {/* Delete Dialog */}
        <DeleteConfirmDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          onConfirm={handleConfirmDelete}
          title="Eliminar Item"
          description={`¿Estás seguro de eliminar ${selectedItem?.nombre}? Esta acción no se puede deshacer.`}
        />
      </div>
    </MainLayout>
  );
}

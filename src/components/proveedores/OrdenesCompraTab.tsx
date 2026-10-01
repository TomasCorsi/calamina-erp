import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, FileDown, FileText } from "lucide-react";
import { useOrdenesCompra, OrdenCompraWithRelations, EstadoOrdenCompra } from "@/hooks/useOrdenesCompra";
import { OrdenCompraFormDialog } from "./OrdenCompraFormDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { generateOrdenCompraPDF } from "@/utils/generateOrdenCompraPDF";
import { formatDate } from "@/lib/utils";

const estadoColors: Record<EstadoOrdenCompra, string> = {
  borrador: "bg-muted text-muted-foreground",
  emitida: "bg-blue-600 text-white",
  recibida: "bg-green-600 text-white",
  cancelada: "bg-destructive text-destructive-foreground",
};

const estadoLabels: Record<EstadoOrdenCompra, string> = {
  borrador: "Borrador",
  emitida: "Emitida",
  recibida: "Recibida",
  cancelada: "Cancelada",
};

export function OrdenesCompraTab() {
  const { ordenes, loading, createOrden, updateOrden, deleteOrden, updateEstado } = useOrdenesCompra();

  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OrdenCompraWithRelations | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<OrdenCompraWithRelations | null>(null);

  const filtered = useMemo(() => {
    return ordenes.filter((o) => {
      if (estadoFilter !== "all" && o.estado !== estadoFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          o.numero.toLowerCase().includes(q) ||
          ((o as any).numero_factura?.toLowerCase() || "").includes(q) ||
          (o.proveedor?.nombre?.toLowerCase() || "").includes(q) ||
          (o.obra?.nombre?.toLowerCase() || "").includes(q)
        );
      }
      return true;
    });
  }, [ordenes, search, estadoFilter]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (o: OrdenCompraWithRelations) => {
    setEditing(o);
    setFormOpen(true);
  };

  const handleSubmit = async (form: any) => {
    if (editing) await updateOrden(editing.id, form);
    else await createOrden(form);
  };

  const handleDelete = async () => {
    if (toDelete) {
      await deleteOrden(toDelete.id);
      setDeleteOpen(false);
      setToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Órdenes de Compra
          </h2>
          <p className="text-sm text-muted-foreground">{filtered.length} órdenes</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" /> Nueva Orden
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, proveedor, obra..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="borrador">Borrador</SelectItem>
            <SelectItem value="emitida">Emitida</SelectItem>
            <SelectItem value="recibida">Recibida</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>N° Factura</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="hidden md:table-cell">Obra</TableHead>
                <TableHead className="hidden lg:table-cell">Maquinaria</TableHead>
                <TableHead className="hidden lg:table-cell">Sector</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No hay órdenes de compra
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono font-medium">{o.numero}</TableCell>
                    <TableCell className="font-mono text-xs">{(o as any).numero_factura || "—"}</TableCell>
                    <TableCell>{formatDate(o.fecha)}</TableCell>
                    <TableCell>{o.proveedor?.nombre || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{o.obra?.nombre || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-xs">
                      {o.maquinaria
                        ? `${o.maquinaria.codigo || o.maquinaria.nombre || "—"}${o.maquinaria.patente ? ` · ${o.maquinaria.patente}` : ""}`
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {o.sector ? <Badge variant="outline" className="text-xs">{o.sector}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {`${(o.moneda === "USD" ? "US$" : "$")} ${Number(o.total).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      {o.moneda === "USD" && <Badge variant="outline" className="ml-2 text-xs">USD</Badge>}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={o.estado}
                        onValueChange={(v) => updateEstado(o.id, v as EstadoOrdenCompra)}
                      >
                        <SelectTrigger className="h-7 w-32 px-2">
                          <Badge className={estadoColors[o.estado]}>{estadoLabels[o.estado]}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="borrador">Borrador</SelectItem>
                          <SelectItem value="emitida">Emitida</SelectItem>
                          <SelectItem value="recibida">Recibida</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Generar PDF"
                          onClick={() => generateOrdenCompraPDF(o)}
                        >
                          <FileDown className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(o)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setToDelete(o);
                            setDeleteOpen(true);
                          }}
                        >
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

      <OrdenCompraFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        editing={editing}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        title="Eliminar Orden de Compra"
        description={`¿Eliminar la orden ${toDelete?.numero}? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}

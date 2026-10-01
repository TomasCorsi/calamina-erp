import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, FileText, Download, Save, Files } from "lucide-react";
import { usePersonal, PersonalDB } from "@/hooks/usePersonal";
import {
  useEntregasEPP,
  DEFAULT_EPP_ITEMS,
  EntregaEPPItemForm,
  EntregaEPPItem,
} from "@/hooks/useEntregasEPP";
import { generateEntregaEPPPDF, generateEntregaEPPMasivoPDF } from "@/utils/generateEntregaEPPPDF";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";

export function EntregaEPPTab() {
  const { personal, loading: personalLoading } = usePersonal();
  const [selectedPersonalId, setSelectedPersonalId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<EntregaEPPItemForm[]>(() => {
    try {
      const saved = localStorage.getItem("epp-items-template");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [...DEFAULT_EPP_ITEMS];
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { entregas, isLoading, createEntrega, isCreating, fetchItems, deleteEntrega } =
    useEntregasEPP(selectedPersonalId);

  const personalOptions = useMemo(
    () =>
      personal
        .filter((p) => p.activo)
        .map((p) => ({
          value: p.id,
          label: `${p.apellido || ""} ${p.nombre || ""}`.trim(),
          searchValue: `${p.apellido || ""} ${p.nombre || ""} ${p.dni || ""} ${p.legajo || ""}`,
        })),
    [personal]
  );

  const selectedPersonal = personal.find((p) => p.id === selectedPersonalId);

  const updateItem = (index: number, field: keyof EntregaEPPItemForm, value: any) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { producto: "", tipo_modelo: "", marca: "", posee_certificacion: true, cantidad: 1 },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const [generatingMasivo, setGeneratingMasivo] = useState(false);
  const ALL_ROLES = [
    { value: "capataz", label: "Capataz" },
    { value: "maquinista", label: "Maquinista" },
    { value: "chofer", label: "Chofer" },
    { value: "administrativo", label: "Administrativo" },
    { value: "ayudante", label: "Ayudante" },
    { value: "sereno", label: "Sereno" },
    { value: "mecanico", label: "Mecánico" },
    { value: "topografo", label: "Topógrafo" },
    { value: "repartidor_calecita", label: "Repartidor Calecita" },
  ];
  const [selectedRoles, setSelectedRoles] = useState<string[]>(ALL_ROLES.map((r) => r.value));

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };


  const handleSaveTemplate = () => {
    localStorage.setItem("epp-items-template", JSON.stringify(items));
    toast.success("Plantilla de elementos guardada");
  };

  const handleGenerarMasivo = async () => {
    const validItems = items.filter((i) => i.producto.trim());
    if (validItems.length === 0) {
      toast.error("Agregá al menos un producto en la plantilla");
      return;
    }
    if (selectedRoles.length === 0) {
      toast.error("Seleccioná al menos un rol");
      return;
    }
    const empleadosFiltrados = personal.filter((p) => p.activo && selectedRoles.includes(p.rol));
    if (empleadosFiltrados.length === 0) {
      toast.error("No hay empleados activos con los roles seleccionados");
      return;
    }
    setGeneratingMasivo(true);
    try {
      await generateEntregaEPPMasivoPDF({
        empleados: empleadosFiltrados,
        items: validItems,
        fecha,
      });
      toast.success(`PDF generado con ${empleadosFiltrados.length} certificados`);
    } catch {
      toast.error("Error al generar PDF masivo");
    } finally {
      setGeneratingMasivo(false);
    }
  };

  const handleSaveAndPDF = async () => {
    if (!selectedPersonalId) {
      toast.error("Seleccioná un empleado");
      return;
    }
    const validItems = items.filter((i) => i.producto.trim());
    if (validItems.length === 0) {
      toast.error("Agregá al menos un producto");
      return;
    }

    try {
      const entrega = await createEntrega({
        personalId: selectedPersonalId,
        fecha,
        items: validItems,
      });

      // Fetch saved items for PDF
      const savedItems = await fetchItems(entrega.id);
      await generateEntregaEPPPDF({
        personal: selectedPersonal!,
        items: savedItems,
        fecha,
      });
    } catch {
      // error handled by hook
    }
  };

  const handleReprint = async (entregaId: string, entregaFecha: string) => {
    try {
      const savedItems = await fetchItems(entregaId);
      await generateEntregaEPPPDF({
        personal: selectedPersonal!,
        items: savedItems,
        fecha: entregaFecha,
      });
    } catch {
      toast.error("Error al generar PDF");
    }
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await deleteEntrega(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Employee selector + date */}
      <div className="card-industrial p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          Entrega de Ropa de Trabajo y EPP
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Empleado</Label>
            <Combobox
              options={personalOptions}
              value={selectedPersonalId}
              onValueChange={setSelectedPersonalId}
              placeholder="Seleccionar empleado..."
              searchPlaceholder="Buscar por nombre, DNI o legajo..."
            />
          </div>
          <div className="space-y-2">
            <Label>Fecha de entrega</Label>
            <Input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="bg-muted border-border"
            />
          </div>
        </div>
      </div>

      {/* Editable items table */}
      <div className="card-industrial overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h4 className="font-medium text-foreground">Elementos a entregar</h4>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="w-4 h-4 mr-1" /> Agregar fila
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground w-8">N°</TableHead>
              <TableHead className="text-muted-foreground">Producto</TableHead>
              <TableHead className="text-muted-foreground">Tipo / Modelo</TableHead>
              <TableHead className="text-muted-foreground">Marca</TableHead>
              <TableHead className="text-muted-foreground w-16 text-center">Cert.</TableHead>
              <TableHead className="text-muted-foreground w-16 text-center">Cant.</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, i) => (
              <TableRow key={i} className="border-border">
                <TableCell className="text-muted-foreground text-center">{i + 1}</TableCell>
                <TableCell>
                  <Input
                    value={item.producto}
                    onChange={(e) => updateItem(i, "producto", e.target.value)}
                    className="bg-muted border-border h-8 text-sm"
                    placeholder="Producto"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={item.tipo_modelo}
                    onChange={(e) => updateItem(i, "tipo_modelo", e.target.value)}
                    className="bg-muted border-border h-8 text-sm"
                    placeholder="Tipo / Modelo"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={item.marca}
                    onChange={(e) => updateItem(i, "marca", e.target.value)}
                    className="bg-muted border-border h-8 text-sm"
                    placeholder="Marca"
                  />
                </TableCell>
                <TableCell className="text-center">
                  <Checkbox
                    checked={item.posee_certificacion}
                    onCheckedChange={(v) => updateItem(i, "posee_certificacion", !!v)}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    value={item.cantidad}
                    onChange={(e) => updateItem(i, "cantidad", parseInt(e.target.value) || 1)}
                    className="bg-muted border-border h-8 text-sm text-center w-14"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeItem(i)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleSaveTemplate}
          >
            <Save className="w-4 h-4 mr-1" />
            Guardar Plantilla
          </Button>
          <Button
            onClick={handleSaveAndPDF}
            disabled={isCreating || !selectedPersonalId}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <FileText className="w-4 h-4 mr-2" />
            {isCreating ? "Guardando..." : "Guardar y Generar PDF"}
          </Button>
        </div>
      </div>

      {/* Bulk generation */}
      <div className="card-industrial p-6 space-y-4">
        <h4 className="font-medium text-foreground">Generación Masiva</h4>
        <p className="text-sm text-muted-foreground">
          Genera un único PDF con un certificado por cada empleado activo de los roles seleccionados, usando la plantilla y fecha actuales.
        </p>
        <div className="space-y-2">
          <Label>Roles a incluir</Label>
          <div className="flex flex-wrap gap-2">
            {ALL_ROLES.map((role) => {
              const count = personal.filter((p) => p.activo && p.rol === role.value).length;
              const isSelected = selectedRoles.includes(role.value);
              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => toggleRole(role.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border hover:bg-accent"
                  }`}
                >
                  {role.label}
                  <Badge variant="secondary" className="ml-1 h-5 min-w-[1.25rem] px-1 text-xs">
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {personal.filter((p) => p.activo && selectedRoles.includes(p.rol)).length} empleados seleccionados
          </p>
        </div>
        <Button
          onClick={handleGenerarMasivo}
          disabled={generatingMasivo || selectedRoles.length === 0}
          variant="outline"
        >
          <Files className="w-4 h-4 mr-2" />
          {generatingMasivo ? "Generando..." : "Generar PDF Masivo"}
        </Button>
      </div>

      {/* History */}
      {selectedPersonalId && (
        <div className="card-industrial overflow-hidden">
          <div className="p-4 border-b border-border">
            <h4 className="font-medium text-foreground">Historial de entregas</h4>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Cargando...</div>
          ) : entregas.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No hay entregas registradas para este empleado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Fecha</TableHead>
                  <TableHead className="text-muted-foreground">Registrado</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entregas.map((e) => (
                  <TableRow key={e.id} className="border-border">
                    <TableCell className="font-medium text-foreground">
                      {formatDate(e.fecha)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(e.created_at)}
                    </TableCell>
                    <TableCell className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleReprint(e.id, e.fecha)}
                        title="Reimprimir PDF"
                      >
                        <Download className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeleteId(e.id)}
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Eliminar entrega de EPP"
        description="¿Estás seguro de eliminar esta entrega? Esta acción no se puede deshacer."
      />
    </div>
  );
}

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download } from "lucide-react";
import { VacacionDB } from "@/hooks/useVacaciones";
import { formatDate } from "@/lib/utils";
import * as XLSX from "xlsx";

interface ExportVacacionesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacaciones: VacacionDB[];
}

export function ExportVacacionesDialog({
  open,
  onOpenChange,
  vacaciones,
}: ExportVacacionesDialogProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter only unpaid vacations
  const noPagadas = useMemo(
    () => vacaciones.filter((v) => !v.pagada),
    [vacaciones]
  );

  // Reset selection when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      // Select all by default
      setSelectedIds(new Set(noPagadas.map((v) => v.id)));
    }
    onOpenChange(isOpen);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === noPagadas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(noPagadas.map((v) => v.id)));
    }
  };

  const isAllSelected = selectedIds.size === noPagadas.length && noPagadas.length > 0;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < noPagadas.length;

  const exportToExcel = () => {
    const vacacionesSeleccionadas = noPagadas.filter((v) =>
      selectedIds.has(v.id)
    );

    const data = vacacionesSeleccionadas.map((v) => ({
      Legajo: v.personal?.legajo || "",
      Empleado: `${v.personal?.apellido || ""}, ${v.personal?.nombre || ""}`.trim(),
      Dias: v.dias_totales,
      Desde: formatDate(v.fecha_inicio),
      Hasta: formatDate(v.fecha_fin),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vacaciones No Pagadas");

    // Auto-size columns
    ws["!cols"] = [
      { wch: 10 }, // Legajo
      { wch: 35 }, // Empleado
      { wch: 8 },  // Dias
      { wch: 12 }, // Desde
      { wch: 12 }, // Hasta
    ];

    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Vacaciones_No_Pagadas_${today}.xlsx`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Exportar Vacaciones No Pagadas</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Selecciona los empleados que quieres exportar
        </p>

        <div className="flex items-center gap-2 py-2 border-b border-border">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={toggleSelectAll}
            data-state={isIndeterminate ? "indeterminate" : isAllSelected ? "checked" : "unchecked"}
          />
          <span className="text-sm font-medium">
            Seleccionar todos ({selectedIds.size} de {noPagadas.length})
          </span>
        </div>

        <ScrollArea className="h-[300px] rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-muted-foreground">Legajo</TableHead>
                <TableHead className="text-muted-foreground">Empleado</TableHead>
                <TableHead className="text-muted-foreground">Días</TableHead>
                <TableHead className="text-muted-foreground">Desde</TableHead>
                <TableHead className="text-muted-foreground">Hasta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {noPagadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay vacaciones sin pagar
                  </TableCell>
                </TableRow>
              ) : (
                noPagadas.map((v) => (
                  <TableRow
                    key={v.id}
                    className="border-border cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleSelect(v.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(v.id)}
                        onCheckedChange={() => toggleSelect(v.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {v.personal?.legajo || "-"}
                    </TableCell>
                    <TableCell>
                      {v.personal?.apellido || ""}, {v.personal?.nombre || ""}
                    </TableCell>
                    <TableCell>{v.dias_totales}</TableCell>
                    <TableCell>{formatDate(v.fecha_inicio)}</TableCell>
                    <TableCell>{formatDate(v.fecha_fin)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={exportToExcel}
            disabled={selectedIds.size === 0}
            className="bg-primary hover:bg-primary/90"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar Excel ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

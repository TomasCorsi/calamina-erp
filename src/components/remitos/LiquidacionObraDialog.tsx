import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, FileText } from "lucide-react";
import { RemitoWithRelations } from "@/hooks/useRemitos";
import { useRemitoItemsMap } from "@/hooks/useRemitoItems";
import { toast } from "sonner";
import ExcelJS from "exceljs";

interface LiquidacionObraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remitos: RemitoWithRelations[];
}

interface TipoResumen {
  tipo: string;
  viajes: number;
  cantidad: number;
  unidad: string;
  precioTotal: number;
}

export function LiquidacionObraDialog({
  open,
  onOpenChange,
  remitos,
}: LiquidacionObraDialogProps) {
  const [selectedObra, setSelectedObra] = useState<string>("");
  const [obraOpen, setObraOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const { itemsMap } = useRemitoItemsMap();

  // Obras únicas presentes en desde / hasta
  const obrasUnicas = useMemo(() => {
    const set = new Set<string>();
    remitos.forEach((r) => {
      if (r.desde) set.add(r.desde);
      if (r.hasta) set.add(r.hasta);
    });
    return [...set].sort();
  }, [remitos]);

  const remitosObra = useMemo(() => {
    if (!selectedObra) return [];
    return remitos.filter(
      (r) => r.desde === selectedObra || r.hasta === selectedObra
    );
  }, [remitos, selectedObra]);

  const tiposUnicos = useMemo(() => {
    const set = new Set<string>();
    remitosObra.forEach((r) => {
      if (r.tipo_material) set.add(r.tipo_material);
    });
    return [...set].sort();
  }, [remitosObra]);

  useMemo(() => {
    if (tiposUnicos.length > 0 && !initialized) {
      setSelectedTypes(new Set(tiposUnicos));
      setInitialized(true);
    }
  }, [tiposUnicos, initialized]);

  const handleObraChange = (value: string) => {
    setSelectedObra(value);
    setInitialized(false);
    setSelectedTypes(new Set());
  };

  const toggleType = (tipo: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(tipo)) next.delete(tipo);
      else next.add(tipo);
      return next;
    });
  };

  const selectAllTypes = () => setSelectedTypes(new Set(tiposUnicos));
  const deselectAllTypes = () => setSelectedTypes(new Set());

  const resumen: TipoResumen[] = useMemo(() => {
    const map: Record<string, TipoResumen> = {};
    remitosObra
      .filter((r) => r.tipo_material && selectedTypes.has(r.tipo_material))
      .forEach((r) => {
        const tipo = r.tipo_material!;
        if (!map[tipo]) {
          map[tipo] = { tipo, viajes: 0, cantidad: 0, unidad: r.unidad || "M3", precioTotal: 0 };
        }
        map[tipo].viajes += r.cantidad_viajes || 1;
        map[tipo].cantidad += r.cantidad || 0;
        map[tipo].precioTotal += r.precio_total || 0;
      });
    // Ítems adicionales de remitos (jornadas de máquina, servicios) como línea propia
    remitosObra
      .filter((r) => r.tipo_material && selectedTypes.has(r.tipo_material))
      .forEach((r) => {
        for (const it of (itemsMap as Record<string, any[]>)[r.id] || []) {
          const key = it.concepto || "Ítems adicionales";
          if (!map[key]) {
            map[key] = { tipo: key, viajes: 0, cantidad: 0, unidad: it.unidad || "DIA", precioTotal: 0 };
          }
          map[key].cantidad += it.cantidad || 0;
          map[key].precioTotal += it.precio_total || 0;
        }
      });
    return Object.values(map).sort((a, b) => a.tipo.localeCompare(b.tipo));
  }, [remitosObra, selectedTypes]);

  const totales = useMemo(
    () => ({
      viajes: resumen.reduce((s, r) => s + r.viajes, 0),
      cantidad: resumen.reduce((s, r) => s + r.cantidad, 0),
      precioTotal: resumen.reduce((s, r) => s + r.precioTotal, 0),
    }),
    [resumen]
  );

  const exportarExcel = async () => {
    if (resumen.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = "Gestión de Obras";
    wb.created = new Date();

    const COLOR_RED = "FFB00020";
    const COLOR_BLACK = "FF0F0F0F";
    const COLOR_GRAY_LIGHT = "FFF7F7F7";
    const COLOR_GRAY_MED = "FFE5E5E5";
    const COLOR_WHITE = "FFFFFFFF";
    const COLOR_BORDER = "FFBFBFBF";

    const thinBorder = {
      top: { style: "thin" as const, color: { argb: COLOR_BORDER } },
      left: { style: "thin" as const, color: { argb: COLOR_BORDER } },
      bottom: { style: "thin" as const, color: { argb: COLOR_BORDER } },
      right: { style: "thin" as const, color: { argb: COLOR_BORDER } },
    };

    const applyHeaderStyle = (row: ExcelJS.Row) => {
      row.height = 22;
      row.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: COLOR_WHITE }, size: 11 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_BLACK } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = thinBorder;
      });
    };

    const applyTotalStyle = (row: ExcelJS.Row) => {
      row.height = 22;
      row.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: COLOR_WHITE }, size: 11 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_RED } };
        cell.alignment = { vertical: "middle" };
        cell.border = thinBorder;
      });
    };

    // ---------- Hoja 1: Liquidación ----------
    const ws = wb.addWorksheet("Liquidación");
    ws.columns = [
      { width: 28 },
      { width: 12 },
      { width: 14 },
      { width: 10 },
      { width: 18 },
    ];

    // Título obra
    const titleRow = ws.addRow([`Obra: ${selectedObra}`]);
    ws.mergeCells(titleRow.number, 1, titleRow.number, 5);
    const titleCell = titleRow.getCell(1);
    titleCell.font = { bold: true, color: { argb: COLOR_WHITE }, size: 12 };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_RED } };
    titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    titleRow.height = 24;

    // Header
    const headerRow = ws.addRow(["Tipo Material", "Viajes", "Cantidad", "Unidad", "Precio Total"]);
    applyHeaderStyle(headerRow);

    // Data
    resumen.forEach((t, idx) => {
      const dataRow = ws.addRow([t.tipo, t.viajes, t.cantidad, t.unidad, t.precioTotal]);
      const zebra = idx % 2 === 1;
      dataRow.eachCell((cell, col) => {
        cell.border = thinBorder;
        if (zebra) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_GRAY_LIGHT } };
        }
        if (col === 1) cell.alignment = { vertical: "middle", horizontal: "left" };
        else if (col === 4) cell.alignment = { vertical: "middle", horizontal: "center" };
        else cell.alignment = { vertical: "middle", horizontal: "right" };
      });
      dataRow.getCell(2).numFmt = "#,##0";
      dataRow.getCell(3).numFmt = "#,##0.00";
      dataRow.getCell(5).numFmt = '"$"#,##0.00';
    });

    // Subtotal por obra
    const unidadesUnicas = new Set(resumen.map((t) => t.unidad));
    const unidadSubtotal = unidadesUnicas.size === 1 ? [...unidadesUnicas][0] : "";
    const subRow = ws.addRow([
      `Subtotal ${selectedObra}`,
      totales.viajes,
      totales.cantidad,
      unidadSubtotal,
      totales.precioTotal,
    ]);
    subRow.height = 20;
    subRow.eachCell((cell, col) => {
      cell.font = { bold: true, color: { argb: COLOR_BLACK } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_GRAY_MED } };
      cell.border = {
        ...thinBorder,
        top: { style: "medium", color: { argb: COLOR_BLACK } },
      };
      if (col === 1) cell.alignment = { vertical: "middle", horizontal: "left" };
      else if (col === 4) cell.alignment = { vertical: "middle", horizontal: "center" };
      else cell.alignment = { vertical: "middle", horizontal: "right" };
    });
    subRow.getCell(2).numFmt = "#,##0";
    subRow.getCell(3).numFmt = "#,##0.00";
    subRow.getCell(5).numFmt = '"$"#,##0.00';

    ws.addRow([]);

    // Total general
    const totalRow = ws.addRow([
      "TOTAL GENERAL",
      totales.viajes,
      totales.cantidad,
      "",
      totales.precioTotal,
    ]);
    applyTotalStyle(totalRow);
    totalRow.getCell(1).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    totalRow.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
    totalRow.getCell(3).alignment = { vertical: "middle", horizontal: "right" };
    totalRow.getCell(5).alignment = { vertical: "middle", horizontal: "right" };
    totalRow.getCell(2).numFmt = "#,##0";
    totalRow.getCell(3).numFmt = "#,##0.00";
    totalRow.getCell(5).numFmt = '"$"#,##0.00';

    // ---------- Hoja 2: Liquidación General (por forma de pago) ----------
    type FormaPagoTotales = {
      efectivo: number;
      transferencia: number;
      cuenta_corriente: number;
      sin_especificar: number;
    };
    const normalizarFormaPago = (fp: string | null | undefined): keyof FormaPagoTotales => {
      if (!fp) return "sin_especificar";
      const v = fp.toLowerCase().trim();
      if (v.includes("efectivo")) return "efectivo";
      if (v.includes("transfer")) return "transferencia";
      if (v.includes("cuenta") || v.includes("cta") || v.includes("corriente")) return "cuenta_corriente";
      return "sin_especificar";
    };

    const totFP: FormaPagoTotales = {
      efectivo: 0,
      transferencia: 0,
      cuenta_corriente: 0,
      sin_especificar: 0,
    };
    remitosObra
      .filter((r) => r.tipo_material && selectedTypes.has(r.tipo_material))
      .forEach((r) => {
        totFP[normalizarFormaPago((r as any).forma_pago)] += r.precio_total || 0;
        for (const it of (itemsMap as Record<string, any[]>)[r.id] || []) {
          totFP[normalizarFormaPago((r as any).forma_pago)] += it.precio_total || 0;
        }
      });

    const hayFormaPago = totFP.efectivo + totFP.transferencia + totFP.cuenta_corriente > 0;
    const moneyFmt = '"$"#,##0.00;[Red]("$"#,##0.00);"-"';

    const wsGeneral = wb.addWorksheet("Liquidación General", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    if (hayFormaPago) {
      wsGeneral.columns = [
        { width: 36 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 20 },
      ];
      const genHeader = wsGeneral.addRow([
        "Obra",
        "Efectivo",
        "Transferencia",
        "Cta. Corriente",
        "Sin especificar",
        "Precio Total",
      ]);
      applyHeaderStyle(genHeader);

      const r = wsGeneral.addRow([
        selectedObra,
        totFP.efectivo,
        totFP.transferencia,
        totFP.cuenta_corriente,
        totFP.sin_especificar,
        totales.precioTotal,
      ]);
      r.eachCell((cell, col) => {
        cell.border = thinBorder;
        cell.alignment = { vertical: "middle", horizontal: col === 1 ? "left" : "right" };
        if (col >= 2) cell.numFmt = moneyFmt;
      });

      const genTotal = wsGeneral.addRow([
        "TOTAL",
        totFP.efectivo,
        totFP.transferencia,
        totFP.cuenta_corriente,
        totFP.sin_especificar,
        totales.precioTotal,
      ]);
      applyTotalStyle(genTotal);
      genTotal.getCell(1).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      for (let col = 2; col <= 6; col++) {
        genTotal.getCell(col).alignment = { vertical: "middle", horizontal: "right" };
        genTotal.getCell(col).numFmt = moneyFmt;
      }
    } else {
      wsGeneral.columns = [{ width: 36 }, { width: 20 }];
      const genHeader = wsGeneral.addRow(["Obra", "Precio Total"]);
      applyHeaderStyle(genHeader);

      const r = wsGeneral.addRow([selectedObra, totales.precioTotal]);
      r.eachCell((cell, col) => {
        cell.border = thinBorder;
        cell.alignment = { vertical: "middle", horizontal: col === 1 ? "left" : "right" };
      });
      r.getCell(2).numFmt = '"$"#,##0.00';

      const genTotal = wsGeneral.addRow(["TOTAL", totales.precioTotal]);
      applyTotalStyle(genTotal);
      genTotal.getCell(1).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      genTotal.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
      genTotal.getCell(2).numFmt = '"$"#,##0.00';
    }

    const fileName = `Liquidacion_Obra_${selectedObra.replace(/\s/g, "_")}_${format(new Date(), "yyyyMMdd")}.xlsx`;
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel exportado");
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Liquidación por Obra
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Obra
            </label>
            <Popover open={obraOpen} onOpenChange={setObraOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full justify-between bg-card font-normal",
                    !selectedObra && "text-muted-foreground"
                  )}
                >
                  {selectedObra || "Seleccionar obra..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar obra..." />
                  <CommandList>
                    <CommandEmpty>Sin resultados.</CommandEmpty>
                    <CommandGroup>
                      {obrasUnicas.map((o) => (
                        <CommandItem
                          key={o}
                          value={o}
                          onSelect={() => {
                            handleObraChange(o);
                            setObraOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedObra === o ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {o}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedObra && tiposUnicos.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">
                  Tipos de material a incluir
                </label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAllTypes}>
                    Todos
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAllTypes}>
                    Ninguno
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {tiposUnicos.map((tipo) => (
                  <label
                    key={tipo}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedTypes.has(tipo)}
                      onCheckedChange={() => toggleType(tipo)}
                    />
                    {tipo}
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedObra && resumen.length > 0 && (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo Material</TableHead>
                      <TableHead className="text-center">Viajes</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-center">Unidad</TableHead>
                      <TableHead className="text-right">Precio Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumen.map((r) => (
                      <TableRow key={r.tipo}>
                        <TableCell className="font-medium">{r.tipo}</TableCell>
                        <TableCell className="text-center">{r.viajes}</TableCell>
                        <TableCell className="text-center">
                          {r.cantidad.toLocaleString("es-AR")}
                        </TableCell>
                        <TableCell className="text-center">{r.unidad}</TableCell>
                        <TableCell className="text-right">
                          ${r.precioTotal.toLocaleString("es-AR")}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-center">{totales.viajes}</TableCell>
                      <TableCell className="text-center">
                        {totales.cantidad.toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right">
                        ${totales.precioTotal.toLocaleString("es-AR")}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <Button onClick={exportarExcel} variant="outline" className="gap-2">
                  <Download className="w-4 h-4" />
                  Exportar Excel
                </Button>
              </div>
            </>
          )}

          {selectedObra && remitosObra.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay remitos para esta obra en el período seleccionado.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

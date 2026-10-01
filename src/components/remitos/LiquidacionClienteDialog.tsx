import { useState, useMemo, useEffect } from "react";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { Download, FileText, Search } from "lucide-react";
import { RemitoWithRelations } from "@/hooks/useRemitos";
import { useRemitoItemsMap } from "@/hooks/useRemitoItems";
import { toast } from "sonner";
import ExcelJS from "exceljs";

interface LiquidacionClienteDialogProps {
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

type TipoCliente = "cliente_destino" | "cliente_cantera" | "cliente_o_destino";

const TIPO_LABELS: Record<TipoCliente, string> = {
  cliente_o_destino: "Cliente / Cliente destino",
  cliente_destino: "Cliente destino",
  cliente_cantera: "Cliente cantera",
};

export function LiquidacionClienteDialog({
  open,
  onOpenChange,
  remitos,
}: LiquidacionClienteDialogProps) {
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>("cliente_o_destino");
  const [selectedClientes, setSelectedClientes] = useState<Set<string>>(new Set());
  const [searchCliente, setSearchCliente] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [typesInitialized, setTypesInitialized] = useState(false);
  const { itemsMap } = useRemitoItemsMap();

  // Get unique clients based on tipoCliente
  const clientesUnicos = useMemo(() => {
    const set = new Set<string>();
    remitos.forEach((r) => {
      if (tipoCliente === "cliente_o_destino") {
        if (r.cliente) set.add(r.cliente);
        if (r.cliente_destino) set.add(r.cliente_destino);
      } else if (tipoCliente === "cliente_destino") {
        if (r.cliente_destino) set.add(r.cliente_destino);
      } else if (tipoCliente === "cliente_cantera") {
        if (r.cliente_cantera) set.add(r.cliente_cantera);
      }
    });
    return [...set].sort();
  }, [remitos, tipoCliente]);

  const filteredClientes = useMemo(() => {
    const q = searchCliente.trim().toLowerCase();
    if (!q) return clientesUnicos;
    return clientesUnicos.filter((c) => c.toLowerCase().includes(q));
  }, [clientesUnicos, searchCliente]);

  // Get remitos for selected clients based on tipoCliente
  const remitosCliente = useMemo(() => {
    if (selectedClientes.size === 0) return [];
    return remitos.filter((r) => {
      if (tipoCliente === "cliente_o_destino") {
        return (
          (r.cliente && selectedClientes.has(r.cliente)) ||
          (r.cliente_destino && selectedClientes.has(r.cliente_destino))
        );
      }
      if (tipoCliente === "cliente_destino")
        return !!r.cliente_destino && selectedClientes.has(r.cliente_destino);
      if (tipoCliente === "cliente_cantera")
        return !!r.cliente_cantera && selectedClientes.has(r.cliente_cantera);
      return false;
    });
  }, [remitos, selectedClientes, tipoCliente]);

  // Get unique types for selected clients
  const tiposUnicos = useMemo(() => {
    const set = new Set<string>();
    remitosCliente.forEach((r) => {
      if (r.tipo_material) set.add(r.tipo_material);
    });
    return [...set].sort();
  }, [remitosCliente]);

  // Initialize selectedTypes when client selection changes
  useEffect(() => {
    if (tiposUnicos.length > 0 && !typesInitialized) {
      setSelectedTypes(new Set(tiposUnicos));
      setTypesInitialized(true);
    }
  }, [tiposUnicos, typesInitialized]);

  const handleTipoClienteChange = (value: TipoCliente) => {
    setTipoCliente(value);
    setSelectedClientes(new Set());
    setSearchCliente("");
    setTypesInitialized(false);
    setSelectedTypes(new Set());
  };

  const toggleCliente = (cliente: string) => {
    setSelectedClientes((prev) => {
      const next = new Set(prev);
      if (next.has(cliente)) next.delete(cliente);
      else next.add(cliente);
      return next;
    });
    setTypesInitialized(false);
  };

  const selectAllClientes = () => {
    setSelectedClientes(new Set(filteredClientes));
    setTypesInitialized(false);
  };
  const deselectAllClientes = () => {
    setSelectedClientes(new Set());
    setTypesInitialized(false);
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

  // Calculate summary grouped by tipo_material
  const resumen: TipoResumen[] = useMemo(() => {
    const map: Record<string, TipoResumen> = {};

    remitosCliente
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
    remitosCliente
      .filter((r) => r.tipo_material && selectedTypes.has(r.tipo_material))
      .forEach((r) => {
        for (const it of itemsMap[r.id] || []) {
          const key = it.concepto || "Ítems adicionales";
          if (!map[key]) {
            map[key] = { tipo: key, viajes: 0, cantidad: 0, unidad: it.unidad || "DIA", precioTotal: 0 };
          }
          map[key].cantidad += it.cantidad || 0;
          map[key].precioTotal += it.precio_total || 0;
        }
      });

    return Object.values(map).sort((a, b) => a.tipo.localeCompare(b.tipo));
  }, [remitosCliente, selectedTypes]);

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

    // Style helpers
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

    // ---------- Sheet 1: Liquidación ----------
    const clientesOrdenados = [...selectedClientes].sort((a, b) => a.localeCompare(b));

    const matchCliente = (r: RemitoWithRelations, cliente: string) => {
      if (tipoCliente === "cliente_o_destino") {
        return r.cliente === cliente || r.cliente_destino === cliente;
      }
      if (tipoCliente === "cliente_destino") return r.cliente_destino === cliente;
      if (tipoCliente === "cliente_cantera") return r.cliente_cantera === cliente;
      return false;
    };

    type FormaPagoTotales = {
      efectivo: number;
      transferencia: number;
      cuenta_corriente: number;
      sin_especificar: number;
    };

    type ClienteResumen = {
      cliente: string;
      tipos: TipoResumen[];
      viajes: number;
      cantidad: number;
      precioTotal: number;
      totalesPorFormaPago: FormaPagoTotales;
    };

    const normalizarFormaPago = (fp: string | null | undefined): keyof FormaPagoTotales => {
      if (!fp) return "sin_especificar";
      const v = fp.toLowerCase().trim();
      if (v.includes("efectivo")) return "efectivo";
      if (v.includes("transfer")) return "transferencia";
      if (v.includes("cuenta") || v.includes("cta") || v.includes("corriente")) return "cuenta_corriente";
      return "sin_especificar";
    };

    const resumenPorCliente: ClienteResumen[] = clientesOrdenados
      .map((cliente) => {
        const map: Record<string, TipoResumen> = {};
        const totalesPorFormaPago: FormaPagoTotales = {
          efectivo: 0,
          transferencia: 0,
          cuenta_corriente: 0,
          sin_especificar: 0,
        };
        remitosCliente
          .filter(
            (r) =>
              matchCliente(r, cliente) &&
              r.tipo_material &&
              selectedTypes.has(r.tipo_material)
          )
          .forEach((r) => {
            const tipo = r.tipo_material!;
            if (!map[tipo]) {
              map[tipo] = {
                tipo,
                viajes: 0,
                cantidad: 0,
                unidad: r.unidad || "M3",
                precioTotal: 0,
              };
            }
            map[tipo].viajes += r.cantidad_viajes || 1;
            map[tipo].cantidad += r.cantidad || 0;
            map[tipo].precioTotal += r.precio_total || 0;
            const fpKey = normalizarFormaPago(r.forma_pago);
            totalesPorFormaPago[fpKey] += r.precio_total || 0;
            for (const it of itemsMap[r.id] || []) {
              const key = it.concepto || "Ítems adicionales";
              if (!map[key]) {
                map[key] = { tipo: key, viajes: 0, cantidad: 0, unidad: it.unidad || "DIA", precioTotal: 0 };
              }
              map[key].cantidad += it.cantidad || 0;
              map[key].precioTotal += it.precio_total || 0;
              totalesPorFormaPago[fpKey] += it.precio_total || 0;
            }
          });
        const tipos = Object.values(map).sort((a, b) => a.tipo.localeCompare(b.tipo));
        return {
          cliente,
          tipos,
          viajes: tipos.reduce((s, t) => s + t.viajes, 0),
          cantidad: tipos.reduce((s, t) => s + t.cantidad, 0),
          precioTotal: tipos.reduce((s, t) => s + t.precioTotal, 0),
          totalesPorFormaPago,
        };
      })
      .filter((c) => c.tipos.length > 0);

    const ws = wb.addWorksheet("Liquidación");
    ws.columns = [
      { width: 28 },
      { width: 12 },
      { width: 14 },
      { width: 10 },
      { width: 18 },
    ];

    resumenPorCliente.forEach((c) => {
      // Cliente title row (merged)
      const titleRow = ws.addRow([`Cliente: ${c.cliente}`]);
      ws.mergeCells(titleRow.number, 1, titleRow.number, 5);
      const titleCell = titleRow.getCell(1);
      titleCell.font = { bold: true, color: { argb: COLOR_WHITE }, size: 12 };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_RED } };
      titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      titleRow.height = 24;

      // Header
      const headerRow = ws.addRow(["Tipo Material", "Viajes", "Cantidad", "Unidad", "Precio Total"]);
      applyHeaderStyle(headerRow);

      // Data rows
      c.tipos.forEach((t, idx) => {
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

      // Subtotal
      const unidadesUnicas = new Set(c.tipos.map((t) => t.unidad));
      const unidadSubtotal = unidadesUnicas.size === 1 ? [...unidadesUnicas][0] : "";
      const subRow = ws.addRow([`Subtotal ${c.cliente}`, c.viajes, c.cantidad, unidadSubtotal, c.precioTotal]);
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
    });

    const totalGeneral = {
      viajes: resumenPorCliente.reduce((s, c) => s + c.viajes, 0),
      cantidad: resumenPorCliente.reduce((s, c) => s + c.cantidad, 0),
      precioTotal: resumenPorCliente.reduce((s, c) => s + c.precioTotal, 0),
    };
    const totalRow = ws.addRow([
      "TOTAL GENERAL",
      totalGeneral.viajes,
      totalGeneral.cantidad,
      "",
      totalGeneral.precioTotal,
    ]);
    applyTotalStyle(totalRow);
    totalRow.getCell(1).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    totalRow.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
    totalRow.getCell(3).alignment = { vertical: "middle", horizontal: "right" };
    totalRow.getCell(5).alignment = { vertical: "middle", horizontal: "right" };
    totalRow.getCell(2).numFmt = "#,##0";
    totalRow.getCell(3).numFmt = "#,##0.00";
    totalRow.getCell(5).numFmt = '"$"#,##0.00';

    // ---------- Sheet 2: Liquidación General ----------
    const wsGeneral = wb.addWorksheet("Liquidación General", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    // Detect if any forma_pago info exists
    const hayFormaPago = resumenPorCliente.some(
      (c) =>
        c.totalesPorFormaPago.efectivo > 0 ||
        c.totalesPorFormaPago.transferencia > 0 ||
        c.totalesPorFormaPago.cuenta_corriente > 0
    );

    const moneyFmt = '"$"#,##0.00;[Red]("$"#,##0.00);"-"';

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
        "Cliente",
        "Efectivo",
        "Transferencia",
        "Cta. Corriente",
        "Sin especificar",
        "Precio Total",
      ]);
      applyHeaderStyle(genHeader);

      resumenPorCliente.forEach((c, idx) => {
        const r = wsGeneral.addRow([
          c.cliente,
          c.totalesPorFormaPago.efectivo,
          c.totalesPorFormaPago.transferencia,
          c.totalesPorFormaPago.cuenta_corriente,
          c.totalesPorFormaPago.sin_especificar,
          c.precioTotal,
        ]);
        const zebra = idx % 2 === 1;
        r.eachCell((cell, col) => {
          cell.border = thinBorder;
          if (zebra) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_GRAY_LIGHT } };
          cell.alignment = { vertical: "middle", horizontal: col === 1 ? "left" : "right" };
          if (col >= 2) cell.numFmt = moneyFmt;
        });
      });

      const sumFP = resumenPorCliente.reduce(
        (acc, c) => ({
          efectivo: acc.efectivo + c.totalesPorFormaPago.efectivo,
          transferencia: acc.transferencia + c.totalesPorFormaPago.transferencia,
          cuenta_corriente: acc.cuenta_corriente + c.totalesPorFormaPago.cuenta_corriente,
          sin_especificar: acc.sin_especificar + c.totalesPorFormaPago.sin_especificar,
        }),
        { efectivo: 0, transferencia: 0, cuenta_corriente: 0, sin_especificar: 0 }
      );

      const genTotal = wsGeneral.addRow([
        "TOTAL",
        sumFP.efectivo,
        sumFP.transferencia,
        sumFP.cuenta_corriente,
        sumFP.sin_especificar,
        totalGeneral.precioTotal,
      ]);
      applyTotalStyle(genTotal);
      genTotal.getCell(1).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      for (let col = 2; col <= 6; col++) {
        genTotal.getCell(col).alignment = { vertical: "middle", horizontal: "right" };
        genTotal.getCell(col).numFmt = moneyFmt;
      }
    } else {
      wsGeneral.columns = [{ width: 36 }, { width: 20 }];
      const genHeader = wsGeneral.addRow(["Cliente", "Precio Total"]);
      applyHeaderStyle(genHeader);

      resumenPorCliente.forEach((c, idx) => {
        const r = wsGeneral.addRow([c.cliente, c.precioTotal]);
        const zebra = idx % 2 === 1;
        r.eachCell((cell, col) => {
          cell.border = thinBorder;
          if (zebra) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_GRAY_LIGHT } };
          cell.alignment = { vertical: "middle", horizontal: col === 1 ? "left" : "right" };
        });
        r.getCell(2).numFmt = '"$"#,##0.00';
      });

      const genTotal = wsGeneral.addRow(["TOTAL", totalGeneral.precioTotal]);
      applyTotalStyle(genTotal);
      genTotal.getCell(1).alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      genTotal.getCell(2).alignment = { vertical: "middle", horizontal: "right" };
      genTotal.getCell(2).numFmt = '"$"#,##0.00';
    }

    // ---------- Sheet 3: Detalle Remitos ----------
    const detalleRemitos = remitosCliente
      .filter((r) => r.tipo_material && selectedTypes.has(r.tipo_material))
      .sort((a, b) => {
        const f = (a.fecha || "").localeCompare(b.fecha || "");
        if (f !== 0) return f;
        return (a.numero || "").localeCompare(b.numero || "");
      });

    const fmtFecha = (f: string | null) => {
      if (!f) return "";
      try {
        return format(parseISO(f), "dd/MM/yyyy");
      } catch {
        return f;
      }
    };

    if (detalleRemitos.length > 0) {
      const wsDetalle = wb.addWorksheet("Detalle Remitos", {
        views: [{ state: "frozen", ySplit: 1 }],
      });
      const headers = [
        "Fecha",
        "N° Remito",
        "Remito Tercero",
        "Cliente",
        "Cliente Destino",
        "Cliente Cantera",
        "Desde",
        "Hasta",
        "Tipo Material",
        "Viajes",
        "Cantidad",
        "Unidad",
        "Precio Unitario",
        "Precio Total",
        "Transporte",
        "Patente",
        "Observaciones",
      ];
      wsDetalle.columns = headers.map((h) => ({
        width: Math.max(h.length + 2, 14),
      }));

      const detHeader = wsDetalle.addRow(headers);
      applyHeaderStyle(detHeader);

      detalleRemitos.forEach((r, idx) => {
        const row = wsDetalle.addRow([
          fmtFecha(r.fecha),
          r.numero || "",
          r.remito_tercero || "",
          r.cliente || "",
          r.cliente_destino || "",
          r.cliente_cantera || "",
          r.desde || "",
          r.hasta || "",
          r.tipo_material || "",
          r.cantidad_viajes || 0,
          r.cantidad || 0,
          r.unidad || "",
          r.precio_unitario || 0,
          r.precio_total || 0,
          r.tipo_transporte || "",
          r.maquinaria?.patente || r.patente_tercero || "",
          r.observaciones || "",
        ]);
        const zebra = idx % 2 === 1;
        row.eachCell((cell) => {
          cell.border = thinBorder;
          if (zebra) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_GRAY_LIGHT } };
          cell.alignment = { vertical: "middle" };
        });
        row.getCell(10).numFmt = "#,##0";
        row.getCell(11).numFmt = "#,##0.00";
        row.getCell(13).numFmt = '"$"#,##0.00';
        row.getCell(14).numFmt = '"$"#,##0.00';
      });

      wsDetalle.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headers.length },
      };
    }

    // ---------- Download ----------
    const prefijo =
      tipoCliente === "cliente_cantera"
        ? "Liquidacion_Cantera"
        : tipoCliente === "cliente_destino"
        ? "Liquidacion_Destino"
        : "Liquidacion";
    const clientesArr = [...selectedClientes];
    const sufijo =
      clientesArr.length === 1
        ? clientesArr[0].replace(/\s/g, "_")
        : `${clientesArr.length}_clientes`;
    const fileName = `${prefijo}_${sufijo}_${format(new Date(), "yyyyMMdd")}.xlsx`;

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

  const hasSelection = selectedClientes.size > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Liquidación por Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo de cliente selector */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Liquidar por
            </label>
            <Select value={tipoCliente} onValueChange={(v) => handleTipoClienteChange(v as TipoCliente)}>
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cliente_o_destino">{TIPO_LABELS.cliente_o_destino}</SelectItem>
                <SelectItem value="cliente_destino">{TIPO_LABELS.cliente_destino}</SelectItem>
                <SelectItem value="cliente_cantera">{TIPO_LABELS.cliente_cantera}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clientes multi-select with search */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">
                {TIPO_LABELS[tipoCliente]}{" "}
                {selectedClientes.size > 0 && (
                  <span className="text-muted-foreground font-normal">
                    ({selectedClientes.size} seleccionados)
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllClientes} disabled={filteredClientes.length === 0}>
                  Seleccionar todos
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAllClientes} disabled={selectedClientes.size === 0}>
                  Ninguno
                </Button>
              </div>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchCliente}
                onChange={(e) => setSearchCliente(e.target.value)}
                placeholder="Buscar cliente..."
                className="pl-9 bg-card"
              />
            </div>

            <div className="rounded-md border max-h-60 overflow-y-auto bg-card">
              {filteredClientes.length === 0 ? (
                <div className="px-3 py-6 text-sm text-muted-foreground text-center">
                  {clientesUnicos.length === 0 ? "No hay datos" : "No se encontraron clientes"}
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredClientes.map((c) => (
                    <li key={c}>
                      <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent/40">
                        <Checkbox
                          checked={selectedClientes.has(c)}
                          onCheckedChange={() => toggleCliente(c)}
                        />
                        <span className="truncate">{c}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Type checkboxes */}
          {hasSelection && tiposUnicos.length > 0 && (
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

          {/* Summary table */}
          {hasSelection && resumen.length > 0 && (
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

          {hasSelection && remitosCliente.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay remitos para los clientes seleccionados en el período.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

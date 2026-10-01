import ExcelJS from "exceljs";
import { format, parseISO } from "date-fns";
import type { ReporteObraData } from "@/hooks/useReporteObra";

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

const MONEY = '"$"#,##0.00;[Red]("$"#,##0.00);"-"';

function applyHeaderStyle(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLOR_WHITE }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_BLACK } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder;
  });
}

function applyTotalStyle(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: COLOR_WHITE }, size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_RED } };
    cell.alignment = { vertical: "middle" };
    cell.border = thinBorder;
  });
}

function styleDataRows(
  ws: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  moneyCols: number[] = [],
  numCols: number[] = []
) {
  for (let r = startRow; r <= endRow; r++) {
    const row = ws.getRow(r);
    const zebra = (r - startRow) % 2 === 1;
    row.eachCell((cell, col) => {
      cell.border = thinBorder;
      if (zebra) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_GRAY_LIGHT } };
      cell.alignment = {
        vertical: "middle",
        horizontal: moneyCols.includes(col) || numCols.includes(col) ? "right" : col === 1 ? "left" : "left",
      };
      if (moneyCols.includes(col)) cell.numFmt = MONEY;
      else if (numCols.includes(col)) cell.numFmt = "#,##0.##";
    });
  }
}

function addSheetTitle(ws: ExcelJS.Worksheet, title: string, cols: number) {
  const row = ws.addRow([title]);
  ws.mergeCells(row.number, 1, row.number, cols);
  const cell = row.getCell(1);
  cell.font = { bold: true, color: { argb: COLOR_WHITE }, size: 13 };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_RED } };
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  row.height = 26;
}

const fmtFecha = (f: string | null | undefined) => {
  if (!f) return "";
  try {
    return format(parseISO(f), "dd/MM/yyyy");
  } catch {
    return f;
  }
};

export async function exportReporteObraExcel(
  data: ReporteObraData,
  fechaDesde?: string,
  fechaHasta?: string
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sistema de Gestión";
  wb.created = new Date();

  const obraNombre = data.obra?.nombre || "Obra";
  const periodo =
    fechaDesde || fechaHasta
      ? `${fechaDesde ? fmtFecha(fechaDesde) : "Inicio"} - ${fechaHasta ? fmtFecha(fechaHasta) : "Hoy"}`
      : "Historia completa";

  // -------- Sheet: Resumen --------
  const wsR = wb.addWorksheet("Resumen");
  wsR.columns = [{ width: 38 }, { width: 24 }];
  addSheetTitle(wsR, `Reporte Integral - ${obraNombre}`, 2);
  wsR.addRow([]);

  const info: [string, any][] = [
    ["Obra", obraNombre],
    ["N°", data.obra?.numero || "-"],
    ["Cliente", data.obra?.cliente || "-"],
    ["Estado", data.obra?.estado || "-"],
    ["Ubicación", data.obra?.ubicacion || "-"],
    ["Período del reporte", periodo],
  ];
  info.forEach(([k, v]) => {
    const r = wsR.addRow([k, v]);
    r.getCell(1).font = { bold: true };
    r.eachCell((c) => (c.border = thinBorder));
  });
  wsR.addRow([]);

  const totalesHeader = wsR.addRow(["Concepto", "Total"]);
  applyHeaderStyle(totalesHeader);

  const t = data.totales;
  const esCantera = data.esCantera;
  const totalRows: [string, number, boolean?][] = esCantera
    ? [
        ["Ingresos por Remitos (ventas)", t.ingresosRemitos],
        ["Personal — días-persona", t.personalDias],
        ["Personal — horas totales", Number(t.personalHoras.toFixed(2))],
        ["Personal — costo estimado $", t.personalCosto],
        ["Horas máquina (total)", Number(t.horasMaquinaTotal.toFixed(2))],
        ["Combustible — litros", Number(t.combustibleLitros.toFixed(2))],
        ["Combustible — costo $", t.combustibleCosto],
        ["Órdenes de compra — $", t.ordenesCompraTotal],
        ["Gastos generales — $", t.otrosGastosTotal],
        ["TOTAL GASTOS (Pers + Comb + OC + Otros)", t.gastosTotal, true],
        ["BALANCE (Ingresos - Gastos)", t.balance, true],
      ]
    : [
        ["Cotizado (aprobado)", data.cotizado],
        ["Personal — días-persona", t.personalDias],
        ["Personal — horas totales", Number(t.personalHoras.toFixed(2))],
        ["Horas máquina (total)", Number(t.horasMaquinaTotal.toFixed(2))],
        ["Combustible — litros", Number(t.combustibleLitros.toFixed(2))],
        ["Combustible — costo $", t.combustibleCosto],
        ["Remitos — $ facturado", t.remitosTotal],
        ["Órdenes de compra — $", t.ordenesCompraTotal],
        ["Gastos generales — $", t.otrosGastosTotal],
        ["TOTAL GASTOS (Comb + OC + Otros)", t.gastosTotal, true],
        ["BALANCE (Cotizado - Gastos)", t.balance, true],
      ];
  totalRows.forEach(([label, val, bold]) => {
    const r = wsR.addRow([label, val]);
    r.eachCell((c) => {
      c.border = thinBorder;
      if (bold) c.font = { bold: true };
    });
    if (
      label.includes("$") ||
      label.startsWith("Cotizado") ||
      label.startsWith("Ingresos") ||
      label.startsWith("TOTAL") ||
      label.startsWith("BALANCE")
    ) {
      r.getCell(2).numFmt = MONEY;
    } else {
      r.getCell(2).numFmt = "#,##0.##";
    }
    r.getCell(2).alignment = { horizontal: "right" };
  });
  const rentLabel = esCantera ? "Margen %" : "Rentabilidad %";
  const rentRow = wsR.addRow([rentLabel, Number(t.rentabilidad.toFixed(2))]);
  rentRow.eachCell((c) => {
    c.border = thinBorder;
    c.font = { bold: true };
  });
  rentRow.getCell(2).numFmt = "0.00\"%\"";
  rentRow.getCell(2).alignment = { horizontal: "right" };

  // -------- Sheet: Personal --------
  const wsP = wb.addWorksheet("Personal", { views: [{ state: "frozen", ySplit: 2 }] });
  const pCols = esCantera
    ? [{ width: 32 }, { width: 16 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 18 }]
    : [{ width: 32 }, { width: 16 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 12 }];
  wsP.columns = pCols;
  addSheetTitle(wsP, "Personal — Partes Diarios", pCols.length);
  const pHeader = esCantera
    ? ["Empleado", "Rol", "Días", "Horas", "Viajes", "Ausencias", "Costo estimado"]
    : ["Empleado", "Rol", "Días", "Horas", "Viajes", "Ausencias"];
  const pH = wsP.addRow(pHeader);
  applyHeaderStyle(pH);
  const pStart = wsP.rowCount + 1;
  data.personal.forEach((p) => {
    const base = [p.nombre, p.rol || "", p.dias, Number(p.horas.toFixed(2)), p.viajes, p.ausencias];
    wsP.addRow(esCantera ? [...base, p.costoEstimado] : base);
  });
  const pEnd = wsP.rowCount;
  if (pEnd >= pStart) styleDataRows(wsP, pStart, pEnd, esCantera ? [7] : [], [3, 4, 5, 6]);
  const pTotalRow = esCantera
    ? ["TOTAL", "", t.personalDias, Number(t.personalHoras.toFixed(2)), data.personal.reduce((s, p) => s + p.viajes, 0), data.personal.reduce((s, p) => s + p.ausencias, 0), t.personalCosto]
    : ["TOTAL", "", t.personalDias, Number(t.personalHoras.toFixed(2)), data.personal.reduce((s, p) => s + p.viajes, 0), data.personal.reduce((s, p) => s + p.ausencias, 0)];
  const pT = wsP.addRow(pTotalRow);
  applyTotalStyle(pT);
  [3, 4, 5, 6].forEach((c) => (pT.getCell(c).numFmt = "#,##0.##"));
  if (esCantera) pT.getCell(7).numFmt = MONEY;

  // -------- Sheet: Horas Máquina --------
  const wsH = wb.addWorksheet("Horas Máquina", { views: [{ state: "frozen", ySplit: 2 }] });
  wsH.columns = [{ width: 14 }, { width: 28 }, { width: 14 }, { width: 18 }, { width: 10 }, { width: 12 }, { width: 12 }];
  addSheetTitle(wsH, "Horas Máquina por Maquinaria", 7);
  const hH = wsH.addRow(["Código", "Nombre", "Patente", "Tipo", "Días", "Horas", "Operadores"]);
  applyHeaderStyle(hH);
  const hStart = wsH.rowCount + 1;
  data.horasMaquina.forEach((m) =>
    wsH.addRow([m.codigo || "", m.nombre || "", m.patente || "", m.tipo || "", m.dias, Number(m.horas.toFixed(2)), m.operadores])
  );
  const hEnd = wsH.rowCount;
  if (hEnd >= hStart) styleDataRows(wsH, hStart, hEnd, [], [5, 6, 7]);
  const hT = wsH.addRow(["TOTAL", "", "", "", data.horasMaquina.reduce((s, m) => s + m.dias, 0), Number(t.horasMaquinaTotal.toFixed(2)), ""]);
  applyTotalStyle(hT);
  [5, 6].forEach((c) => (hT.getCell(c).numFmt = "#,##0.##"));

  // -------- Sheet: Maquinarias Usadas --------
  const wsM = wb.addWorksheet("Maquinarias", { views: [{ state: "frozen", ySplit: 2 }] });
  wsM.columns = [{ width: 14 }, { width: 28 }, { width: 14 }, { width: 18 }, { width: 12 }];
  addSheetTitle(wsM, "Maquinarias Utilizadas en la Obra", 5);
  const mH = wsM.addRow(["Código", "Nombre", "Patente", "Tipo", "Horas"]);
  applyHeaderStyle(mH);
  const mStart = wsM.rowCount + 1;
  data.maquinarias.forEach((m) => wsM.addRow([m.codigo || "", m.nombre || "", m.patente || "", m.tipo || "", Number((m.horas || 0).toFixed(2))]));
  const mEnd = wsM.rowCount;
  if (mEnd >= mStart) styleDataRows(wsM, mStart, mEnd, [], [5]);

  // -------- Sheet: Combustible --------
  const wsC = wb.addWorksheet("Combustible", { views: [{ state: "frozen", ySplit: 2 }] });
  wsC.columns = [{ width: 14 }, { width: 28 }, { width: 14 }, { width: 12 }, { width: 16 }, { width: 12 }];
  addSheetTitle(wsC, "Gastos de Combustible", 6);
  const cH = wsC.addRow(["Código", "Maquinaria", "Patente", "Litros", "Costo $", "Cargas"]);
  applyHeaderStyle(cH);
  const cStart = wsC.rowCount + 1;
  data.combustible.forEach((c) =>
    wsC.addRow([c.codigo || "", c.nombre || "", c.patente || "", Number(c.litros.toFixed(2)), c.costo, c.cargas])
  );
  const cEnd = wsC.rowCount;
  if (cEnd >= cStart) styleDataRows(wsC, cStart, cEnd, [5], [4, 6]);
  const cT = wsC.addRow([
    "TOTAL",
    "",
    "",
    Number(t.combustibleLitros.toFixed(2)),
    t.combustibleCosto,
    data.combustible.reduce((s, x) => s + x.cargas, 0),
  ]);
  applyTotalStyle(cT);
  cT.getCell(4).numFmt = "#,##0.##";
  cT.getCell(5).numFmt = MONEY;
  cT.getCell(6).numFmt = "#,##0";

  // -------- Sheet: Remitos --------
  const wsRe = wb.addWorksheet("Remitos", { views: [{ state: "frozen", ySplit: 2 }] });
  wsRe.columns = [{ width: 26 }, { width: 22 }, { width: 10 }, { width: 12 }, { width: 14 }, { width: 10 }, { width: 16 }];
  addSheetTitle(wsRe, esCantera ? "Ingresos por Remitos (ventas de material)" : "Remitos por Tipo de Material", 7);
  const reH = wsRe.addRow(["Tipo Material", "Material", "Remitos", "Viajes", "Cantidad", "Unidad", "Total $"]);
  applyHeaderStyle(reH);
  const reStart = wsRe.rowCount + 1;
  data.remitos.forEach((r) =>
    wsRe.addRow([r.tipo, r.material, r.remitos, r.viajes, Number(r.cantidad.toFixed(2)), r.unidad, r.total])
  );
  const reEnd = wsRe.rowCount;
  if (reEnd >= reStart) styleDataRows(wsRe, reStart, reEnd, [7], [3, 4, 5]);
  const reT = wsRe.addRow([
    "TOTAL",
    "",
    data.remitos.reduce((s, r) => s + r.remitos, 0),
    data.remitos.reduce((s, r) => s + r.viajes, 0),
    Number(data.remitos.reduce((s, r) => s + r.cantidad, 0).toFixed(2)),
    "",
    t.remitosTotal,
  ]);
  applyTotalStyle(reT);
  [3, 4, 5].forEach((c) => (reT.getCell(c).numFmt = "#,##0.##"));
  reT.getCell(7).numFmt = MONEY;

  // -------- Sheet: Órdenes de Compra --------
  const wsO = wb.addWorksheet("Órdenes Compra", { views: [{ state: "frozen", ySplit: 2 }] });
  wsO.columns = [{ width: 14 }, { width: 12 }, { width: 26 }, { width: 50 }, { width: 14 }, { width: 16 }];
  addSheetTitle(wsO, "Órdenes de Compra", 6);
  const oH = wsO.addRow(["Número", "Fecha", "Proveedor", "Descripción", "Estado", "Total $"]);
  applyHeaderStyle(oH);
  const oStart = wsO.rowCount + 1;
  data.ordenesCompra.forEach((o) =>
    wsO.addRow([o.numero, fmtFecha(o.fecha), o.proveedor, o.descripcion, o.estado, o.total])
  );
  const oEnd = wsO.rowCount;
  if (oEnd >= oStart) styleDataRows(wsO, oStart, oEnd, [6]);
  const oT = wsO.addRow(["TOTAL", "", "", "", "", t.ordenesCompraTotal]);
  applyTotalStyle(oT);
  oT.getCell(6).numFmt = MONEY;

  // -------- Sheet: Otros Gastos --------
  const wsG = wb.addWorksheet("Gastos Generales", { views: [{ state: "frozen", ySplit: 2 }] });
  wsG.columns = [{ width: 28 }, { width: 22 }, { width: 12 }, { width: 16 }];
  addSheetTitle(wsG, "Gastos Generales por Categoría", 4);
  const gH = wsG.addRow(["Categoría", "Sector", "Ítems", "Monto $"]);
  applyHeaderStyle(gH);
  const gStart = wsG.rowCount + 1;
  data.otrosGastos.forEach((g) => wsG.addRow([g.categoria, g.sector || "", g.items, g.monto]));
  const gEnd = wsG.rowCount;
  if (gEnd >= gStart) styleDataRows(wsG, gStart, gEnd, [4], [3]);
  const gT = wsG.addRow(["TOTAL", "", data.otrosGastos.reduce((s, x) => s + x.items, 0), t.otrosGastosTotal]);
  applyTotalStyle(gT);
  gT.getCell(3).numFmt = "#,##0";
  gT.getCell(4).numFmt = MONEY;

  // -------- Download --------
  const safe = obraNombre.replace(/[^\w\-]+/g, "_").slice(0, 40);
  const fileName = `Reporte_${safe}_${format(new Date(), "yyyyMMdd")}.xlsx`;
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
}

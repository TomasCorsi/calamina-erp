import ExcelJS from "exceljs";
import { format } from "date-fns";
import {
  COLOR_RED, COLOR_BLACK, COLOR_GRAY_LIGHT, COLOR_WHITE,
  thinBorder, applyHeaderStyle, applyTotalStyle, applyTitleStyle, applyZebra,
} from "@/lib/excel/styles";
import type { Liquidacion, LiquidacionItem } from "@/hooks/useLiquidaciones";

const PERIODO_LABEL: Record<string, string> = {
  quincena_1: "Quincena 1 (1-15)",
  quincena_2: "Quincena 2 (16-fin)",
  mes: "Mes completo",
};

const periodoSlug = (l: Liquidacion) => `${l.periodo}_${String(l.mes).padStart(2, "0")}_${l.anio}`;

const empleadoNombre = (it: LiquidacionItem) =>
  it.personal ? `${it.personal.apellido}, ${it.personal.nombre}` : "—";

export async function exportarExcelBanco(liq: Liquidacion, items: LiquidacionItem[]) {
  const filtered = items.filter((i) => Number(i.monto_banco) > 0);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gestión de Obras";
  wb.created = new Date();
  const ws = wb.addWorksheet("Banco");
  ws.columns = [
    { width: 12 }, { width: 32 }, { width: 16 }, { width: 22 }, { width: 18 }, { width: 18 }, { width: 28 },
  ];

  const title = ws.addRow([`Depósitos Banco — ${PERIODO_LABEL[liq.periodo]} ${String(liq.mes).padStart(2, "0")}/${liq.anio}`]);
  ws.mergeCells(`A${title.number}:G${title.number}`);
  applyTitleStyle(title);
  ws.addRow([]);

  const header = ws.addRow(["Legajo", "Empleado", "DNI", "Banco", "CBU/Cuenta", "Importe", "Concepto"]);
  applyHeaderStyle(header);

  let total = 0;
  filtered.forEach((it, idx) => {
    const r = ws.addRow([
      it.personal?.legajo ?? "",
      empleadoNombre(it),
      it.personal?.dni ?? "",
      it.banco_snapshot ?? "",
      it.cbu_snapshot ?? it.numero_cuenta_snapshot ?? "",
      Number(it.monto_banco),
      `Sueldo ${PERIODO_LABEL[liq.periodo]} ${String(liq.mes).padStart(2, "0")}/${liq.anio}`,
    ]);
    applyZebra(r, idx);
    r.getCell(6).numFmt = '"$"#,##0.00';
    total += Number(it.monto_banco);
  });

  const totalRow = ws.addRow(["", "", "", "", "TOTAL BANCO", total, ""]);
  totalRow.getCell(6).numFmt = '"$"#,##0.00';
  applyTotalStyle(totalRow);

  await downloadWb(wb, `Banco_${periodoSlug(liq)}.xlsx`);
}

export async function exportarExcelEfectivo(liq: Liquidacion, items: LiquidacionItem[]) {
  const filtered = items.filter((i) => Number(i.monto_efectivo) > 0);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gestión de Obras";
  wb.created = new Date();
  const ws = wb.addWorksheet("Efectivo");
  ws.columns = [{ width: 12 }, { width: 32 }, { width: 18 }, { width: 12 }, { width: 40 }];

  const title = ws.addRow([`Efectivo a preparar — ${PERIODO_LABEL[liq.periodo]} ${String(liq.mes).padStart(2, "0")}/${liq.anio}`]);
  ws.mergeCells(`A${title.number}:E${title.number}`);
  applyTitleStyle(title);
  ws.addRow([]);

  const header = ws.addRow(["Legajo", "Empleado", "Importe", "Embargo", "Observaciones"]);
  applyHeaderStyle(header);

  let total = 0;
  filtered.forEach((it, idx) => {
    const r = ws.addRow([
      it.personal?.legajo ?? "",
      empleadoNombre(it),
      Number(it.monto_efectivo),
      it.embargo ? "SÍ" : "",
      it.observaciones ?? "",
    ]);
    applyZebra(r, idx);
    r.getCell(3).numFmt = '"$"#,##0.00';
    if (it.embargo) {
      r.getCell(4).font = { bold: true, color: { argb: COLOR_RED } };
    }
    total += Number(it.monto_efectivo);
  });

  const totalRow = ws.addRow(["", "TOTAL EFECTIVO A RETIRAR", total, "", ""]);
  totalRow.getCell(3).numFmt = '"$"#,##0.00';
  applyTotalStyle(totalRow);

  await downloadWb(wb, `Efectivo_${periodoSlug(liq)}.xlsx`);
}

export async function exportarExcelResumenContable(liq: Liquidacion, items: LiquidacionItem[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Gestión de Obras";
  wb.created = new Date();
  const ws = wb.addWorksheet("Resumen");
  ws.columns = [
    { width: 12 }, { width: 30 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 12 },
    { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
  ];

  const title = ws.addRow([`Resumen Contable — ${PERIODO_LABEL[liq.periodo]} ${String(liq.mes).padStart(2, "0")}/${liq.anio}`]);
  ws.mergeCells(`A${title.number}:L${title.number}`);
  applyTitleStyle(title);
  ws.addRow([]);

  const header = ws.addRow([
    "Legajo", "Empleado", "Bruto Blanco", "Bruto Negro", "Faltas", "Licencia",
    "HE Importe", "Presentismo", "Adelantos", "Préstamo", "Neto Total", "Banco / Efectivo",
  ]);
  applyHeaderStyle(header);

  let tb = 0, tn = 0, tHe = 0, tPr = 0, tAd = 0, tCu = 0, tNeto = 0, tBanco = 0, tEfe = 0;
  items.forEach((it, idx) => {
    const r = ws.addRow([
      it.personal?.legajo ?? "",
      empleadoNombre(it),
      Number(it.bruto_blanco),
      Number(it.bruto_negro),
      Number(it.dias_falta),
      Number(it.dias_licencia),
      Number(it.importe_he),
      Number(it.presentismo),
      Number(it.adelantos),
      Number(it.cuota_prestamo),
      Number(it.neto_total),
      `${formatARS(it.monto_banco)} / ${formatARS(it.monto_efectivo)}`,
    ]);
    applyZebra(r, idx);
    [3, 4, 7, 8, 9, 10, 11].forEach((c) => (r.getCell(c).numFmt = '"$"#,##0.00'));
    tb += Number(it.bruto_blanco);
    tn += Number(it.bruto_negro);
    tHe += Number(it.importe_he);
    tPr += Number(it.presentismo);
    tAd += Number(it.adelantos);
    tCu += Number(it.cuota_prestamo);
    tNeto += Number(it.neto_total);
    tBanco += Number(it.monto_banco);
    tEfe += Number(it.monto_efectivo);
  });

  const totalRow = ws.addRow(["", "TOTALES", tb, tn, "", "", tHe, tPr, tAd, tCu, tNeto, `${formatARS(tBanco)} / ${formatARS(tEfe)}`]);
  [3, 4, 7, 8, 9, 10, 11].forEach((c) => (totalRow.getCell(c).numFmt = '"$"#,##0.00'));
  applyTotalStyle(totalRow);

  await downloadWb(wb, `Resumen_${periodoSlug(liq)}.xlsx`);
}

const formatARS = (n: number | string) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(n));

async function downloadWb(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

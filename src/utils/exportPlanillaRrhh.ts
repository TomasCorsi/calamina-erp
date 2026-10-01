import ExcelJS from "exceljs";
import { applyHeaderStyle, applyTitleStyle, applyZebra } from "@/lib/excel/styles";
import { formatDate } from "@/lib/utils";
import { PERIODO_LABEL, MESES, type RrhhPeriodo } from "@/hooks/useRrhh";
import { round1, type PlanillaRow } from "@/components/rrhh/planillaData";

const HEADERS = [
  "Legajo", "Empleado", "Ingreso", "Baja", "Horas normales", "Feriado trabajado",
  "Inasistencias", "Enfermedad", "ART", "Licencia", "Vacaciones", "Total horas",
  "Premio", "Anticipo", "Observaciones",
];

export async function exportPlanillaRrhh(periodo: RrhhPeriodo, rows: PlanillaRow[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Novedades");

  ws.columns = [
    { width: 10 }, { width: 30 }, { width: 12 }, { width: 12 }, { width: 15 },
    { width: 16 }, { width: 14 }, { width: 13 }, { width: 10 }, { width: 12 },
    { width: 13 }, { width: 13 }, { width: 14 }, { width: 14 }, { width: 40 },
  ];

  const titulo = ws.addRow([
    `NOVEDADES ${PERIODO_LABEL[periodo.tipo].toUpperCase()} ${MESES[periodo.mes - 1].toUpperCase()} ${periodo.anio}`,
  ]);
  ws.mergeCells(titulo.number, 1, titulo.number, HEADERS.length);
  applyTitleStyle(titulo);

  const sub = ws.addRow([`Período: ${formatDate(periodo.fecha_desde)} al ${formatDate(periodo.fecha_hasta)}`]);
  ws.mergeCells(sub.number, 1, sub.number, HEADERS.length);
  sub.getCell(1).font = { italic: true, size: 10 };

  ws.addRow([]);
  applyHeaderStyle(ws.addRow(HEADERS));

  rows.forEach((r, i) => {
    const row = ws.addRow([
      r.legajo,
      r.empleado,
      r.ingreso ? formatDate(r.ingreso) : "",
      r.baja ? formatDate(r.baja) : "",
      round1(r.horasNormales),
      round1(r.feriadoTrabajado),
      round1(r.inasistencias),
      round1(r.enfermedad),
      round1(r.art),
      round1(r.licencia),
      round1(r.vacaciones),
      round1(r.totalHoras),
      r.premio || 0,
      r.anticipo || 0,
      r.observaciones,
    ]);
    applyZebra(row, i);
    [13, 14].forEach((c) => (row.getCell(c).numFmt = '#,##0'));
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Novedades_${PERIODO_LABEL[periodo.tipo].replace(/\s/g, "")}_${MESES[periodo.mes - 1]}_${periodo.anio}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

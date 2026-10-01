import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import logoCalamina from "@/assets/logo-calamina-sur.png";

const EMPRESA_INFO = {
  nombre: "CALAMINA SUR S.A.",
  cuit: "30-71457642-5",
  direccion: "CASTEX 499 – Piso: 6° Oficina 601",
  localidad: "(1804) Canning - Pcia. Bs. As.",
  telefono: "11-38537787",
  email: "calamimasur@hotmail.com",
};

export interface MaquinariaData {
  codigo: string | null;
  nombre: string | null;
  tipo: string;
  marca: string | null;
  patente: string | null;
  anio: number | null;
  estado: string;
  horas_acumuladas: number;
  km_acumulados: number;
}

export interface TotalesData {
  totalCombustible: number;
  totalLitros: number;
  totalRemitos: number;
  totalViajes: number;
  costoRemitos: number;
  totalMantenimientos: number;
  costoMantenimientos: number;
  gastoTotal: number;
  cantCargas: number;
}

export interface RendimientoData {
  totalKm: number;
  horasMaquina: number;
  conductores: Array<{ nombre: string; dias: number }>;
  totalViajesPartes: number;
  totalMovInternos: number;
  viajesPorTipo: Record<string, number>;
}

interface ImageData {
  base64: string;
  width: number;
  height: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

async function loadImageAsBase64(url: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve({
          base64: canvas.toDataURL("image/png"),
          width: img.width,
          height: img.height,
        });
      } else {
        reject(new Error("Could not get canvas context"));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

const estadoLabels: Record<string, string> = {
  operativa: "Operativa",
  mantenimiento: "En Mantenimiento",
  inactiva: "Inactiva",
  en_uso: "En Uso",
};

export async function generateGastosMaquinariaPDF(
  maquinaria: MaquinariaData,
  totales: TotalesData,
  rendimiento: RendimientoData,
  fechaDesde?: Date,
  fechaHasta?: Date
): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let yPos = 8;

  // Load logo
  let logoData: ImageData | null = null;
  try {
    logoData = await loadImageAsBase64(logoCalamina);
  } catch (e) {
    console.warn("Could not load logo:", e);
  }

  // ============== HEADER ==============
  if (logoData) {
    const logoWidth = 35;
    const logoAspectRatio = logoData.height / logoData.width;
    const logoHeight = logoWidth * logoAspectRatio;
    doc.addImage(logoData.base64, "PNG", margin, yPos, logoWidth, logoHeight);
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA_INFO.nombre, pageWidth - margin, yPos + 3, { align: "right" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`CUIT: ${EMPRESA_INFO.cuit}`, pageWidth - margin, yPos + 7, { align: "right" });
  doc.text(EMPRESA_INFO.direccion, pageWidth - margin, yPos + 11, { align: "right" });
  doc.text(EMPRESA_INFO.localidad, pageWidth - margin, yPos + 15, { align: "right" });
  doc.text(`Cel: ${EMPRESA_INFO.telefono} | ${EMPRESA_INFO.email}`, pageWidth - margin, yPos + 19, { align: "right" });

  yPos += 24;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // ============== REPORT TITLE ==============
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 0, 0);
  doc.text("LIQUIDACIÓN DE MAQUINARIA / VEHÍCULO", margin, yPos);
  doc.setTextColor(0, 0, 0);

  const periodoDesde = fechaDesde ? format(fechaDesde, "dd/MM/yyyy") : "Inicio";
  const periodoHasta = fechaHasta ? format(fechaHasta, "dd/MM/yyyy") : "Actual";
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${periodoDesde} - ${periodoHasta}`, pageWidth - margin, yPos, { align: "right" });
  yPos += 7;

  // ============== DATOS DEL EQUIPO (con conductor y KM/Hs período) ==============
  const hasConductores = rendimiento.conductores.length > 0;
  const equipoBoxHeight = hasConductores ? 34 : 20;
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos - 2, pageWidth - margin * 2, equipoBoxHeight, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL EQUIPO", margin + 2, yPos + 2);
  yPos += 5;

  const col1X = margin + 2;
  const col2X = pageWidth / 3 + 5;
  const col3X = (pageWidth / 3) * 2;

  const drawField = (label: string, value: string, x: number, y: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(`${label}:`, x, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, x + doc.getTextWidth(`${label}: `) + 1, y);
  };

  drawField("Código", maquinaria.codigo || "S/C", col1X, yPos);
  drawField("Nombre", maquinaria.nombre || "Sin nombre", col2X, yPos);
  drawField("Patente", maquinaria.patente || "-", col3X, yPos);
  yPos += 4;

  drawField("Tipo", maquinaria.tipo, col1X, yPos);
  drawField("Marca", maquinaria.marca || "-", col2X, yPos);
  drawField("Año", maquinaria.anio?.toString() || "-", col3X, yPos);
  yPos += 4;

  drawField("Estado", estadoLabels[maquinaria.estado] || maquinaria.estado, col1X, yPos);
  drawField("Horas acum.", maquinaria.horas_acumuladas.toLocaleString(), col2X, yPos);
  drawField("KM acum.", maquinaria.km_acumulados.toLocaleString(), col3X, yPos);
  yPos += 4;

  if (hasConductores) {
    const conductorTexto = rendimiento.conductores
      .sort((a, b) => b.dias - a.dias)
      .map(c => `${c.nombre} (${c.dias}d)`)
      .join(" | ");
    // Conductor on its own full-width row
    drawField("Conductor(es)", conductorTexto.length > 80 ? conductorTexto.substring(0, 77) + "..." : conductorTexto, col1X, yPos);
    yPos += 4;

    // KM and Hs on a separate row
    drawField("KM período", `${rendimiento.totalKm.toLocaleString()} km`, col1X, yPos);
    drawField("Hs período", `${rendimiento.horasMaquina.toLocaleString()} hs`, col2X, yPos);
    yPos += 4;
  }

  yPos += 4;

  // ============== RESUMEN DE GASTOS ==============
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN DE GASTOS", margin, yPos);
  yPos += 3;

  const resumenBody = [
    [
      "Combustible / Insumos",
      `${totales.totalLitros.toLocaleString()} L  (${totales.cantCargas} cargas)`,
      formatCurrency(totales.totalCombustible),
    ],
    [
      "Mantenimientos",
      `${totales.totalMantenimientos} servicio${totales.totalMantenimientos !== 1 ? "s" : ""}`,
      formatCurrency(totales.costoMantenimientos),
    ],
    [
      "Remitos / Viajes",
      `${totales.totalRemitos} remitos - ${totales.totalViajes} viajes`,
      formatCurrency(totales.costoRemitos),
    ],
  ];

  const categoryColors: [number, number, number][] = [
    [245, 245, 245],
    [235, 235, 235],
    [245, 245, 245],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [["Categoría", "Detalle", "Total"]],
    body: resumenBody,
    theme: "grid",
    headStyles: {
      fillColor: [45, 45, 45],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
      cellPadding: 2,
    },
    bodyStyles: { fontSize: 7.5, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: "bold" },
      1: { cellWidth: "auto", halign: "center" },
      2: { cellWidth: 35, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
    foot: [["GASTO TOTAL", "", formatCurrency(totales.gastoTotal)]],
    footStyles: {
      fillColor: [180, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 3,
    },
    didParseCell: (data) => {
      if (data.section === "body" && categoryColors[data.row.index]) {
        data.cell.styles.fillColor = categoryColors[data.row.index];
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // ============== ACTIVIDAD DEL PERÍODO ==============
  const actividadBody: string[][] = [];

  // Viajes por tipo de material
  const tiposOrdenados = Object.entries(rendimiento.viajesPorTipo)
    .sort((a, b) => b[1] - a[1]);
  
  for (const [tipo, cant] of tiposOrdenados) {
    actividadBody.push([tipo, `${cant} viaje${cant !== 1 ? "s" : ""}`]);
  }

  // Movimientos internos
  if (rendimiento.totalMovInternos > 0) {
    actividadBody.push(["Movimientos Internos", `${rendimiento.totalMovInternos}`]);
  }

  // Cargas de combustible
  actividadBody.push(["Cargas de Combustible", `${totales.cantCargas}`]);

  // Total viajes
  const totalViajes = rendimiento.totalViajesPartes || totales.totalViajes;
  actividadBody.push(["Total Viajes", `${totalViajes}`]);

  if (actividadBody.length > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 60, 100);
    doc.text("ACTIVIDAD DEL PERÍODO", margin, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 3;

    autoTable(doc, {
      startY: yPos,
      head: [["Concepto", "Cantidad"]],
      body: actividadBody,
      theme: "striped",
      headStyles: {
        fillColor: [45, 45, 45],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
        cellPadding: 2,
      },
      bodyStyles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold" },
        1: { halign: "center" },
      },
      margin: { left: margin, right: margin },
      didParseCell: (data) => {
        if (data.section === "body" && data.row.index === actividadBody.length - 1) {
          data.cell.styles.fillColor = [225, 225, 225];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ============== FOOTER ==============
  const signatureX = pageWidth / 2;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos - 4, pageWidth - margin, yPos - 4);

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA_INFO.nombre, signatureX, yPos, { align: "center" });
  yPos += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, signatureX, yPos, { align: "center" });

  // Save PDF
  const fileName = `Liquidacion_${maquinaria.codigo || "Maquinaria"}_${format(new Date(), "yyyyMMdd")}.pdf`;
  doc.save(fileName);
}

// ==================================================================
// PDF CONSOLIDADO: liquidación de todos los vehículos / maquinarias
// ==================================================================

export interface VehiculoLiquidacionRow {
  codigo: string | null;
  nombre: string | null;
  patente: string | null;
  tipo: string;
  litros: number;
  costoCombustible: number;
  cantRemitos: number;
  cantViajes: number;
  costoRemitos: number;
  cantMantenimientos: number;
  costoMantenimientos: number;
  gastoTotal: number;
  conductores?: Array<{ nombre: string; dias: number }>;
}

function formatConductores(conductores?: Array<{ nombre: string; dias: number }>): string {
  if (!conductores || conductores.length === 0) return "-";
  const sorted = [...conductores].sort((a, b) => b.dias - a.dias);
  const shown = sorted.slice(0, 2).map((c) => `${c.nombre} (${c.dias}d)`).join(" | ");
  const rest = sorted.length - 2;
  return rest > 0 ? `${shown} +${rest}` : shown;
}

export async function generateLiquidacionVehiculosPDF(
  filas: VehiculoLiquidacionRow[],
  fechaDesde?: Date,
  fechaHasta?: Date
): Promise<void> {
  const doc = new jsPDF("l", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let yPos = 8;

  let logoData: ImageData | null = null;
  try {
    logoData = await loadImageAsBase64(logoCalamina);
  } catch (e) {
    console.warn("Could not load logo:", e);
  }

  // ============== HEADER ==============
  if (logoData) {
    const logoWidth = 35;
    const logoHeight = logoWidth * (logoData.height / logoData.width);
    doc.addImage(logoData.base64, "PNG", margin, yPos, logoWidth, logoHeight);
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA_INFO.nombre, pageWidth - margin, yPos + 3, { align: "right" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`CUIT: ${EMPRESA_INFO.cuit}`, pageWidth - margin, yPos + 7, { align: "right" });
  doc.text(EMPRESA_INFO.direccion, pageWidth - margin, yPos + 11, { align: "right" });
  doc.text(EMPRESA_INFO.localidad, pageWidth - margin, yPos + 15, { align: "right" });
  doc.text(`Cel: ${EMPRESA_INFO.telefono} | ${EMPRESA_INFO.email}`, pageWidth - margin, yPos + 19, { align: "right" });

  yPos += 24;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 0, 0);
  doc.text("LIQUIDACIÓN DE VEHÍCULOS", margin, yPos);
  doc.setTextColor(0, 0, 0);

  const periodoDesde = fechaDesde ? format(fechaDesde, "dd/MM/yyyy") : "Inicio";
  const periodoHasta = fechaHasta ? format(fechaHasta, "dd/MM/yyyy") : "Actual";
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${periodoDesde} - ${periodoHasta}`, pageWidth - margin, yPos, { align: "right" });
  yPos += 4;

  // Mes / meses del período
  const mesLabel = (d: Date) => format(d, "MMMM yyyy", { locale: es }).toUpperCase();
  let mesTexto = "PERÍODO COMPLETO";
  if (fechaDesde && fechaHasta) {
    const a = mesLabel(fechaDesde);
    const b = mesLabel(fechaHasta);
    mesTexto = a === b ? a : `${a} - ${b}`;
  } else if (fechaDesde) {
    mesTexto = `DESDE ${mesLabel(fechaDesde)}`;
  } else if (fechaHasta) {
    mesTexto = `HASTA ${mesLabel(fechaHasta)}`;
  }
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(mesTexto, margin, yPos);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Vehículos con movimiento: ${filas.length}`, pageWidth - margin, yPos, { align: "right" });
  yPos += 5;

  // ============== TOTALES ==============
  const gastoDe = (f: VehiculoLiquidacionRow) => f.costoCombustible + f.costoMantenimientos;

  const tot = filas.reduce(
    (a, f) => ({
      litros: a.litros + f.litros,
      combustible: a.combustible + f.costoCombustible,
      remitos: a.remitos + f.cantRemitos,
      viajes: a.viajes + f.cantViajes,
      ingresos: a.ingresos + f.costoRemitos,
      mant: a.mant + f.cantMantenimientos,
      costoMant: a.costoMant + f.costoMantenimientos,
      gasto: a.gasto + gastoDe(f),
    }),
    { litros: 0, combustible: 0, remitos: 0, viajes: 0, ingresos: 0, mant: 0, costoMant: 0, gasto: 0 }
  );
  const resultadoTotal = tot.ingresos - tot.gasto;

  const body = filas.map((f) => {
    const gasto = gastoDe(f);
    const resultado = f.costoRemitos - gasto;
    return [
      f.codigo || "S/C",
      [f.nombre || "", f.patente ? `(${f.patente})` : ""].filter(Boolean).join(" "),
      f.tipo,
      formatConductores(f.conductores),
      f.litros ? f.litros.toLocaleString("es-AR", { maximumFractionDigits: 0 }) : "-",
      f.costoCombustible ? formatCurrency(f.costoCombustible) : "-",
      f.cantMantenimientos ? String(f.cantMantenimientos) : "-",
      f.costoMantenimientos ? formatCurrency(f.costoMantenimientos) : "-",
      formatCurrency(gasto),
      f.cantRemitos ? `${f.cantRemitos} / ${f.cantViajes}` : "-",
      f.costoRemitos ? formatCurrency(f.costoRemitos) : "-",
      formatCurrency(resultado),
    ];
  });

  const resultadosFila = filas.map((f) => f.costoRemitos - gastoDe(f));

  body.push([
    "TOTALES",
    "",
    "",
    "",
    tot.litros.toLocaleString("es-AR", { maximumFractionDigits: 0 }),
    formatCurrency(tot.combustible),
    String(tot.mant),
    formatCurrency(tot.costoMant),
    formatCurrency(tot.gasto),
    `${tot.remitos} / ${tot.viajes}`,
    formatCurrency(tot.ingresos),
    formatCurrency(resultadoTotal),
  ]);
  resultadosFila.push(resultadoTotal);

  autoTable(doc, {
    startY: yPos,
    head: [[
      "Código", "Vehículo", "Tipo", "Chofer / Maquinista", "Litros", "$ Combustible",
      "Mant.", "$ Mantenim.", "GASTO TOTAL", "Rem./Viajes", "INGRESOS", "RESULTADO",
    ]],
    body,
    theme: "grid",
    headStyles: {
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.5,
      cellPadding: 2,
      halign: "center",
    },
    bodyStyles: { fontSize: 6.8, cellPadding: 1.6 },
    alternateRowStyles: { fillColor: [246, 246, 246] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 15 },
      1: { cellWidth: 36 },
      2: { cellWidth: 20 },
      3: { cellWidth: 40, fontSize: 6 },
      4: { halign: "right", cellWidth: 14 },
      5: { halign: "right", cellWidth: 23 },
      6: { halign: "center", cellWidth: 12 },
      7: { halign: "right", cellWidth: 23 },
      8: { halign: "right", cellWidth: 25, fontStyle: "bold" },
      9: { halign: "center", cellWidth: 17 },
      10: { halign: "right", cellWidth: 25, fontStyle: "bold" },
      11: { halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      const isTotals = data.section === "body" && data.row.index === body.length - 1;
      if (isTotals) {
        data.cell.styles.fillColor = [225, 225, 225];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = [0, 0, 0];
      }
      if (data.section === "body" && data.column.index === 11) {
        const r = resultadosFila[data.row.index];
        if (typeof r === "number") {
          data.cell.styles.textColor = r >= 0 ? [0, 120, 60] : [180, 0, 0];
        }
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // ============== RESUMEN INGRESOS VS GASTOS ==============
  const pct = (v: number) => (tot.gasto > 0 ? `${((v / tot.gasto) * 100).toFixed(1)}%` : "0,0%");
  const margen = tot.ingresos > 0 ? `${((resultadoTotal / tot.ingresos) * 100).toFixed(1)}%` : "-";

  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 15;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 0, 0);
  doc.text("INGRESOS VS GASTOS", margin, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 3;

  autoTable(doc, {
    startY: yPos,
    head: [["Concepto", "Cantidad", "Importe", "% s/ gasto"]],
    body: [
      ["INGRESOS (Remitos / Viajes)", `${tot.remitos} rem. / ${tot.viajes} viajes`, formatCurrency(tot.ingresos), "-"],
      ["Combustible", `${tot.litros.toLocaleString("es-AR", { maximumFractionDigits: 0 })} L`, formatCurrency(tot.combustible), pct(tot.combustible)],
      ["Mantenimientos", `${tot.mant} servicios`, formatCurrency(tot.costoMant), pct(tot.costoMant)],
      ["GASTO TOTAL", "", formatCurrency(tot.gasto), "100,0%"],
      ["RESULTADO DEL PERÍODO", `Margen: ${margen}`, formatCurrency(resultadoTotal), ""],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7, cellPadding: 2,
    },
    bodyStyles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 60 },
      1: { halign: "center", cellWidth: 55 },
      2: { halign: "right", cellWidth: 40 },
      3: { halign: "right", cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.row.index === 0) {
        data.cell.styles.fillColor = [238, 245, 238];
        data.cell.styles.fontStyle = "bold";
      }
      if (data.row.index === 3) {
        data.cell.styles.fillColor = [235, 235, 235];
        data.cell.styles.fontStyle = "bold";
      }
      if (data.row.index === 4) {
        data.cell.styles.fillColor = [220, 220, 220];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = resultadoTotal >= 0 ? [0, 120, 60] : [180, 0, 0];
      }
    },
  });

  // ============== FOOTER + PAGINADO ==============
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(
      `${EMPRESA_INFO.nombre} · Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`,
      margin,
      pageHeight - 6
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 6, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  const sufijoMes = fechaDesde ? format(fechaDesde, "yyyy-MM") : format(new Date(), "yyyy-MM");
  doc.save(`Liquidacion_Vehiculos_${sufijoMes}.pdf`);

}

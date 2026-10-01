import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import firmaPresidente from "@/assets/firma-presidente.png";
import type { EntregaEPPItem } from "@/hooks/useEntregasEPP";
import type { PersonalDB } from "@/hooks/usePersonal";

const ROL_LABELS: Record<string, string> = {
  capataz: "Capataz",
  maquinista: "Maquinista",
  chofer: "Chofer",
  administrativo: "Administrativo",
  ayudante: "Ayudante",
  sereno: "Sereno",
  mecanico: "Mecánico",
  topografo: "Topógrafo",
  repartidor_calecita: "Repartidor Calecita",
};

interface EPPPDFData {
  personal: PersonalDB;
  items: EntregaEPPItem[];
  fecha: string;
}

interface EPPMasivoPDFData {
  empleados: PersonalDB[];
  items: Array<{ producto: string; tipo_modelo: string; marca: string; posee_certificacion: boolean; cantidad: number }>;
  fecha: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

type ItemLike = {
  producto: string;
  tipo_modelo?: string | null;
  marca?: string | null;
  posee_certificacion?: boolean | null;
  cantidad: number;
};

function renderEPPPage(
  doc: jsPDF,
  personal: PersonalDB,
  items: ItemLike[],
  fecha: string,
  firmaImg: HTMLImageElement | null
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const boxW = pageW - margin * 2;
  let y = 8;

  const fechaFormatted = new Date(fecha + "T12:00:00").toLocaleDateString("es-AR");
  const rolLabel = ROL_LABELS[personal.rol] || personal.rol;
  const productNames = items.map((i) => i.producto).join(", ");
  const fullName = `${personal.apellido || ""} ${personal.nombre || ""}`.trim().toUpperCase();

  // ─── Resolución top-right ───
  doc.setFontSize(9);
  doc.setFont("helvetica", "bolditalic");
  doc.text("Resolución 299/11, Anexo I", pageW - margin, y + 3, { align: "right" });

  // ─── Title bar ───
  y += 7;
  doc.setFillColor(230, 230, 230);
  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.rect(margin, y, boxW, 8, "FD");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ENTREGA DE ROPA DE TRABAJO Y ELEMENTOS DE PROTECCIÓN PERSONAL", pageW / 2, y + 5.5, { align: "center" });
  y += 8;

  // ─── Helper to draw a labeled field ───
  const field = (x: number, fy: number, num: string, label: string, value: string) => {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`(${num})`, x, fy);
    const nw = doc.getTextWidth(`(${num})`) + 1;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(`${label}  `, x + nw, fy);
    const lw = doc.getTextWidth(`${label}  `);
    doc.setFont("helvetica", "normal");
    doc.text(value, x + nw + lw, fy);
  };

  const rh = 7;

  // ─── Row 1: Razón Social + CUIT ───
  doc.setLineWidth(0.3);
  doc.rect(margin, y, boxW, rh);
  const splitR1 = margin + boxW * 0.7;
  doc.line(splitR1, y, splitR1, y + rh);
  field(margin + 2, y + 5, "1", "Razón Social:", "CALAMINA SUR S.A");
  field(splitR1 + 2, y + 5, "2", "C.U.I.T.:", "30-71457642-5");
  y += rh;

  // ─── Row 2: Dirección + Localidad + CP + Provincia ───
  doc.rect(margin, y, boxW, rh);
  const c2a = margin + boxW * 0.30;
  const c2b = margin + boxW * 0.50;
  const c2c = margin + boxW * 0.62;
  doc.line(c2a, y, c2a, y + rh);
  doc.line(c2b, y, c2b, y + rh);
  doc.line(c2c, y, c2c, y + rh);
  field(margin + 2, y + 5, "3", "Dirección:", "MARIANO CASTEX 499");
  field(c2a + 2, y + 5, "4", "Localidad:", "CANNING");
  field(c2b + 2, y + 5, "5", "C.P.:", "1804");
  field(c2c + 2, y + 5, "6", "Provincia:", "BUENOS AIRES");
  y += rh;

  // ─── Row 3: Nombre + DNI ───
  doc.rect(margin, y, boxW, rh);
  const splitR3 = margin + boxW * 0.75;
  doc.line(splitR3, y, splitR3, y + rh);
  field(margin + 2, y + 5, "7", "Nombre y Apellido del Trabajador:", fullName);
  field(splitR3 + 2, y + 5, "8", "D.N.I.:", personal.dni || "-");
  y += rh;

  // ─── Row 4: Puesto + Descripción EPP ───
  const r4h = 22;
  doc.rect(margin, y, boxW, r4h);
  const splitR4 = margin + boxW * 0.30;
  doc.line(splitR4, y, splitR4, y + r4h);

  const leftColW = boxW * 0.30 - 6;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("(9)", margin + 2, y + 4);
  doc.setFontSize(6);
  doc.setTextColor(0);
  const label9 = "Descripción breve del puesto/s de trabajo en el/los cuales se desempeña el trabajador:";
  const label9Lines = doc.splitTextToSize(label9, leftColW);
  doc.text(label9Lines, margin + 8, y + 4);
  const label9H = label9Lines.length * 2.5;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(rolLabel, margin + 5, y + 5 + label9H + 4);

  const rightColW = boxW * 0.70 - 6;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("(10)", splitR4 + 2, y + 4);
  doc.setFontSize(6);
  doc.setTextColor(0);
  const label10 = "Elementos de protección personal, necesarios para el trabajador, según el puesto de trabajo:";
  const label10Lines = doc.splitTextToSize(label10, rightColW - 12);
  doc.text(label10Lines, splitR4 + 9, y + 4);
  const label10H = label10Lines.length * 2.5;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  const eppLines = doc.splitTextToSize(productNames + ".", rightColW - 4);
  doc.text(eppLines, splitR4 + 5, y + 5 + label10H + 2);
  doc.setTextColor(0);
  y += r4h;

  // ─── Items table ───
  y += 2;

  autoTable(doc, {
    startY: y,
    tableWidth: boxW,
    margin: { left: margin, right: margin },
    head: [
      [
        "",
        "(11)\nProducto",
        "(12)\nTipo // Modelo",
        "(13)\nMarca",
        { content: "(14) Posee\ncertificación\nSI // NO", styles: { halign: "center" as const } },
        { content: "(15)\nCantidad", styles: { halign: "center" as const } },
        { content: "(16)\nFecha de entrega", styles: { halign: "center" as const } },
        "(17)\nFirma del trabajador",
      ],
    ],
    columnStyles: {
      0: { cellWidth: boxW * 0.035, halign: "center", fontStyle: "bold" },
      1: { cellWidth: boxW * 0.15 },
      2: { cellWidth: boxW * 0.18 },
      3: { cellWidth: boxW * 0.13 },
      4: { cellWidth: boxW * 0.09, halign: "center" },
      5: { cellWidth: boxW * 0.07, halign: "center" },
      6: { cellWidth: boxW * 0.12, halign: "center" },
      7: { cellWidth: boxW * 0.225 },
    },
    body: items.map((item, i) => [
      (i + 1).toString(),
      item.producto.toUpperCase(),
      (item.tipo_modelo || "").toUpperCase(),
      (item.marca || "").toUpperCase(),
      item.posee_certificacion ? "SI" : "NO",
      item.cantidad.toString(),
      fechaFormatted,
      "",
    ]),
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontSize: 7.5,
      fontStyle: "bold",
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      valign: "middle",
    },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY;

  // ─── Signature blocks ───
  const sigY = Math.max(y + 20, pageH - 35);

  if (firmaImg) {
    const firmaAspect = firmaImg.naturalWidth / firmaImg.naturalHeight;
    const firmaH = 18;
    const firmaW = firmaH * firmaAspect;
    doc.addImage(firmaImg, "PNG", margin + 10, sigY - firmaH - 2, firmaW, firmaH);
  }

  doc.setDrawColor(0);
  doc.setLineWidth(0.4);

  doc.line(margin, sigY, margin + 75, sigY);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Firma y aclaración del Empleador", margin + 5, sigY + 4);

  doc.line(pageW - margin - 75, sigY, pageW - margin, sigY);
  doc.text("Firma y aclaración del Trabajador", pageW - margin - 70, sigY + 4);
}

export async function generateEntregaEPPPDF({ personal, items, fecha }: EPPPDFData) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  let firmaImg: HTMLImageElement | null = null;
  try {
    firmaImg = await loadImage(firmaPresidente);
  } catch {
    // silently skip
  }

  renderEPPPage(doc, personal, items, fecha, firmaImg);
  doc.save(`EPP_${personal.apellido || "empleado"}_${personal.nombre || ""}_${fecha}.pdf`);
}

export async function generateEntregaEPPMasivoPDF({ empleados, items, fecha }: EPPMasivoPDFData) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  let firmaImg: HTMLImageElement | null = null;
  try {
    firmaImg = await loadImage(firmaPresidente);
  } catch {
    // silently skip
  }

  for (let i = 0; i < empleados.length; i++) {
    if (i > 0) doc.addPage();
    renderEPPPage(doc, empleados[i], items, fecha, firmaImg);
  }

  doc.save(`EPP_Masivo_${fecha}.pdf`);
}

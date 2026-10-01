import jsPDF from "jspdf";
import { format, parseISO } from "date-fns";
import autoTable from "jspdf-autotable";
import logoCalamina from "@/assets/logo-calamina-sur.png";
import firmaPresidente from "@/assets/firma-presidente.png";
import type { Certificado, CertificadoItem, AcumuladoConcepto, CertificadoPago } from "@/hooks/useCertificados";

// ─── Corporate Constants ────────────────────────────────────────
const CORP_RED: [number, number, number] = [180, 0, 0];
const CORP_DARK_RED: [number, number, number] = [139, 0, 0];
const WHITE: [number, number, number] = [255, 255, 255];
const LIGHT_BG: [number, number, number] = [248, 248, 248];
const SUBTLE_BORDER: [number, number, number] = [200, 200, 200];

const EMPRESA_INFO = {
  nombre: "CALAMINA SUR S.A.",
  cuit: "30-71457642-5",
  direccion: "CASTEX 499 – Piso: 6° Oficina 601",
  localidad: "(1804) Canning - Pcia. Bs. As.",
  telefono: "11-38537787",
  email: "calamimasur@hotmail.com",
  presidente: "Tognini Gabriel Andres",
  nombreFirma: "Gabriel Tognini",
};

// ─── Helpers ────────────────────────────────────────────────────
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

interface ImageData {
  base64: string;
  width: number;
  height: number;
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
        resolve({ base64: canvas.toDataURL("image/png"), width: img.width, height: img.height });
      } else {
        reject(new Error("Could not get canvas context"));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ─── Types ──────────────────────────────────────────────────────
interface CertificadoPDFData {
  certificado: Certificado;
  items: CertificadoItem[];
  obraNombre: string;
  obraUbicacion?: string;
  clienteNombre?: string;
  clienteCuit?: string;
  clienteDireccion?: string;
  clienteLocalidad?: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  categoriaMap: Record<string, string>;
  etapaMap?: Record<string, string>;
  cantidadTotalMap?: Record<string, number>;
  acumulados?: AcumuladoConcepto[];
  etapaOrdenMap?: Record<string, number>;
  pagos?: CertificadoPago[];
}

// ─── Header ─────────────────────────────────────────────────────
async function renderHeader(doc: jsPDF, margin: number, pageWidth: number): Promise<number> {
  let yPos = 8;
  let logoData: ImageData | null = null;
  try { logoData = await loadImageAsBase64(logoCalamina); } catch (e) { console.warn("Could not load logo:", e); }

  if (logoData) {
    const logoWidth = 40;
    const logoAspectRatio = logoData.height / logoData.width;
    doc.addImage(logoData.base64, "PNG", margin, yPos, logoWidth, logoWidth * logoAspectRatio);
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA_INFO.nombre, pageWidth - margin, yPos + 4, { align: "right" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`CUIT: ${EMPRESA_INFO.cuit}`, pageWidth - margin, yPos + 9, { align: "right" });
  doc.text(EMPRESA_INFO.direccion, pageWidth - margin, yPos + 13, { align: "right" });
  doc.text(EMPRESA_INFO.localidad, pageWidth - margin, yPos + 17, { align: "right" });
  doc.text(`Cel: ${EMPRESA_INFO.telefono} | ${EMPRESA_INFO.email}`, pageWidth - margin, yPos + 21, { align: "right" });
  doc.setTextColor(0, 0, 0);
  yPos += 26;

  // Corporate red accent line
  doc.setDrawColor(...CORP_RED);
  doc.setLineWidth(1);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;
  return yPos;
}

// ─── Certificate Info Block ─────────────────────────────────────
function renderCertInfo(
  doc: jsPDF, margin: number, pageWidth: number, yPos: number,
  certificado: Certificado, obraNombre: string, obraUbicacion?: string,
  clienteNombre?: string, clienteCuit?: string, clienteDireccion?: string,
  clienteLocalidad?: string, clienteTelefono?: string, clienteEmail?: string
): number {
  const contentWidth = pageWidth - margin * 2;

  // Title bar with dark red background
  const titleHeight = 9;
  doc.setFillColor(...CORP_DARK_RED);
  doc.rect(margin, yPos, contentWidth, titleHeight, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  const certNum = certificado.numero.replace("CERT-", "");
  doc.text(`CERTIFICADO - ${obraNombre} - N° ${certNum}`, pageWidth / 2, yPos + 6.5, { align: "center" });
  doc.setTextColor(0, 0, 0);
  yPos += titleHeight + 4;

  // Period and date
  const periodoDate = new Date(certificado.periodo + "-01");
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const periodoLabel = `${meses[periodoDate.getMonth()]} ${periodoDate.getFullYear()}`;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${periodoLabel}`, margin, yPos);
  if (certificado.fecha_emision) {
    doc.text(`Fecha de emisión: ${certificado.fecha_emision}`, pageWidth - margin, yPos, { align: "right" });
  }
  yPos += 6;

  // Two-column info block with red left border
  const colWidth = (contentWidth - 4) / 2;
  const blockX = margin;

  // Calculate block height
  let leftLines = 1; // Obra name always
  if (obraUbicacion) leftLines++;
  let rightLines = 0;
  if (clienteNombre) rightLines++;
  if (clienteCuit) rightLines++;
  if (clienteDireccion) rightLines++;
  if (clienteLocalidad) rightLines++;
  if (clienteTelefono || clienteEmail) rightLines++;
  const maxLines = Math.max(leftLines, rightLines);
  const blockHeight = Math.max(maxLines * 4.5 + 8, 18);

  // Background
  doc.setFillColor(...LIGHT_BG);
  doc.rect(blockX, yPos, contentWidth, blockHeight, "F");

  // Red left border
  doc.setDrawColor(...CORP_RED);
  doc.setLineWidth(1.5);
  doc.line(blockX, yPos, blockX, yPos + blockHeight);

  // Subtle outer border
  doc.setDrawColor(...SUBTLE_BORDER);
  doc.setLineWidth(0.3);
  doc.rect(blockX, yPos, contentWidth, blockHeight, "S");

  // Left column: Obra info
  let leftY = yPos + 5;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...CORP_DARK_RED);
  doc.text("DATOS DE OBRA", blockX + 4, leftY);
  doc.setTextColor(0, 0, 0);
  leftY += 4.5;

  doc.setFont("helvetica", "bold");
  doc.text("Obra:", blockX + 4, leftY);
  doc.setFont("helvetica", "normal");
  doc.text(obraNombre, blockX + 16, leftY);
  leftY += 4.5;

  if (obraUbicacion) {
    doc.setFont("helvetica", "bold");
    doc.text("Ubicación:", blockX + 4, leftY);
    doc.setFont("helvetica", "normal");
    doc.text(obraUbicacion, blockX + 22, leftY);
  }

  // Right column: Client info
  const rightX = blockX + colWidth + 4;
  let rightY = yPos + 5;

  if (clienteNombre) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...CORP_DARK_RED);
    doc.text("DATOS DEL CLIENTE", rightX, rightY);
    doc.setTextColor(0, 0, 0);
    rightY += 4.5;

    doc.setFont("helvetica", "bold");
    doc.text("Cliente:", rightX, rightY);
    doc.setFont("helvetica", "normal");
    doc.text(clienteNombre, rightX + 15, rightY);
    rightY += 4.5;

    if (clienteCuit) {
      doc.setFont("helvetica", "bold");
      doc.text("CUIT:", rightX, rightY);
      doc.setFont("helvetica", "normal");
      doc.text(clienteCuit, rightX + 12, rightY);
      rightY += 4.5;
    }

    if (clienteDireccion) {
      doc.setFont("helvetica", "bold");
      doc.text("Dirección:", rightX, rightY);
      doc.setFont("helvetica", "normal");
      doc.text(clienteDireccion, rightX + 20, rightY);
      rightY += 4.5;
    }

    if (clienteLocalidad) {
      doc.setFont("helvetica", "bold");
      doc.text("Localidad:", rightX, rightY);
      doc.setFont("helvetica", "normal");
      doc.text(clienteLocalidad, rightX + 20, rightY);
      rightY += 4.5;
    }

    if (clienteTelefono || clienteEmail) {
      const contactParts: string[] = [];
      if (clienteTelefono) contactParts.push(`Tel: ${clienteTelefono}`);
      if (clienteEmail) contactParts.push(clienteEmail);
      doc.setFont("helvetica", "normal");
      doc.text(contactParts.join(" | "), rightX, rightY);
    }
  }

  return yPos + blockHeight + 5;
}

// ─── Footer (page numbers + confidentiality) ────────────────────
function addFooter(doc: jsPDF, margin: number) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Thin red line
    doc.setDrawColor(...CORP_RED);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(
      "Este documento es confidencial y propiedad de CALAMINA SUR S.A. Su reproducción no autorizada está prohibida.",
      margin,
      pageHeight - 8
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: "right" }
    );
    doc.setTextColor(0, 0, 0);
  }
}

// ─── Firma ──────────────────────────────────────────────────────
async function renderFirma(doc: jsPDF, pageWidth: number, yPos: number, margin = 10): Promise<number> {
  // Check if there's enough space for the signature block (~40mm needed)
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerZone = 15; // footer occupies ~15mm at the bottom
  const firmaSpace = 40;
  if (yPos + firmaSpace > pageHeight - footerZone) {
    doc.addPage();
    yPos = 20;
  }

  let firmaData: ImageData | null = null;
  try { firmaData = await loadImageAsBase64(firmaPresidente); } catch (e) { console.warn("Could not load firma:", e); }

  const signatureX = pageWidth / 2;

  if (firmaData) {
    const firmaWidth = 32;
    const firmaAspectRatio = firmaData.height / firmaData.width;
    const firmaHeight = firmaWidth * firmaAspectRatio;
    doc.addImage(firmaData.base64, "PNG", signatureX - firmaWidth / 2, yPos, firmaWidth, firmaHeight);
    yPos += firmaHeight + 2;
  } else {
    yPos += 12;
  }

  // Signature line
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.4);
  doc.line(signatureX - 30, yPos, signatureX + 30, yPos);
  yPos += 4;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA_INFO.nombreFirma, signatureX, yPos, { align: "center" });
  yPos += 3.5;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Presidente", signatureX, yPos, { align: "center" });
  yPos += 3;
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  doc.text(`${EMPRESA_INFO.nombre} | CUIT: ${EMPRESA_INFO.cuit}`, signatureX, yPos, { align: "center" });
  doc.setTextColor(0, 0, 0);

  return yPos;
}

// ─── Totals Box ─────────────────────────────────────────────────
function renderTotalsBox(
  doc: jsPDF, margin: number, pageWidth: number, yPos: number,
  lines: { label: string; value: string; bold?: boolean; separator?: boolean }[]
): number {
  const boxWidth = 95;
  const boxX = pageWidth - margin - boxWidth;
  const lineHeight = 5;
  const padding = 4;
  const boxHeight = lines.length * lineHeight + padding * 2 + lines.filter(l => l.separator).length * 2;

  // Box background and border
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...SUBTLE_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(boxX, yPos, boxWidth, boxHeight, 1, 1, "FD");

  let lineY = yPos + padding + 3;
  lines.forEach((line) => {
    if (line.separator) {
      doc.setDrawColor(...CORP_RED);
      doc.setLineWidth(0.5);
      doc.line(boxX + 3, lineY - 4, boxX + boxWidth - 3, lineY - 4);
      lineY += 2;
    }

    doc.setFontSize(line.bold ? 9 : 7.5);
    doc.setFont("helvetica", line.bold ? "bold" : "normal");
    doc.text(line.label, boxX + 4, lineY);
    doc.text(line.value, boxX + boxWidth - 4, lineY, { align: "right" });
    lineY += lineHeight;
  });

  return yPos + boxHeight + 5;
}

// ─── Servicio PDF ───────────────────────────────────────────────
function generateServicioPDF(
  doc: jsPDF, yPos: number, margin: number, pageWidth: number,
  certificado: Certificado, items: CertificadoItem[], categoriaMap: Record<string, string>,
  skipTotals = false,
  etapaMap: Record<string, string> = {}
): number {
  const itemsByCategory = new Map<string, CertificadoItem[]>();
  items.forEach((item) => {
    const cat = (item.concepto_id && categoriaMap[item.concepto_id]) || "General";
    if (!itemsByCategory.has(cat)) itemsByCategory.set(cat, []);
    itemsByCategory.get(cat)!.push(item);
  });

  const tableData: any[] = [];
  const headerRowIndices = new Set<number>();
  const sortedCategories = [...itemsByCategory.keys()].sort();

  const servicioHeaderRow = ["Concepto", "Un.", "Cantidad", "P. Unitario", "Subtotal", "Obs."].map((text) => ({
    content: text,
    styles: { fillColor: [...CORP_DARK_RED] as [number, number, number], textColor: [...WHITE] as [number, number, number], fontStyle: "bold" as const, fontSize: 7, halign: "center" as const, cellPadding: 2 },
  }));

  sortedCategories.forEach((catName) => {
    const catItems = itemsByCategory.get(catName) || [];
    if (catItems.length === 0) return;

    // Category header row
    headerRowIndices.add(tableData.length);
    tableData.push([{
      content: catName.toUpperCase(),
      colSpan: 6,
      styles: { fontStyle: "bold", fillColor: [200, 200, 200], fontSize: 7, cellPadding: 2.5, textColor: [40, 40, 40] },
    }]);

    // Group items by sub category (etapa) within this category
    const itemsByEtapa = new Map<string, CertificadoItem[]>();
    catItems.forEach((item) => {
      const etapa = item.etapa || (item.concepto_id && etapaMap[item.concepto_id]) || "";
      if (!itemsByEtapa.has(etapa)) itemsByEtapa.set(etapa, []);
      itemsByEtapa.get(etapa)!.push(item);
    });

    const sortedEtapas = [...itemsByEtapa.keys()].sort();

    sortedEtapas.forEach((etapaName) => {
      const etapaItems = itemsByEtapa.get(etapaName) || [];
      if (etapaItems.length === 0) return;

      // Sub category row (only if there's an etapa name)
      if (etapaName) {
        headerRowIndices.add(tableData.length);
        tableData.push([{
          content: "  " + etapaName.toUpperCase(),
          colSpan: 6,
          styles: { fontStyle: "bold", fillColor: [235, 235, 235], fontSize: 6, cellPadding: 2 },
        }]);
      }

      // Column headers row after category/etapa
      headerRowIndices.add(tableData.length);
      tableData.push([...servicioHeaderRow]);

      etapaItems.forEach((item) => {
        tableData.push([
          item.descripcion,
          item.unidad,
          item.cantidad.toLocaleString("es-AR"),
          formatCurrency(item.precio_unitario),
          formatCurrency(item.subtotal),
          item.observaciones || "",
        ]);
      });
    });

    const catSubtotal = catItems.reduce((s, i) => s + i.subtotal, 0);
    tableData.push([
      { content: "", colSpan: 3 },
      { content: `Subtotal ${catName}:`, styles: { fontStyle: "bold", halign: "right", fontSize: 7 } },
      { content: formatCurrency(catSubtotal), styles: { fontStyle: "bold", fontSize: 7 } },
      { content: "" },
    ]);
  });

  const pageBreakApplied = new Set<number>();
  autoTable(doc, {
    startY: yPos,
    body: tableData,
    showHead: "never",
    theme: "grid",
    bodyStyles: { fontSize: 7, cellPadding: 1.5 },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 22, halign: "right" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 30 },
    },
    margin: { left: margin, right: margin },
    willDrawCell: (data: any) => {
      if (data.section === "body" && data.column.index === 0 && headerRowIndices.has(data.row.index)) {
        const pageHeight = doc.internal.pageSize.getHeight();
        const bottomMargin = 15;
        const minSpaceNeeded = 20; // header + at least 1 data row
        if (data.cell.y + minSpaceNeeded > pageHeight - bottomMargin && !pageBreakApplied.has(data.row.index)) {
          pageBreakApplied.add(data.row.index);
          doc.addPage();
          data.cell.y = 15;
          data.cursor.y = 15;
        }
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

  // Totals
  if (!skipTotals) {
    const totalsLines: { label: string; value: string; bold?: boolean; separator?: boolean }[] = [];

    // Category subtotals
    sortedCategories.forEach((catName) => {
      const catItems = itemsByCategory.get(catName) || [];
      if (catItems.length === 0) return;
      const catSubtotal = catItems.reduce((s, i) => s + i.subtotal, 0);
      totalsLines.push({ label: `Subtotal ${catName}:`, value: formatCurrency(catSubtotal) });
    });

    totalsLines.push({ label: "Subtotal General:", value: formatCurrency(certificado.subtotal), bold: true });
    if (certificado.incluir_iva !== false) {
      totalsLines.push({ label: "IVA (21%):", value: formatCurrency(certificado.iva) });
    }
    totalsLines.push({ label: "TOTAL:", value: formatCurrency(certificado.total), bold: true, separator: true });

    yPos = renderTotalsBox(doc, margin, pageWidth, yPos, totalsLines);
  }

  return yPos;
}

// ─── Obra PDF ───────────────────────────────────────────────────
function generateObraPDF(
  doc: jsPDF, yPos: number, margin: number, pageWidth: number,
  certificado: Certificado, items: CertificadoItem[],
  etapaMap: Record<string, string>, cantidadTotalMap: Record<string, number>,
  acumulados: AcumuladoConcepto[],
  etapaOrdenMap?: Record<string, number>,
  categoriaMap?: Record<string, string>,
  skipTotals = false
): number {
  const itemsByEtapa = new Map<string, CertificadoItem[]>();
  items.forEach((item) => {
    const etapa = item.etapa || (item.concepto_id && etapaMap[item.concepto_id]) || "General";
    if (!itemsByEtapa.has(etapa)) itemsByEtapa.set(etapa, []);
    itemsByEtapa.get(etapa)!.push(item);
  });

  const tableData: any[] = [];
  const headerRowIndices = new Set<number>();
  const sortedEtapas = [...itemsByEtapa.keys()].sort((a, b) => {
    if (etapaOrdenMap) {
      const oa = etapaOrdenMap[a] ?? 999999;
      const ob = etapaOrdenMap[b] ?? 999999;
      if (oa !== ob) return oa - ob;
    }
    return a.localeCompare(b);
  });

  let totalAvAnterior = 0;
  let totalAvActual = 0;
  let totalAvAcumulado = 0;

  let lastCategory = "";

  sortedEtapas.forEach((etapaName) => {
    const etapaItems = itemsByEtapa.get(etapaName) || [];
    if (etapaItems.length === 0) return;

    // Determine the category from the first item in this etapa group
    const firstItem = etapaItems[0];
    const currentCategory = (firstItem.concepto_id && categoriaMap && categoriaMap[firstItem.concepto_id]) || "";

    const obraHeaderRow = ["Concepto", "V. Unit.", "Cant.", "V. Total", "% Ant.", "% Act.", "% Acum.", "Av. Ant.", "Av. Act.", "Av. Acum.", "Obs."].map((text) => ({
      content: text,
      styles: { fillColor: [...CORP_DARK_RED] as [number, number, number], textColor: [...WHITE] as [number, number, number], fontStyle: "bold" as const, fontSize: 5.5, halign: "center" as const, cellPadding: 1.5 },
    }));

    // Insert category header row if category changed
    if (currentCategory && currentCategory !== lastCategory) {
      headerRowIndices.add(tableData.length);
      tableData.push([{
        content: currentCategory.toUpperCase(),
        colSpan: 11,
        styles: { fontStyle: "bold", fillColor: [200, 200, 200], fontSize: 7, cellPadding: 2.5, textColor: [40, 40, 40] },
      }]);
      lastCategory = currentCategory;
    }

    // Sub category row
    headerRowIndices.add(tableData.length);
    tableData.push([{
      content: "  " + etapaName.toUpperCase(),
      colSpan: 11,
      styles: { fontStyle: "bold", fillColor: [235, 235, 235], fontSize: 6, cellPadding: 2 },
    }]);

    // Column headers row after category/etapa
    headerRowIndices.add(tableData.length);
    tableData.push([...obraHeaderRow]);

    let etapaAvAnterior = 0;
    let etapaAvActual = 0;
    let etapaAvAcumulado = 0;

    etapaItems.forEach((item) => {
      const ac = acumulados.find((a) => a.concepto_id === item.concepto_id) || { cantidad_anterior: 0, avance_anterior: 0 };
      const cantTotal = (item.concepto_id && cantidadTotalMap[item.concepto_id]) || 0;
      const valorTotal = cantTotal * item.precio_unitario;
      const pctAnterior = cantTotal > 0 ? (ac.cantidad_anterior / cantTotal) * 100 : 0;
      const pctActual = cantTotal > 0 ? (item.cantidad / cantTotal) * 100 : 0;
      const pctAcumulado = pctAnterior + pctActual;
      const avAnterior = ac.avance_anterior;
      const avActual = item.subtotal;
      const avAcumulado = avAnterior + avActual;

      totalAvAnterior += avAnterior;
      totalAvActual += avActual;
      totalAvAcumulado += avAcumulado;
      etapaAvAnterior += avAnterior;
      etapaAvActual += avActual;
      etapaAvAcumulado += avAcumulado;

      tableData.push([
        item.descripcion,
        formatCurrency(item.precio_unitario),
        item.cantidad > 0 ? item.cantidad.toLocaleString("es-AR") : "-",
        formatCurrency(valorTotal),
        formatPercent(pctAnterior),
        formatPercent(pctActual),
        formatPercent(pctAcumulado),
        formatCurrency(avAnterior),
        formatCurrency(avActual),
        formatCurrency(avAcumulado),
        item.observaciones || "",
      ]);
    });

    // Subtotal row per etapa
    tableData.push([
      { content: `Subtotal ${etapaName}`, colSpan: 7, styles: { fontStyle: "bold", halign: "right", fontSize: 5.5, fillColor: [245, 245, 245] } },
      { content: formatCurrency(etapaAvAnterior), styles: { fontStyle: "bold", fontSize: 5.5, halign: "right", fillColor: [245, 245, 245] } },
      { content: formatCurrency(etapaAvActual), styles: { fontStyle: "bold", fontSize: 5.5, halign: "right", fillColor: [245, 245, 245] } },
      { content: formatCurrency(etapaAvAcumulado), styles: { fontStyle: "bold", fontSize: 5.5, halign: "right", fillColor: [245, 245, 245] } },
      { content: "", styles: { fillColor: [245, 245, 245] } },
    ]);
  });

  const pageBreakApplied = new Set<number>();
  autoTable(doc, {
    startY: yPos,
    body: tableData,
    showHead: "never",
    theme: "grid",
    bodyStyles: { fontSize: 5.5, cellPadding: 1 },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 16, halign: "right" },
      2: { cellWidth: 14, halign: "right" },
      3: { cellWidth: 18, halign: "right" },
      4: { cellWidth: 11, halign: "right" },
      5: { cellWidth: 11, halign: "right" },
      6: { cellWidth: 11, halign: "right" },
      7: { cellWidth: 18, halign: "right" },
      8: { cellWidth: 18, halign: "right" },
      9: { cellWidth: 18, halign: "right" },
      10: { cellWidth: 18 },
    },
    margin: { left: margin, right: margin },
    willDrawCell: (data: any) => {
      if (data.section === "body" && data.column.index === 0 && headerRowIndices.has(data.row.index)) {
        const pageHeight = doc.internal.pageSize.getHeight();
        const bottomMargin = 15;
        const minSpaceNeeded = 20;
        if (data.cell.y + minSpaceNeeded > pageHeight - bottomMargin && !pageBreakApplied.has(data.row.index)) {
          pageBreakApplied.add(data.row.index);
          doc.addPage();
          data.cell.y = 15;
          data.cursor.y = 15;
        }
      }
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

  // Totals
  if (!skipTotals) {
    const totalsLines: { label: string; value: string; bold?: boolean; separator?: boolean }[] = [];

    // Category subtotals
    const catTotalsMap = new Map<string, number>();
    items.forEach((item) => {
      const cat = (item.concepto_id && categoriaMap && categoriaMap[item.concepto_id]) || "General";
      catTotalsMap.set(cat, (catTotalsMap.get(cat) || 0) + item.subtotal);
    });
    [...catTotalsMap.keys()].sort().forEach((catName) => {
      totalsLines.push({ label: `Subtotal ${catName}:`, value: formatCurrency(catTotalsMap.get(catName)!) });
    });

    totalsLines.push({ label: "Avance Anterior:", value: formatCurrency(totalAvAnterior) });
    totalsLines.push({ label: "Avance Actual:", value: formatCurrency(totalAvActual) });
    totalsLines.push({ label: "Avance Acumulado:", value: formatCurrency(totalAvAcumulado), bold: true });

    if (certificado.anticipo_porcentaje > 0) {
      const anticipoMonto = Math.round(totalAvAcumulado * (certificado.anticipo_porcentaje / 100));
      totalsLines.push({ label: `Anticipo (${certificado.anticipo_porcentaje}%):`, value: `- ${formatCurrency(anticipoMonto)}` });
    }

    if (certificado.incluir_iva !== false) {
      totalsLines.push({ label: "IVA (21%):", value: formatCurrency(certificado.iva) });
    }
    totalsLines.push({ label: "TOTAL:", value: formatCurrency(certificado.total), bold: true, separator: true });

    yPos = renderTotalsBox(doc, margin, pageWidth, yPos, totalsLines);
  }

  return yPos;
}

// ─── Mixto PDF ──────────────────────────────────────────────────
function generateMixtoPDF(
  doc: jsPDF, yPos: number, margin: number, pageWidth: number,
  certificado: Certificado, items: CertificadoItem[],
  etapaMap: Record<string, string>, cantidadTotalMap: Record<string, number>,
  acumulados: AcumuladoConcepto[],
  etapaOrdenMap?: Record<string, number>,
  categoriaMap?: Record<string, string>
): number {
  const obraItems = items.filter((i) => i.seccion === "obra");
  const servicioItems = items.filter((i) => i.seccion === "servicio");

  // --- SECCIÓN OBRA ---
  if (obraItems.length > 0) {
    yPos = generateObraPDF(doc, yPos, margin, pageWidth, certificado, obraItems, etapaMap, cantidadTotalMap, acumulados, etapaOrdenMap, categoriaMap, true);
  }

  // --- SECCIÓN SERVICIO ---
  if (servicioItems.length > 0) {
    if (obraItems.length > 0) yPos += 4;
    yPos = generateServicioPDF(doc, yPos, margin, pageWidth, certificado, servicioItems, categoriaMap || {}, true, etapaMap);
  }

  // --- TOTALES UNIFICADOS AL FINAL ---
  const allItems = [...obraItems, ...servicioItems];
  const catTotalsMap = new Map<string, number>();
  allItems.forEach((item) => {
    const cat = (item.concepto_id && categoriaMap && categoriaMap[item.concepto_id]) || "General";
    catTotalsMap.set(cat, (catTotalsMap.get(cat) || 0) + item.subtotal);
  });
  const totalSub = allItems.reduce((s, i) => s + i.subtotal, 0);

  const totalsLines: { label: string; value: string; bold?: boolean; separator?: boolean }[] = [];

  // Category subtotals
  [...catTotalsMap.keys()].sort().forEach((catName) => {
    totalsLines.push({ label: `Subtotal ${catName}:`, value: formatCurrency(catTotalsMap.get(catName)!) });
  });

  if (certificado.anticipo_porcentaje > 0 && obraItems.length > 0) {
    const obraSubtotal = obraItems.reduce((s, i) => s + i.subtotal, 0);
    const anticipoMonto = Math.round(obraSubtotal * (certificado.anticipo_porcentaje / 100));
    totalsLines.push({ label: `Anticipo (${certificado.anticipo_porcentaje}%) s/ Obra:`, value: `- ${formatCurrency(anticipoMonto)}` });
  }

  totalsLines.push({ label: "Subtotal General:", value: formatCurrency(totalSub), bold: true });

  if (certificado.incluir_iva !== false) {
    totalsLines.push({ label: "IVA (21%):", value: formatCurrency(certificado.iva) });
  }
  totalsLines.push({ label: "TOTAL:", value: formatCurrency(certificado.total), bold: true, separator: true });

  yPos = renderTotalsBox(doc, margin, pageWidth, yPos, totalsLines);

  return yPos;
}

// ─── Main Export ─────────────────────────────────────────────────
export async function generateCertificadoPDF({
  certificado,
  items,
  obraNombre,
  obraUbicacion,
  clienteNombre,
  clienteCuit,
  clienteDireccion,
  clienteLocalidad,
  clienteTelefono,
  clienteEmail,
  categoriaMap,
  etapaMap = {},
  cantidadTotalMap = {},
  acumulados = [],
  etapaOrdenMap,
  pagos = [],
}: CertificadoPDFData): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;

  let yPos = await renderHeader(doc, margin, pageWidth);
  yPos = renderCertInfo(doc, margin, pageWidth, yPos, certificado, obraNombre, obraUbicacion, clienteNombre, clienteCuit, clienteDireccion, clienteLocalidad, clienteTelefono, clienteEmail);

  if (certificado.tipo === "obra") {
    yPos = generateObraPDF(doc, yPos, margin, pageWidth, certificado, items, etapaMap, cantidadTotalMap, acumulados, etapaOrdenMap, categoriaMap);
  } else if (certificado.tipo === "mixto") {
    yPos = generateMixtoPDF(doc, yPos, margin, pageWidth, certificado, items, etapaMap, cantidadTotalMap, acumulados, etapaOrdenMap, categoriaMap);
  } else {
    yPos = generateServicioPDF(doc, yPos, margin, pageWidth, certificado, items, categoriaMap, false, etapaMap);
  }

  // Pagos y Saldo
  if (pagos.length > 0) {
    const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
    const saldo = certificado.total - totalPagado;

    const pagoLines: { label: string; value: string; bold?: boolean; separator?: boolean }[] = [];
    pagos.forEach((p) => {
      const fechaLabel = format(parseISO(p.fecha), "dd/MM/yyyy");
      const desc = p.descripcion ? ` (${p.descripcion})` : "";
      pagoLines.push({ label: `Pago ${fechaLabel}${desc}:`, value: `- ${formatCurrency(p.monto)}` });
    });
    pagoLines.push({ label: "SALDO PENDIENTE:", value: formatCurrency(saldo), bold: true, separator: true });

    yPos = renderTotalsBox(doc, margin, pageWidth, yPos, pagoLines);
  }

  // Observaciones
  if (certificado.observaciones) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVACIONES:", margin, yPos);
    yPos += 4;
    doc.setFont("helvetica", "normal");
    const obsLines = doc.splitTextToSize(certificado.observaciones, pageWidth - margin * 2);
    doc.text(obsLines, margin, yPos);
    yPos += obsLines.length * 3 + 5;
  }

  // Footer on all pages
  addFooter(doc, margin);

  doc.save(`Certificado_${certificado.numero}.pdf`);
}


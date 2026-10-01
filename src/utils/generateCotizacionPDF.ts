import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoCalamina from "@/assets/logo-calamina-sur.png";
import firmaPresidente from "@/assets/firma-presidente.png";
import { 
  CotizacionWithRelations, 
  CotizacionCategoriaDB, 
  CotizacionItemDB 
} from "@/hooks/useCotizaciones";

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

const NOTAS_DEFAULT = `Validez de la Oferta: 10 días Corridos
Cláusula de Ajuste: 100% CAC
Forma de pago: Anticipo 30% al inicio de obra, resto según certificación de avance de obra

Terminaciones a Maquina. No se Realizan Trabajos manuales ni parquización
No incluye gestiones municipales ni pagos de aranceles por luz y agua de obra ante los entes correspondientes.
La energía y Agua de obra deberan ser provistas por el comitente a pie de obra.
Movimiento de suelo. Excavaciones y fundaciones sujetas a modificación y posterior recotización de acuerdo a estudio de suelo, planimetria y niveles definitivos a proveer por comitente.`;

function formatCurrency(value: number, moneda: string = "ARS"): string {
  if (moneda === "USD") {
    return "US$ " + new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 0,
    }).format(value);
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number, decimals = 2): string {
  if (!value || value === 0) return "-";
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function safeText(v: any): string {
  return v === null || v === undefined ? "" : String(v);
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

export async function generateCotizacionPDF(
  cotizacion: CotizacionWithRelations,
  obraNombre?: string
): Promise<void> {
  const moneda = cotizacion.moneda || "ARS";
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let yPos = 8;

  // Load images
  let logoData: ImageData | null = null;
  let firmaData: ImageData | null = null;
  try {
    logoData = await loadImageAsBase64(logoCalamina);
  } catch (e) {
    console.warn("Could not load logo:", e);
  }
  try {
    firmaData = await loadImageAsBase64(firmaPresidente);
  } catch (e) {
    console.warn("Could not load firma:", e);
  }

  // ============== HEADER ==============
  // Logo - maintain aspect ratio
  if (logoData) {
    const logoWidth = 35;
    const logoAspectRatio = logoData.height / logoData.width;
    const logoHeight = logoWidth * logoAspectRatio;
    doc.addImage(logoData.base64, "PNG", margin, yPos, logoWidth, logoHeight);
  }

  // Company info (right side) - compact
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

  // Divider line
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // ============== COTIZACIÓN INFO ==============
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 0, 0);
  doc.text(`COTIZACIÓN Nº: ${safeText(cotizacion.numero)}`, margin, yPos);
  doc.setTextColor(0, 0, 0);
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${safeText(cotizacion.fecha_creacion)}  |  Vence: ${safeText(cotizacion.fecha_vencimiento)}`, margin + 55, yPos);
  yPos += 5;

  // ============== OBRA INFO ==============
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos - 2, pageWidth - margin * 2, 8, "F");
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Obra:", margin + 2, yPos + 3);
  doc.setFont("helvetica", "normal");
  doc.text(safeText(obraNombre || cotizacion.obra?.nombre || "Sin asignar"), margin + 14, yPos + 3);
  
  doc.setFont("helvetica", "bold");
  doc.text("Resp:", margin + 90, yPos + 3);
  doc.setFont("helvetica", "normal");
  doc.text(safeText(cotizacion.responsable) || "-", margin + 102, yPos + 3);
  yPos += 10;

  // ============== DESCRIPCIÓN ==============
  if (cotizacion.descripcion) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    const descripcionLines = doc.splitTextToSize(safeText(cotizacion.descripcion), pageWidth - margin * 2);
    doc.text(descripcionLines, margin, yPos);
    yPos += descripcionLines.length * 3 + 2;
  }

  // ============== ITEMS TABLE ==============
  const categorias = cotizacion.categorias || [];
  const items = cotizacion.items || [];

  // Group items by category
  const itemsByCategory = new Map<string | null, CotizacionItemDB[]>();
  
  items.forEach((item) => {
    const catId = item.categoria_id;
    if (!itemsByCategory.has(catId)) {
      itemsByCategory.set(catId, []);
    }
    itemsByCategory.get(catId)!.push(item);
  });

  // Build table data
  const tableData: any[] = [];
  let rowIndex = 0;
  const categoryRows: number[] = [];
  const subtotalRows: number[] = [];

  // Sort categories by numero
  const sortedCategories = [...categorias].sort((a, b) => a.numero - b.numero);

  sortedCategories.forEach((cat) => {
    // Category header row
    categoryRows.push(rowIndex);
    tableData.push([
      { content: safeText(cat.numero), styles: { fontStyle: "bold", fillColor: [230, 230, 230] } },
      { content: safeText(cat.nombre).toUpperCase(), colSpan: 7, styles: { fontStyle: "bold", fillColor: [230, 230, 230] } },
    ]);
    rowIndex++;

    // Category items
    const catItems = [...(itemsByCategory.get(cat.id) || [])].sort((a, b) => {
      const pa = parseInt((a.numero || "").split(".")[1] || "0", 10);
      const pb = parseInt((b.numero || "").split(".")[1] || "0", 10);
      return pa - pb;
    });
    let categorySubtotal = 0;
    
    catItems.forEach((item) => {
      const itemTotal = item.total ?? item.subtotal ?? 0;
      categorySubtotal += itemTotal;
      
      tableData.push([
        safeText(item.numero),
        safeText(item.descripcion),
        safeText(item.unidad).toUpperCase(),
        formatNumber(item.cantidad_m2 || 0),
        formatNumber(item.altura_promedio || 0),
        formatNumber(item.cantidad_m3 || 0),
        formatCurrency(item.precio_unitario || 0, moneda),
        formatCurrency(itemTotal, moneda),
      ]);
      rowIndex++;
    });

    // Category subtotal row
    if (catItems.length > 0) {
      subtotalRows.push(rowIndex);
      tableData.push([
        { content: "", colSpan: 6 },
        { content: `Subtotal ${safeText(cat.nombre)}:`, styles: { fontStyle: "bold", halign: "right" } },
        { content: formatCurrency(categorySubtotal, moneda), styles: { fontStyle: "bold" } },
      ]);
      rowIndex++;
    }
  });

  // Uncategorized items
  const uncategorizedItems = itemsByCategory.get(null) || [];
  if (uncategorizedItems.length > 0) {
    uncategorizedItems.forEach((item) => {
      const itemTotal = item.total ?? item.subtotal ?? 0;
      tableData.push([
        safeText(item.numero),
        safeText(item.descripcion),
        safeText(item.unidad).toUpperCase(),
        formatNumber(item.cantidad_m2 || 0),
        formatNumber(item.altura_promedio || 0),
        formatNumber(item.cantidad_m3 || 0),
        formatCurrency(item.precio_unitario || 0, moneda),
        formatCurrency(itemTotal, moneda),
      ]);
      rowIndex++;
    });
  }

  // Generate table - compact
  autoTable(doc, {
    startY: yPos,
    head: [["Nº", "Descripción", "Un.", "Cant", "Alt", "M³", "P.U.", "Total"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6,
      halign: "center",
      cellPadding: 1,
    },
    bodyStyles: {
      fontSize: 6,
      cellPadding: 1,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 10, halign: "center" },
      3: { cellWidth: 14, halign: "right" },
      4: { cellWidth: 12, halign: "right" },
      5: { cellWidth: 14, halign: "right" },
      6: { cellWidth: 20, halign: "right" },
      7: { cellWidth: 22, halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 3;

  // ============== TOTALS ==============
  // Los anticipos se descuentan del subtotal (base imponible) antes del IVA
  const anticiposRaw: any[] = (cotizacion as any).anticipos || [];
  const anticipoTipo = (cotizacion as any).anticipo_tipo;
  const anticipoValor = (cotizacion as any).anticipo_valor || 0;
  const listaAnticipos = anticiposRaw.length > 0
    ? [...anticiposRaw].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    : ((cotizacion as any).anticipo_monto || 0) > 0
      ? [{ descripcion: "Anticipo", tipo: anticipoTipo, valor: anticipoValor, monto: (cotizacion as any).anticipo_monto }]
      : [];
  const anticipoMonto = listaAnticipos.reduce((s, a) => s + Number(a.monto || 0), 0);
  const baseImponible = cotizacion.subtotal - anticipoMonto;
  const ivaCalc = baseImponible * 0.21;
  const totalCalc = baseImponible + ivaCalc;
  const totalsStartX = pageWidth - margin - 55;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", totalsStartX, yPos);
  doc.text(formatCurrency(cotizacion.subtotal, moneda), pageWidth - margin, yPos, { align: "right" });
  yPos += 4;

  if (anticipoMonto > 0) {
    listaAnticipos.forEach((a) => {
      const label = `${a.descripcion || "Anticipo"}${a.tipo === "porcentaje" ? ` (${a.valor}%)` : ""}:`;
      doc.text(label, totalsStartX, yPos);
      doc.text(`- ${formatCurrency(Number(a.monto || 0), moneda)}`, pageWidth - margin, yPos, { align: "right" });
      yPos += 4;
    });

    doc.text("Subtotal - Anticipos:", totalsStartX, yPos);
    doc.text(formatCurrency(baseImponible, moneda), pageWidth - margin, yPos, { align: "right" });
    yPos += 4;
  }


  doc.text("IVA (21%):", totalsStartX, yPos);
  doc.text(formatCurrency(ivaCalc, moneda), pageWidth - margin, yPos, { align: "right" });
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setFillColor(245, 245, 245);
  doc.rect(totalsStartX - 3, yPos - 3, 60, 7, "F");
  doc.text("TOTAL:", totalsStartX, yPos + 1);
  doc.text(formatCurrency(totalCalc, moneda), pageWidth - margin, yPos + 1, { align: "right" });
  yPos += 8;

  // ============== NOTAS ==============
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("NOTAS Y CONDICIONES:", margin, yPos);
  yPos += 3;

  doc.setFontSize(5.5);
  doc.setFont("helvetica", "normal");
  const notas = cotizacion.notas || NOTAS_DEFAULT;
  const notasLines = doc.splitTextToSize(notas, pageWidth - margin * 2);
  doc.text(notasLines, margin, yPos);
  yPos += notasLines.length * 2.2 + 4;

  // ============== FIRMA ==============
  const signatureX = pageWidth / 2;
  
  // Signature image - maintain aspect ratio
  if (firmaData) {
    const firmaWidth = 30;
    const firmaAspectRatio = firmaData.height / firmaData.width;
    const firmaHeight = firmaWidth * firmaAspectRatio;
    doc.addImage(firmaData.base64, "PNG", signatureX - firmaWidth / 2, yPos, firmaWidth, firmaHeight);
    yPos += firmaHeight + 1;
  } else {
    yPos += 10;
  }

  // Signature text - compact
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA_INFO.nombre, signatureX, yPos, { align: "center" });
  yPos += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(`CUIT: ${EMPRESA_INFO.cuit} | ${EMPRESA_INFO.presidente.toUpperCase()} - PRESIDENTE`, signatureX, yPos, { align: "center" });
  yPos += 4;
  
  doc.setFont("helvetica", "italic");
  doc.text("Saluda Atte-", signatureX, yPos, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA_INFO.nombreFirma, signatureX + 18, yPos, { align: "center" });

  // Save PDF
  doc.save(`Cotizacion_${cotizacion.numero}.pdf`);
}

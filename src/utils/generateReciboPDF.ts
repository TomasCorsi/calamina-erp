import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import logoCalamina from "@/assets/logo-calamina-sur.png";
import type { Certificado, CertificadoPago, MetodoPago } from "@/hooks/useCertificados";

const CORP_RED: [number, number, number] = [180, 0, 0];
const DARK: [number, number, number] = [30, 30, 30];
const LIGHT_BG: [number, number, number] = [248, 248, 248];

const EMPRESA = {
  nombre: "CALAMINA SUR S.A.",
  cuit: "30-71457642-5",
  direccion: "Castex 499 - 6°601 - Canning - Bs. As.",
};

const METODO_LABEL: Record<string, string> = {
  transferencia: "Transferencia",
  cheque: "Cheque",
  echeq: "eCheq",
  deposito: "Depósito",
  efectivo: "Efectivo",
  otro: "Otro",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);

async function loadImageAsBase64(url: string): Promise<{ base64: string; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("ctx"));
      ctx.drawImage(img, 0, 0);
      resolve({ base64: canvas.toDataURL("image/png"), w: img.width, h: img.height });
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Convertir número a letras (simplificado, hasta millones)
function numeroALetras(num: number): string {
  const entero = Math.floor(num);
  const cents = Math.round((num - entero) * 100);
  return `${entero.toLocaleString("es-AR")} pesos con ${cents.toString().padStart(2, "0")}/100`;
}

interface ReciboPDFData {
  certificado: Certificado;
  pago: CertificadoPago;
  pagoIndex: number; // 1-based number within the certificate
  totalPagado: number; // accumulated including this payment
  obraNombre: string;
  clienteNombre?: string;
  clienteCuit?: string;
  clienteDireccion?: string;
}

export async function generateReciboPDF(data: ReciboPDFData) {
  const { certificado, pago, pagoIndex, totalPagado, obraNombre, clienteNombre, clienteCuit, clienteDireccion } = data;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Header band
  doc.setFillColor(...CORP_RED);
  doc.rect(0, 0, pageW, 28, "F");

  try {
    const logo = await loadImageAsBase64(logoCalamina);
    const logoH = 18;
    const logoW = (logo.w / logo.h) * logoH;
    doc.addImage(logo.base64, "PNG", margin, 5, logoW, logoH);
  } catch {
    // ignore
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("RECIBO DE PAGO", pageW - margin, 14, { align: "right" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const reciboNum = `REC-${certificado.numero}-${String(pagoIndex).padStart(2, "0")}`;
  doc.text(`N° ${reciboNum}`, pageW - margin, 21, { align: "right" });
  doc.text(format(parseISO(pago.fecha), "dd/MM/yyyy"), pageW - margin, 26, { align: "right" });

  // Empresa
  doc.setTextColor(...DARK);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA.nombre, margin, 38);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`CUIT: ${EMPRESA.cuit}  |  ${EMPRESA.direccion}`, margin, 43);

  // Recibido de
  let y = 55;
  doc.setFillColor(...LIGHT_BG);
  doc.rect(margin, y, pageW - margin * 2, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("RECIBIMOS DE:", margin + 3, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(clienteNombre || "—", margin + 3, y + 13);
  doc.setFontSize(8);
  if (clienteCuit) doc.text(`CUIT: ${clienteCuit}`, margin + 3, y + 18);
  if (clienteDireccion) doc.text(clienteDireccion, margin + 3, y + 22);

  // Monto destacado
  y += 30;
  doc.setFillColor(...CORP_RED);
  doc.rect(margin, y, pageW - margin * 2, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("LA CANTIDAD DE", margin + 3, y + 6);
  doc.setFontSize(16);
  doc.text(fmt(pago.monto), pageW - margin - 3, y + 12, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(`(${numeroALetras(pago.monto)})`, margin + 3, y + 14);

  // Concepto
  y += 24;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("EN CONCEPTO DE:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Pago a cuenta del Certificado ${certificado.numero} - Período ${certificado.periodo} - Obra: ${obraNombre}`,
    margin,
    y + 5,
    { maxWidth: pageW - margin * 2 },
  );

  // Detalle de pago
  y += 16;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Detalle del Pago", ""]],
    body: [
      ["Método", pago.metodo ? METODO_LABEL[pago.metodo] || pago.metodo : "—"],
      ["Referencia / N° comprobante", pago.referencia || "—"],
      ["Banco", pago.banco || "—"],
      ["Fecha", format(parseISO(pago.fecha), "dd/MM/yyyy")],
      ["Descripción", pago.descripcion || "—"],
    ],
    theme: "grid",
    headStyles: { fillColor: CORP_RED, textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 } },
  });

  // Estado del certificado
  // @ts-expect-error
  y = (doc.lastAutoTable?.finalY || y + 40) + 8;
  const saldo = certificado.total - totalPagado;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Estado del Certificado", ""]],
    body: [
      ["Total certificado", fmt(certificado.total)],
      ["Total cobrado (incluye este pago)", fmt(totalPagado)],
      ["Saldo pendiente", fmt(saldo)],
    ],
    theme: "grid",
    headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 }, 1: { halign: "right" } },
  });

  // Firma
  // @ts-expect-error
  y = (doc.lastAutoTable?.finalY || y + 30) + 30;
  doc.setDrawColor(...DARK);
  doc.line(pageW - margin - 70, y, pageW - margin, y);
  doc.setFontSize(8);
  doc.text("Firma y aclaración", pageW - margin - 35, y + 5, { align: "center" });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Recibo generado el ${format(new Date(), "dd/MM/yyyy HH:mm")} - ${EMPRESA.nombre}`,
    pageW / 2,
    287,
    { align: "center" },
  );

  doc.save(`${reciboNum}.pdf`);
}

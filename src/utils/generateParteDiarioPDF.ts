import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import logoCalamina from "@/assets/logo-calamina-sur.png";
import type { ParteDiario } from "@/hooks/useParteDiario";
import type { EmpleadoRendimiento, TotalesRendimiento, RolPersonal } from "@/hooks/useParteDiarioRendimiento";

const EMPRESA_INFO = {
  nombre: "CALAMINA SUR S.A.",
  cuit: "30-71457642-5",
  direccion: "CASTEX 499 – Piso: 6° Oficina 601",
  localidad: "(1804) Canning - Pcia. Bs. As.",
  telefono: "11-38537787",
  email: "calamimasur@hotmail.com",
};

const ROL_LABELS: Record<string, string> = {
  maquinista: 'Maquinista',
  chofer: 'Chofer',
  capataz: 'Capataz',
  mecanico: 'Mecánico',
  sereno: 'Sereno',
  topografo: 'Topógrafo',
  ayudante: 'Ayudante',
  administrativo: 'Administrativo',
};

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

function formatTime(time: string | null): string {
  if (!time) return "-";
  return time.slice(0, 5);
}


function getTableColumnsForRole(rol: RolPersonal): { header: string[]; keys: string[] } {
  switch (rol) {
    case 'maquinista':
      return {
        header: ["Fecha", "Obra", "Máquina", "Horario", "Horómetro", "Comb.", "Obs."],
        keys: ["fecha", "obra", "maquina", "horario", "horometro", "combustible", "obs"],
      };
    case 'chofer':
      return {
        header: ["Fecha", "Camión", "Horario", "Viajes", "Mov.Int", "Comb.", "Obs."],
        keys: ["fecha", "camion", "horario", "viajes", "movInterno", "combustible", "obs"],
      };
    case 'capataz':
      return {
        header: ["Fecha", "Obra", "Horario", "Ausencias", "Obs."],
        keys: ["fecha", "obra", "horario", "ausencias", "obs"],
      };
    case 'mecanico':
    case 'ayudante':
      return {
        header: ["Fecha", "Obra", "Horario", "Tareas", "Obs."],
        keys: ["fecha", "obra", "horario", "tareas", "obs"],
      };
    default:
      return {
        header: ["Fecha", "Obra", "Horario", "Obs."],
        keys: ["fecha", "obra", "horario", "obs"],
      };
  }
}

function getRowDataForRole(parte: ParteDiario, rol: RolPersonal): string[] {
  const fecha = format(new Date(parte.fecha), "dd/MM/yyyy");
  const horario = `${formatTime(parte.hora_entrada)}-${formatTime(parte.hora_salida)}`;
  const obraName = parte.obras?.nombre || "-";
  const maquinaName = parte.maquinarias?.codigo || parte.maquinarias?.tipo || "-";
  const tieneObs = parte.observaciones_inconvenientes ? 'Sí' : '-';
  
  switch (rol) {
    case 'maquinista':
      const horometro = `${parte.horometro_inicio || 0}→${parte.horometro_fin || 0}`;
      return [fecha, obraName, maquinaName, horario, horometro, `${parte.combustible || 0}L`, tieneObs];
    case 'chofer':
      return [
        fecha,
        maquinaName,
        horario,
        String(parte.cantidad_viajes || 0),
        String(parte.cantidad_movimiento_interno || 0),
        `${parte.combustible || 0}L`,
        tieneObs,
      ];
    case 'capataz':
      const ausenciasCount = parte.ausencias?.length || 0;
      return [fecha, obraName, horario, `${ausenciasCount} emp.`, tieneObs];
    case 'mecanico':
    case 'ayudante':
      const tareaResumen = parte.tareas 
        ? (parte.tareas.length > 18 ? parte.tareas.slice(0, 18) + '...' : parte.tareas) 
        : '-';
      return [fecha, obraName, horario, tareaResumen, tieneObs];
    default:
      return [fecha, obraName, horario, tieneObs];
  }
}

function getChecklistForRole(rol: RolPersonal): { label: string; key: keyof ParteDiario }[] {
  switch (rol) {
    case 'maquinista':
      return [
        { label: "Filtro de aire", key: "check_filtro_aire" },
        { label: "Aceite motor", key: "check_aceite_motor" },
        { label: "Aceite hidráulico", key: "check_aceite_hidraulico" },
        { label: "Líquido refrigerante", key: "check_liquido_refrigerante" },
      ];
    case 'chofer':
      return [
        { label: "Aceite motor", key: "check_aceite_motor" },
        { label: "Líquido refrigerante", key: "check_liquido_refrigerante" },
        { label: "Uría", key: "check_uria" },
      ];
    default:
      return [];
  }
}

export async function generateParteDiarioPDF(
  empleado: EmpleadoRendimiento,
  partes: ParteDiario[],
  totales: TotalesRendimiento,
  fechaDesde: Date,
  fechaHasta: Date,
  personalList?: Array<{ id: string; nombre: string | null; apellido: string | null }>,
  obraNombre?: string
): Promise<void> {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let yPos = 8;

  const rol = empleado.rol;

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

  // Company info (right side)
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
  yPos += 5;

  // ============== REPORT TITLE ==============
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 0, 0);
  doc.text("REPORTE DE PARTES DIARIOS", margin, yPos);
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha del reporte: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, pageWidth - margin, yPos, { align: "right" });
  yPos += 6;

  // ============== EMPLOYEE DATA ==============
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, yPos - 2, pageWidth - margin * 2, 14, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DATOS DEL EMPLEADO", margin + 2, yPos + 2);
  yPos += 5;

  doc.setFont("helvetica", "normal");
  const col1X = margin + 2;
  const col2X = pageWidth / 2;

  const nombreCompleto = [empleado.nombre, empleado.apellido].filter(Boolean).join(" ") || "Sin nombre";

  doc.setFont("helvetica", "bold");
  doc.text("Nombre:", col1X, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(nombreCompleto, col1X + 18, yPos);

  doc.setFont("helvetica", "bold");
  doc.text("Legajo:", col2X, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(empleado.legajo || "-", col2X + 18, yPos);
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Rol:", col1X, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(ROL_LABELS[rol] || rol, col1X + 18, yPos);
  yPos += 6;

  // ============== PERIOD ==============
  const periodoStr = `${format(fechaDesde, "dd/MM/yyyy")} al ${format(fechaHasta, "dd/MM/yyyy")}`;
  doc.setFont("helvetica", "bold");
  doc.text("PERÍODO:", margin, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(periodoStr, margin + 20, yPos);
  if (obraNombre) {
    doc.setFont("helvetica", "bold");
    doc.text("OBRA:", col2X, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(obraNombre, col2X + 14, yPos);
  }
  yPos += 6;

  // ============== SUMMARY (adapted by role) ==============
  doc.setFillColor(230, 230, 230);
  const summaryHeight = (rol === 'maquinista' || rol === 'chofer') ? 24 : 14;
  doc.rect(margin, yPos - 2, pageWidth - margin * 2, summaryHeight, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("RESUMEN DEL PERÍODO", margin + 2, yPos + 2);
  yPos += 5;

  doc.setFont("helvetica", "normal");
  
  // Common fields
  doc.text(`Partes completados:`, col1X, yPos);
  doc.text(`${totales.partesCompletados}`, col1X + 35, yPos);
  
  doc.text(`Días trabajados:`, col2X, yPos);
  doc.text(`${totales.diasTrabajados}`, col2X + 30, yPos);
  yPos += 4;

  // Role-specific fields
  if (rol === 'maquinista') {
    doc.text(`Horas de máquina:`, col1X, yPos);
    doc.text(`${totales.horasMaquinaTotales.toFixed(1)} hrs`, col1X + 35, yPos);

    doc.text(`Combustible:`, col2X, yPos);
    doc.text(`${totales.combustibleTotal.toFixed(0)} L`, col2X + 30, yPos);
    yPos += 4;

    doc.text(`Checklist cumplido:`, col1X, yPos);
    doc.text(`${totales.checklistCumplimiento}%`, col1X + 35, yPos);
    yPos += 4;
  } else if (rol === 'chofer') {
    doc.text(`Total viajes:`, col1X, yPos);
    doc.text(`${totales.viajesTotales}`, col1X + 35, yPos);

    doc.text(`Mov. interno:`, col2X, yPos);
    doc.text(`${totales.movimientoInternoTotal}`, col2X + 30, yPos);
    yPos += 4;

    doc.text(`Combustible:`, col1X, yPos);
    doc.text(`${totales.combustibleTotal.toFixed(0)} L`, col1X + 35, yPos);
    yPos += 4;
  }

  yPos += 2;

  // ============== DETAIL TABLE ==============
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("DETALLE DE PARTES", margin, yPos);
  yPos += 3;

  const { header, keys } = getTableColumnsForRole(rol);

  // Sort partes by date
  const sortedPartes = [...partes].sort((a, b) => 
    new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  const tableData = sortedPartes.map((parte) => getRowDataForRole(parte, rol));

  autoTable(doc, {
    startY: yPos,
    head: [header],
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
      fontSize: 5.5,
      cellPadding: 1,
    },
    columnStyles: {
      0: { cellWidth: 20, halign: "center" }, // Fecha
    },
    margin: { left: margin, right: margin },
    tableWidth: "auto",
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

  // ============== CHECKLIST SUMMARY (if applicable) ==============
  const checklistItems = getChecklistForRole(rol);
  if (checklistItems.length > 0 && partes.length > 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("CUMPLIMIENTO DE CHECKLIST", margin, yPos);
    yPos += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    checklistItems.forEach((item) => {
      const completados = partes.filter((p) => p[item.key] === true).length;
      const porcentaje = partes.length > 0 ? Math.round((completados / partes.length) * 100) : 0;
      doc.text(`${item.label}: ${completados}/${partes.length} (${porcentaje}%)`, margin + 2, yPos);
      yPos += 3;
    });

    yPos += 2;
  }

  // ============== NOVEDADES (Capataz only) ==============
  if (rol === 'capataz') {
    const partesConNovedades = partes.filter(p => p.novedades);
    if (partesConNovedades.length > 0) {
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 15;
      }

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("NOVEDADES REGISTRADAS", margin, yPos);
      yPos += 4;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      partesConNovedades.forEach(p => {
        const fechaStr = format(new Date(p.fecha), "dd/MM");
        const novedadText = p.novedades?.slice(0, 100) || '';
        const suffix = (p.novedades?.length || 0) > 100 ? '...' : '';
        doc.text(`${fechaStr}: ${novedadText}${suffix}`, margin + 2, yPos);
        yPos += 3;
        if (yPos > 280) {
          doc.addPage();
          yPos = 15;
        }
      });
      yPos += 3;
    }
  }

  // ============== OBSERVACIONES / INCONVENIENTES (all roles) ==============
  const partesConObservaciones = partes.filter(p => p.observaciones_inconvenientes);
  if (partesConObservaciones.length > 0) {
    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 15;
    }

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("OBSERVACIONES / INCONVENIENTES", margin, yPos);
    yPos += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    partesConObservaciones.forEach(p => {
      const fechaStr = format(new Date(p.fecha), "dd/MM");
      const obsText = p.observaciones_inconvenientes?.slice(0, 80) || '';
      const suffix = (p.observaciones_inconvenientes?.length || 0) > 80 ? '...' : '';
      doc.text(`${fechaStr}: ${obsText}${suffix}`, margin + 2, yPos);
      yPos += 3;
      if (yPos > 280) {
        doc.addPage();
        yPos = 15;
      }
    });
    yPos += 3;
  }

  // ============== FOOTER ==============
  const signatureX = pageWidth / 2;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(EMPRESA_INFO.nombre, signatureX, yPos, { align: "center" });
  yPos += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text(`Generado el ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, signatureX, yPos, { align: "center" });

  // Save PDF
  const empleadoNombre = [empleado.nombre, empleado.apellido].filter(Boolean).join("_") || "Empleado";
  const fileName = `PartesDiarios_${empleadoNombre}_${format(fechaDesde, "yyyyMMdd")}-${format(fechaHasta, "yyyyMMdd")}.pdf`;
  doc.save(fileName);
}

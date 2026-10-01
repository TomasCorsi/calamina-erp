import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Upload,
  Download,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Building,
} from "lucide-react";
import { PersonalDB } from "@/hooks/usePersonal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type BancoDestino = "galicia" | "santander";
type ModalidadPago = "mensual" | "quincenal" | "vacaciones";

interface LiquidacionRow {
  legajo: string;
  nombreArchivo: string;
  importe: number;
  status: "listo" | "sin_cuenta" | "no_encontrado" | "modalidad_incorrecta";
  empleado?: PersonalDB;
}

interface LiquidacionesTabProps {
  personal: PersonalDB[];
}

const bancos: { value: BancoDestino; label: string }[] = [
  { value: "galicia", label: "Banco Galicia" },
  { value: "santander", label: "Banco Santander" },
];

const modalidades: { value: ModalidadPago; label: string }[] = [
  { value: "mensual", label: "Mensual" },
  { value: "quincenal", label: "Quincenal" },
  { value: "vacaciones", label: "Vacaciones" },
];

function detectSeparator(line: string): string {
  const semicolons = (line.match(/;/g) || []).length;
  const tabs = (line.match(/\t/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  
  if (semicolons >= tabs && semicolons >= commas) return ";";
  if (tabs >= commas) return "\t";
  return ",";
}

function parseNumber(value: string | number): number {
  if (value === null || value === undefined || value === "") return 0;
  
  // If it's already a number (from Excel), return it directly
  if (typeof value === "number") {
    return isNaN(value) ? 0 : value;
  }
  
  const str = String(value).trim();
  
  // Check if it's a plain number (Excel often exports as plain numbers)
  const plainNumber = parseFloat(str);
  if (!isNaN(plainNumber) && /^-?\d+\.?\d*$/.test(str)) {
    return plainNumber;
  }
  
  // Handle Argentine format: 1.234.567,89 (dots as thousands, comma as decimal)
  // First check if it has comma as decimal separator
  if (str.includes(",")) {
    const cleaned = str
      .replace(/\s/g, "")
      .replace(/\./g, "") // Remove thousand separators
      .replace(",", "."); // Convert decimal comma to dot
    return parseFloat(cleaned) || 0;
  }
  
  // Otherwise treat dots as thousand separators only if there are multiple
  const dotCount = (str.match(/\./g) || []).length;
  if (dotCount > 1) {
    // Multiple dots = thousand separators, no decimal
    const cleaned = str.replace(/\s/g, "").replace(/\./g, "");
    return parseFloat(cleaned) || 0;
  }
  
  // Single dot could be decimal or thousand separator - treat as decimal
  const cleaned = str.replace(/\s/g, "");
  return parseFloat(cleaned) || 0;
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  for (const name of possibleNames) {
    const idx = normalizedHeaders.findIndex(h => h.includes(name.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

export function LiquidacionesTab({ personal }: LiquidacionesTabProps) {
  const [banco, setBanco] = useState<BancoDestino | "">("");
  const [modalidadesSeleccionadas, setModalidadesSeleccionadas] = useState<ModalidadPago[]>([]);
  const [rows, setRows] = useState<LiquidacionRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isExcelFile = (fileName: string): boolean => {
    const ext = fileName.toLowerCase().split('.').pop();
    return ext === 'xlsx' || ext === 'xls';
  };

  const processExcel = (data: ArrayBuffer) => {
    try {
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON array format with header: 1 to get array of arrays
      const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, raw: true });
      
      if (jsonData.length < 2) {
        toast.error("El archivo no tiene datos suficientes");
        return;
      }
      
      const firstRow = jsonData[0];
      if (!Array.isArray(firstRow)) {
        toast.error("Formato de archivo no válido");
        return;
      }
      
      const headers = firstRow.map(h => String(h || "").trim());
      
      // Find column indices
      const legajoIdx = findColumnIndex(headers, ["legajo", "leg", "nro", "numero"]);
      const importeIdx = findColumnIndex(headers, ["neto", "cobrar", "importe", "total", "liquido"]);
      const nombreIdx = findColumnIndex(headers, ["nombre", "apellido", "empleado"]);

      if (legajoIdx === -1) {
        toast.error("No se encontró la columna de Legajo");
        return;
      }
      if (importeIdx === -1) {
        toast.error("No se encontró la columna de Importe/Neto a cobrar");
        return;
      }

      const processedRows: LiquidacionRow[] = [];

      for (let i = 1; i < jsonData.length; i++) {
        const cols = jsonData[i];
        if (!Array.isArray(cols) || cols.length <= Math.max(legajoIdx, importeIdx)) continue;

        const legajo = String(cols[legajoIdx] ?? "").trim();
        const importe = parseNumber(cols[importeIdx] as string | number);
        const nombreArchivo = nombreIdx !== -1 ? String(cols[nombreIdx] ?? "").trim() : "";

        if (!legajo || importe === 0) continue;

        // Find employee by legajo
        const empleado = personal.find(p => p.legajo === legajo);

        let status: LiquidacionRow["status"] = "no_encontrado";
        if (empleado) {
          // Verificar que la modalidad coincida (excepto para vacaciones que acepta cualquiera)
          const empleadoModalidad = empleado.modalidad_pago || "mensual";
          const skipModalidadCheck = modalidadesSeleccionadas.includes("vacaciones");
          if (!skipModalidadCheck && !modalidadesSeleccionadas.includes(empleadoModalidad as ModalidadPago)) {
            status = "modalidad_incorrecta";
          } else if (empleado.numero_cuenta) {
            status = "listo";
          } else {
            status = "sin_cuenta";
          }
        }

        processedRows.push({
          legajo,
          nombreArchivo,
          importe,
          status,
          empleado,
        });
      }

      if (processedRows.length === 0) {
        toast.error("No se encontraron registros válidos en el archivo");
        return;
      }

      setRows(processedRows);
      toast.success(`Se procesaron ${processedRows.length} registros`);
    } catch (error) {
      toast.error("Error al procesar el archivo Excel");
      console.error(error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!banco || modalidadesSeleccionadas.length === 0) {
      toast.error("Selecciona banco y al menos una modalidad antes de cargar el archivo");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFileName(file.name);
    
    if (isExcelFile(file.name)) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as ArrayBuffer;
        processExcel(data);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processCSV(text);
      };
      reader.readAsText(file, "UTF-8");
    }
  };

  const processCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      toast.error("El archivo no tiene datos suficientes");
      return;
    }

    const separator = detectSeparator(lines[0]);
    const headers = lines[0].split(separator).map(h => h.trim());
    
    // Find column indices
    const legajoIdx = findColumnIndex(headers, ["legajo", "leg", "nro", "numero"]);
    const importeIdx = findColumnIndex(headers, ["neto", "cobrar", "importe", "total", "liquido"]);
    const nombreIdx = findColumnIndex(headers, ["nombre", "apellido", "empleado"]);

    if (legajoIdx === -1) {
      toast.error("No se encontró la columna de Legajo");
      return;
    }
    if (importeIdx === -1) {
      toast.error("No se encontró la columna de Importe/Neto a cobrar");
      return;
    }

    const processedRows: LiquidacionRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(separator).map(c => c.trim());
      if (cols.length <= Math.max(legajoIdx, importeIdx)) continue;

      const legajo = cols[legajoIdx]?.trim();
      const importe = parseNumber(cols[importeIdx]);
      const nombreArchivo = nombreIdx !== -1 ? cols[nombreIdx]?.trim() : "";

      if (!legajo || importe === 0) continue;

      // Find employee by legajo
      const empleado = personal.find(p => p.legajo === legajo);

      let status: LiquidacionRow["status"] = "no_encontrado";
      if (empleado) {
        // Verificar que la modalidad coincida (excepto para vacaciones que acepta cualquiera)
        const empleadoModalidad = empleado.modalidad_pago || "mensual";
        const skipModalidadCheck = modalidadesSeleccionadas.includes("vacaciones");
        if (!skipModalidadCheck && !modalidadesSeleccionadas.includes(empleadoModalidad as ModalidadPago)) {
          status = "modalidad_incorrecta";
        } else if (empleado.numero_cuenta) {
          status = "listo";
        } else {
          status = "sin_cuenta";
        }
      }

      processedRows.push({
        legajo,
        nombreArchivo,
        importe,
        status,
        empleado,
      });
    }

    if (processedRows.length === 0) {
      toast.error("No se encontraron registros válidos en el archivo");
      return;
    }

    setRows(processedRows);
    toast.success(`Se procesaron ${processedRows.length} registros`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!banco || modalidadesSeleccionadas.length === 0) {
      toast.error("Selecciona banco y al menos una modalidad antes de cargar el archivo");
      return;
    }

    setFileName(file.name);
    
    if (isExcelFile(file.name)) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as ArrayBuffer;
        processExcel(data);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processCSV(text);
      };
      reader.readAsText(file, "UTF-8");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const generateExcel = () => {
    const readyRows = rows.filter(r => r.status === "listo");
    if (readyRows.length === 0) {
      toast.error("No hay registros listos para generar la planilla");
      return;
    }

    const bancoLabel = bancos.find(b => b.value === banco)?.label || banco;
    const modalidadLabel = modalidadesSeleccionadas
      .map(m => modalidades.find(mo => mo.value === m)?.label || m)
      .join("-");
    const today = new Date().toISOString().split("T")[0];
    
    // Prepare data for Excel - account number without prefix, importe rounded
    const excelData = readyRows.map(row => ({
      "Numero de cuenta": row.empleado?.numero_cuenta ?? "",
      "Nombre completo": `${row.empleado?.nombre || ""} ${row.empleado?.apellido || ""}`.trim(),
      "Importe": Math.round(row.importe),
      "Concepto": 1
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pagos");

    // Force account number column to text format (without apostrophe)
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
    for (let row = 1; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 0 });
      const cell = worksheet[cellAddress];
      if (cell) {
        cell.t = "s"; // Set type to string
        cell.z = "@"; // Set Excel number format to Text
        cell.v = String(cell.v || ""); // Ensure value is string
      }
    }

    // Auto-size columns
    const colWidths = [
      { wch: 25 }, // Numero de cuenta
      { wch: 35 }, // Nombre completo
      { wch: 15 }, // Importe
      { wch: 10 }, // Concepto
    ];
    worksheet["!cols"] = colWidths;

    // Generate and download Excel file
    const fileName = `Pagos_${bancoLabel.replace(/\s/g, "_")}_${modalidadLabel}_${today}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast.success(`Planilla generada para ${readyRows.length} empleados`);
  };

  const clearData = () => {
    setRows([]);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const stats = {
    listos: rows.filter(r => r.status === "listo").length,
    sinCuenta: rows.filter(r => r.status === "sin_cuenta").length,
    noEncontrado: rows.filter(r => r.status === "no_encontrado").length,
    modalidadIncorrecta: rows.filter(r => r.status === "modalidad_incorrecta").length,
  };

  const totalImporte = rows
    .filter(r => r.status === "listo")
    .reduce((sum, r) => sum + r.importe, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-industrial p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Generador de Planilla de Pagos</h3>
            <p className="text-sm text-muted-foreground">
              Sube la planilla del estudio contable y genera el archivo para el banco
            </p>
          </div>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Banco destino
            </Label>
            <Select value={banco} onValueChange={(v) => setBanco(v as BancoDestino)}>
              <SelectTrigger className="bg-muted border-border">
                <SelectValue placeholder="Seleccionar banco..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {bancos.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Modalidad de pago
            </Label>
            <ToggleGroup
              type="multiple"
              value={modalidadesSeleccionadas}
              onValueChange={(v) => setModalidadesSeleccionadas(v as ModalidadPago[])}
              className="justify-start gap-2"
            >
              {modalidades.map((m) => (
                <ToggleGroupItem
                  key={m.value}
                  value={m.value}
                  variant="outline"
                  size="sm"
                  className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
                >
                  {m.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>

        {/* File Upload Zone */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
            banco && modalidadesSeleccionadas.length > 0
              ? "border-primary/50 bg-primary/5 hover:border-primary cursor-pointer" 
              : "border-border bg-muted/50 cursor-not-allowed opacity-60"
          )}
          onDrop={banco && modalidadesSeleccionadas.length > 0 ? handleDrop : undefined}
          onDragOver={banco && modalidadesSeleccionadas.length > 0 ? handleDragOver : undefined}
          onClick={() => banco && modalidadesSeleccionadas.length > 0 && fileInputRef.current?.click()}
        >
          <Upload className={cn("w-10 h-10 mx-auto mb-3", banco && modalidadesSeleccionadas.length > 0 ? "text-primary" : "text-muted-foreground")} />
          <p className="text-foreground font-medium">
            {banco && modalidadesSeleccionadas.length > 0 ? "Arrastra tu archivo CSV aquí" : "Selecciona banco y modalidad primero"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {banco && modalidadesSeleccionadas.length > 0 ? "o haz clic para seleccionar (CSV o Excel)" : ""}
          </p>
          {fileName && (
            <Badge variant="outline" className="mt-3">
              {fileName}
            </Badge>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.tsv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            disabled={!banco || modalidadesSeleccionadas.length === 0}
          />
        </div>
      </div>

      {/* Results */}
      {rows.length > 0 && (
        <div className="card-industrial overflow-hidden">
          {/* Summary Bar */}
          <div className="p-4 border-b border-border bg-muted/30 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-foreground">{stats.listos} listos</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-foreground">{stats.sinCuenta} sin cuenta</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-foreground">{stats.noEncontrado} no encontrados</span>
              </div>
              {stats.modalidadIncorrecta > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-foreground">{stats.modalidadIncorrecta} modalidad incorrecta</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Total a pagar: <strong className="text-foreground">${totalImporte.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</strong>
              </span>
              <Button variant="outline" size="sm" onClick={clearData}>
                Limpiar
              </Button>
              <Button 
                onClick={generateExcel}
                disabled={stats.listos === 0}
                className="bg-primary hover:bg-primary/90"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar Excel
              </Button>
            </div>
          </div>

          {/* Data Table */}
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground font-medium">Legajo</TableHead>
                <TableHead className="text-muted-foreground font-medium">Nombre (archivo)</TableHead>
                <TableHead className="text-muted-foreground font-medium">Nombre (sistema)</TableHead>
                <TableHead className="text-muted-foreground font-medium">Cuenta</TableHead>
                <TableHead className="text-muted-foreground font-medium text-right">Importe</TableHead>
                <TableHead className="text-muted-foreground font-medium">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx} className="border-border">
                  <TableCell className="font-mono text-sm">{row.legajo}</TableCell>
                  <TableCell className="text-muted-foreground">{row.nombreArchivo || "-"}</TableCell>
                  <TableCell>
                    {row.empleado 
                      ? `${row.empleado.nombre || ""} ${row.empleado.apellido || ""}`.trim()
                      : <span className="text-destructive">No encontrado</span>
                    }
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {row.empleado?.numero_cuenta || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${row.importe.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    {row.status === "listo" && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Listo
                      </Badge>
                    )}
                    {row.status === "sin_cuenta" && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Sin cuenta
                      </Badge>
                    )}
                    {row.status === "no_encontrado" && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        <XCircle className="w-3 h-3 mr-1" />
                        No existe
                      </Badge>
                    )}
                    {row.status === "modalidad_incorrecta" && (
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Modalidad incorrecta ({row.empleado?.modalidad_pago || "mensual"})
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

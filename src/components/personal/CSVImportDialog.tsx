import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle, CheckCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { PersonalForm, RolPersonal, ModalidadPago } from "@/hooks/usePersonal";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (personal: PersonalForm[]) => Promise<void>;
}

// Mapeo de roles con variantes de texto (lowercase para comparación)
const rolesMap: Record<string, RolPersonal> = {
  "capataz": "capataz",
  "maquinista": "maquinista",
  "chofer": "chofer",
  "administrativo": "administrativo",
  "ayudante": "ayudante",
  "sereno": "sereno",
  "mecanico": "mecanico",
  "topografo": "topografo",
  "repartidor_calecita": "repartidor_calecita",
  "repartidor calecita": "repartidor_calecita",
};

interface ParseResult {
  valid: PersonalForm[];
  errors: { row: number; message: string }[];
}

function detectSeparator(line: string): string {
  const separators = [";", "\t", ","];
  let maxCount = 0;
  let detectedSeparator = ",";
  
  for (const sep of separators) {
    const count = (line.match(new RegExp(sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      detectedSeparator = sep;
    }
  }
  
  return detectedSeparator;
}

function parseDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  
  // Try DD/MM/YYYY format
  const dmy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try YYYY-MM-DD format
  const ymd = dateStr.match(/^\d{4}-\d{2}-\d{2}$/);
  if (ymd) {
    return dateStr;
  }
  
  return undefined;
}

function parseCSV(text: string): ParseResult {
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    return { valid: [], errors: [{ row: 0, message: "El archivo debe tener al menos una fila de encabezados y una de datos" }] };
  }

  const firstLine = lines[0];
  const separator = detectSeparator(firstLine);

  const headers = firstLine.split(separator).map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  
  const valid: PersonalForm[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(separator).map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    // Normalizar rol (convertir a lowercase y buscar en el mapa)
    const rolRaw = row.rol?.toLowerCase().trim();
    const rol = rolRaw ? rolesMap[rolRaw] : undefined;
    if (rolRaw && !rol) {
      errors.push({ row: i + 1, message: `Rol inválido: ${row.rol}. Válidos: ${Object.keys(rolesMap).join(", ")}` });
      continue;
    }

    // Parse dates
    const fechaIngreso = parseDate(row.fecha_ingreso);
    if (row.fecha_ingreso && !fechaIngreso) {
      errors.push({ row: i + 1, message: `Fecha de ingreso inválida: ${row.fecha_ingreso}. Formatos válidos: DD/MM/YYYY o YYYY-MM-DD` });
      continue;
    }

    const vencimientoLicencia = parseDate(row.vencimiento_licencia);
    if (row.vencimiento_licencia && !vencimientoLicencia) {
      errors.push({ row: i + 1, message: `Vencimiento de licencia inválido: ${row.vencimiento_licencia}. Formatos válidos: DD/MM/YYYY o YYYY-MM-DD` });
      continue;
    }

    // Parse activo (default true)
    const activoRaw = row.activo?.toLowerCase().trim();
    const activo = activoRaw === "false" || activoRaw === "no" || activoRaw === "0" ? false : true;

    // Parse sueldo
    const sueldo = row.sueldo ? parseFloat(row.sueldo.replace(',', '.')) : undefined;
    if (row.sueldo && (isNaN(sueldo!) || sueldo! < 0)) {
      errors.push({ row: i + 1, message: `Sueldo inválido: ${row.sueldo}. Debe ser un número positivo` });
      continue;
    }

    // Parse sueldo_negro
    const sueldo_negro = row.sueldo_negro ? parseFloat(row.sueldo_negro.replace(',', '.')) : undefined;
    if (row.sueldo_negro && (isNaN(sueldo_negro!) || sueldo_negro! < 0)) {
      errors.push({ row: i + 1, message: `Sueldo en negro inválido: ${row.sueldo_negro}. Debe ser un número positivo` });
      continue;
    }

    // Parse situacion_laboral (default blanco)
    const situacionRaw = row.situacion_laboral?.toLowerCase().trim();
    const situacion_laboral = situacionRaw === "negro" ? "negro" : "blanco";

    // Parse modalidad_pago (default mensual)
    const modalidadRaw = row.modalidad_pago?.toLowerCase().trim();
    const modalidad_pago: ModalidadPago = modalidadRaw === "quincenal" ? "quincenal" : "mensual";

    valid.push({
      nombre: row.nombre || undefined,
      apellido: row.apellido || undefined,
      dni: row.dni || undefined,
      rol: rol,
      email: row.email || undefined,
      telefono: row.telefono || undefined,
      fecha_ingreso: fechaIngreso,
      activo: activo,
      licencia: row.licencia || undefined,
      vencimiento_licencia: vencimientoLicencia,
      sueldo: sueldo,
      sueldo_negro: sueldo_negro,
      modalidad_pago: modalidad_pago,
      legajo: row.legajo || undefined,
      situacion_laboral: situacion_laboral,
      banco: row.banco || undefined,
      numero_cuenta: row.numero_cuenta || undefined,
    });
  }

  return { valid, errors };
}

export function CSVImportDialog({ open, onOpenChange, onImport }: CSVImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validExtensions = [".csv", ".tsv", ".txt"];
    const hasValidExtension = validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
    if (!hasValidExtension) {
      toast.error("Por favor selecciona un archivo CSV o TSV");
      return;
    }

    setFile(selectedFile);
    const text = await selectedFile.text();
    const result = parseCSV(text);
    setParseResult(result);
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.valid.length === 0) return;

    setIsImporting(true);
    try {
      await onImport(parseResult.valid);
      toast.success(`${parseResult.valid.length} registros de personal importados correctamente`);
      handleClose();
    } catch (error) {
      toast.error("Error al importar personal");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParseResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const headers = ["nombre", "apellido", "dni", "rol", "email", "telefono", "fecha_ingreso", "activo", "licencia", "vencimiento_licencia", "sueldo", "sueldo_negro", "modalidad_pago", "legajo", "situacion_laboral", "banco", "numero_cuenta"].join(";");
    const example = ["Juan", "Pérez", "12345678", "Maquinista", "juan@email.com", "1155667788", "01/01/2024", "true", "B2", "31/12/2025", "150000", "50000", "mensual", "001", "blanco", "Banco Nación", "1234567890"].join(";");
    const content = `${headers}\n${example}`;
    const bom = "\uFEFF";
    const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "personal_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Personal</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV/TSV con los datos del personal a importar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar plantilla
          </Button>

          {/* File Upload */}
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-foreground">
                <FileText className="w-5 h-5" />
                <span>{file.name}</span>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Haz clic para seleccionar un archivo (CSV/TSV)
                </p>
              </div>
            )}
          </div>

          {/* Parse Results */}
          {parseResult && (
            <div className="space-y-3">
              {parseResult.valid.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  {parseResult.valid.length} registros válidos para importar
                </div>
              )}

              {parseResult.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    {parseResult.errors.length} errores encontrados
                  </div>
                  <div className="max-h-32 overflow-y-auto text-xs space-y-1 bg-muted p-2 rounded">
                    {parseResult.errors.slice(0, 10).map((err, idx) => (
                      <p key={idx} className="text-muted-foreground">
                        Fila {err.row}: {err.message}
                      </p>
                    ))}
                    {parseResult.errors.length > 10 && (
                      <p className="text-muted-foreground">
                        ...y {parseResult.errors.length - 10} errores más
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={!parseResult || parseResult.valid.length === 0 || isImporting}
            >
              {isImporting ? "Importando..." : `Importar ${parseResult?.valid.length || 0} registros`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

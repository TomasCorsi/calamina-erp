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
import { MaquinariaForm, TipoMaquinaria, EstadoMaquinaria } from "@/hooks/useMaquinarias";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (maquinarias: MaquinariaForm[]) => Promise<void>;
}

// Mapeo de tipos con variantes de texto (lowercase para comparación)
const tiposMap: Record<string, TipoMaquinaria> = {
  "cargadora": "cargadora",
  "compactador": "compactador",
  "retroexcavadora": "retroexcavadora",
  "minicargadora": "minicargadora",
  "motoniveladora": "motoniveladora",
  "topador": "topador",
  "pala_retro": "pala_retro",
  "pala retro": "pala_retro",
  "batea": "batea",
  "acoplado": "acoplado",
  "camion": "camion",
  "camión": "camion",
  "carreton": "carreton",
  "carretón": "carreton",
  "cisterna": "cisterna",
  "tanque_cisterna": "tanque_cisterna",
  "tanque cisterna": "tanque_cisterna",
  "tanque_regador_tractor": "tanque_regador_tractor",
  "tanque regador tractor": "tanque_regador_tractor",
  "soplador": "soplador",
  "zanjeadora": "zanjeadora",
  "rastra": "rastra",
  "tractor": "tractor",
  "rastra_grosspal": "rastra_grosspal",
  "rastra grosspal": "rastra_grosspal",
  "auto": "auto",
  "camioneta": "camioneta",
};

// Mapeo de estados con variantes de texto
const estadosMap: Record<string, EstadoMaquinaria> = {
  "operativa": "operativa",
  "mantenimiento": "mantenimiento",
  "inactiva": "inactiva",
  "en_uso": "en_uso",
  "en uso": "en_uso",
};

interface ParseResult {
  valid: MaquinariaForm[];
  errors: { row: number; message: string }[];
}

function detectSeparator(line: string): string {
  // Detectar el separador más común en la línea
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

function parseCSV(text: string): ParseResult {
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    return { valid: [], errors: [{ row: 0, message: "El archivo debe tener al menos una fila de encabezados y una de datos" }] };
  }

  const firstLine = lines[0];
  const separator = detectSeparator(firstLine);

  const headers = firstLine.split(separator).map(h => h.trim().toLowerCase());
  
  // Ya no requerimos columnas obligatorias
  const valid: MaquinariaForm[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(separator).map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });

    // Normalizar tipo (convertir a lowercase y buscar en el mapa)
    const tipoRaw = row.tipo?.toLowerCase().trim();
    const tipo = tipoRaw ? tiposMap[tipoRaw] : undefined;
    if (tipoRaw && !tipo) {
      errors.push({ row: i + 1, message: `Tipo inválido: ${row.tipo}. Válidos: ${Object.keys(tiposMap).join(", ")}` });
      continue;
    }
    
    // Normalizar estado
    const estadoRaw = row.estado?.toLowerCase().trim();
    const estado = estadoRaw ? estadosMap[estadoRaw] : undefined;
    if (estadoRaw && !estado) {
      errors.push({ row: i + 1, message: `Estado inválido: ${row.estado}. Válidos: ${Object.keys(estadosMap).join(", ")}` });
      continue;
    }

    const anio = row.anio ? parseInt(row.anio) : undefined;
    if (row.anio && (isNaN(anio!) || anio! < 1900 || anio! > new Date().getFullYear() + 1)) {
      errors.push({ row: i + 1, message: `Año inválido: ${row.anio}` });
      continue;
    }

    const horas = row.horas_acumuladas ? parseFloat(row.horas_acumuladas) : 0;

    valid.push({
      codigo: row.codigo || undefined,
      nombre: row.nombre || undefined,
      tipo: tipo,
      marca: row.marca || undefined,
      anio: anio,
      patente: row.patente || undefined,
      estado: estado,
      horas_acumuladas: isNaN(horas) ? 0 : horas,
      obra_id: row.obra_id || undefined,
      operador_asignado_id: row.operador_asignado_id || undefined,
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
      toast.success(`${parseResult.valid.length} maquinarias importadas correctamente`);
      handleClose();
    } catch (error) {
      toast.error("Error al importar maquinarias");
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
    // Formato separado por punto y coma (compatible con Excel en español)
    const headers = ["id", "codigo", "nombre", "tipo", "marca", "anio", "patente", "estado", "horas_acumuladas", "operador_asignado_id", "created_at", "updated_at", "obra_id"].join(";");
    const example = ["", "102", "102-Cargadora-CATERPILLAR", "Cargadora", "CATERPILLAR", "2020", "ABC123", "Operativa", "1500", "", "", "", ""].join(";");
    const content = `${headers}\n${example}`;
    // BOM para que Excel reconozca UTF-8
    const bom = "\uFEFF";
    const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "maquinarias_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Maquinarias</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV/TSV (separado por tabulaciones) con las maquinarias a importar
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
            Descargar plantilla (TSV)
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

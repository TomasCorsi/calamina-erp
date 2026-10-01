import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import type { ConceptoForm } from "@/hooks/useCertificados";
import { CATEGORIAS_CERTIFICADO } from "@/hooks/useCertificados";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImport: (rows: ConceptoForm[]) => Promise<void>;
}

interface Parsed {
  valid: ConceptoForm[];
  errors: { row: number; message: string }[];
}

const VALID_UNITS = ["HR", "DIA", "M3", "M2", "ML", "TN", "LT", "VJ", "UN", "GL"];

function normNum(v: any): number {
  if (v == null || v === "") return 0;
  const s = String(v).replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function parseRows(rows: any[]): Parsed {
  const valid: ConceptoForm[] = [];
  const errors: Parsed["errors"] = [];
  rows.forEach((r, idx) => {
    const rowNum = idx + 2;
    const nombre = String(r.nombre || r.Nombre || "").trim();
    const unidad = String(r.unidad || r.Unidad || "").trim().toUpperCase();
    if (!nombre) { errors.push({ row: rowNum, message: "Falta nombre" }); return; }
    if (!unidad || !VALID_UNITS.includes(unidad)) {
      errors.push({ row: rowNum, message: `Unidad inválida (${unidad}). Válidas: ${VALID_UNITS.join(", ")}` });
      return;
    }
    const tipoRaw = String(r.tipo || r.Tipo || "servicio").trim().toLowerCase();
    const tipo: "obra" | "servicio" = tipoRaw === "obra" ? "obra" : "servicio";
    const categoriaRaw = String(r.categoria || r.Categoria || "General").trim();
    const categoria = CATEGORIAS_CERTIFICADO.includes(categoriaRaw) ? categoriaRaw : "General";
    valid.push({
      obra_id: "",
      nombre,
      unidad,
      precio_unitario: normNum(r.precio_unitario ?? r["Precio Unitario"] ?? r.precio),
      cantidad_total: normNum(r.cantidad_total ?? r["Cantidad Total"] ?? r.cantidad),
      etapa: String(r.etapa || r.Etapa || "").trim() || null,
      categoria,
      tipo,
      activo: true,
    });
  });
  return { valid, errors };
}

export function ConceptosCSVImportDialog({ open, onOpenChange, onImport }: Props) {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      setParsed(parseRows(rows as any[]));
    } catch (e) {
      console.error(e);
      toast.error("No se pudo leer el archivo");
    }
  };

  const handleConfirm = async () => {
    if (!parsed || parsed.valid.length === 0) return;
    setImporting(true);
    try {
      await onImport(parsed.valid);
      onOpenChange(false);
      setParsed(null);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { nombre: "Horas Retro", unidad: "HR", precio_unitario: 1000, cantidad_total: 100, categoria: "Alquiler de Maquinas", etapa: "ETAPA 1", tipo: "servicio" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "conceptos");
    XLSX.writeFile(wb, "plantilla-conceptos.xlsx");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setParsed(null); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar conceptos</DialogTitle>
          <DialogDescription>
            Subí un archivo Excel/CSV con columnas: nombre, unidad, precio_unitario, cantidad_total, categoria, etapa, tipo (obra/servicio).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-1" /> Descargar plantilla
            </Button>
            <Button size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1" /> Elegir archivo
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {parsed && (
            <div className="space-y-2 max-h-[40vh] overflow-y-auto">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>{parsed.valid.length} válidos</span>
                {parsed.errors.length > 0 && (
                  <>
                    <AlertCircle className="w-4 h-4 text-destructive ml-2" />
                    <span>{parsed.errors.length} con error</span>
                  </>
                )}
              </div>
              {parsed.errors.length > 0 && (
                <div className="text-xs space-y-1 bg-destructive/10 p-2 rounded">
                  {parsed.errors.slice(0, 10).map((e, i) => (
                    <div key={i}>Fila {e.row}: {e.message}</div>
                  ))}
                  {parsed.errors.length > 10 && <div>...y {parsed.errors.length - 10} más</div>}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!parsed || parsed.valid.length === 0 || importing}>
            {importing ? "Importando..." : `Importar ${parsed?.valid.length || 0}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

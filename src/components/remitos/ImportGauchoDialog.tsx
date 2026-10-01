import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, AlertCircle, CheckCircle, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { RemitoForm } from "@/hooks/useRemitos";
import { formatDate } from "@/lib/utils";
import {
  findMaquinariaId,
  parseDate,
  parseNumber,
  matchFromMap,
  normalizeValue,
  tipoMaterialNormalize,
  validMaterialTypes,
} from "./CSVImportDialog";

const PROVEEDOR_FIJO = "Canteras del Gaucho";

interface ImportGauchoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (remitos: RemitoForm[]) => Promise<void>;
  maquinariasMap: Record<string, string>; // codigo -> id
  patentesMap: Record<string, string>; // patente normalizada -> id
  obrasMap: Record<string, string>; // nombre normalizado -> nombre real
  obrasClienteMap: Record<string, string>; // nombre real de obra -> cliente
}

interface ParsedRow {
  data: RemitoForm;
  row: number;
  patenteInput: string;
  patenteOk: boolean;
  obraInput: string;
  obraOk: boolean;
  desdeInput: string;
  desdeOk: boolean;
  materialOk: boolean;
}

interface ParseResult {
  valid: ParsedRow[];
  errors: { row: number; message: string }[];
}

const COLUMN_ALIASES: Record<string, string[]> = {
  fecha: ["fecha", "date"],
  remito: ["remito n°", "remito nº", "remito n", "remito no", "remito", "remito numero", "remito número", "n° remito", "nro remito"],
  material: ["material", "tipo material", "tipo_material"],
  patente: ["patente", "dominio", "vehiculo", "vehículo"],
  hasta: ["hasta", "obra"],
  desde: ["desde", "origen"],
  viajes: ["viajes", "cantidad de viajes", "cant viajes", "cantidad viajes", "cant. viajes", "cant.viajes", "nº viajes", "n° viajes"],
  transporte: ["transporte", "transport", "empresa transporte"],
  m3: ["m3", "m³", "cantidad", "metros cubicos", "metros cúbicos"],
  precio: ["precio", "precio unitario", "precio uni", "precio uni."],
  importe: ["importe", "total", "precio total", "monto"],
};


function normalizeHeader(h: unknown): string {
  return String(h ?? "").trim().toLowerCase().replace(/['"]/g, "").replace(/\s+/g, " ");
}

function excelSerialToISO(serial: number): string | null {
  if (!isFinite(serial) || serial <= 0) return null;
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

function parseRows(rows: unknown[][], maps: {
  maquinariasMap: Record<string, string>;
  patentesMap: Record<string, string>;
  obrasMap: Record<string, string>;
  obrasClienteMap: Record<string, string>;
}): ParseResult {
  const valid: ParsedRow[] = [];
  const errors: { row: number; message: string }[] = [];

  // Buscar la fila de encabezados (primeras 10 filas)
  let headerIdx = -1;
  let colIndex: Record<string, number> = {};
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const headers = (rows[r] || []).map(normalizeHeader);
    const idx: Record<string, number> = {};
    for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
      const found = headers.findIndex((h) => aliases.includes(h));
      if (found !== -1) idx[key] = found;
    }
    if (idx.fecha !== undefined && (idx.m3 !== undefined || idx.material !== undefined)) {
      headerIdx = r;
      colIndex = idx;
      break;
    }
  }

  if (headerIdx === -1) {
    return {
      valid: [],
      errors: [{ row: 0, message: "No se encontraron los encabezados esperados (fecha, remito N°, material, patente, Hasta, m3, precio, importe)" }],
    };
  }

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const values = rows[i] || [];
    const raw = (key: string): string => {
      const idx = colIndex[key];
      if (idx === undefined) return "";
      const v = values[idx];
      return v === null || v === undefined ? "" : String(v).trim();
    };

    const fechaCell = colIndex.fecha !== undefined ? values[colIndex.fecha] : undefined;
    const remitoRaw = raw("remito");
    const materialRaw = raw("material");
    const patenteRaw = raw("patente");
    const hastaRaw = raw("hasta");
    const desdeRaw = raw("desde");
    const viajesRaw = raw("viajes");
    const transporteRaw = raw("transporte");
    const m3Raw = raw("m3");
    const precioRaw = raw("precio");
    const importeRaw = raw("importe");

    // Fila vacía
    if (!remitoRaw && !materialRaw && !patenteRaw && !hastaRaw && !desdeRaw && !m3Raw && !viajesRaw) continue;


    let fecha: string | null = null;
    if (typeof fechaCell === "number") {
      fecha = excelSerialToISO(fechaCell);
    } else if (fechaCell instanceof Date) {
      fecha = `${fechaCell.getFullYear()}-${String(fechaCell.getMonth() + 1).padStart(2, "0")}-${String(fechaCell.getDate()).padStart(2, "0")}`;
    } else {
      fecha = parseDate(String(fechaCell ?? "").trim());
    }
    if (!fecha) {
      errors.push({ row: i + 1, message: `Fecha inválida: ${String(fechaCell ?? "")}` });
      continue;
    }

    const { id: maquinaria_id } = patenteRaw
      ? findMaquinariaId(patenteRaw, maps.maquinariasMap, maps.patentesMap)
      : { id: undefined };

    const obraMatch = matchFromMap(hastaRaw, maps.obrasMap);
    const hasta = obraMatch.matched;
    const desdeMatch = matchFromMap(desdeRaw, maps.obrasMap);
    const desde = desdeMatch.matched;
    const cliente = obraMatch.found
      ? maps.obrasClienteMap[hasta]
      : desdeMatch.found
        ? maps.obrasClienteMap[desde]
        : undefined;


    const tipo_material = normalizeValue(materialRaw, tipoMaterialNormalize) || materialRaw || "";
    const materialOk = !materialRaw || validMaterialTypes.has(tipo_material);

    const cantidad = parseNumber(m3Raw);
    const precio_unitario = parseNumber(precioRaw);
    const importe = parseNumber(importeRaw);
    const precio_total = importe || precio_unitario * cantidad;
    const cantidad_viajes = parseNumber(viajesRaw) || 1;
    const cantidad_uni = cantidad_viajes > 0 ? cantidad / cantidad_viajes : cantidad;

    valid.push({
      data: {
        numero: remitoRaw || `CDG-${Date.now()}-${i}`,
        fecha,
        material: tipo_material,
        cantidad,
        unidad: "M3",
        recibido_por: "",
        firmado: false,
        remito_tercero: remitoRaw || undefined,
        hasta: hasta || undefined,
        desde: desde || undefined,
        cantidad_viajes,
        cantidad_uni,
        tipo_material: tipo_material || undefined,
        precio_unitario,
        precio_calc_mode: "cantidad",
        precio_total,
        tipo_transporte: transporteRaw || undefined,
        maquinaria_id: maquinaria_id || undefined,
        proveedor: PROVEEDOR_FIJO,
        cliente: cliente || undefined,
      },
      row: i + 1,
      patenteInput: patenteRaw,
      patenteOk: !!maquinaria_id,
      obraInput: hastaRaw,
      obraOk: obraMatch.found,
      desdeInput: desdeRaw,
      desdeOk: desdeMatch.found,
      materialOk,
    });

  }

  return { valid, errors };
}

export function ImportGauchoDialog({
  open,
  onOpenChange,
  onImport,
  maquinariasMap,
  patentesMap,
  obrasMap,
  obrasClienteMap,
}: ImportGauchoDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validExtensions = [".xlsx", ".xls", ".csv", ".tsv", ".txt"];
    if (!validExtensions.some((ext) => selectedFile.name.toLowerCase().endsWith(ext))) {
      toast.error("Formato no soportado. Usá Excel (.xlsx) o CSV");
      return;
    }

    try {
      const buffer = await selectedFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
      setFile(selectedFile);
      setParseResult(parseRows(rows, { maquinariasMap, patentesMap, obrasMap, obrasClienteMap }));
    } catch {
      toast.error("No se pudo leer el archivo");
    }
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.valid.length === 0) return;
    setIsImporting(true);
    try {
      await onImport(parseResult.valid.map((r) => r.data));
      toast.success(`${parseResult.valid.length} remitos importados correctamente`);
      handleClose();
    } catch {
      toast.error("Error al importar remitos");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParseResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const headers = ["fecha", "remito N°", "nombre cliente", "material", "transporte", "patente", "Hasta", "Desde", "viajes", "m3", "precio", "importe"];
    const example = ["01/08/2026", "12345", "Cliente Ejemplo", "Suelo seleccionado", "Calamina Sur", "AB629JD", "Ceamse Tristan Suarez", "Cantera Gaucho", "1", "18", "12000", "216000"];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Remitos");
    XLSX.writeFile(wb, "plantilla_canteras_del_gaucho.xlsx");
  };

  const sinPatente = parseResult?.valid.filter((r) => r.patenteInput && !r.patenteOk).length ?? 0;
  const sinObraRows = parseResult?.valid.filter((r) => (r.obraInput && !r.obraOk) || (r.desdeInput && !r.desdeOk)) ?? [];
  const sinObra = sinObraRows.length;
  const obrasNoEncontradas = Array.from(
    new Set(
      parseResult?.valid.flatMap((r) => [
        ...(r.obraInput && !r.obraOk ? [r.obraInput] : []),
        ...(r.desdeInput && !r.desdeOk ? [r.desdeInput] : []),
      ]) ?? []
    )
  );

  const materialDesconocido = parseResult?.valid.filter((r) => !r.materialOk).length ?? 0;
  const totalM3 = parseResult?.valid.reduce((s, r) => s + (r.data.cantidad || 0), 0) ?? 0;
  const totalImporte = parseResult?.valid.reduce((s, r) => s + (r.data.precio_total || 0), 0) ?? 0;
  const fijoCls = "p-2 text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle>Importar remitos Canteras del Gaucho</DialogTitle>
          <DialogDescription>
            Subí el Excel (o CSV) con las columnas: fecha, remito N°, nombre cliente, material, transporte, patente, Hasta, Desde, viajes, m3, precio, importe.
            La columna "viajes" indica la cantidad de viajes (si está vacía se asume 1). El transporte se toma de la columna "transporte" (si está vacío queda vacío). Todos se cargan con unidad M3 y proveedor Canteras del Gaucho.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col gap-4 px-6 py-4 overflow-y-auto">
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full">

            <Download className="w-4 h-4 mr-2" />
            Descargar plantilla
          </Button>

          <div
            className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors shrink-0"

            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.tsv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm">
                <FileText className="w-5 h-5 text-primary" />
                <span>{file.name}</span>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Hacé clic para seleccionar el archivo</p>
              </div>
            )}
          </div>

          {parseResult && (
            <div className="flex-1 min-h-0 flex flex-col gap-3">

              <div className="flex flex-wrap gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {parseResult.valid.length} remitos listos
                </Badge>
                {sinPatente > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                    {sinPatente} sin vehículo vinculado
                  </Badge>
                )}
                {sinObra > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                    {sinObra} sin obra vinculada
                  </Badge>
                )}
                {materialDesconocido > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                    {materialDesconocido} material no reconocido
                  </Badge>
                )}
                {parseResult.errors.length > 0 && (
                  <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {parseResult.errors.length} filas con error
                  </Badge>
                )}
              </div>

              {parseResult.errors.length > 0 && (
                <ScrollArea className="h-24 rounded border border-destructive/30 p-2">
                  {parseResult.errors.map((e, idx) => (
                    <p key={idx} className="text-xs text-destructive">
                      Fila {e.row}: {e.message}
                    </p>
                  ))}
                </ScrollArea>
              )}

              {obrasNoEncontradas.length > 0 && (
                <p className="text-xs text-amber-600">
                  Obras no encontradas: {obrasNoEncontradas.slice(0, 5).join(", ")}
                  {obrasNoEncontradas.length > 5 ? ` y ${obrasNoEncontradas.length - 5} más` : ""}
                </p>
              )}

              {parseResult.valid.length > 0 && (
                <>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {parseResult.valid.length} remitos · {totalM3.toLocaleString("es-AR")} M3 · $
                    {totalImporte.toLocaleString("es-AR")}
                  </div>
                  <div className="flex-1 min-h-[300px] rounded border border-border overflow-auto">
                    <table className="text-xs whitespace-nowrap w-full">
                      <thead className="sticky top-0 z-10 bg-muted">
                        <tr className="text-left">

                            <th className="p-2">Fecha</th>
                            <th className="p-2">Rem. Tercero</th>
                            <th className="p-2">Rem. Local</th>
                            <th className="p-2">Desde</th>
                            <th className="p-2">Hasta</th>
                            <th className="p-2">Tipo</th>
                            <th className="p-2">Transporte</th>
                            <th className="p-2">Vehículo</th>
                            <th className="p-2">Cliente</th>
                            <th className="p-2 text-right">Viajes</th>
                            <th className="p-2 text-right">C. Uni.</th>
                            <th className="p-2 text-right">C. Total</th>
                            <th className="p-2">Unidad</th>
                            <th className="p-2 text-right">P. Unit.</th>
                            <th className="p-2 text-right">P. Total</th>
                            <th className="p-2">Proveedor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parseResult.valid.map((r) => (
                            <tr key={r.row} className="border-t border-border">
                              <td className="p-2">{formatDate(r.data.fecha)}</td>
                              <td className="p-2">{r.data.remito_tercero || "-"}</td>
                              <td className="p-2 text-muted-foreground">-</td>
                              <td className={`p-2 ${r.desdeInput && !r.desdeOk ? "text-amber-600" : ""}`}>
                                {r.data.desde || r.desdeInput || "-"}
                              </td>

                              <td className={`p-2 ${r.obraInput && !r.obraOk ? "text-amber-600" : ""}`}>
                                {r.data.hasta || r.obraInput || "-"}
                              </td>
                              <td className="p-2">{r.data.tipo_material || "-"}</td>
                              <td className="p-2">{r.data.tipo_transporte || "-"}</td>
                              <td className={`p-2 ${r.patenteInput && !r.patenteOk ? "text-amber-600" : ""}`}>
                                {r.patenteInput || "-"}
                              </td>
                              <td className="p-2">{r.data.cliente || "-"}</td>
                              <td className="p-2 text-right">{r.data.cantidad_viajes}</td>
                              <td className="p-2 text-right">{r.data.cantidad_uni ? Math.round(r.data.cantidad_uni * 100) / 100 : "-"}</td>
                              <td className="p-2 text-right">{r.data.cantidad}</td>
                              <td className={fijoCls}>M3</td>
                              <td className="p-2 text-right">
                                ${(r.data.precio_unitario || 0).toLocaleString("es-AR")}
                              </td>
                              <td className="p-2 text-right">
                                ${(r.data.precio_total || 0).toLocaleString("es-AR")}
                              </td>
                              <td className={fijoCls}>{PROVEEDOR_FIJO}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border shrink-0 bg-background">
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={isImporting || !parseResult || parseResult.valid.length === 0}>
            {isImporting ? "Importando..." : `Importar ${parseResult?.valid.length ?? 0} remitos`}
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}

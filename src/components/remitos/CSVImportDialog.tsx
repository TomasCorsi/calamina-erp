import { useState, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertCircle, CheckCircle, Download, Hash, CreditCard, Type, HelpCircle, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { RemitoForm } from "@/hooks/useRemitos";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (remitos: RemitoForm[]) => Promise<void>;
  maquinariasMap: Record<string, string>; // codigo -> id
  patentesMap: Record<string, string>; // patente normalizada -> id
  obrasMap: Record<string, string>; // nombre normalizado -> nombre real
  clientesMap: Record<string, string>; // nombre normalizado -> nombre real
}

type MatchMethod = 'codigo' | 'patente' | 'no_encontrada';

interface ParsedRow {
  data: RemitoForm;
  patenteInput: string;
  matchMethod: MatchMethod;
  row: number;
}

interface ValidationWarning {
  field: string;
  value: string;
  row: number;
}

interface ParseResult {
  valid: ParsedRow[];
  errors: { row: number; message: string }[];
  warnings: ValidationWarning[];
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

export function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // Try YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Try DD/MM/YYYY or D/M/YYYY format
  const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

export function findMaquinariaId(
  value: string,
  maquinariasMap: Record<string, string>,
  patentesMap: Record<string, string>
): { id: string | undefined; method: MatchMethod } {
  if (!value) return { id: undefined, method: 'no_encontrada' };
  
  const trimmed = value.trim();
  const upperTrimmed = trimmed.toUpperCase();
  const normalized = upperTrimmed.replace(/[-\s]/g, '');
  const lowerTrimmed = trimmed.toLowerCase();
  
  // 1. Búsqueda exacta por código
  if (maquinariasMap[trimmed]) {
    return { id: maquinariasMap[trimmed], method: 'codigo' };
  }
  
  // 2. Extraer código de formato "708-TOPADOR-LIUGONG"
  const codePart = trimmed.split('-')[0]?.trim();
  if (codePart && maquinariasMap[codePart]) {
    return { id: maquinariasMap[codePart], method: 'codigo' };
  }
  
  // 3. Búsqueda exacta por patente (mayúsculas)
  if (patentesMap[upperTrimmed]) {
    return { id: patentesMap[upperTrimmed], method: 'patente' };
  }
  
  // 4. Búsqueda normalizada por patente (sin espacios/guiones)
  if (patentesMap[normalized]) {
    return { id: patentesMap[normalized], method: 'patente' };
  }
  
  // 5. Búsqueda case-insensitive en códigos
  for (const [codigo, id] of Object.entries(maquinariasMap)) {
    if (codigo.toLowerCase() === lowerTrimmed) {
      return { id, method: 'codigo' };
    }
    if (codigo.toLowerCase() === codePart?.toLowerCase()) {
      return { id, method: 'codigo' };
    }
  }
  
  // 6. Extraer patente de formato compuesto: "955-camion-ab 629 jd"
  const parts = trimmed.split('-');
  if (parts.length >= 3) {
    const patentePart = parts.slice(2).join('-').trim().toUpperCase();
    const normalizedPatentePart = patentePart.replace(/[-\s]/g, '');
    if (patentesMap[patentePart]) {
      return { id: patentesMap[patentePart], method: 'patente' };
    }
    if (patentesMap[normalizedPatentePart]) {
      return { id: patentesMap[normalizedPatentePart], method: 'patente' };
    }
  }
  
  return { id: undefined, method: 'no_encontrada' };
}

// Material type normalization
export const tipoMaterialNormalize: Record<string, string> = {
  'residuos': 'Residuos',
  'desmonte': 'Desmonte',
  'cascote': 'Cascote',
  'escombro': 'Escombro',
  'tierra': 'Tierra',
  'piedra': 'Piedra',
  'movimiento interno': 'Movimiento interno',
  'mov interno': 'Movimiento interno',
  'mov. interno': 'Movimiento interno',
  'tosca': 'Tosca',
  'cemento': 'Cemento',
  'hormigon': 'Hormigon',
  'hormigón': 'Hormigon',
  'traslado': 'Traslado',
  'cubiertas': 'Cubiertas',
  'frezado': 'Frezado',
  'cobertura de residuos': 'Cobertura de residuos',
  'cobertura de basura': 'Cobertura de residuos',
  'arena': 'Arena',
  'hormigon h30': 'Hormigon H30',
  'hormigón h30': 'Hormigon H30',
  'tierra negra': 'Tierra negra',
  'relleno': 'Relleno',
  'piedra 30/50': 'Piedra 30/50',
  'materiales varios': 'Materiales varios',
  'raices': 'Raices',
  'raíces': 'Raices',
  'traslado interno': 'Traslado interno',
  'barro': 'Barro',
  'cal vial': 'Cal Vial',
  'caños': 'Caños',
  'canios': 'Caños',
  'caños de': 'Caños',
  'suelo seleccionado': 'Suelo seleccionado',
  'suelo select.': 'Suelo seleccionado',
  'suelo select': 'Suelo seleccionado',
  'suelo': 'Suelo seleccionado',
};

// Valid material types for validation
export const validMaterialTypes = new Set(Object.values(tipoMaterialNormalize));

// Transport type normalization
const tipoTransporteNormalize: Record<string, string> = {
  'calamina sur': 'Calamina Sur',
  'calamina': 'Calamina Sur',
  'geo hermanos': 'Geo hermanos',
  'geo': 'Geo hermanos',
  'diaz neiva': 'Diaz Neiva',
  'diaz': 'Diaz Neiva',
  'japones': 'japones',
  'japonés': 'japones',
  'cato': 'Cato',
  'tatu': 'Tatu',
  'patan': 'Patan',
  'patán': 'Patan',
  'hormicret': 'Hormicret',
  'lamacol': 'Lamacol',
  'britcom': 'Britcom',
  'ramon romero gomez': 'Ramon romero gomez',
  'ramon romero': 'Ramon romero gomez',
  'duraez': 'Duraez',
  'bertone': 'BERTONE',
  'nardon': 'NARDONI',
  'nardoni': 'NARDONI',
};

// Valid transport types for validation
const validTransportTypes = new Set(Object.values(tipoTransporteNormalize));

// Unit normalization
const unidadNormalize: Record<string, string> = {
  'tn': 'TN',
  'tonelada': 'TN',
  'toneladas': 'TN',
  'kg': 'KG',
  'kilogramo': 'KG',
  'kilogramos': 'KG',
  'm3': 'M3',
  'm³': 'M3',
  'metros cubicos': 'M3',
  'm2': 'M2',
  'm²': 'M2',
  'metros cuadrados': 'M2',
  'u': 'U',
  'unidad': 'U',
  'unidades': 'U',
};

export function normalizeValue(value: string, map: Record<string, string>): string | undefined {
  if (!value) return undefined;
  const lower = value.trim().toLowerCase();
  return map[lower];
}

export function matchFromMap(value: string, map: Record<string, string>): { matched: string; found: boolean } {
  if (!value) return { matched: '', found: false };
  const lower = value.trim().toLowerCase();
  // Exact match
  if (map[lower]) return { matched: map[lower], found: true };
  // Partial match: CSV value contained in DB name or vice-versa
  for (const [key, realName] of Object.entries(map)) {
    if (key.includes(lower) || lower.includes(key)) {
      return { matched: realName, found: true };
    }
  }
  return { matched: value.trim(), found: false };
}

export function parseNumber(raw: string): number {
  if (!raw) return 0;
  // Remove currency symbols, spaces
  let cleaned = raw.replace(/[$\s]/g, '');
  if (!cleaned) return 0;
  
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  
  if (lastComma > lastDot) {
    // Format: 2.000,50 (comma is decimal)
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // Format: 2,000.50 (dot is decimal)
    cleaned = cleaned.replace(/,/g, '');
  } else {
    // Only one or neither: just replace comma with dot
    cleaned = cleaned.replace(',', '.');
  }
  
  const result = parseFloat(cleaned);
  return isNaN(result) ? 0 : result;
}

function parseCSV(
  text: string,
  maquinariasMap: Record<string, string>,
  patentesMap: Record<string, string>,
  obrasMap: Record<string, string>,
  clientesMap: Record<string, string>
): ParseResult {
  // Strip BOM character
  text = text.replace(/^\uFEFF/, '');
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    return { valid: [], errors: [{ row: 0, message: "El archivo debe tener al menos una fila de encabezados y una de datos" }], warnings: [] };
  }

  const firstLine = lines[0];
  const separator = detectSeparator(firstLine);

  const headers = firstLine.split(separator).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  
  // Map possible column names
  const columnAliases: Record<string, string[]> = {
    remito_tercero: ['remito_tercero', 'remito tercero', 'rem_tercero', 'externo', 'rem. tercero'],
    remito_local: ['remito_local', 'remito local', 'rem_local', 'local', 'interno', 'numero', 'nro', 'rem. local', 'rem. loc.', 'rem. loc'],
    fecha: ['fecha', 'date'],
    desde: ['desde', 'origen', 'from', 'de'],
    hasta: ['hasta', 'destino', 'to', 'a'],
    cantidad_viajes: ['cantidad_viajes', 'viajes', 'cant_viajes', 'trips'],
    unidad: ['unidad', 'unit', 'un'],
    cantidad_uni_col: ['cantidad uni.', 'cantidad uni', 'cant uni', 'cant. uni.', 'cant uni.'],
    cantidad_total_col: ['cantidad total', 'cant total', 'cantidad', 'cant', 'quantity', 'amount'],
    tipo_material: ['tipo_material', 'tipo', 'material', 'type'],
    precio_total: ['precio_total', 'precio total', 'precio', 'total', 'price', 'monto'],
    precio_unitario: ['precio uni.', 'precio_uni', 'precio unitario', 'precio_unitario'],
    tipo_transporte: ['tipo_transporte', 'transporte', 'transport', 'empresa'],
    patente: ['patente', 'patente local', 'maquinaria', 'maquinaria_id', 'equipo', 'dominio', 'vehiculo'],
    patente_tercero: ['patente_tercero', 'patente tercero', 'pat_tercero', 'pat tercero', 'tercero'],
    precio_calc_mode: ['calc. precio', 'calc_precio', 'precio_calc_mode', 'calc', 'modo calculo'],
    proveedor: ['proveedor', 'provider', 'supplier'],
    cliente: ['cliente', 'client', 'customer', 'cliente origen', 'cli origen', 'cli. origen'],
    cliente_destino: ['cliente_destino', 'cliente destino', 'cli destino', 'cli. destino'],
    observaciones: ['observaciones', 'descripcion', 'descripción', 'notas', 'obs'],
  };

  // Find column indices
  const colIndex: Record<string, number> = {};
  for (const [key, aliases] of Object.entries(columnAliases)) {
    for (const alias of aliases) {
      const idx = headers.indexOf(alias);
      if (idx !== -1) {
        colIndex[key] = idx;
        break;
      }
    }
  }

  const valid: ParsedRow[] = [];
  const errors: { row: number; message: string }[] = [];
  const warnings: ValidationWarning[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(separator).map(v => v.trim().replace(/['"]/g, ''));
    
    const getValue = (key: string): string => {
      const idx = colIndex[key];
      return idx !== undefined ? values[idx] || "" : "";
    };

    // Parse fecha
    const fechaRaw = getValue('fecha');
    const fecha = fechaRaw ? parseDate(fechaRaw) : new Date().toISOString().split('T')[0];

    // Parse patente/maquinaria
    const patenteValue = getValue('patente');
    const { id: maquinaria_id, method: matchMethod } = patenteValue 
      ? findMaquinariaId(patenteValue, maquinariasMap, patentesMap) 
      : { id: undefined, method: 'no_encontrada' as MatchMethod };
    
    if (patenteValue && !maquinaria_id) {
      warnings.push({ field: 'patente', value: patenteValue, row: i + 1 });
    }

    // Parse cantidad_viajes
    const viajesRaw = getValue('cantidad_viajes');
    const cantidad_viajes = viajesRaw ? parseInt(viajesRaw, 10) : 1;

    // Parse unidad
    const unidadRaw = getValue('unidad');
    const unidad = normalizeValue(unidadRaw, unidadNormalize) || unidadRaw?.toUpperCase() || 'M3';

    // Parse cantidad_uni and cantidad_total separately
    const cantidadUniRaw = getValue('cantidad_uni_col');
    const cantidadTotalRaw = getValue('cantidad_total_col');
    const cantidad_uni_parsed = cantidadUniRaw ? parseNumber(cantidadUniRaw) : 0;
    const cantidad_total_parsed = cantidadTotalRaw ? parseNumber(cantidadTotalRaw) : 0;
    const effectiveViajesCant = isNaN(cantidad_viajes) ? 1 : cantidad_viajes;

    // If CSV has cantidad_total, use it directly. Otherwise calculate from uni * viajes.
    const cantidad_uni = cantidad_uni_parsed || (cantidad_total_parsed && effectiveViajesCant > 0 
      ? cantidad_total_parsed / effectiveViajesCant : 0);
    const cantidad = cantidad_total_parsed || (cantidad_uni_parsed * effectiveViajesCant);

    // Parse tipo_material
    const tipoMaterialRaw = getValue('tipo_material');
    const tipo_material = normalizeValue(tipoMaterialRaw, tipoMaterialNormalize) || tipoMaterialRaw || '';
    
    // Warn if material type is not recognized
    if (tipoMaterialRaw && !validMaterialTypes.has(tipo_material)) {
      warnings.push({ field: 'tipo_material', value: tipoMaterialRaw, row: i + 1 });
    }
    // Parse precio_unitario
    const precioUniRaw = getValue('precio_unitario');
    const precio_unitario = precioUniRaw ? parseNumber(precioUniRaw) : 0;

    // Parse precio_calc_mode
    const calcModeRaw = getValue('precio_calc_mode');
    const precio_calc_mode = calcModeRaw?.toLowerCase().includes('cant') ? 'cantidad' : 'viajes';

    // Calculate precio_total based on calc mode
    const effectiveViajes = isNaN(cantidad_viajes) ? 1 : cantidad_viajes;
    let precio_total = precio_calc_mode === 'cantidad'
      ? precio_unitario * cantidad_uni * effectiveViajes
      : precio_unitario * effectiveViajes;

    // Fallback: if precio_unitario is 0 but precio_total column has value, use it directly
    if (precio_unitario === 0) {
      const precioTotalRaw = getValue('precio_total');
      if (precioTotalRaw) {
        const parsed = parseNumber(precioTotalRaw);
        if (!isNaN(parsed) && parsed > 0) {
          precio_total = parsed;
        }
      }
    }

    // Parse tipo_transporte
    const tipoTransporteRaw = getValue('tipo_transporte');
    const tipo_transporte = normalizeValue(tipoTransporteRaw, tipoTransporteNormalize) || tipoTransporteRaw || '';

    // Warn if transport type is not recognized
    if (tipoTransporteRaw && !validTransportTypes.has(tipo_transporte)) {
      warnings.push({ field: 'tipo_transporte', value: tipoTransporteRaw, row: i + 1 });
    }
    // Get text fields
    const remito_tercero = getValue('remito_tercero');
    const remito_local = getValue('remito_local');
    
    // Match desde/hasta against obras
    const desdeRaw = getValue('desde');
    const hastaRaw = getValue('hasta');
    const desdeMatch = matchFromMap(desdeRaw, obrasMap);
    const hastaMatch = matchFromMap(hastaRaw, obrasMap);
    const desde = desdeMatch.matched;
    const hasta = hastaMatch.matched;
    
    if (desdeRaw && !desdeMatch.found) {
      warnings.push({ field: 'obra_desde', value: desdeRaw, row: i + 1 });
    }
    if (hastaRaw && !hastaMatch.found) {
      warnings.push({ field: 'obra_hasta', value: hastaRaw, row: i + 1 });
    }
    
    // Match cliente: first try clientesMap, then try obrasMap (by numero/nombre -> resolve to obra name as client)
    const clienteRaw = getValue('cliente');
    let clienteMatch = matchFromMap(clienteRaw, clientesMap);
    if (!clienteMatch.found && clienteRaw) {
      // Fallback: try matching against obras (e.g. by numero de obra)
      const obraMatch = matchFromMap(clienteRaw, obrasMap);
      if (obraMatch.found) {
        clienteMatch = obraMatch;
      }
    }
    const cliente = clienteMatch.matched;
    
    if (clienteRaw && !clienteMatch.found) {
      warnings.push({ field: 'cliente', value: clienteRaw, row: i + 1 });
    }
    
    // Match cliente_destino
    const clienteDestinoRaw = getValue('cliente_destino');
    let clienteDestinoMatch = matchFromMap(clienteDestinoRaw, clientesMap);
    if (!clienteDestinoMatch.found && clienteDestinoRaw) {
      const obraMatch = matchFromMap(clienteDestinoRaw, obrasMap);
      if (obraMatch.found) clienteDestinoMatch = obraMatch;
    }
    const cliente_destino = clienteDestinoMatch.matched;

    const proveedor = getValue('proveedor');
    const patente_tercero = getValue('patente_tercero');
    const observaciones = getValue('observaciones');

    // Generate numero for legacy field
    const numero = remito_local || `IMP-${Date.now()}-${i}`;

    // Skip empty rows
    if (!remito_tercero && !remito_local && !desde && !hasta && cantidad === 0) {
      continue;
    }

    valid.push({
      data: {
        numero,
        fecha: fecha || new Date().toISOString().split('T')[0],
        obra_id: undefined,
        material: tipo_material,
        cantidad: isNaN(cantidad) ? 0 : cantidad,
        unidad: ['TN', 'KG', 'M3', 'M2', 'U'].includes(unidad) ? unidad : 'M3',
        recibido_por: '',
        firmado: false,
        remito_tercero: remito_tercero || undefined,
        remito_local: remito_local || undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
        cantidad_viajes: isNaN(cantidad_viajes) ? 1 : cantidad_viajes,
        cantidad_uni: isNaN(cantidad_uni) ? 0 : cantidad_uni,
        tipo_material: tipo_material || undefined,
        precio_unitario: isNaN(precio_unitario) ? 0 : precio_unitario,
        precio_calc_mode,
        precio_total: isNaN(precio_total) ? 0 : precio_total,
        tipo_transporte: tipo_transporte || undefined,
        maquinaria_id: maquinaria_id || undefined,
        patente_tercero: patente_tercero || undefined,
        observaciones: observaciones || undefined,
        proveedor: proveedor || undefined,
        cliente: cliente || undefined,
        cliente_destino: cliente_destino || undefined,
      },
      patenteInput: patenteValue,
      matchMethod: patenteValue ? matchMethod : 'no_encontrada',
      row: i + 1,
    });
  }

  return { valid, errors, warnings };
}

const matchMethodConfig: Record<MatchMethod, { label: string; icon: React.ElementType; className: string }> = {
  codigo: { 
    label: 'Código', 
    icon: Hash, 
    className: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
  },
  patente: { 
    label: 'Patente', 
    icon: CreditCard, 
    className: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30' 
  },
  no_encontrada: { 
    label: 'No encontrada', 
    icon: HelpCircle, 
    className: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30' 
  },
};

export function RemitosCSVImportDialog({ open, onOpenChange, onImport, maquinariasMap, patentesMap, obrasMap, clientesMap }: CSVImportDialogProps) {
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
    const result = parseCSV(text, maquinariasMap, patentesMap, obrasMap, clientesMap);
    setParseResult(result);
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.valid.length === 0) return;

    setIsImporting(true);
    try {
      await onImport(parseResult.valid.map(row => row.data));
      toast.success(`${parseResult.valid.length} remitos importados correctamente`);
      handleClose();
    } catch (error) {
      toast.error("Error al importar remitos");
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
    const headers = [
      "Rem. Tercero", "Rem. Local", "Fecha", "Desde", "Hasta",
      "Viajes", "Cantidad Uni.", "Cantidad total", "Unidad", "Tipo",
      "Calc. Precio", "Precio Uni.", "Precio Total",
      "Transporte", "Patente Local", "Patente Tercero", "Descripcion"
    ].join(";");
    const examples = [
      // Remito interno, transporte propio, modo viajes (precio = precio_uni * viajes)
      ["", "REM-2026-001", "26/01/2026", "Cantera San Vicente", "Obra Centro",
        "3", "10", "30", "M3", "Tosca",
        "viajes", "5000", "15000",
        "Calamina Sur", "ABC-123", "", "Carga de tosca"].join(";"),
      // Remito de tercero, modo cantidad (precio = precio_uni * cantidad_uni * viajes)
      ["00123", "REM-2026-002", "26/01/2026", "Cantera San Vicente", "Obra Norte",
        "2", "8", "16", "TN", "Piedra",
        "cantidad", "1500", "24000",
        "Geo hermanos", "", "XY-456", "Flete tercero"].join(";"),
      // Movimiento interno sin precio
      ["", "REM-2026-003", "27/01/2026", "Obra Norte", "Obra Sur",
        "1", "5", "5", "M3", "Movimiento interno",
        "viajes", "", "",
        "Calamina Sur", "ABC-123", "", ""].join(";"),
    ];
    const content = `${headers}\n${examples.join("\n")}`;
    const bom = "\uFEFF";
    const blob = new Blob([bom + content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "remitos_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Stats for match methods
  const matchStats = parseResult?.valid.reduce((acc, row) => {
    if (row.patenteInput) {
      acc[row.matchMethod] = (acc[row.matchMethod] || 0) + 1;
    }
    return acc;
  }, {} as Record<MatchMethod, number>) || {};

  // Stats for obras/clientes matching
  const obrasMatchStats = useMemo(() => {
    if (!parseResult) return { matched: 0, unmatched: 0 };
    const obraWarnings = parseResult.warnings.filter(w => w.field === 'obra_desde' || w.field === 'obra_hasta');
    const totalObraFields = parseResult.valid.filter(r => r.data.desde || r.data.hasta).length;
    return { matched: totalObraFields * 2 - obraWarnings.length, unmatched: obraWarnings.length };
  }, [parseResult]);

  const clientesMatchStats = useMemo(() => {
    if (!parseResult) return { matched: 0, unmatched: 0 };
    const clienteWarnings = parseResult.warnings.filter(w => w.field === 'cliente');
    const totalClientes = parseResult.valid.filter(r => r.data.cliente).length;
    return { matched: totalClientes - clienteWarnings.length, unmatched: clienteWarnings.length };
  }, [parseResult]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Importar Remitos</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV/TSV. La columna "patente" puede contener código o patente de maquinaria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
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
            <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
              {/* Summary Stats */}
              <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-muted/50">
                {parseResult.valid.length > 0 && (
                  <div className="flex items-center gap-2 text-base font-medium text-primary">
                    <CheckCircle className="w-5 h-5" />
                    {parseResult.valid.length} registros válidos
                  </div>
                )}
                {parseResult.errors.length > 0 && (
                  <div className="flex items-center gap-2 text-base font-medium text-muted-foreground">
                    <AlertCircle className="w-5 h-5" />
                    {parseResult.errors.length} advertencias
                  </div>
                )}
              </div>

              {/* Validation Warnings */}
              {parseResult.warnings.length > 0 && (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
                  <p className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-1">
                    ⚠️ {parseResult.warnings.length} valores no reconocidos (se importarán tal cual)
                  </p>
                  <div className="max-h-24 overflow-y-auto text-xs space-y-0.5">
                    {parseResult.warnings.slice(0, 15).map((w, idx) => (
                      <p key={idx} className="text-muted-foreground">
                        Fila {w.row}: {w.field === 'tipo_material' ? 'Material' : w.field === 'tipo_transporte' ? 'Transporte' : w.field === 'obra_desde' ? 'Obra (Desde)' : w.field === 'obra_hasta' ? 'Obra (Hasta)' : 'Cliente'} "{w.value}" no encontrado
                      </p>
                    ))}
                    {parseResult.warnings.length > 15 && (
                      <p className="text-muted-foreground">...y {parseResult.warnings.length - 15} más</p>
                    )}
                  </div>
                </div>
              )}

              {Object.keys(matchStats).length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {Object.entries(matchStats).map(([method, count]) => {
                    const config = matchMethodConfig[method as MatchMethod];
                    const Icon = config.icon;
                    return (
                      <Badge 
                        key={method} 
                        variant="outline" 
                        className={`px-3 py-1.5 text-sm font-medium ${config.className}`}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {count as number} por {config.label.toLowerCase()}
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Obras & Clientes matching stats */}
              {parseResult.valid.length > 0 && (obrasMatchStats.matched > 0 || obrasMatchStats.unmatched > 0 || clientesMatchStats.matched > 0 || clientesMatchStats.unmatched > 0) && (
                <div className="flex flex-wrap gap-3">
                  {obrasMatchStats.matched > 0 && (
                    <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      <MapPin className="w-4 h-4 mr-2" />
                      {obrasMatchStats.matched} obras detectadas
                    </Badge>
                  )}
                  {obrasMatchStats.unmatched > 0 && (
                    <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                      <MapPin className="w-4 h-4 mr-2" />
                      {obrasMatchStats.unmatched} obras no encontradas
                    </Badge>
                  )}
                  {clientesMatchStats.matched > 0 && (
                    <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      <Users className="w-4 h-4 mr-2" />
                      {clientesMatchStats.matched} clientes detectados
                    </Badge>
                  )}
                  {clientesMatchStats.unmatched > 0 && (
                    <Badge variant="outline" className="px-3 py-1.5 text-sm font-medium bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                      <Users className="w-4 h-4 mr-2" />
                      {clientesMatchStats.unmatched} clientes no encontrados
                    </Badge>
                  )}
                </div>
              )}

              {/* Preview Table */}
              {parseResult.valid.length > 0 && (
                <div className="flex-1 overflow-hidden border rounded-lg bg-background">
                  <ScrollArea className="h-[280px]">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-foreground w-14">Fila</th>
                          <th className="px-3 py-2 text-left font-semibold text-foreground">Rem. Tercero</th>
                          <th className="px-3 py-2 text-left font-semibold text-foreground">Rem. Local</th>
                          <th className="px-3 py-2 text-left font-semibold text-foreground w-24">Fecha</th>
                          <th className="px-3 py-2 text-left font-semibold text-foreground">Desde → Hasta</th>
                          <th className="px-3 py-2 text-right font-semibold text-foreground w-16">Cant.</th>
                          <th className="px-3 py-2 text-left font-semibold text-foreground">Tipo</th>
                          <th className="px-3 py-2 text-left font-semibold text-foreground">Patente</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {parseResult.valid.slice(0, 100).map((row, idx) => {
                          const config = matchMethodConfig[row.matchMethod];
                          const Icon = config.icon;
                          return (
                            <tr key={idx} className="hover:bg-muted/50 transition-colors">
                              <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{row.row}</td>
                              <td className="px-3 py-2 font-mono text-xs">{row.data.remito_tercero || '-'}</td>
                              <td className="px-3 py-2 font-mono text-xs">{row.data.remito_local || '-'}</td>
                              <td className="px-3 py-2 text-xs">{row.data.fecha}</td>
                              <td className="px-3 py-2 text-xs max-w-[150px] truncate">
                                {row.data.desde || '-'} → {row.data.hasta || '-'}
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-xs">
                                {row.data.cantidad} {row.data.unidad}
                              </td>
                              <td className="px-3 py-2 text-xs">{row.data.tipo_material || '-'}</td>
                              <td className="px-3 py-2">
                                {row.patenteInput ? (
                                  <Badge variant="outline" className={`text-xs px-1.5 py-0.5 ${config.className}`}>
                                    <Icon className="w-3 h-3 mr-1" />
                                    {row.patenteInput.substring(0, 10)}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {parseResult.valid.length > 100 && (
                          <tr>
                            <td colSpan={8} className="p-2 text-center text-muted-foreground text-xs">
                              ...y {parseResult.valid.length - 100} filas más
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </ScrollArea>
                </div>
              )}

              {/* Errors */}
              {parseResult.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="max-h-20 overflow-y-auto text-xs space-y-1 bg-muted p-2 rounded">
                    {parseResult.errors.slice(0, 10).map((err, idx) => (
                      <p key={idx} className="text-muted-foreground">
                        Fila {err.row}: {err.message}
                      </p>
                    ))}
                    {parseResult.errors.length > 10 && (
                      <p className="text-muted-foreground">
                        ...y {parseResult.errors.length - 10} advertencias más
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

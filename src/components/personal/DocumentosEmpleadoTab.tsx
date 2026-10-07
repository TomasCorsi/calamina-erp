import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload, FileText, Files, Trash2, Loader2, CheckCircle2, AlertTriangle, Download, FileSignature,
} from "lucide-react";
import { usePersonal } from "@/hooks/usePersonal";
import { useEmpleadoDocumentos, type TipoDocumento, type EmpleadoDocumento } from "@/hooks/useEmpleadoDocumentos";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

const DOCS_BUCKET = "empleado-documentos";
import { formatDate } from "@/lib/utils";
import { createExtractorFromData } from "node-unrar-js";
import {
  buildPersonalIndex,
  extractTextFromPdf,
  matchEmpleadoLocal,
  matchEmpleadoByFilename,
  runWithConcurrency,
} from "@/utils/empleadoMatcher";

const TIPO_LABEL: Record<TipoDocumento, string> = {
  estudio_medico: "Estudio médico",
  recibo_sueldo: "Recibo de sueldo",
};

const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";
const ACCEPT_BULK = "application/pdf,image/png,image/jpeg,image/webp,application/zip,application/x-zip-compressed,.zip,application/x-rar-compressed,application/vnd.rar,.rar";
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SOURCE_BYTES = 100 * 1024 * 1024; // PDF "fuente" antes de partir
const MAX_ARCHIVE_BYTES = 1024 * 1024 * 1024; // 1 GB para ZIP/RAR

const isZip = (f: File) => /\.zip$/i.test(f.name) || f.type === "application/zip" || f.type === "application/x-zip-compressed";
const isRar = (f: File) => /\.rar$/i.test(f.name) || f.type === "application/x-rar-compressed" || f.type === "application/vnd.rar";
const isPdfName = (name: string) => /\.pdf$/i.test(name);
const isImageName = (name: string) => /\.(png|jpe?g|webp)$/i.test(name);
const isIgnorable = (path: string) => {
  const base = path.split("/").pop() || "";
  return path.includes("__MACOSX/") || base.startsWith(".");
};
const stripChunkSuffix = (name: string) => {
  const base = (name.split(/[\\/]/).pop() || name)
    .replace(/\s*\(\d+\s*-\s*\d+\)\.pdf$/i, "")
    .replace(/\.[^.]+$/i, "")
    .trim();
  return base || name;
};
const normalizeGroupKey = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

async function extractZip(file: File): Promise<File[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);
  const out: File[] = [];
  const entries = Object.values(zip.files).filter((e) => !e.dir && !isIgnorable(e.name) && (isPdfName(e.name) || isImageName(e.name)));
  for (const entry of entries) {
    const blob = await entry.async("blob");
    const type = isPdfName(entry.name) ? "application/pdf" : blob.type || "application/octet-stream";
    out.push(new File([blob], entry.name.replace(/\//g, " - "), { type }));
  }
  return out;
}

let _rarWasmBinaryPromise: Promise<ArrayBuffer> | null = null;
async function getRarWasmBinary(): Promise<ArrayBuffer> {
  if (!_rarWasmBinaryPromise) {
    _rarWasmBinaryPromise = (async () => {
      const wasmUrl = "/wasm/unrar.wasm";
      const res = await fetch(wasmUrl);
      if (!res.ok) throw new Error(`No se pudo cargar unrar.wasm (${res.status})`);
      return await res.arrayBuffer();
    })().catch((e) => {
      _rarWasmBinaryPromise = null;
      throw e;
    });
  }
  return _rarWasmBinaryPromise;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Tiempo agotado al ${label} (${Math.round(ms / 1000)}s)`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function extractRar(file: File): Promise<File[]> {
  let wasmBinary: ArrayBuffer;
  try {
    wasmBinary = await getRarWasmBinary();
  } catch (e: any) {
    console.error("[extractRar] WASM load error", e);
    throw new Error(`No se pudo cargar el módulo RAR (${e?.message || e}). Recargá la app o probá con ZIP.`);
  }
  const data = await file.arrayBuffer();
  const extractor = await createExtractorFromData({ wasmBinary, data });

  // Extraemos TODO y filtramos después (más confiable que pasar `files: fn`).
  const result = extractor.extract({});
  const out: File[] = [];
  const stats = {
    total: 0,
    directorios: 0,
    ignoradas: 0,
    otras: 0,
    pdfs: 0,
    imagenes: 0,
    sinExtraccion: 0,
    cifradas: 0,
    nombres: [] as string[],
  };

  try {
    for (const f of result.files) {
      stats.total++;
      const name = f.fileHeader?.name || "";
      if (stats.nombres.length < 20) stats.nombres.push(name);
      if (f.fileHeader?.flags?.directory) { stats.directorios++; continue; }
      if (isIgnorable(name)) { stats.ignoradas++; continue; }
      const isPdf = isPdfName(name);
      const isImg = isImageName(name);
      if (!isPdf && !isImg) { stats.otras++; continue; }
      if (!f.extraction) {
        stats.sinExtraccion++;
        if (f.fileHeader?.flags?.encrypted) stats.cifradas++;
        continue;
      }
      const ext = (name.split(".").pop() || "").toLowerCase().replace("jpg", "jpeg");
      const type = isPdf ? "application/pdf" : `image/${ext}`;
      const buf = f.extraction.slice().buffer;
      out.push(new File([buf], name.replace(/[\\/]/g, " - "), { type }));
      if (isPdf) stats.pdfs++; else stats.imagenes++;
    }
  } catch (iterErr: any) {
    console.error("[extractRar] error iterando entradas", iterErr, stats);
    if (out.length === 0) {
      throw new Error(`Formato RAR no soportado o archivo dañado (${iterErr?.message || iterErr})`);
    }
  }

  console.info("[extractRar]", file.name, stats);

  if (out.length === 0) {
    if (stats.cifradas > 0) {
      throw new Error("El RAR está protegido con contraseña.");
    }
    if (stats.total === 0) {
      throw new Error("El RAR está vacío o el formato no es soportado (probá guardarlo como RAR4 o ZIP).");
    }
    if (stats.pdfs === 0 && stats.imagenes === 0 && stats.sinExtraccion === 0) {
      throw new Error(`El RAR no contiene PDFs ni imágenes (${stats.total} entradas, ${stats.otras} de otros tipos).`);
    }
    if (stats.sinExtraccion > 0) {
      throw new Error(`No se pudo extraer ningún archivo (${stats.sinExtraccion} entradas fallaron). Puede ser RAR sólido/dañado, probá con ZIP.`);
    }
    throw new Error("No se obtuvieron archivos del RAR.");
  }
  return out;
}

const getErrorMessage = (e: unknown, fallback: string) => e instanceof Error ? e.message : fallback;

interface MatchRow {
  file: File;
  detected: any;
  personal_id: string | null;
  confidence: "alta" | "media" | "baja" | "sin_match";
  error?: string;
  uploadError?: string;
  selected: boolean;
}

export function DocumentosEmpleadoTab() {
  const { personal } = usePersonal();
  const { membership } = useAuth();
  const companyId = membership?.company_id;
  const [filterTipo, setFilterTipo] = useState<"all" | TipoDocumento>("all");
  const [filterPersonal, setFilterPersonal] = useState<string>("");
  const [filterEstado, setFilterEstado] = useState<"all" | "pendiente" | "visto" | "firmado">("all");
  const qc = useQueryClient();

  const { documentos, isLoading, uploadOne, isUploading, remove, getDownloadUrl } =
    useEmpleadoDocumentos({
      personalId: filterPersonal || undefined,
      tipo: filterTipo === "all" ? undefined : filterTipo,
    });

  const personalOptions = useMemo(
    () =>
      personal
        .filter((p) => p.activo)
        .map((p) => ({
          value: p.id,
          label: `${p.apellido || ""} ${p.nombre || ""}`.trim(),
          searchValue: `${p.apellido || ""} ${p.nombre || ""} ${p.dni || ""} ${p.legajo || ""}`,
        })),
    [personal]
  );

  const filtered = useMemo(() => {
    return documentos.filter((d) => {
      if (filterEstado === "pendiente" && d.visto_at) return false;
      if (filterEstado === "visto" && (!d.visto_at || (d.tipo === "recibo_sueldo" && d.firmado_at))) return false;
      if (filterEstado === "firmado" && !d.firmado_at) return false;
      return true;
    });
  }, [documentos, filterEstado]);

  // ---------- Subir individual ----------
  const [openInd, setOpenInd] = useState(false);
  const [indPersonal, setIndPersonal] = useState("");
  const [indTipo, setIndTipo] = useState<TipoDocumento>("recibo_sueldo");
  const [indTitulo, setIndTitulo] = useState("");
  const [indPeriodo, setIndPeriodo] = useState("");
  const [indFile, setIndFile] = useState<File | null>(null);

  const handleIndividual = async () => {
    if (!indPersonal || !indFile || !indTitulo) {
      toast.error("Completá empleado, título y archivo");
      return;
    }
    if (indFile.size > MAX_BYTES) {
      toast.error("Archivo supera 10 MB");
      return;
    }
    await uploadOne({
      personal_id: indPersonal,
      tipo: indTipo,
      titulo: indTitulo,
      periodo: indPeriodo,
      file: indFile,
    });
    setOpenInd(false);
    setIndPersonal(""); setIndTitulo(""); setIndPeriodo(""); setIndFile(null);
  };

  // ---------- Carga masiva ----------
  const [openMas, setOpenMas] = useState(false);
  const [masTipo, setMasTipo] = useState<TipoDocumento>("recibo_sueldo");
  const [masPeriodo, setMasPeriodo] = useState("");
  const [masFiles, setMasFiles] = useState<File[]>([]); // archivos fuente (sin partir)
  const [pagesPerDoc, setPagesPerDoc] = useState<number>(2);
  const [autoSplit, setAutoSplit] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzePhase, setAnalyzePhase] = useState<"extract" | "local" | null>(null);
  const [analyzeProgress, setAnalyzeProgress] = useState<{ done: number; total: number } | null>(null);
  const [items, setItems] = useState<MatchRow[]>([]);

  // Extrae rango "(1-16)" del nombre del chunk si existe
  const extractPageRange = (name: string): string | null => {
    const m = name.match(/\((\d+)\s*-\s*(\d+)\)\.pdf$/i);
    return m ? `${m[1]}-${m[2]}` : null;
  };
  const sourceBaseOf = (name: string): string =>
    name.replace(/\s*\(\d+\s*-\s*\d+\)\.pdf$/i, "").replace(/\.pdf$/i, "").trim();
  const groupPageRange = (files: File[]): string | null => {
    const nums: number[] = [];
    for (const f of files) {
      const r = extractPageRange(f.name);
      if (!r) continue;
      r.split("-").forEach((n) => { const v = parseInt(n, 10); if (!isNaN(v)) nums.push(v); });
    }
    if (nums.length === 0) return null;
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    return min === max ? `${min}` : `${min}-${max}`;
  };

  // Consolidación visual: una fila por documento detectado. Chunks del mismo PDF se unen,
  // pero nunca se fusionan documentos distintos solo por tener el mismo empleado.
  type GroupedRow = {
    key: string;
    itemIdx: number[];
    files: File[];
    detected: any;
    personal_id: string | null;
    confidence: MatchRow["confidence"];
    error?: string;
    uploadError?: string;
    selected: boolean;
  };
  const rows: GroupedRow[] = useMemo(() => {
    const out: GroupedRow[] = [];
    if (autoSplit) {
      // Auto: agrupar páginas CONSECUTIVAS del MISMO PDF fuente y MISMO empleado.
      // Páginas sin asignar quedan como fila propia para asignación manual.
      let cur: (GroupedRow & { _sourceBase?: string }) | null = null;
      items.forEach((it, idx) => {
        const base = sourceBaseOf(it.file.name);
        const canMerge =
          !!cur &&
          !!it.personal_id &&
          cur._sourceBase === base &&
          cur.personal_id === it.personal_id;
        if (canMerge && cur) {
          cur.itemIdx.push(idx);
          cur.files.push(it.file);
          // Mantener la mejor confianza/detected del grupo
          if (it.detected && !cur.detected) cur.detected = it.detected;
          cur.selected = cur.selected && it.selected;
        } else {
          cur = {
            key: `g-${idx}`,
            itemIdx: [idx],
            files: [it.file],
            detected: it.detected,
            personal_id: it.personal_id,
            confidence: it.confidence,
            error: it.error,
            uploadError: it.uploadError,
            selected: it.selected,
            _sourceBase: base,
          };
          out.push(cur);
        }
      });
    } else {
      items.forEach((it, idx) => {
        out.push({
          key: `doc-${idx}`,
          itemIdx: [idx],
          files: [it.file],
          detected: it.detected,
          personal_id: it.personal_id,
          confidence: it.confidence,
          error: it.error,
          uploadError: it.uploadError,
          selected: it.selected,
        });
      });
    }
    // Filas sin asignar primero, para que se vean sin scrollear
    out.sort((a, b) => {
      const aSin = a.personal_id ? 1 : 0;
      const bSin = b.personal_id ? 1 : 0;
      return aSin - bSin;
    });
    return out;
  }, [items, autoSplit]);
  const sinAsignarCount = useMemo(() => rows.filter((r) => !r.personal_id).length, [rows]);
  const selectedAssignedCount = useMemo(() => rows.filter((r) => r.selected && r.personal_id).length, [rows]);
  const duplicatePidKeys = useMemo(() => {
    const counts = new Map<string, number>();
    rows.forEach((r) => {
      if (r.personal_id) counts.set(r.personal_id, (counts.get(r.personal_id) || 0) + 1);
    });
    return new Set(rows.filter((r) => r.personal_id && (counts.get(r.personal_id) || 0) > 1).map((r) => r.key));
  }, [rows]);
  const duplicatePidCount = duplicatePidKeys.size;
  const [confirmSkipOpen, setConfirmSkipOpen] = useState(false);
  const [confirmDupOpen, setConfirmDupOpen] = useState(false);
  const [savingBulk, setSavingBulk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePickMas = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter((f) => {
      const archive = isZip(f) || isRar(f);
      const limit = archive ? MAX_ARCHIVE_BYTES : MAX_SOURCE_BYTES;
      if (f.size > limit) {
        toast.error(`"${f.name}" supera ${archive ? "1 GB" : "100 MB"}`);
        return false;
      }
      return true;
    });
    setMasFiles(arr);
    setItems([]);
  };

  // Expande ZIP/RAR en los PDFs/imágenes internos. Resto pasa tal cual.
  const expandArchives = async (files: File[]): Promise<File[]> => {
    const out: File[] = [];
    const archives = files.filter((f) => isZip(f) || isRar(f));
    if (archives.length > 0) {
      setAnalyzePhase("extract");
      setAnalyzeProgress({ done: 0, total: archives.length });
    }
    let extractedCount = 0;
    for (const f of files) {
      if (isZip(f)) {
        try {
          const inner = await extractZip(f);
          if (inner.length === 0) toast.warning(`"${f.name}" no contenía PDFs`);
          out.push(...inner);
        } catch (e: any) {
          toast.error(`No se pudo abrir ZIP "${f.name}": ${e?.message || e}`);
        }
        extractedCount++;
        setAnalyzeProgress({ done: extractedCount, total: archives.length });
      } else if (isRar(f)) {
        try {
          toast.info(`Extrayendo RAR grande "${f.name}". Puede tardar varios minutos.`);
          const inner = await withTimeout(extractRar(f), 300_000, `extraer "${f.name}"`);
          if (inner.length === 0) toast.warning(`"${f.name}" no contenía PDFs`);
          out.push(...inner);
        } catch (e: any) {
          console.error("[extractRar]", f.name, e);
          toast.error(`No se pudo abrir RAR "${f.name}": ${e?.message || e}. Probá subiéndolo como ZIP.`);
        }
        extractedCount++;
        setAnalyzeProgress({ done: extractedCount, total: archives.length });
      } else {
        out.push(f);
      }
    }
    return out;
  };



  // Particiona PDFs en chunks de N páginas. Imágenes pasan tal cual.
  // Importante: pages=1 significa "una hoja por archivo", NO "dejar PDF entero".
  const splitFiles = async (files: File[], pages: number): Promise<File[]> => {
    if (pages < 1) pages = 1;
    const { PDFDocument, ParseSpeeds } = await import("pdf-lib");
    const loadTolerant = async (bytes: Uint8Array) => {
      try {
        return await PDFDocument.load(bytes, {
          ignoreEncryption: true,
          throwOnInvalidObject: false,
          updateMetadata: false,
          parseSpeed: ParseSpeeds.Fastest,
        });
      } catch {
        return await PDFDocument.load(bytes, {
          ignoreEncryption: true,
          throwOnInvalidObject: false,
          updateMetadata: false,
          parseSpeed: ParseSpeeds.Fastest,
          capNumbers: true,
        });
      }
    };
    const out: File[] = [];
    for (const f of files) {
      if (!f.type.includes("pdf")) {
        if (f.size > MAX_BYTES) {
          toast.error(`"${f.name}" supera 10 MB`);
          continue;
        }
        out.push(f);
        continue;
      }
      try {
        const bytes = new Uint8Array(await f.arrayBuffer());
        const src = await loadTolerant(bytes);
        const total = src.getPageCount();
        const base = f.name.replace(/\.pdf$/i, "");
        if (total <= 1 && f.size <= MAX_BYTES) {
          out.push(new File([bytes], `${base} (1-1).pdf`, { type: "application/pdf" }));
          continue;
        }
        for (let start = 0; start < total; start += pages) {
          const end = Math.min(start + pages, total);
          try {
            const sub = await PDFDocument.create();
            const copied = await sub.copyPages(src, Array.from({ length: end - start }, (_, k) => start + k));
            copied.forEach((p) => sub.addPage(p));
            const u8 = await sub.save();
            const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
            const chunk = new File([ab], `${base} (${start + 1}-${end}).pdf`, { type: "application/pdf" });
            if (chunk.size > MAX_BYTES) {
              toast.error(`Chunk "${chunk.name}" supera 10 MB`);
              continue;
            }
            out.push(chunk);
          } catch (e: any) {
            // Páginas específicas con error: intentar partir página por página dentro del rango
            for (let p = start; p < end; p++) {
              try {
                const sub = await PDFDocument.create();
                const [copied] = await sub.copyPages(src, [p]);
                sub.addPage(copied);
                const u8 = await sub.save();
                const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
                const chunk = new File([ab], `${base} (${p + 1}-${p + 1}).pdf`, { type: "application/pdf" });
                if (chunk.size > MAX_BYTES) continue;
                out.push(chunk);
              } catch {
                // página dañada: la salteamos
              }
            }
          }
        }
      } catch (e: any) {
        if (f.size <= MAX_BYTES) {
          toast.warning(`No se pudo partir "${f.name}", se procesa entero`);
          out.push(f);
        } else {
          toast.error(`"${f.name}" no se pudo partir y supera 10 MB. Reducí el archivo y volvé a intentar.`);
        }
      }
    }
    return out;
  };

  const analyze = async () => {
    if (masFiles.length === 0) return;
    setAnalyzing(true);
    setAnalyzePhase(null);
    setAnalyzeProgress(null);
    try {
      const expanded = await expandArchives(masFiles);
      if (expanded.length === 0) {
        toast.error("No quedaron archivos para analizar");
        return;
      }
      const chunks = await splitFiles(expanded, autoSplit ? 1 : pagesPerDoc);
      if (chunks.length === 0) {
        toast.error("No quedaron archivos para analizar");
        return;
      }
      if (chunks.length > 500) {
        toast.error(`Demasiados documentos (${chunks.length}). Subí en tandas más chicas.`);
        return;
      }

      const personalActivo = personal.filter((p) => p.activo);
      const personalIndex = buildPersonalIndex(personalActivo);

      // ---------- FASE 1: matching local con pdfjs ----------
      setAnalyzePhase("local");
      setAnalyzeProgress({ done: 0, total: chunks.length });

      const localResults = await runWithConcurrency(
        chunks,
        8,
        async (f) => {
          // Las imágenes se vinculan por nombre; los casos ambiguos quedan para asignación manual.
          if (!f.type.includes("pdf")) {
            const byName = matchEmpleadoByFilename(f.name, personalIndex);
            if (byName.personal_id) return { needsAi: false, match: byName };
            return { needsAi: true, match: null as any };
          }
          let textMatch: ReturnType<typeof matchEmpleadoLocal> | null = null;
          try {
            const text = await extractTextFromPdf(f);
            textMatch = matchEmpleadoLocal(text, personalIndex);
            if (textMatch.personal_id) {
              return { needsAi: false, match: textMatch };
            }
          } catch {
            // pdfjs falló (PDF dañado o sin texto) → seguimos con filename
          }
          // Fallback: matching por nombre de archivo
          const byName = matchEmpleadoByFilename(f.name, personalIndex);
          if (byName.personal_id) {
            return { needsAi: false, match: byName };
          }
          // Si el texto trajo algo detectado (CUIT/DNI que no matcheó), lo mantenemos
          if (textMatch && textMatch.detected) {
            return { needsAi: false, match: textMatch };
          }
          return { needsAi: true, match: null as any };
        },
        (done, total) => setAnalyzeProgress({ done, total })
      );

      const collected: MatchRow[] = chunks.map((f, i) => {
        const r = localResults[i];
        if (r && r.match) {
          return {
            file: f,
            detected: r.match.detected,
            personal_id: r.match.personal_id,
            confidence: r.match.confidence,
            selected: !!r.match.personal_id,
          };
        }
        return {
          file: f,
          detected: null,
          personal_id: null,
          confidence: "sin_match",
          selected: false,
        };
      });
      setItems([...collected]);

      const matched = collected.filter((r) => r.personal_id).length;
      const sinAsignar = collected.length - matched;
      if (sinAsignar > 0) {
        toast.warning(
          `Analizados ${collected.length} · ${matched} con match · ${sinAsignar} sin asignar`,
          { description: "Asignalos manualmente antes de confirmar o se descartan." }
        );
      } else {
        toast.success(`Analizados ${collected.length} documentos · ${matched} con match`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Error al analizar");
    } finally {
      setAnalyzing(false);
      setAnalyzePhase(null);
    }
  };

  const confirmBulk = async () => {
    // Permitir reintentar fallidos: si hay errores previos, reintentar solo esos
    const hasPrevErrors = rows.some((r) => r.uploadError);
    const ok = rows.filter((r) =>
      r.selected && r.personal_id && (!hasPrevErrors || r.uploadError)
    );
    if (ok.length === 0) {
      toast.error("No hay filas asignadas para subir");
      return;
    }
    setSavingBulk(true);
    // Limpiar errores de las filas que vamos a reintentar
    setItems((prev) => prev.map((x, j) =>
      ok.some((g) => g.itemIdx.includes(j)) ? { ...x, uploadError: undefined } : x
    ));

    const { PDFDocument } = await import("pdf-lib");
    const titulo = masPeriodo
      ? `${TIPO_LABEL[masTipo]} - ${masPeriodo}`
      : TIPO_LABEL[masTipo];

    let uploadedRows = 0;
    let failedRows = 0;

    const markGroupError = (group: GroupedRow, message: string) => {
      setItems((prev) => prev.map((x, j) => group.itemIdx.includes(j) ? { ...x, uploadError: message } : x));
    };

    // Upload directo a Storage + insert, sin pasar por la mutation (evita spam de toasts y cuellos).
    const uploadDirect = async (pid: string, file: File) => {
      if (!companyId) throw new Error("No hay empresa activa");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${companyId}/${pid}/${masTipo}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(DOCS_BUCKET).upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: { user } } = await supabase.auth.getUser();
      const { error: insErr } = await supabase.from("empleado_documentos").insert({
        company_id: companyId,
        personal_id: pid,
        tipo: masTipo,
        titulo,
        periodo: masPeriodo || null,
        descripcion: null,
        storage_path: path,
        mime_type: file.type || null,
        tamano_bytes: file.size,
        nombre_original: file.name,
        uploaded_by: user?.id ?? null,
      });
      if (insErr) {
        await supabase.storage.from(DOCS_BUCKET).remove([path]).catch(() => {});
        throw insErr;
      }
    };

    const isTransient = (e: unknown) => {
      const msg = (e instanceof Error ? e.message : String(e || "")).toLowerCase();
      return /network|fetch|timeout|temporar|rate|429|5\d\d|abort|socket/.test(msg);
    };

    const uploadWithRetry = async (pid: string, file: File) => {
      let lastErr: unknown;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await uploadDirect(pid, file);
          return;
        } catch (e) {
          lastErr = e;
          console.error("[confirmBulk] upload failed", { pid, file: file.name, attempt, error: e });
          if (attempt === 3 || !isTransient(e)) break;
          await new Promise((res) => setTimeout(res, 600 * attempt + Math.random() * 400));
        }
      }
      throw lastErr;
    };

    const processGroup = async (group: GroupedRow) => {
      const pid = group.personal_id!;
      const files = group.files;
      try {
        const allPdf = files.every((f) => f.type.includes("pdf"));

        if (files.length === 1 || !allPdf) {
          for (const f of files) await uploadWithRetry(pid, f);
          uploadedRows++;
          return;
        }

        // Merge de chunks PDF
        let fileToUpload: File | null = null;
        try {
          const merged = await PDFDocument.create();
          for (const f of files) {
            const bytes = new Uint8Array(await f.arrayBuffer());
            const src = await PDFDocument.load(bytes, { ignoreEncryption: true, throwOnInvalidObject: false, updateMetadata: false });
            const copied = await merged.copyPages(src, src.getPageIndices());
            copied.forEach((p) => merged.addPage(p));
          }
          const u8 = await merged.save();
          const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
          const baseName = files[0].name
            .replace(/\s*\(\d+-\d+\)\.pdf$/i, "")
            .replace(/\.pdf$/i, "");
          fileToUpload = new File([ab], `${baseName}.pdf`, { type: "application/pdf" });

          if (fileToUpload.size > MAX_BYTES) {
            for (const f of files) await uploadWithRetry(pid, f);
            uploadedRows++;
            return;
          }
        } catch (e) {
          console.warn("[confirmBulk] merge fallido, subiendo chunks", e);
          for (const f of files) await uploadWithRetry(pid, f);
          uploadedRows++;
          return;
        }

        if (!fileToUpload) throw new Error("No se pudo preparar el PDF");
        await uploadWithRetry(pid, fileToUpload);
        uploadedRows++;
      } catch (e) {
        failedRows++;
        markGroupError(group, getErrorMessage(e, "Error al subir"));
      }
    };

    // Concurrencia controlada
    await runWithConcurrency(ok, 3, processGroup);

    qc.invalidateQueries({ queryKey: ["empleado_documentos"] });
    qc.invalidateQueries({ queryKey: ["mis_documentos"] });

    setSavingBulk(false);
    if (failedRows === 0) {
      toast.success(`Subidos ${uploadedRows} documentos`);
      setOpenMas(false);
      setMasFiles([]); setItems([]); setMasPeriodo("");
    } else {
      toast.warning(`Subidos ${uploadedRows} de ${ok.length}. Fallaron ${failedRows}.`, {
        description: "Las filas en rojo quedaron marcadas. Tocá 'Reintentar fallidos' para volver a intentar.",
      });
    }
  };


  const [toDelete, setToDelete] = useState<EmpleadoDocumento | null>(null);

  const handleDownload = async (doc: EmpleadoDocumento) => {
    try {
      const url = await getDownloadUrl(doc);
      window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e?.message || "Error al obtener archivo");
    }
  };

  const estadoBadge = (d: EmpleadoDocumento) => {
    if (d.tipo === "recibo_sueldo" && d.firmado_at) {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30"><FileSignature className="w-3 h-3 mr-1" />Firmado</Badge>;
    }
    if (d.visto_at) {
      return <Badge variant="outline" className="text-blue-500"><CheckCircle2 className="w-3 h-3 mr-1" />Visto</Badge>;
    }
    return <Badge variant="outline" className="text-amber-500">Pendiente</Badge>;
  };

  const confBadge = (c: MatchRow["confidence"]) => {
    const map: Record<MatchRow["confidence"], string> = {
      alta: "bg-green-500/20 text-green-500 border-green-500/30",
      media: "bg-blue-500/20 text-blue-500 border-blue-500/30",
      baja: "bg-amber-500/20 text-amber-500 border-amber-500/30",
      sin_match: "bg-red-500/20 text-red-500 border-red-500/30",
    };
    return <Badge variant="outline" className={map[c]}>{c.replace("_", " ")}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end justify-between">
        <div className="flex flex-col md:flex-row gap-3 flex-1">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Empleado</Label>
            <Combobox
              options={[{ value: "", label: "Todos" }, ...personalOptions]}
              value={filterPersonal}
              onValueChange={setFilterPersonal}
              placeholder="Todos"
            />
          </div>
          <div className="w-44">
            <Label className="text-xs">Tipo</Label>
            <Select value={filterTipo} onValueChange={(v: any) => setFilterTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="estudio_medico">Estudio médico</SelectItem>
                <SelectItem value="recibo_sueldo">Recibo de sueldo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-44">
            <Label className="text-xs">Estado</Label>
            <Select value={filterEstado} onValueChange={(v: any) => setFilterEstado(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="visto">Visto</SelectItem>
                <SelectItem value="firmado">Firmado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpenInd(true)}>
            <Upload className="w-4 h-4 mr-2" /> Subir individual
          </Button>
          <Button onClick={() => setOpenMas(true)}>
            <Files className="w-4 h-4 mr-2" /> Carga masiva
          </Button>
        </div>
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empleado</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Subido</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline" /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin documentos</TableCell></TableRow>
            ) : (
              filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.personal ? `${d.personal.apellido} ${d.personal.nombre}` : "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{TIPO_LABEL[d.tipo]}</Badge></TableCell>
                  <TableCell className="max-w-[240px] truncate">{d.titulo}</TableCell>
                  <TableCell>{d.periodo || "—"}</TableCell>
                  <TableCell>{formatDate(d.created_at)}</TableCell>
                  <TableCell>{estadoBadge(d)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => handleDownload(d)}><Download className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setToDelete(d)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Subir individual */}
      <Dialog open={openInd} onOpenChange={setOpenInd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Subir documento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Empleado</Label>
              <Combobox options={personalOptions} value={indPersonal} onValueChange={setIndPersonal} placeholder="Elegir empleado" />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={indTipo} onValueChange={(v: any) => setIndTipo(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="recibo_sueldo">Recibo de sueldo</SelectItem>
                  <SelectItem value="estudio_medico">Estudio médico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Título</Label>
              <Input value={indTitulo} onChange={(e) => setIndTitulo(e.target.value)} placeholder="Ej: Recibo Junio 2026" />
            </div>
            <div>
              <Label className="text-xs">Período (opcional)</Label>
              <Input value={indPeriodo} onChange={(e) => setIndPeriodo(e.target.value)} placeholder="Ej: Junio 2026" />
            </div>
            <div>
              <Label className="text-xs">Archivo (PDF/imagen, máx 10 MB)</Label>
              <Input type="file" accept={ACCEPT} onChange={(e) => setIndFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenInd(false)}>Cancelar</Button>
            <Button onClick={handleIndividual} disabled={isUploading}>
              {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Subir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Carga masiva */}
      <Dialog open={openMas} onOpenChange={setOpenMas}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Carga masiva con auto-asignación</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select
                  value={masTipo}
                  onValueChange={(v: any) => {
                    setMasTipo(v);
                    setAutoSplit(true);
                    setPagesPerDoc(v === "recibo_sueldo" ? 2 : 1);
                    setItems([]);
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recibo_sueldo">Recibo de sueldo</SelectItem>
                    <SelectItem value="estudio_medico">Estudio médico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Período (opcional)</Label>
                <Input value={masPeriodo} onChange={(e) => setMasPeriodo(e.target.value)} placeholder="Ej: Junio 2026" />
              </div>
              <div>
                <Label className="text-xs">División de páginas</Label>
                <Select
                  value={autoSplit ? "auto" : "manual"}
                  onValueChange={(v) => setAutoSplit(v === "auto")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automática (recomendado)</SelectItem>
                    <SelectItem value="manual">Fijo: N páginas</SelectItem>
                  </SelectContent>
                </Select>
                {!autoSplit && (
                  <Input
                    className="mt-2"
                    type="number"
                    min={1}
                    max={50}
                    value={pagesPerDoc}
                    onChange={(e) => setPagesPerDoc(Math.max(1, Number(e.target.value) || 1))}
                  />
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {autoSplit
                    ? "Analiza cada página y agrupa las consecutivas del mismo empleado."
                    : "Parte el PDF cada N páginas, sin importar el contenido."}
                </p>
              </div>
            </div>

            <div>
              <Label className="text-xs">Archivos (PDF unificado, varios sueltos, o ZIP/RAR con PDFs · máx 100 MB c/u)</Label>
              <Input ref={fileInputRef} type="file" accept={ACCEPT_BULK} multiple onChange={(e) => handlePickMas(e.target.files)} />
              {masFiles.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {masFiles.length} archivo(s) fuente seleccionado(s)
                  {autoSplit
                    ? " · se analiza página por página y se agrupa por empleado"
                    : pagesPerDoc > 1 ? ` · se parten cada ${pagesPerDoc} páginas` : ""}
                </p>
              )}
            </div>

            <Button onClick={analyze} disabled={masFiles.length === 0 || analyzing} className="w-full">
              {analyzing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <FileText className="w-4 h-4 mr-2" />
              {analyzing && analyzeProgress
                ? analyzePhase === "extract"
                  ? `Extrayendo comprimidos ${analyzeProgress.done}/${analyzeProgress.total}...`
                  : `Leyendo PDFs localmente ${analyzeProgress.done}/${analyzeProgress.total}...`
                : "Analizar y detectar empleado"}
            </Button>



            {rows.length > 0 && sinAsignarCount > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <strong>{sinAsignarCount} de {rows.length}</strong> documento(s) sin empleado asignado.
                  Asignalos manualmente con el selector "Asignar..." o se van a descartar al confirmar.
                </div>
              </div>
            )}

            {rows.length > 0 && duplicatePidCount > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg border border-orange-500/40 bg-orange-500/10 text-xs">
                <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                <div>
                  Hay <strong>{duplicatePidCount}</strong> documento(s) asignados a empleados repetidos.
                  Revisá que cada estudio corresponda al empleado correcto antes de subir.
                </div>
              </div>
            )}

            {rows.length > 0 && (
              <div className="border border-border rounded-lg max-h-[40vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Archivo</TableHead>
                      <TableHead>Detectado</TableHead>
                      <TableHead>Empleado asignado</TableHead>
                      <TableHead>Confianza</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow
                        key={r.key}
                        className={r.uploadError ? "bg-red-500/10 hover:bg-red-500/15" : !r.personal_id ? "bg-amber-500/10 hover:bg-amber-500/15" : undefined}
                      >
                        <TableCell>
                          <input type="checkbox" checked={r.selected} onChange={(e) => {
                            const checked = e.target.checked;
                            setItems((prev) => prev.map((x, j) => r.itemIdx.includes(j) ? { ...x, selected: checked } : x));
                          }} />
                        </TableCell>
                        <TableCell className="max-w-[220px] text-xs">
                          <div className="truncate">{sourceBaseOf(r.files[0].name) || r.files[0].name}</div>
                          {groupPageRange(r.files) && (
                            <div className="text-[10px] text-muted-foreground">
                              Páginas {groupPageRange(r.files)}
                              {r.files.length > 1 ? ` · ${r.files.length} hojas` : ""}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.uploadError ? <span className="text-destructive"><AlertTriangle className="w-3 h-3 inline" /> {r.uploadError}</span> :
                            r.error ? <span className="text-destructive"><AlertTriangle className="w-3 h-3 inline" /> {r.error}</span> :
                            r.detected ? (
                              <div>
                                {r.detected.apellido} {r.detected.nombre}
                                {r.detected.dni && <div className="text-muted-foreground">DNI: {r.detected.dni}</div>}
                              </div>
                            ) : "—"}
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          <Combobox
                            options={personalOptions}
                            value={r.personal_id || ""}
                            onValueChange={(v) => {
                              setItems((prev) => prev.map((x, j) => r.itemIdx.includes(j) ? { ...x, personal_id: v || null, selected: !!v } : x));
                            }}
                            placeholder="Asignar..."
                          />
                        </TableCell>
                        <TableCell>
                          {!r.personal_id
                            ? <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-700 dark:text-amber-400">Sin asignar</Badge>
                            : duplicatePidKeys.has(r.key)
                              ? <div className="flex flex-wrap gap-1">{confBadge(r.confidence)}<Badge variant="outline" className="text-[10px] border-orange-500/50 text-orange-700 dark:text-orange-400">Repetido</Badge></div>
                              : confBadge(r.confidence)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenMas(false)}>Cancelar</Button>
            {rows.some((r) => r.uploadError) ? (
              <Button onClick={() => confirmBulk()} disabled={savingBulk} variant="destructive">
                {savingBulk && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Reintentar fallidos ({rows.filter((r) => r.uploadError).length})
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (sinAsignarCount > 0) {
                    setConfirmSkipOpen(true);
                  } else if (duplicatePidCount > 0) {
                    setConfirmDupOpen(true);
                  } else {
                    confirmBulk();
                  }
                }}
                disabled={rows.length === 0 || savingBulk}
              >
                {savingBulk && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirmar y subir ({selectedAssignedCount})
              </Button>
            )}
          </DialogFooter>

        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (toDelete) remove(toDelete); setToDelete(null); }}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmSkipOpen} onOpenChange={setConfirmSkipOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hay documentos sin asignar</AlertDialogTitle>
            <AlertDialogDescription>
              {sinAsignarCount} documento(s) no tienen empleado asignado y NO se van a subir.
              Se subirán únicamente los {rows.filter(r => r.selected && r.personal_id).length} asignados. ¿Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver a asignar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setConfirmSkipOpen(false);
              if (duplicatePidCount > 0) setConfirmDupOpen(true);
              else confirmBulk();
            }}>
              Subir solo asignados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDupOpen} onOpenChange={setConfirmDupOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hay empleados repetidos</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a subir varios documentos para el mismo empleado en {duplicatePidCount} caso(s).
              Si ya revisaste las asignaciones, podés continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver a revisar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setConfirmDupOpen(false); confirmBulk(); }}>
              Continuar y subir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

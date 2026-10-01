import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { MainLayout } from "@/components/layout/MainLayout";
import { CertificadoServiceGrid } from "@/components/certificados/CertificadoServiceGrid";
import { useObras } from "@/hooks/useObras";
import {
  useCertificados,
  CONCEPTOS_ESTANDAR,
  CATEGORIAS_CERTIFICADO,
  METODOS_PAGO,
  getEstadoEfectivo,
  ESTADO_EFECTIVO_LABEL,
  ESTADO_EFECTIVO_COLOR,
  type CertificadoItemForm,
  type CertificadoItem,
  type CertificadoPago,
  type Certificado,
  type EstadoCertificado,
  type EstadoEfectivo,
  type MetodoPago,
  type TipoCertificado,
  type AcumuladoConcepto,
} from "@/hooks/useCertificados";
import { generateReciboPDF } from "@/utils/generateReciboPDF";
import { generateCertificadoPDF } from "@/utils/generateCertificadoPDF";
import { KPICard } from "@/components/dashboard/KPICard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  FileText,
  Eye,
  Send,
  CheckCircle2,
  Zap,
  Download,
  Copy,
  Pencil,
  DollarSign,
  Clock,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  HardHat,
  Wrench,
  Search,
  Percent,
  FileSpreadsheet,
  LayoutGrid,
  List as ListIcon,
  Upload,
  FolderOpen,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useUrlState } from "@/hooks/useUrlState";
import { ConceptosCSVImportDialog } from "@/components/certificados/ConceptosCSVImportDialog";
import { AjustePreciosDialog } from "@/components/certificados/AjustePreciosDialog";


const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const formatPercent = (n: number) => `${n.toFixed(1)}%`;

const ESTADO_COLORS: Record<EstadoCertificado, string> = {
  borrador: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  emitido: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  cobrado: "bg-green-500/15 text-green-700 dark:text-green-400",
};

const ESTADO_LABELS: Record<EstadoCertificado, string> = {
  borrador: "Borrador",
  emitido: "Emitido",
  cobrado: "Cobrado",
};

/** Group items by a key field, return sorted entries */
function groupByField<T>(items: T[], keyFn: (item: T) => string, sortOrder?: string[]): { key: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  items.forEach((item) => {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  });
  return [...map.entries()]
    .sort(([a], [b]) => {
      if (sortOrder) {
        const ia = sortOrder.indexOf(a);
        const ib = sortOrder.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      }
      return a.localeCompare(b);
    })
    .map(([key, items]) => ({ key, items }));
}

function groupByCategoria<T extends { categoria?: string }>(items: T[]) {
  return groupByField(items, (i) => i.categoria || "General", CATEGORIAS_CERTIFICADO)
    .map(({ key, items }) => ({ categoria: key, items }));
}

function groupByEtapa<T extends { etapa?: string | null }>(items: T[], etapaOrdenMap?: Record<string, number>) {
  const sortOrder = etapaOrdenMap
    ? Object.entries(etapaOrdenMap)
        .sort(([, a], [, b]) => a - b)
        .map(([etapa]) => etapa)
    : undefined;
  return groupByField(items, (i) => i.etapa || "Sin etapa", sortOrder)
    .map(({ key, items }) => ({ etapa: key, items }));
}

function exportCertificadosExcel(certs: Certificado[], getPagado: (id: string) => number, obraNombre: string) {
  const rows = certs.map((c) => {
    const pagado = getPagado(c.id);
    return {
      Numero: c.numero,
      Periodo: c.periodo,
      "Fecha Certificado": c.fecha_certificado || "",
      "Fecha Emisión": c.fecha_emision || "",
      Tipo: c.tipo,
      Estado: c.estado,
      Subtotal: c.subtotal,
      IVA: c.iva,
      Total: c.total,
      Pagado: pagado,
      Saldo: c.total - pagado,
      Observaciones: c.observaciones || "",
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Certificados");
  XLSX.writeFile(wb, `certificados-${obraNombre.replace(/\s+/g, "_")}-${format(new Date(), "yyyyMMdd")}.xlsx`);
}

export default function Certificados() {
  const { obras, loading: loadingObras } = useObras();
  const [selectedObraId, setSelectedObraId] = useState<string>("");
  const selectedObra = obras.find((o) => o.id === selectedObraId);

  const {
    conceptos,
    loadingConceptos,
    certificados,
    loadingCertificados,
    fetchItems,
    fetchAcumuladosCached,
    createConcepto,
    updateConcepto,
    deleteConcepto,
    createCertificado,
    updateCertificado,
    updateCertificadoEstado,
    deleteCertificado,
    reorderEtapas,
    allPagos,
    fetchPagos,
    createPago,
    updatePago,
    deletePago,
    getComprobanteSignedUrl,
    bulkInsertConceptos,
    bulkAdjustPrices,
  } = useCertificados(selectedObraId);

  // Build etapaOrdenMap from conceptos' orden field (min orden per etapa)
  const etapaOrdenMap = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    conceptos.forEach((c) => {
      const etapa = c.etapa || "Sin etapa";
      if (!(etapa in map) || c.orden < map[etapa]) {
        map[etapa] = c.orden;
      }
    });
    return map;
  }, [conceptos]);

  // ---- Filtros listado ----
  const [filtroEstado, setFiltroEstado] = useUrlState<string>({ key: "fest", defaultValue: "todos", serialize: v => v, deserialize: v => v });
  const [filtroTipo, setFiltroTipo] = useUrlState<string>({ key: "ftipo", defaultValue: "todos", serialize: v => v, deserialize: v => v });
  const [filtroBusqueda, setFiltroBusqueda] = useUrlState<string>({ key: "fq", defaultValue: "", serialize: v => v, deserialize: v => v });
  const [filtroMes, setFiltroMes] = useUrlState<string>({ key: "fmes", defaultValue: "", serialize: v => v, deserialize: v => v });
  const [vistaListado, setVistaListado] = useUrlState<"cards" | "tabla">({ key: "vista", defaultValue: "tabla", serialize: v => v, deserialize: v => (v === "cards" ? "cards" : "tabla") });

  // Debounced search (200 ms) to avoid recomputing filters on every keystroke
  const [busquedaDebounced, setBusquedaDebounced] = useState(filtroBusqueda);
  useEffect(() => {
    const t = setTimeout(() => setBusquedaDebounced(filtroBusqueda), 200);
    return () => clearTimeout(t);
  }, [filtroBusqueda]);

  // O(1) lookup: total pagado por certificado
  const pagadoByCertMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of allPagos) {
      m.set(p.certificado_id, (m.get(p.certificado_id) || 0) + Number(p.monto));
    }
    return m;
  }, [allPagos]);

  const getPagadoByCert = useCallback(
    (certId: string) => pagadoByCertMap.get(certId) || 0,
    [pagadoByCertMap]
  );

  const certificadosFiltrados = useMemo(() => {
    const q = busquedaDebounced.toLowerCase();
    return certificados.filter((c) => {
      if (filtroEstado !== "todos" && c.estado !== filtroEstado) return false;
      if (filtroTipo !== "todos" && c.tipo !== filtroTipo) return false;
      if (q && !c.numero.toLowerCase().includes(q)) return false;
      if (filtroMes && c.periodo !== filtroMes) return false;
      return true;
    });
  }, [certificados, filtroEstado, filtroTipo, busquedaDebounced, filtroMes]);

  // ---- KPIs ----
  const { totalCertificados, montoTotal, montoCobrado, montoPendiente, pctCobranza, antiguedadProm } = useMemo(() => {
    const totalCertificados = certificadosFiltrados.length;
    const montoTotal = certificadosFiltrados.reduce((s, c) => s + c.total, 0);
    const montoCobrado = certificadosFiltrados.reduce((s, c) => s + (pagadoByCertMap.get(c.id) || 0), 0);
    const montoPendiente = certificadosFiltrados
      .filter((c) => c.estado !== "cobrado")
      .reduce((s, c) => s + (c.total - (pagadoByCertMap.get(c.id) || 0)), 0);
    const pctCobranza = montoTotal > 0 ? (montoCobrado / montoTotal) * 100 : 0;
    const pendientes = certificadosFiltrados.filter((c) => c.estado !== "cobrado" && c.fecha_emision);
    const antiguedadProm = pendientes.length > 0
      ? pendientes.reduce((s, c) => s + differenceInDays(new Date(), parseISO(c.fecha_emision!)), 0) / pendientes.length
      : 0;
    return { totalCertificados, montoTotal, montoCobrado, montoPendiente, pctCobranza, antiguedadProm };
  }, [certificadosFiltrados, pagadoByCertMap]);

  // ---- Conceptos tab filters ----
  const [conceptoSearch, setConceptoSearch] = useState("");
  const [conceptoCatFilter, setConceptoCatFilter] = useState<string>("__ALL__");
  const [importConceptosOpen, setImportConceptosOpen] = useState(false);
  const [ajustePreciosOpen, setAjustePreciosOpen] = useState(false);
  const filterConceptos = (list: typeof conceptos) => list.filter((c) => {
    if (conceptoSearch && !c.nombre.toLowerCase().includes(conceptoSearch.toLowerCase())) return false;
    if (conceptoCatFilter !== "__ALL__" && c.categoria !== conceptoCatFilter) return false;
    return true;
  });

  // ---- Add concepto dialog ----
  const [addConceptoOpen, setAddConceptoOpen] = useState(false);
  const [addConceptoTipo, setAddConceptoTipo] = useState<'obra' | 'servicio'>('servicio');
  const [newConcepto, setNewConcepto] = useState({
    nombre: "",
    unidad: "",
    precio_unitario: "",
    categoria: "General",
    cantidad_total: "",
    etapa: "",
  });

  const openAddConceptoDialog = (tipo: 'obra' | 'servicio') => {
    setAddConceptoTipo(tipo);
    setNewConcepto({ nombre: "", unidad: "", precio_unitario: "", categoria: "General", cantidad_total: "", etapa: "" });
    setAddConceptoOpen(true);
  };

  const handleAddConcepto = async () => {
    if (!selectedObraId || !newConcepto.nombre || !newConcepto.unidad) return;
    await createConcepto({
      obra_id: selectedObraId,
      nombre: newConcepto.nombre,
      unidad: newConcepto.unidad,
      precio_unitario: Number(newConcepto.precio_unitario) || 0,
      orden: conceptos.length,
      categoria: newConcepto.categoria,
      cantidad_total: Number(newConcepto.cantidad_total) || 0,
      etapa: newConcepto.etapa || null,
      tipo: addConceptoTipo,
    });
    setNewConcepto({ nombre: "", unidad: "", precio_unitario: "", categoria: "General", cantidad_total: "", etapa: "" });
    setAddConceptoOpen(false);
  };

  const handleAddEstandar = async (e: { nombre: string; unidad: string; categoria: string }, tipo: 'obra' | 'servicio' = 'servicio') => {
    if (!selectedObraId) return;
    await createConcepto({
      obra_id: selectedObraId,
      nombre: e.nombre,
      unidad: e.unidad,
      precio_unitario: 0,
      orden: conceptos.length,
      categoria: e.categoria,
      tipo,
    });
  };

  // ---- Crear / Editar certificado ----
  const [crearOpen, setCrearOpen] = useState(false);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState(() => format(new Date(), "yyyy-MM"));
  const [fechaCertificado, setFechaCertificado] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [observaciones, setObservaciones] = useState("");
  const [itemsDraft, setItemsDraft] = useState<CertificadoItemForm[]>([]);
  const [tipoCert, setTipoCert] = useState<TipoCertificado>("servicio");
  const [anticipoPorcentaje, setAnticipoPorcentaje] = useState(0);
  // For "Agregar concepto" dialogs — null = not open, "obra" | "servicio" = which section
  const [addExtraConceptoSection, setAddExtraConceptoSection] = useState<string | null>(null);
  const [numeroCert, setNumeroCert] = useState("");
  const [incluirIva, setIncluirIva] = useState(true);
  const [acumulados, setAcumulados] = useState<AcumuladoConcepto[]>([]);
  // State for adding extra concepts to an existing certificate during edit
  const [addExtraConceptoOpen, setAddExtraConceptoOpen] = useState(false);
  // Collapsed state per category inside "Conceptos de Obra" / "Conceptos de Servicio"
  const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});
  const toggleCatCollapsed = useCallback((key: string) => {
    setCollapsedCats((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const isEditing = !!editingCertId;


  // Fetch acumulados when tipo is obra or mixto and dialog is open
  useEffect(() => {
    if (crearOpen && (tipoCert === "obra" || tipoCert === "mixto") && selectedObraId && periodo) {
      fetchAcumuladosCached(selectedObraId, periodo, editingCertId || undefined).then(setAcumulados);
    } else {
      setAcumulados([]);
    }
  }, [crearOpen, tipoCert, selectedObraId, periodo, editingCertId]);

  const buildDraftForTipo = (tipo: TipoCertificado) => {
    const activos = conceptos.filter((c) => c.activo);
    if (tipo === "mixto") {
      const obraItems = activos.filter((c) => c.tipo === "obra").map((c) => ({
        concepto_id: c.id,
        descripcion: c.nombre,
        unidad: c.unidad,
        cantidad: 0,
        precio_unitario: c.precio_unitario,
        subtotal: 0,
        categoria: c.categoria,
        etapa: c.etapa,
        cantidad_total: c.cantidad_total,
        seccion: "obra" as const,
      }));
      const servicioItems = activos.filter((c) => c.tipo === "servicio").map((c) => ({
        concepto_id: c.id,
        descripcion: c.nombre,
        unidad: c.unidad,
        cantidad: 0,
        precio_unitario: c.precio_unitario,
        subtotal: 0,
        categoria: c.categoria,
        etapa: c.etapa,
        cantidad_total: c.cantidad_total,
        seccion: "servicio" as const,
      }));
      return [...obraItems, ...servicioItems];
    }
    return activos.filter((c) => c.tipo === tipo).map((c) => ({
      concepto_id: c.id,
      descripcion: c.nombre,
      unidad: c.unidad,
      cantidad: 0,
      precio_unitario: c.precio_unitario,
      subtotal: 0,
      categoria: c.categoria,
      etapa: c.etapa,
      cantidad_total: c.cantidad_total,
      seccion: null as string | null,
    }));
  };

  const buildObraDraft = () => {
    return conceptos.filter((c) => c.activo && c.tipo === "obra").map((c) => ({
      concepto_id: c.id,
      descripcion: c.nombre,
      unidad: c.unidad,
      cantidad: 0,
      precio_unitario: c.precio_unitario,
      subtotal: 0,
      categoria: c.categoria,
      etapa: c.etapa,
      cantidad_total: c.cantidad_total,
      seccion: null as string | null,
    }));
  };

  const openCrearCertificado = () => {
    const initialTipo: TipoCertificado = "servicio";
    setItemsDraft([]);
    setPeriodo(format(new Date(), "yyyy-MM"));
    setFechaCertificado(format(new Date(), "yyyy-MM-dd"));
    setObservaciones("");
    setEditingCertId(null);
    setTipoCert(initialTipo);
    setAnticipoPorcentaje(0);
    setNumeroCert("");
    setIncluirIva(true);
    setCrearOpen(true);
  };

  const skipTipoEffectRef = useRef(false);

  const openEditCertificado = async (cert: Certificado) => {
    const items = await fetchItems(cert.id);

    // Build draft ONLY from saved items — snapshot of what was at creation time
    // No cross-contamination from current active concepts
    const draft: CertificadoItemForm[] = items.map((item) => ({
      concepto_id: item.concepto_id,
      descripcion: item.descripcion,
      unidad: item.unidad,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
      categoria: (item.concepto_id && categoriaMap[item.concepto_id]) || "General",
      etapa: item.etapa,
      cantidad_total: (item.concepto_id && cantidadTotalMap[item.concepto_id]) || 0,
      seccion: item.seccion || (cert.tipo === "mixto" ? "servicio" : null),
      observaciones: (item as any).observaciones || "",
    }));

    setItemsDraft(draft);
    setPeriodo(cert.periodo);
    setFechaCertificado((cert as any).fecha_certificado || cert.fecha_emision || format(new Date(), "yyyy-MM-dd"));
    setObservaciones(cert.observaciones || "");
    setEditingCertId(cert.id);
    skipTipoEffectRef.current = true;
    setTipoCert(cert.tipo);
    setAnticipoPorcentaje(cert.anticipo_porcentaje);
    setNumeroCert(cert.numero);
    setIncluirIva(cert.incluir_iva !== false);
    setCrearOpen(true);
  };

  const duplicateFromCert = async (source: Certificado) => {
    const items = await fetchItems(source.id);
    const draft: CertificadoItemForm[] = items.map((item) => ({
      concepto_id: item.concepto_id,
      descripcion: item.descripcion,
      unidad: item.unidad,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      subtotal: item.subtotal,
      categoria: (item.concepto_id && categoriaMap[item.concepto_id]) || "General",
      etapa: item.etapa,
      cantidad_total: (item.concepto_id && cantidadTotalMap[item.concepto_id]) || 0,
      seccion: item.seccion || (source.tipo === "mixto" ? "servicio" : null),
      observaciones: (item as any).observaciones || "",
    }));
    setItemsDraft(draft);
    setPeriodo(format(new Date(), "yyyy-MM"));
    setFechaCertificado(format(new Date(), "yyyy-MM-dd"));
    setObservaciones("");
    setEditingCertId(null);
    skipTipoEffectRef.current = true;
    setTipoCert(source.tipo);
    setAnticipoPorcentaje(source.anticipo_porcentaje);
    setNumeroCert("");
    setIncluirIva(source.incluir_iva !== false);
    setViewCertId(null);
    setCrearOpen(true);
  };

  const openDuplicarCertificado = async () => {
    if (certificados.length === 0) return;
    await duplicateFromCert(certificados[0]);
  };

  const updateItemCantidad = (idx: number, cantidad: number) => {
    setItemsDraft((prev) =>
      prev.map((item, i) =>
        i === idx
          ? { ...item, cantidad, subtotal: cantidad * item.precio_unitario }
          : item
      )
    );
  };

  const updateItemPrecio = (idx: number, precio_unitario: number) => {
    setItemsDraft((prev) =>
      prev.map((item, i) =>
        i === idx
          ? { ...item, precio_unitario, subtotal: item.cantidad * precio_unitario }
          : item
      )
    );
  };

  const removeItemFromDraft = (idx: number) => {
    setItemsDraft((prev) => prev.filter((_, i) => i !== idx));
  };

  // Rebuild draft when tipoCert changes
  useEffect(() => {
    if (!crearOpen) return;
    if (skipTipoEffectRef.current) {
      skipTipoEffectRef.current = false;
      return;
    }
    if (editingCertId) {
      // Editing: rebuild from all concepts
      setItemsDraft(buildDraftForTipo(tipoCert));
    } else {
      // Creating: auto-populate obra concepts, leave servicio empty
      if (tipoCert === "obra") {
        setItemsDraft(buildObraDraft());
      } else if (tipoCert === "mixto") {
        const obraDraft = conceptos.filter((c) => c.activo && c.tipo === "obra").map((c) => ({
          concepto_id: c.id,
          descripcion: c.nombre,
          unidad: c.unidad,
          cantidad: 0,
          precio_unitario: c.precio_unitario,
          subtotal: 0,
          categoria: c.categoria,
          etapa: c.etapa,
          cantidad_total: c.cantidad_total,
          seccion: "obra" as const,
        }));
        setItemsDraft(obraDraft); // servicio section starts empty
      } else {
        setItemsDraft([]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoCert]);

  // Multi-select state for "Agregar concepto" dialog
  const [selectedConceptoIds, setSelectedConceptoIds] = useState<Set<string>>(new Set());

  const toggleConceptoSelection = (id: string) => {
    setSelectedConceptoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelectedConceptosToDraft = () => {
    const seccion = addExtraConceptoSection;
    const toAdd = conceptos.filter((c) => selectedConceptoIds.has(c.id));
    setItemsDraft((prev) => [
      ...prev,
      ...toAdd.map((c) => ({
        concepto_id: c.id,
        descripcion: c.nombre,
        unidad: c.unidad,
        cantidad: 0,
        precio_unitario: c.precio_unitario,
        subtotal: 0,
        categoria: c.categoria,
        etapa: c.etapa,
        cantidad_total: c.cantidad_total,
        seccion: seccion || null,
      })),
    ]);
    setSelectedConceptoIds(new Set());
    setAddExtraConceptoOpen(false);
    setAddExtraConceptoSection(null);
  };

  // Active concepts not yet in draft — for adding extras when editing
  // For non-mixto: filter by tipo matching cert tipo
  const conceptosNoEnDraft = conceptos.filter(
    (c) => c.activo && c.tipo === tipoCert && !itemsDraft.some((i) => i.concepto_id === c.id)
  );
  // For mixto: filter per section AND tipo independently
  const conceptosNoEnDraftObra = conceptos.filter(
    (c) => c.activo && c.tipo === "obra" && !itemsDraft.some((i) => i.concepto_id === c.id && i.seccion === "obra")
  );
  const conceptosNoEnDraftServicio = conceptos.filter(
    (c) => c.activo && c.tipo === "servicio" && !itemsDraft.some((i) => i.concepto_id === c.id && i.seccion === "servicio")
  );

  const addConceptoToDraft = (conceptoId: string, seccion?: string | null) => {
    const c = conceptos.find((x) => x.id === conceptoId);
    if (!c) return;
    setItemsDraft((prev) => [
      ...prev,
      {
        concepto_id: c.id,
        descripcion: c.nombre,
        unidad: c.unidad,
        cantidad: 0,
        precio_unitario: c.precio_unitario,
        subtotal: 0,
        categoria: c.categoria,
        etapa: c.etapa,
        cantidad_total: c.cantidad_total,
        seccion: seccion || null,
      },
    ]);
    setAddExtraConceptoOpen(false);
    setAddExtraConceptoSection(null);
  };

  const draftSubtotal = itemsDraft.reduce((s, i) => s + i.subtotal, 0);
  const draftIva = incluirIva ? Math.round(draftSubtotal * 0.21 * 100) / 100 : 0;
  const draftTotal = draftSubtotal + draftIva;

  // For tipo obra: compute avance total and anticipo
  const getAcumuladoForItem = (conceptoId: string | null) => {
    if (!conceptoId) return { cantidad_anterior: 0, avance_anterior: 0 };
    return acumulados.find((a) => a.concepto_id === conceptoId) || { cantidad_anterior: 0, avance_anterior: 0 };
  };

  const avanceActualTotal = itemsDraft.reduce((s, i) => s + i.subtotal, 0);
  // For anticipo: only consider obra items
  const obraItemsDraft = itemsDraft.filter((i) => tipoCert === "obra" || i.seccion === "obra");
  const avanceActualObra = obraItemsDraft.reduce((s, i) => s + i.subtotal, 0);
  const avanceAnteriorTotal = (tipoCert === "obra" || tipoCert === "mixto")
    ? obraItemsDraft
        .reduce((s, i) => {
          const ac = getAcumuladoForItem(i.concepto_id);
          return s + ac.avance_anterior;
        }, 0)
    : 0;
  const avanceAcumuladoTotal = avanceAnteriorTotal + avanceActualObra;
  const anticipoMonto = Math.round(avanceAcumuladoTotal * (anticipoPorcentaje / 100));
  const totalAPagar = avanceActualTotal;

  const handleSaveCertificado = async () => {
    if (isEditing && editingCertId) {
      await updateCertificado({
        id: editingCertId,
        periodo,
        items: itemsDraft,
        observaciones,
        tipo: tipoCert,
        anticipo_porcentaje: anticipoPorcentaje,
        numero: numeroCert,
        incluir_iva: incluirIva,
        fecha_certificado: fechaCertificado,
      });
    } else {
      await createCertificado({
        periodo,
        items: itemsDraft,
        observaciones,
        tipo: tipoCert,
        anticipo_porcentaje: anticipoPorcentaje,
        incluir_iva: incluirIva,
        numero: numeroCert || undefined,
        fecha_certificado: fechaCertificado,
      });
    }
    setCrearOpen(false);
    setEditingCertId(null);
  };

  // ---- Ver certificado ----
  const [viewCertId, setViewCertId] = useState<string | null>(null);
  const [viewItems, setViewItems] = useState<CertificadoItem[]>([]);
  const [viewPagos, setViewPagos] = useState<CertificadoPago[]>([]);
  const emptyPago = () => ({
    fecha: format(new Date(), "yyyy-MM-dd"),
    monto: "",
    descripcion: "",
    metodo: "transferencia" as MetodoPago,
    referencia: "",
    banco: "",
    comprobante: null as File | null,
  });
  const [newPago, setNewPago] = useState(emptyPago());
  const [editingPagoId, setEditingPagoId] = useState<string | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [viewAcumulados, setViewAcumulados] = useState<AcumuladoConcepto[]>([]);
  const viewCert = certificados.find((c) => c.id === viewCertId);

  const openViewCert = async (id: string) => {
    setViewCertId(id);
    setLoadingItems(true);
    setNewPago(emptyPago());
    setEditingPagoId(null);

    const cert = certificados.find((c) => c.id === id);
    const needsAcumulados =
      (cert?.tipo === "obra" || cert?.tipo === "mixto") && !!selectedObraId;

    // Run all three queries in parallel (cached per cert)
    const [items, pagos, ac] = await Promise.all([
      fetchItems(id),
      fetchPagos(id),
      needsAcumulados
        ? fetchAcumuladosCached(selectedObraId!, cert!.periodo, cert!.id)
        : Promise.resolve([] as AcumuladoConcepto[]),
    ]);

    setViewItems(items);
    setViewPagos(pagos);
    setViewAcumulados(ac);
    setLoadingItems(false);
  };

  const handleSavePago = async () => {
    if (!viewCertId || !newPago.monto) return;
    try {
      if (editingPagoId) {
        await updatePago({
          id: editingPagoId,
          certificado_id: viewCertId,
          fecha: newPago.fecha,
          monto: Number(newPago.monto),
          descripcion: newPago.descripcion,
          metodo: newPago.metodo,
          referencia: newPago.referencia,
          banco: newPago.banco,
          comprobante: newPago.comprobante,
        });
      } else {
        await createPago({
          certificado_id: viewCertId,
          fecha: newPago.fecha,
          monto: Number(newPago.monto),
          descripcion: newPago.descripcion,
          metodo: newPago.metodo,
          referencia: newPago.referencia,
          banco: newPago.banco,
          comprobante: newPago.comprobante,
        });
      }
      const pagos = await fetchPagos(viewCertId);
      setViewPagos(pagos);
      setNewPago(emptyPago());
      setEditingPagoId(null);
    } catch {
      // toast handled in hook
    }
  };

  const handleEditPago = (pago: CertificadoPago) => {
    setEditingPagoId(pago.id);
    setNewPago({
      fecha: pago.fecha,
      monto: String(pago.monto),
      descripcion: pago.descripcion || "",
      metodo: (pago.metodo as MetodoPago) || "transferencia",
      referencia: pago.referencia || "",
      banco: pago.banco || "",
      comprobante: null,
    });
  };

  const handleDeletePago = async (pago: CertificadoPago) => {
    await deletePago({ id: pago.id, certificado_id: pago.certificado_id });
    if (viewCertId) {
      const pagos = await fetchPagos(viewCertId);
      setViewPagos(pagos);
    }
  };

  const handleOpenComprobante = async (path: string) => {
    const url = await getComprobanteSignedUrl(path);
    if (url) window.open(url, "_blank");
  };

  const handleReciboPDF = async (pago: CertificadoPago, allPagosCert: CertificadoPago[]) => {
    if (!viewCert) return;
    const sorted = [...allPagosCert].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const idx = sorted.findIndex((p) => p.id === pago.id) + 1;
    const acumulado = sorted.slice(0, idx).reduce((s, p) => s + p.monto, 0);
    await generateReciboPDF({
      certificado: viewCert,
      pago,
      pagoIndex: idx,
      totalPagado: acumulado,
      obraNombre: selectedObra?.nombre || "",
      clienteNombre: selectedObra?.cliente?.nombre,
      clienteCuit: selectedObra?.cliente?.cuit,
      clienteDireccion: selectedObra?.cliente?.direccion,
    });
  };

  // Build categoriaMap for PDF
  const categoriaMap: Record<string, string> = {};
  const etapaMap: Record<string, string> = {};
  const cantidadTotalMap: Record<string, number> = {};
  conceptos.forEach((c) => {
    categoriaMap[c.id] = c.categoria;
    if (c.etapa) etapaMap[c.id] = c.etapa;
    cantidadTotalMap[c.id] = c.cantidad_total;
  });

  const handleDownloadPDF = async (cert?: Certificado, items?: CertificadoItem[]) => {
    const targetCert = cert || viewCert;
    if (!targetCert) return;

    let targetItems = items || viewItems;
    if (!items && !viewCertId) {
      targetItems = await fetchItems(targetCert.id);
    }

    // For obra type, fetch acumulados and merge ALL active concepts
    let pdfAcumulados: AcumuladoConcepto[] = [];
    if ((targetCert.tipo === "obra" || targetCert.tipo === "mixto") && selectedObraId) {
      pdfAcumulados = await fetchAcumuladosCached(selectedObraId, targetCert.periodo, targetCert.id);

      // Only use real certificate items — no virtual/phantom items
    }

    // Fetch pagos for this certificate
    const certPagos = await fetchPagos(targetCert.id);

    await generateCertificadoPDF({
      certificado: targetCert,
      items: targetItems,
      obraNombre: selectedObra?.nombre || "",
      obraUbicacion: selectedObra?.ubicacion || undefined,
      clienteNombre: selectedObra?.cliente?.nombre || undefined,
      clienteCuit: selectedObra?.cliente?.cuit || undefined,
      clienteDireccion: selectedObra?.cliente?.direccion || undefined,
      clienteLocalidad: selectedObra?.cliente?.localidad || undefined,
      clienteTelefono: selectedObra?.cliente?.telefono || undefined,
      clienteEmail: selectedObra?.cliente?.email || undefined,
      categoriaMap,
      etapaMap,
      cantidadTotalMap,
      acumulados: pdfAcumulados,
      etapaOrdenMap,
      pagos: certPagos,
    });
  };

  const handleDownloadPDFFromCard = async (cert: Certificado) => {
    const items = await fetchItems(cert.id);
    await handleDownloadPDF(cert, items);
  };

  const conceptosEstandarNoAgregados = CONCEPTOS_ESTANDAR.filter(
    (e) => !conceptos.some((c) => c.nombre === e.nombre)
  );

  // Group conceptos by categoria for display
  const conceptosGrouped = groupByCategoria(conceptos);

  // Group draft items depending on tipo
  const draftGroupedCategoria = groupByCategoria(itemsDraft.filter((i) => !i.seccion || i.seccion === "servicio"));
  const draftGroupedEtapa = groupByEtapa(itemsDraft.filter((i) => !i.seccion || i.seccion === "obra"), etapaOrdenMap);
  // For mixto: separate sections
  const draftMixtoObra = itemsDraft.filter((i) => i.seccion === "obra");
  const draftMixtoServicio = itemsDraft.filter((i) => i.seccion === "servicio");
  const draftMixtoObraGrouped = groupByEtapa(draftMixtoObra, etapaOrdenMap);
  const draftMixtoServicioGrouped = groupByCategoria(draftMixtoServicio);

  // Move an etapa within itemsDraft (visual order in this certificate) and persist globally
  const moveEtapaInDraft = (etapa: string, dir: -1 | 1, scope: "obra" | "mixto-obra") => {
    const filterFn = scope === "obra"
      ? (i: CertificadoItemForm) => !i.seccion || i.seccion === "obra"
      : (i: CertificadoItemForm) => i.seccion === "obra";
    const groups = scope === "obra" ? draftGroupedEtapa : draftMixtoObraGrouped;
    const etapasOrden = groups.map((g) => g.etapa);
    const idx = etapasOrden.indexOf(etapa);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= etapasOrden.length) return;
    [etapasOrden[idx], etapasOrden[swap]] = [etapasOrden[swap], etapasOrden[idx]];

    const scoped = itemsDraft.filter(filterFn);
    const others = itemsDraft.filter((i) => !filterFn(i));
    const reorderedScoped = etapasOrden.flatMap((e) =>
      scoped.filter((i) => (i.etapa || "Sin etapa") === e)
    );
    setItemsDraft([...reorderedScoped, ...others]);

    reorderEtapas(etapasOrden.map((e, i) => ({ etapa: e, orden: i }))).catch(() => {});
  };


  // Group view items
  const viewItemsWithCat = viewItems.map((item) => ({
    ...item,
    categoria: (item.concepto_id && categoriaMap[item.concepto_id]) || "General",
  }));
  const viewGroupedCategoria = groupByCategoria(viewItemsWithCat.filter((i) => !i.seccion || i.seccion === "servicio"));
  const viewItemsWithEtapa = viewItems.map((item) => ({
    ...item,
    etapa: item.etapa || (item.concepto_id && etapaMap[item.concepto_id]) || null,
  }));
  const viewGroupedEtapa = groupByEtapa(viewItemsWithEtapa.filter((i) => !i.seccion || i.seccion === "obra"), etapaOrdenMap);
  // For mixto view
  const viewMixtoObra = viewItemsWithEtapa.filter((i) => i.seccion === "obra");
  const viewMixtoServicio = viewItemsWithCat.filter((i) => i.seccion === "servicio");
  const viewMixtoObraGrouped = groupByEtapa(viewMixtoObra, etapaOrdenMap);
  const viewMixtoServicioGrouped = groupByCategoria(viewMixtoServicio);

  return (
    <MainLayout title="Certificados de Obra" subtitle="Gestión de certificaciones mensuales por obra">
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-end">
            <Combobox
              options={obras
                .filter((o) => o.estado === "activa")
                .map((o) => ({ value: o.id, label: o.nombre }))}
              value={selectedObraId}
              onValueChange={setSelectedObraId}
              placeholder="Seleccionar obra..."
              searchPlaceholder="Buscar obra..."
              emptyText="No se encontraron obras."
              className="w-full sm:w-72"
            />
          </div>

          {!selectedObraId ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Seleccioná una obra para ver sus certificados y conceptos.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* KPIs */}
              {!loadingCertificados && certificados.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <KPICard title="Certificados" value={totalCertificados} icon={FileText} variant="default" />
                  <KPICard title="Total" value={formatCurrency(montoTotal)} icon={TrendingUp} variant="primary" />
                  <KPICard title="Pendiente" value={formatCurrency(montoPendiente)} icon={Clock} variant="warning" />
                  <KPICard title="Cobrado" value={formatCurrency(montoCobrado)} icon={DollarSign} variant="success" />
                  <KPICard title="% Cobranza" value={`${pctCobranza.toFixed(1)}%`} icon={Percent} variant="primary" />
                  <KPICard title="Antig. prom (días)" value={antiguedadProm.toFixed(0)} icon={Clock} variant="default" />
                </div>
              )}

              <Tabs defaultValue="certificados">
                <TabsList>
                  <TabsTrigger value="certificados">Certificados</TabsTrigger>
                  <TabsTrigger value="conceptos">Conceptos</TabsTrigger>
                  <TabsTrigger value="pagos">Pagos</TabsTrigger>
                </TabsList>

                {/* ==================== CERTIFICADOS TAB ==================== */}
                <TabsContent value="certificados" className="space-y-4">
                  {/* Filtros + acciones */}
                  <Card>
                    <CardContent className="p-3 flex flex-wrap gap-2 items-end">
                      <div className="flex-1 min-w-[160px]">
                        <Label className="text-xs">Buscar Nº</Label>
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input className="pl-7 h-8 text-xs" placeholder="CERT-001..." value={filtroBusqueda} onChange={(e) => setFiltroBusqueda(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Estado</Label>
                        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                          <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="borrador">Borrador</SelectItem>
                            <SelectItem value="emitido">Emitido</SelectItem>
                            <SelectItem value="cobrado">Cobrado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Tipo</Label>
                        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                          <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="obra">Obra</SelectItem>
                            <SelectItem value="servicio">Servicio</SelectItem>
                            <SelectItem value="mixto">Mixto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Mes</Label>
                        <div className="flex gap-1">
                          <Input type="month" className="h-8 text-xs w-36" value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)} />
                          {filtroMes && (
                            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setFiltroMes("")}>Limpiar</Button>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-auto">
                        <Button type="button" variant={vistaListado === "cards" ? "default" : "outline"} size="sm" onClick={() => setVistaListado("cards")}>
                          <LayoutGrid className="w-4 h-4" />
                        </Button>
                        <Button type="button" variant={vistaListado === "tabla" ? "default" : "outline"} size="sm" onClick={() => setVistaListado("tabla")}>
                          <ListIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-2 justify-end flex-wrap">
                    {certificadosFiltrados.length > 0 && (
                      <Button variant="outline" size="sm" onClick={() => exportCertificadosExcel(certificadosFiltrados, getPagadoByCert, selectedObra?.nombre || "obra")}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar Excel
                      </Button>
                    )}
                    {certificados.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" onClick={openDuplicarCertificado}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicar último
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Crea un nuevo certificado con los datos del último periodo</TooltipContent>
                      </Tooltip>
                    )}
                    <Button size="sm" onClick={openCrearCertificado} disabled={conceptos.filter((c) => c.activo).length === 0}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Certificado
                    </Button>
                  </div>

                  {loadingCertificados ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-48 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : certificadosFiltrados.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        {certificados.length === 0 ? "No hay certificados para esta obra." : "Ningún certificado coincide con los filtros."}
                      </CardContent>
                    </Card>
                  ) : vistaListado === "tabla" ? (
                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Número</TableHead>
                            <TableHead>Período</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Pagado</TableHead>
                            <TableHead className="text-right">Saldo</TableHead>
                            <TableHead className="text-right">% Cobr.</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {certificadosFiltrados.map((cert) => {
                            const pagado = getPagadoByCert(cert.id);
                            const saldo = cert.total - pagado;
                            const pct = cert.total > 0 ? (pagado / cert.total) * 100 : 0;
                            return (
                              <TableRow key={cert.id} className="cursor-pointer hover:bg-muted/40" onClick={() => openViewCert(cert.id)}>
                                <TableCell className="font-medium">{cert.numero}</TableCell>
                                <TableCell className="capitalize">{format(parseISO(cert.periodo + "-01"), "MMM yyyy", { locale: es })}</TableCell>
                                <TableCell>{cert.fecha_certificado ? format(parseISO(cert.fecha_certificado), "dd/MM/yyyy") : "-"}</TableCell>
                                <TableCell><Badge variant="outline" className="text-xs">{cert.tipo}</Badge></TableCell>
                                <TableCell><Badge variant="secondary" className={ESTADO_COLORS[cert.estado]}>{ESTADO_LABELS[cert.estado]}</Badge></TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(cert.total)}</TableCell>
                                <TableCell className="text-right text-green-600 dark:text-green-400">{formatCurrency(pagado)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(saldo)}</TableCell>
                                <TableCell className="text-right">{pct.toFixed(0)}%</TableCell>
                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver" onClick={() => openViewCert(cert.id)}>
                                      <Eye className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => openEditCertificado(cert)}>
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Descargar PDF" onClick={() => handleDownloadPDFFromCard(cert)}>
                                      <Download className="w-3.5 h-3.5" />
                                    </Button>
                                    {cert.estado === "borrador" && (
                                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Emitir" onClick={() => updateCertificadoEstado({ id: cert.id, estado: "emitido", fecha_emision: format(new Date(), "yyyy-MM-dd") })}>
                                        <Send className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Eliminar" onClick={() => deleteCertificado(cert.id)}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {certificadosFiltrados.map((cert) => (
                        <CertificadoCard
                          key={cert.id}
                          cert={cert}
                          pagado={getPagadoByCert(cert.id)}
                          onView={() => openViewCert(cert.id)}
                          onEdit={() => openEditCertificado(cert)}
                          onEmitir={() =>
                            updateCertificadoEstado({
                              id: cert.id,
                              estado: "emitido",
                              fecha_emision: format(new Date(), "yyyy-MM-dd"),
                            })
                          }
                          onCobrar={() => updateCertificadoEstado({ id: cert.id, estado: "cobrado" })}
                          onDelete={() => deleteCertificado(cert.id)}
                          onDownloadPDF={() => handleDownloadPDFFromCard(cert)}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ==================== CONCEPTOS TAB ==================== */}
                <TabsContent value="conceptos" className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Definí los conceptos que aplican a <strong>{selectedObra?.nombre}</strong>. Los conceptos de Obra se usan en certificados de tipo Obra o Mixto; los de Servicio en certificados de tipo Servicio o Mixto.
                  </p>

                  <Card>
                    <CardContent className="p-3 flex flex-wrap gap-2 items-end">
                      <div className="flex-1 min-w-[180px]">
                        <Label className="text-xs">Buscar concepto</Label>
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input className="pl-7 h-8 text-xs" placeholder="Nombre..." value={conceptoSearch} onChange={(e) => setConceptoSearch(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Categoría</Label>
                        <Select value={conceptoCatFilter} onValueChange={setConceptoCatFilter}>
                          <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__ALL__">Todas</SelectItem>
                            {CATEGORIAS_CERTIFICADO.map((c) => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2 ml-auto">
                        <Button size="sm" variant="outline" onClick={() => setImportConceptosOpen(true)}>
                          <Upload className="w-4 h-4 mr-1" /> Importar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setAjustePreciosOpen(true)} disabled={conceptos.length === 0}>
                          <Percent className="w-4 h-4 mr-1" /> Ajustar precios %
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {loadingConceptos ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <>
                      {/* ---- CONCEPTOS DE OBRA ---- */}
                      <Collapsible defaultOpen className="rounded-lg border border-primary/30 overflow-hidden">
                        <div className="bg-primary/10 px-4 py-3 flex items-center justify-between">
                          <CollapsibleTrigger className="group flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                            <ChevronDown className="w-4 h-4 text-primary transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                            <HardHat className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-sm text-primary">Conceptos de Obra</span>
                            <Badge variant="outline" className="text-xs">{conceptos.filter(c => c.tipo === 'obra').length}</Badge>
                          </CollapsibleTrigger>
                          <Button size="sm" onClick={() => openAddConceptoDialog('obra')}>
                            <Plus className="w-4 h-4 mr-1" />
                            Agregar concepto de Obra
                          </Button>
                        </div>
                        <CollapsibleContent>
                        {conceptos.filter(c => c.tipo === 'obra').length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No hay conceptos de obra. Hacé clic en "Agregar concepto de Obra".
                          </div>
                        ) : (
                          <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                              <TableRow>
                                <TableHead>Concepto</TableHead>
                                <TableHead>Unidad</TableHead>
                                <TableHead className="text-right">P. Unitario</TableHead>
                                <TableHead className="text-right">Cant. Total</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Sub Categoría</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {groupByCategoria(filterConceptos(conceptos.filter(c => c.tipo === 'obra'))).map((group) => {
                                const key = `obra:${group.categoria}`;
                                const collapsed = !!collapsedCats[key];
                                return (
                                  <React.Fragment key={group.categoria}>
                                    <TableRow
                                      className="border-l-4 border-primary bg-primary/10 hover:bg-primary/15 cursor-pointer"
                                      onClick={() => toggleCatCollapsed(key)}
                                    >
                                      <TableCell colSpan={8} className="py-2.5">
                                        <div className="flex items-center gap-2">
                                          <ChevronDown className={cn("w-4 h-4 text-primary transition-transform", collapsed && "-rotate-90")} />
                                          <FolderOpen className="w-4 h-4 text-primary" />
                                          <span className="text-sm font-bold text-primary uppercase tracking-wide">{group.categoria}</span>
                                          <Badge variant="outline" className="text-[10px] h-5 border-primary/40 text-primary">{group.items.length}</Badge>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                    {!collapsed && group.items.map((c) => (
                                      <ConceptoRow
                                        key={c.id}
                                        concepto={c}
                                        onUpdate={(updates) => updateConcepto({ id: c.id, ...updates })}
                                        onDelete={() => deleteConcepto(c.id)}
                                      />
                                    ))}
                                  </React.Fragment>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                        </CollapsibleContent>
                      </Collapsible>

                      {/* ---- CONCEPTOS DE SERVICIO ---- */}
                      <Collapsible defaultOpen className="rounded-lg border border-secondary/50 overflow-hidden">
                        <div className="bg-secondary/30 px-4 py-3 flex items-center justify-between">
                          <CollapsibleTrigger className="group flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                            <ChevronDown className="w-4 h-4 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
                            <Wrench className="w-4 h-4" />
                            <span className="font-semibold text-sm">Conceptos de Servicio</span>
                            <Badge variant="outline" className="text-xs">{conceptos.filter(c => c.tipo === 'servicio').length}</Badge>
                          </CollapsibleTrigger>
                          <Button size="sm" variant="outline" onClick={() => openAddConceptoDialog('servicio')}>
                            <Plus className="w-4 h-4 mr-1" />
                            Agregar concepto de Servicio
                          </Button>
                        </div>
                        <CollapsibleContent>
                        {conceptos.filter(c => c.tipo === 'servicio').length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No hay conceptos de servicio. Hacé clic en "Agregar concepto de Servicio".
                          </div>
                        ) : (
                          <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                              <TableRow>
                                <TableHead>Concepto</TableHead>
                                <TableHead>Unidad</TableHead>
                                <TableHead className="text-right">P. Unitario</TableHead>
                                <TableHead className="text-right">Cant. Total</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Sub Categoría</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {groupByCategoria(filterConceptos(conceptos.filter(c => c.tipo === 'servicio'))).map((group) => {
                                const key = `servicio:${group.categoria}`;
                                const collapsed = !!collapsedCats[key];
                                return (
                                  <React.Fragment key={group.categoria}>
                                    <TableRow
                                      className="border-l-4 border-foreground/60 bg-muted/60 hover:bg-muted cursor-pointer"
                                      onClick={() => toggleCatCollapsed(key)}
                                    >
                                      <TableCell colSpan={8} className="py-2.5">
                                        <div className="flex items-center gap-2">
                                          <ChevronDown className={cn("w-4 h-4 transition-transform", collapsed && "-rotate-90")} />
                                          <FolderOpen className="w-4 h-4" />
                                          <span className="text-sm font-bold uppercase tracking-wide">{group.categoria}</span>
                                          <Badge variant="outline" className="text-[10px] h-5">{group.items.length}</Badge>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                    {!collapsed && group.items.map((c) => (
                                      <ConceptoRow
                                        key={c.id}
                                        concepto={c}
                                        onUpdate={(updates) => updateConcepto({ id: c.id, ...updates })}
                                        onDelete={() => deleteConcepto(c.id)}
                                      />
                                    ))}
                                  </React.Fragment>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                        </CollapsibleContent>
                      </Collapsible>
                    </>
                  )}
                </TabsContent>

                {/* ==================== PAGOS TAB ==================== */}
                <TabsContent value="pagos" className="space-y-4">
                  <PagosTab
                    certificados={certificados}
                    allPagos={allPagos}
                    onOpenComprobante={handleOpenComprobante}
                    onOpenCert={openViewCert}
                  />
                </TabsContent>

              </Tabs>
            </>
          )}

          {/* ==================== ADD CONCEPTO DIALOG ==================== */}
          <Dialog open={addConceptoOpen} onOpenChange={setAddConceptoOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {addConceptoTipo === 'obra' ? <HardHat className="w-4 h-4 text-primary" /> : <Wrench className="w-4 h-4" />}
                  Nuevo Concepto de {addConceptoTipo === 'obra' ? 'Obra' : 'Servicio'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nombre</Label>
                  <Input value={newConcepto.nombre} onChange={(e) => setNewConcepto((p) => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Horas Retro" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Categoría</Label>
                    <Select value={newConcepto.categoria} onValueChange={(v) => setNewConcepto((p) => ({ ...p, categoria: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS_CERTIFICADO.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                   <Label>Sub Categoría (opcional)</Label>
                    <Input value={newConcepto.etapa} onChange={(e) => setNewConcepto((p) => ({ ...p, etapa: e.target.value }))} placeholder="Ej: ETAPA 2" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Unidad</Label>
                    <Select value={newConcepto.unidad} onValueChange={(v) => setNewConcepto((p) => ({ ...p, unidad: v }))}>
                      <SelectTrigger><SelectValue placeholder="Unidad" /></SelectTrigger>
                      <SelectContent>
                        {["HR", "DIA", "M3", "M2", "ML", "TN", "LT", "VJ", "UN", "GL"].map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Precio Unitario</Label>
                    <Input type="number" value={newConcepto.precio_unitario} onChange={(e) => setNewConcepto((p) => ({ ...p, precio_unitario: e.target.value }))} placeholder="0" />
                  </div>
                  <div>
                    <Label>Cant. Total</Label>
                    <Input type="number" value={newConcepto.cantidad_total} onChange={(e) => setNewConcepto((p) => ({ ...p, cantidad_total: e.target.value }))} placeholder="0" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddConceptoOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddConcepto} disabled={!newConcepto.nombre || !newConcepto.unidad}>Agregar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>


          <Dialog open={crearOpen} onOpenChange={(open) => { setCrearOpen(open); if (!open) setEditingCertId(null); }}>
            <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {isEditing ? "Editar Certificado" : "Nuevo Certificado"} — {selectedObra?.nombre}
                </DialogTitle>
                {(() => {
                  const totalConceptos = itemsDraft.length;
                  return totalConceptos > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {totalConceptos} conceptos — desplazá para ver todos
                    </p>
                  ) : null;
                })()}
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Tipo</Label>
                  <Select value={tipoCert} onValueChange={(v) => setTipoCert(v as TipoCertificado)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="servicio">Servicio</SelectItem>
                      <SelectItem value="obra">Obra (con acumulados)</SelectItem>
                      <SelectItem value="mixto">Mixto (Obra + Servicio)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Período</Label>
                  <Input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
                </div>
                <div>
                  <Label>Fecha del certificado</Label>
                  <Input type="date" value={fechaCertificado} onChange={(e) => setFechaCertificado(e.target.value)} />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input value={numeroCert} onChange={(e) => setNumeroCert(e.target.value)} placeholder="CERT-001 (auto si vacío)" />
                </div>
                {(tipoCert === "obra" || tipoCert === "mixto") && (
                  <div>
                    <Label>Anticipo (%)</Label>
                    <Input type="number" min={0} max={100} value={anticipoPorcentaje || ""} onChange={(e) => setAnticipoPorcentaje(Number(e.target.value))} />
                  </div>
                )}
                <div className={(tipoCert === "obra" || tipoCert === "mixto") ? "" : "sm:col-span-2"}>
                  <Label>Observaciones</Label>
                  <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas adicionales..." className="min-h-[60px]" />
                </div>
              </div>
              <div className="pr-2">
                <div className="space-y-4">
                  {tipoCert === "servicio" ? (
                    /* ---- SERVICIO: editable grid ---- */
                    <CertificadoServiceGrid
                      items={itemsDraft.filter((i) => !i.seccion)}
                      seccion={null}
                      conceptos={conceptos.filter(c => c.tipo === 'servicio')}
                      onItemsChange={(newServiceItems) => {
                        const otherItems = itemsDraft.filter((i) => i.seccion != null);
                        setItemsDraft([...otherItems, ...newServiceItems]);
                      }}
                    />
                  ) : tipoCert === "obra" ? (
                    /* ---- OBRA: grouped by etapa with acumulado columns ---- */
                    <>
                      {draftGroupedEtapa.map((group) => {
                        const groupAvanceActual = group.items.reduce((s, i) => s + i.subtotal, 0);
                        return (
                          <div key={group.etapa}>
                            <div className="bg-muted px-3 py-2 rounded-t-md font-semibold text-sm flex items-center justify-between gap-2">
                              <span>{group.items[0]?.categoria ? `${group.items[0].categoria} > ${group.etapa}` : group.etapa}</span>
                              <div className="flex gap-1">
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" disabled={draftGroupedEtapa[0]?.etapa === group.etapa} onClick={() => moveEtapaInDraft(group.etapa, -1, "obra")} title="Subir"><ArrowUp className="w-3.5 h-3.5" /></Button>
                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" disabled={draftGroupedEtapa[draftGroupedEtapa.length - 1]?.etapa === group.etapa} onClick={() => moveEtapaInDraft(group.etapa, 1, "obra")} title="Bajar"><ArrowDown className="w-3.5 h-3.5" /></Button>
                              </div>
                            </div>
                            <div className="overflow-hidden">
                              <Table className="text-xs">
                               <TableHeader>
                                  <TableRow>
                                    <TableHead className="px-1.5 py-2">Concepto</TableHead>
                                    <TableHead className="px-1.5 py-2">Cat.</TableHead>
                                    <TableHead className="px-1.5 py-2">Un.</TableHead>
                                    <TableHead className="px-1.5 py-2 text-right">P.Unit.</TableHead>
                                    <TableHead className="px-1.5 py-2 text-right">C.Tot</TableHead>
                                    <TableHead className="px-1.5 py-2 text-right">V.Tot</TableHead>
                                    <TableHead className="px-1.5 py-2 text-right">%Ant.</TableHead>
                                    <TableHead className="px-1.5 py-2 w-24">C.Act.</TableHead>
                                    <TableHead className="px-1.5 py-2 text-right">%Act.</TableHead>
                                    <TableHead className="px-1.5 py-2 text-right">%Ac.</TableHead>
                                    <TableHead className="px-1.5 py-2 text-right">Av.A</TableHead>
                                    <TableHead className="px-1.5 py-2 text-right">Av.Act</TableHead>
                                    <TableHead className="px-1.5 py-2 text-right">Av.Ac</TableHead>
                                    <TableHead className="px-1 py-2 w-8"></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {group.items.map((item) => {
                                    const globalIdx = itemsDraft.indexOf(item);
                                    const ac = getAcumuladoForItem(item.concepto_id);
                                    const cantTotal = item.cantidad_total || 0;
                                    const pctAnterior = cantTotal > 0 ? (ac.cantidad_anterior / cantTotal) * 100 : 0;
                                    const pctActual = cantTotal > 0 ? (item.cantidad / cantTotal) * 100 : 0;
                                    const pctAcumulado = pctAnterior + pctActual;
                                    const avAnterior = ac.avance_anterior;
                                    const avActual = item.subtotal;
                                    const avAcumulado = avAnterior + avActual;
                                    const valorTotal = cantTotal * item.precio_unitario;
                                    return (
                                      <TableRow key={globalIdx}>
                                        <TableCell className="px-1.5 py-1.5 font-medium truncate max-w-[120px]" title={item.descripcion}>{item.descripcion}</TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-muted-foreground">{item.categoria || "-"}</TableCell>
                                        <TableCell className="px-1.5 py-1.5">{item.unidad}</TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(item.precio_unitario)}</TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-right">{cantTotal.toLocaleString("es-AR")}</TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(valorTotal)}</TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-right text-muted-foreground">{formatPercent(pctAnterior)}</TableCell>
                                        <TableCell className="px-1.5 py-1.5">
                                          <Input type="number" min={0} value={item.cantidad || ""} onChange={(e) => updateItemCantidad(globalIdx, Number(e.target.value))} className="h-7 w-20 text-xs" />
                                        </TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-right">{formatPercent(pctActual)}</TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-right font-medium">{formatPercent(pctAcumulado)}</TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-right text-muted-foreground">{formatCurrency(avAnterior)}</TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(avActual)}</TableCell>
                                        <TableCell className="px-1.5 py-1.5 text-right font-medium">{formatCurrency(avAcumulado)}</TableCell>
                                        <TableCell className="px-1 py-1.5">
                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeItemFromDraft(globalIdx)}>
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                                <TableFooter>
                                  <TableRow>
                                    <TableCell colSpan={12} className="px-1.5 text-right text-xs font-medium">Subtotal {group.etapa}</TableCell>
                                    <TableCell className="px-1.5 text-right font-semibold text-xs">{formatCurrency(groupAvanceActual)}</TableCell>
                                    <TableCell />
                                  </TableRow>
                                </TableFooter>
                              </Table>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    /* ---- MIXTO: Sección Obra + Sección Servicio ---- */
                    <>
                      {/* SECCIÓN OBRA */}
                      <div className="rounded-md border border-primary/30 overflow-hidden">
                        <div className="bg-primary/10 px-4 py-2 flex items-center justify-between">
                          <span className="font-semibold text-sm text-primary">Sección Obra (con acumulados)</span>
                          {conceptosNoEnDraftObra.length > 0 && (
                            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => { setAddExtraConceptoOpen(true); setAddExtraConceptoSection("obra"); }}>
                              <Plus className="w-3 h-3 mr-1" />Agregar concepto
                            </Button>
                          )}
                        </div>
                        {draftMixtoObraGrouped.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                            No hay conceptos de obra. Agregá uno con el botón de arriba.
                          </div>
                        ) : (
                          draftMixtoObraGrouped.map((group) => {
                            const groupAvanceActual = group.items.reduce((s, i) => s + i.subtotal, 0);
                            return (
                              <div key={group.etapa}>
                                <div className="bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground border-l-2 border-primary/40 ml-2 mt-1 flex items-center justify-between gap-2">
                                  <span>{group.items[0]?.categoria ? `${group.items[0].categoria} > ${group.etapa}` : group.etapa}</span>
                                  <div className="flex gap-1">
                                    <Button type="button" variant="ghost" size="icon" className="h-5 w-5" disabled={draftMixtoObraGrouped[0]?.etapa === group.etapa} onClick={() => moveEtapaInDraft(group.etapa, -1, "mixto-obra")} title="Subir"><ArrowUp className="w-3 h-3" /></Button>
                                    <Button type="button" variant="ghost" size="icon" className="h-5 w-5" disabled={draftMixtoObraGrouped[draftMixtoObraGrouped.length - 1]?.etapa === group.etapa} onClick={() => moveEtapaInDraft(group.etapa, 1, "mixto-obra")} title="Bajar"><ArrowDown className="w-3 h-3" /></Button>
                                  </div>
                                </div>
                                <div className="overflow-hidden">
                                  <Table className="text-xs">
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="px-1.5 py-2">Concepto</TableHead>
                                        <TableHead className="px-1.5 py-2">Cat.</TableHead>
                                        <TableHead className="px-1.5 py-2">Un.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">P.Unit.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">C.Tot</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">V.Tot</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">%Ant.</TableHead>
                                        <TableHead className="px-1.5 py-2 w-24">C.Act.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">%Act.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">%Ac.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">Av.A</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">Av.Act</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">Av.Ac</TableHead>
                                        <TableHead className="px-1 py-2 w-8"></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {group.items.map((item) => {
                                        const globalIdx = itemsDraft.indexOf(item);
                                        const ac = getAcumuladoForItem(item.concepto_id);
                                        const cantTotal = item.cantidad_total || 0;
                                        const pctAnterior = cantTotal > 0 ? (ac.cantidad_anterior / cantTotal) * 100 : 0;
                                        const pctActual = cantTotal > 0 ? (item.cantidad / cantTotal) * 100 : 0;
                                        const pctAcumulado = pctAnterior + pctActual;
                                        const avAnterior = ac.avance_anterior;
                                        const avActual = item.subtotal;
                                        const avAcumulado = avAnterior + avActual;
                                        const valorTotal = cantTotal * item.precio_unitario;
                                        return (
                                          <TableRow key={globalIdx}>
                                            <TableCell className="px-1.5 py-1.5 font-medium truncate max-w-[120px]" title={item.descripcion}>{item.descripcion}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-muted-foreground">{item.categoria || "-"}</TableCell>
                                            <TableCell className="px-1.5 py-1.5">{item.unidad}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(item.precio_unitario)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{cantTotal.toLocaleString("es-AR")}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(valorTotal)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right text-muted-foreground">{formatPercent(pctAnterior)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5">
                                              <Input type="number" min={0} value={item.cantidad || ""} onChange={(e) => updateItemCantidad(globalIdx, Number(e.target.value))} className="h-7 w-20 text-xs" />
                                            </TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{formatPercent(pctActual)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right font-medium">{formatPercent(pctAcumulado)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right text-muted-foreground">{formatCurrency(avAnterior)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(avActual)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right font-medium">{formatCurrency(avAcumulado)}</TableCell>
                                            <TableCell className="px-1 py-1.5">
                                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => removeItemFromDraft(globalIdx)}>
                                                <Trash2 className="w-3 h-3" />
                                              </Button>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                    <TableFooter>
                                      <TableRow>
                                        <TableCell colSpan={12} className="px-1.5 text-right text-xs font-medium">Subtotal {group.etapa}</TableCell>
                                        <TableCell className="px-1.5 text-right font-semibold text-xs">{formatCurrency(groupAvanceActual)}</TableCell>
                                        <TableCell />
                                      </TableRow>
                                    </TableFooter>
                                  </Table>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* SECCIÓN SERVICIO */}
                      <div className="rounded-md border border-secondary/50 overflow-hidden mt-4">
                        <div className="bg-secondary/30 px-4 py-2 flex items-center justify-between">
                          <span className="font-semibold text-sm">Sección Servicio (Precio × Cantidad)</span>
                        </div>
                        <div className="p-2">
                          <CertificadoServiceGrid
                            items={draftMixtoServicio}
                            seccion="servicio"
                            conceptos={conceptos.filter(c => c.tipo === 'servicio')}
                            onItemsChange={(newServiceItems) => {
                              const obraItems = itemsDraft.filter((i) => i.seccion === "obra");
                              setItemsDraft([...obraItems, ...newServiceItems]);
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {/* Totals - always visible outside scroll */}
              <div className="border-t pt-3 space-y-1 px-1">
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="incluir-iva" className="text-sm cursor-pointer">Incluir IVA (21%)</Label>
                  <Switch id="incluir-iva" checked={incluirIva} onCheckedChange={setIncluirIva} />
                </div>
                {tipoCert === "servicio" ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span className="font-semibold">{formatCurrency(draftSubtotal)}</span>
                    </div>
                    {incluirIva && (
                      <div className="flex justify-between text-sm">
                        <span>IVA 21%</span>
                        <span>{formatCurrency(draftIva)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold">
                      <span>TOTAL</span>
                      <span>{formatCurrency(draftTotal)}</span>
                    </div>
                  </>
                ) : tipoCert === "obra" ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Avance Anterior</span>
                      <span className="text-muted-foreground">{formatCurrency(avanceAnteriorTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avance Actual</span>
                      <span className="font-semibold">{formatCurrency(avanceActualTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Avance Acumulado</span>
                      <span className="font-semibold">{formatCurrency(avanceAcumuladoTotal)}</span>
                    </div>
                    {anticipoPorcentaje > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Anticipo ({anticipoPorcentaje}%)</span>
                        <span className="text-muted-foreground">- {formatCurrency(anticipoMonto)}</span>
                      </div>
                    )}
                    {incluirIva && (
                      <div className="flex justify-between text-sm">
                        <span>IVA 21%</span>
                        <span>{formatCurrency(draftIva)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold">
                      <span>TOTAL A PAGAR</span>
                      <span>{formatCurrency(draftTotal)}</span>
                    </div>
                  </>
                ) : (
                  /* MIXTO totals */
                  <>
                    {(() => {
                      const obraSubtotal = draftMixtoObra.reduce((s, i) => s + i.subtotal, 0);
                      const servicioSubtotal = draftMixtoServicio.reduce((s, i) => s + i.subtotal, 0);
                      const totalSub = obraSubtotal + servicioSubtotal;
                      const totalIva = incluirIva ? Math.round(totalSub * 0.21 * 100) / 100 : 0;
                      const anticipoMixto = Math.round(obraSubtotal * (anticipoPorcentaje / 100));
                      const totalFinal = totalSub - anticipoMixto + totalIva;
                      return (
                        <>
                          <div className="flex justify-between text-sm">
                            <span>Subtotal Obra</span>
                            <span className="font-medium">{formatCurrency(obraSubtotal)}</span>
                          </div>
                          {anticipoPorcentaje > 0 && (
                            <div className="flex justify-between text-sm pl-4 text-muted-foreground">
                              <span>Anticipo ({anticipoPorcentaje}%) s/ Obra</span>
                              <span>- {formatCurrency(Math.round(obraSubtotal * (anticipoPorcentaje / 100)))}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span>Subtotal Servicio</span>
                            <span className="font-medium">{formatCurrency(servicioSubtotal)}</span>
                          </div>
                          {incluirIva && (
                            <div className="flex justify-between text-sm">
                              <span>IVA 21%</span>
                              <span>{formatCurrency(totalIva)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold">
                            <span>TOTAL</span>
                            <span>{formatCurrency(totalFinal)}</span>
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setCrearOpen(false); setEditingCertId(null); }}>Cancelar</Button>
                <Button onClick={handleSaveCertificado} disabled={draftSubtotal === 0}>
                  {isEditing ? "Guardar Cambios" : "Crear Certificado"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ==================== ADD EXTRA CONCEPTO DIALOG (Multi-select, grouped) ==================== */}
          <Dialog open={addExtraConceptoOpen} onOpenChange={(open) => { setAddExtraConceptoOpen(open); if (!open) { setSelectedConceptoIds(new Set()); setAddExtraConceptoSection(null); } }}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {tipoCert === "obra" || (tipoCert === "mixto" && addExtraConceptoSection === "obra")
                    ? <><HardHat className="w-4 h-4 text-primary" />Agregar conceptos de Obra</>
                    : <><Wrench className="w-4 h-4" />Agregar conceptos de Servicio</>
                  }
                </DialogTitle>
              </DialogHeader>
              {(() => {
                const conceptosParaAgregar = tipoCert === "mixto"
                  ? (addExtraConceptoSection === "obra" ? conceptosNoEnDraftObra : conceptosNoEnDraftServicio)
                  : conceptosNoEnDraft;
                const groupedForDialog = groupByCategoria(conceptosParaAgregar);
                return conceptosParaAgregar.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay conceptos disponibles para agregar.</p>
                ) : (
                  <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-3">
                    {groupedForDialog.map(({ categoria, items }) => {
                      const etapaGroups = groupByEtapa(items);
                      return (
                        <div key={categoria}>
                          <div className="bg-muted px-3 py-1.5 rounded-md text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{categoria}</div>
                          {etapaGroups.map(({ etapa, items: etapaItems }) => (
                            <div key={etapa}>
                              {etapa !== "Sin etapa" && (
                                <div className="pl-3 py-1 text-xs font-medium text-muted-foreground border-l-2 border-primary/30 ml-2 mb-0.5">{etapa}</div>
                              )}
                              {etapaItems.map((c) => (
                                <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent cursor-pointer transition-colors">
                                  <Checkbox checked={selectedConceptoIds.has(c.id)} onCheckedChange={() => toggleConceptoSelection(c.id)} />
                                  <span className="flex-1 text-sm font-medium">{c.nombre}</span>
                                  <span className="text-xs text-muted-foreground">{c.unidad}</span>
                                </label>
                              ))}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              <DialogFooter>
                <Button variant="outline" onClick={() => { setAddExtraConceptoOpen(false); setSelectedConceptoIds(new Set()); }}>
                  Cancelar
                </Button>
                <Button onClick={addSelectedConceptosToDraft} disabled={selectedConceptoIds.size === 0}>
                  Agregar {selectedConceptoIds.size > 0 ? `(${selectedConceptoIds.size})` : ""}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ==================== VER CERTIFICADO ==================== */}
          <Dialog open={!!viewCertId} onOpenChange={(open) => { if (!open) setViewCertId(null); }}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {viewCert?.numero} — {selectedObra?.nombre}
                </DialogTitle>
              </DialogHeader>
              <div>
                {loadingItems ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : viewCert && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className={ESTADO_COLORS[viewCert.estado]}>
                        {ESTADO_LABELS[viewCert.estado]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {viewCert.tipo === "obra" ? "Obra" : viewCert.tipo === "mixto" ? "Mixto" : "Servicio"}
                      </Badge>
                      <span className="text-sm text-muted-foreground capitalize">
                        {format(parseISO(viewCert.periodo + "-01"), "MMMM yyyy", { locale: es })}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadPDF()} className="ml-auto">
                        <Download className="w-4 h-4 mr-1" /> PDF
                      </Button>
                    </div>

                    {/* Service or simple view */}
                    {viewCert.tipo === "servicio" ? (
                      <>
                        {viewGroupedCategoria.map((group) => {
                          const groupSubtotal = group.items.reduce((s, i) => s + i.subtotal, 0);
                          const etapas = Array.from(new Set(group.items.map((i: any) => i.etapa || ""))).filter(Boolean);
                          const hasEtapas = etapas.length > 0;
                          const itemsWithoutEtapa = group.items.filter((i: any) => !i.etapa);

                          const renderViewTable = (items: typeof group.items, showFooter = false) => (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Concepto</TableHead>
                                  <TableHead>Unidad</TableHead>
                                  <TableHead className="text-right">Cantidad</TableHead>
                                  <TableHead className="text-right">P. Unitario</TableHead>
                                  <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {items.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>{item.descripcion}</TableCell>
                                    <TableCell>{item.unidad}</TableCell>
                                    <TableCell className="text-right">{item.cantidad}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.precio_unitario)}</TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                              {showFooter && (
                                <TableFooter>
                                  <TableRow>
                                    <TableCell colSpan={4} className="text-right text-sm font-medium">Subtotal {group.categoria}</TableCell>
                                    <TableCell className="text-right font-semibold">{formatCurrency(groupSubtotal)}</TableCell>
                                  </TableRow>
                                </TableFooter>
                              )}
                            </Table>
                          );

                          return (
                            <div key={group.categoria}>
                              <div className="bg-muted px-3 py-2 rounded-t-md font-semibold text-sm">{group.categoria}</div>
                              {hasEtapas ? (
                                <>
                                  {etapas.map((etapa) => {
                                    const etapaItems = group.items.filter((i: any) => (i.etapa || "") === etapa);
                                    return (
                                      <div key={etapa}>
                                        <div className="bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground border-l-2 border-primary/40 ml-1 mt-1">{etapa}</div>
                                        {renderViewTable(etapaItems, false)}
                                      </div>
                                    );
                                  })}
                                  {itemsWithoutEtapa.length > 0 && renderViewTable(itemsWithoutEtapa, false)}
                                  <Table>
                                    <TableFooter>
                                      <TableRow>
                                        <TableCell colSpan={4} className="text-right text-sm font-medium">Subtotal {group.categoria}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(groupSubtotal)}</TableCell>
                                      </TableRow>
                                    </TableFooter>
                                  </Table>
                                </>
                              ) : (
                                renderViewTable(group.items, true)
                              )}
                            </div>
                          );
                        })}
                        <div className="border-t pt-3 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span className="font-semibold">{formatCurrency(viewCert.subtotal)}</span>
                          </div>
                          {viewCert.incluir_iva !== false && (
                            <div className="flex justify-between text-sm">
                              <span>IVA 21%</span>
                              <span>{formatCurrency(viewCert.iva)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold">
                            <span>TOTAL</span>
                            <span>{formatCurrency(viewCert.total)}</span>
                          </div>
                        </div>
                      </>
                    ) : viewCert.tipo === "obra" ? (
                      <>
                        {viewGroupedEtapa.map((group) => {
                          const groupAvanceActual = group.items.reduce((s, i) => s + i.subtotal, 0);
                          return (
                            <div key={group.etapa}>
                              <div className="bg-muted px-3 py-2 rounded-t-md font-semibold text-sm">{group.etapa}</div>
                              <div className="overflow-hidden">
                                <Table className="text-xs">
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="px-1.5 py-2">Concepto</TableHead>
                                      <TableHead className="px-1.5 py-2">Cat.</TableHead>
                                      <TableHead className="px-1.5 py-2">Un.</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">P.Unit.</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">C.Tot</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">V.Tot</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">%Ant.</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">C.Act.</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">%Act.</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">%Ac.</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">Av.A</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">Av.Act</TableHead>
                                      <TableHead className="px-1.5 py-2 text-right">Av.Ac</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {group.items.map((item) => {
                                      const ac = viewAcumulados.find((a) => a.concepto_id === item.concepto_id) || { cantidad_anterior: 0, avance_anterior: 0 };
                                      const cantTotal = (item.concepto_id && cantidadTotalMap[item.concepto_id]) || 0;
                                      const pctAnterior = cantTotal > 0 ? (ac.cantidad_anterior / cantTotal) * 100 : 0;
                                      const pctActual = cantTotal > 0 ? (item.cantidad / cantTotal) * 100 : 0;
                                      const pctAcumulado = pctAnterior + pctActual;
                                      const avAnterior = ac.avance_anterior;
                                      const avActual = item.subtotal;
                                      const avAcumulado = avAnterior + avActual;
                                      const valorTotal = cantTotal * item.precio_unitario;
                                      return (
                                        <TableRow key={item.id}>
                                          <TableCell className="px-1.5 py-1.5 font-medium truncate max-w-[120px]" title={item.descripcion}>{item.descripcion}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-muted-foreground">{(item.concepto_id && categoriaMap[item.concepto_id]) || "-"}</TableCell>
                                          <TableCell className="px-1.5 py-1.5">{item.unidad}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(item.precio_unitario)}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right">{cantTotal.toLocaleString("es-AR")}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(valorTotal)}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right text-muted-foreground">{formatPercent(pctAnterior)}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right">{item.cantidad}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right">{formatPercent(pctActual)}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right font-medium">{formatPercent(pctAcumulado)}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right text-muted-foreground">{formatCurrency(avAnterior)}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(avActual)}</TableCell>
                                          <TableCell className="px-1.5 py-1.5 text-right font-medium">{formatCurrency(avAcumulado)}</TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                  <TableFooter>
                                    <TableRow>
                                      <TableCell colSpan={12} className="px-1.5 text-right text-xs font-medium">Subtotal {group.etapa}</TableCell>
                                      <TableCell className="px-1.5 text-right font-semibold text-xs">{formatCurrency(groupAvanceActual)}</TableCell>
                                    </TableRow>
                                  </TableFooter>
                                </Table>
                              </div>
                            </div>
                          );
                        })}
                        <div className="border-t pt-3 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Avance Anterior</span>
                            <span className="text-muted-foreground">{formatCurrency(viewGroupedEtapa.reduce((s, g) => s + g.items.reduce((ss, i) => { const ac = viewAcumulados.find((a) => a.concepto_id === i.concepto_id); return ss + (ac?.avance_anterior || 0); }, 0), 0))}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span className="font-semibold">{formatCurrency(viewCert.subtotal)}</span>
                          </div>
                          {viewCert.incluir_iva !== false && (
                            <div className="flex justify-between text-sm">
                              <span>IVA 21%</span>
                              <span>{formatCurrency(viewCert.iva)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold">
                            <span>TOTAL</span>
                            <span>{formatCurrency(viewCert.total)}</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* MIXTO view */
                      <>
                        {/* Sección Obra */}
                        <div className="rounded-md border border-primary/30 overflow-hidden">
                          <div className="bg-primary/10 px-4 py-2">
                            <span className="font-semibold text-sm text-primary">Sección Obra (con acumulados)</span>
                          </div>
                          {viewMixtoObraGrouped.length === 0 ? (
                            <div className="px-4 py-4 text-sm text-muted-foreground text-center">Sin ítems de obra.</div>
                          ) : viewMixtoObraGrouped.map((group) => {
                            const groupAvanceActual = group.items.reduce((s, i) => s + i.subtotal, 0);
                            return (
                              <div key={group.etapa}>
                                <div className="bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground border-l-2 border-primary/40 ml-2 mt-1">{group.etapa}</div>
                                <div className="overflow-hidden">
                                  <Table className="text-xs">
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="px-1.5 py-2">Concepto</TableHead>
                                        <TableHead className="px-1.5 py-2">Cat.</TableHead>
                                        <TableHead className="px-1.5 py-2">Un.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">P.Unit.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">C.Tot</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">V.Tot</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">%Ant.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">C.Act.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">%Act.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">%Ac.</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">Av.A</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">Av.Act</TableHead>
                                        <TableHead className="px-1.5 py-2 text-right">Av.Ac</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {group.items.map((item) => {
                                        const ac = viewAcumulados.find((a) => a.concepto_id === item.concepto_id) || { cantidad_anterior: 0, avance_anterior: 0 };
                                        const cantTotal = (item.concepto_id && cantidadTotalMap[item.concepto_id]) || 0;
                                        const pctAnterior = cantTotal > 0 ? (ac.cantidad_anterior / cantTotal) * 100 : 0;
                                        const pctActual = cantTotal > 0 ? (item.cantidad / cantTotal) * 100 : 0;
                                        const pctAcumulado = pctAnterior + pctActual;
                                        const avAnterior = ac.avance_anterior;
                                        const avActual = item.subtotal;
                                        const avAcumulado = avAnterior + avActual;
                                        const valorTotal = cantTotal * item.precio_unitario;
                                        return (
                                          <TableRow key={item.id}>
                                            <TableCell className="px-1.5 py-1.5 font-medium truncate max-w-[120px]" title={item.descripcion}>{item.descripcion}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-muted-foreground">{(item.concepto_id && categoriaMap[item.concepto_id]) || "-"}</TableCell>
                                            <TableCell className="px-1.5 py-1.5">{item.unidad}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(item.precio_unitario)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{cantTotal.toLocaleString("es-AR")}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(valorTotal)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right text-muted-foreground">{formatPercent(pctAnterior)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{item.cantidad}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{formatPercent(pctActual)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right font-medium">{formatPercent(pctAcumulado)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right text-muted-foreground">{formatCurrency(avAnterior)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right">{formatCurrency(avActual)}</TableCell>
                                            <TableCell className="px-1.5 py-1.5 text-right font-medium">{formatCurrency(avAcumulado)}</TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                    <TableFooter>
                                      <TableRow>
                                        <TableCell colSpan={12} className="px-1.5 text-right text-xs font-medium">Subtotal {group.etapa}</TableCell>
                                        <TableCell className="px-1.5 text-right font-semibold text-xs">{formatCurrency(groupAvanceActual)}</TableCell>
                                      </TableRow>
                                    </TableFooter>
                                  </Table>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Sección Servicio */}
                        <div className="rounded-md border border-secondary/50 overflow-hidden mt-4">
                          <div className="bg-secondary/30 px-4 py-2">
                            <span className="font-semibold text-sm">Sección Servicio (Precio × Cantidad)</span>
                          </div>
                          {viewMixtoServicioGrouped.length === 0 ? (
                            <div className="px-4 py-4 text-sm text-muted-foreground text-center">Sin ítems de servicio.</div>
                          ) : viewMixtoServicioGrouped.map((group) => {
                            const groupSubtotal = group.items.reduce((s, i) => s + i.subtotal, 0);
                            return (
                              <div key={group.categoria}>
                                <div className="bg-muted px-3 py-1.5 text-sm font-semibold">{group.categoria}</div>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Concepto</TableHead>
                                      <TableHead>Unidad</TableHead>
                                      <TableHead className="text-right">Cantidad</TableHead>
                                      <TableHead className="text-right">P. Unitario</TableHead>
                                      <TableHead className="text-right">Subtotal</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {group.items.map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell>{item.descripcion}</TableCell>
                                        <TableCell>{item.unidad}</TableCell>
                                        <TableCell className="text-right">{item.cantidad}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.precio_unitario)}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(item.subtotal)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                  <TableFooter>
                                    <TableRow>
                                      <TableCell colSpan={4} className="text-right text-sm font-medium">Subtotal {group.categoria}</TableCell>
                                      <TableCell className="text-right font-semibold">{formatCurrency(groupSubtotal)}</TableCell>
                                    </TableRow>
                                  </TableFooter>
                                </Table>
                              </div>
                            );
                          })}
                        </div>

                        {/* Totals Mixto */}
                        <div className="border-t pt-3 space-y-1">
                          {(() => {
                            const obraSubtotal = viewMixtoObra.reduce((s, i) => s + i.subtotal, 0);
                            const servicioSubtotal = viewMixtoServicio.reduce((s, i) => s + i.subtotal, 0);
                            const obraAvAnterior = viewMixtoObra.reduce((s, i) => {
                              const ac = viewAcumulados.find((a) => a.concepto_id === i.concepto_id);
                              return s + (ac?.avance_anterior || 0);
                            }, 0);
                            const viewAnticipo = Math.round((obraSubtotal + obraAvAnterior) * (viewCert.anticipo_porcentaje / 100));
                            return (
                              <>
                                <div className="flex justify-between text-sm">
                                  <span>Subtotal Obra</span>
                                  <span className="font-medium">{formatCurrency(obraSubtotal)}</span>
                                </div>
                                {viewCert.anticipo_porcentaje > 0 && (
                                  <div className="flex justify-between text-sm pl-4 text-muted-foreground">
                                    <span>Anticipo ({viewCert.anticipo_porcentaje}%) s/ Obra</span>
                                    <span>- {formatCurrency(viewAnticipo)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm">
                                  <span>Subtotal Servicio</span>
                                  <span className="font-medium">{formatCurrency(servicioSubtotal)}</span>
                                </div>
                                {viewCert.incluir_iva !== false && (
                                  <div className="flex justify-between text-sm">
                                    <span>IVA 21%</span>
                                    <span>{formatCurrency(viewCert.iva)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-lg font-bold">
                                  <span>TOTAL</span>
                                  <span>{formatCurrency(viewCert.total)}</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </>
                    )}
                    {viewCert.observaciones && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Observaciones:</strong> {viewCert.observaciones}
                      </p>
                    )}

                    {/* ---- PAGOS SECTION ---- */}
                    <div className="border-t pt-4 mt-4 space-y-3">
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <DollarSign className="w-4 h-4" /> Pagos
                      </h4>

                      {/* Resumen + barra */}
                      {(() => {
                        const totalPagadoCert = viewPagos.reduce((s, p) => s + p.monto, 0);
                        const saldoCert = viewCert.total - totalPagadoCert;
                        const pct = viewCert.total > 0 ? Math.min(100, (totalPagadoCert / viewCert.total) * 100) : 0;
                        const barColor = pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
                        return (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm font-medium">
                              <span>Pagado: <span className="text-green-600 dark:text-green-400">{formatCurrency(totalPagadoCert)}</span></span>
                              <span>Saldo: <strong>{formatCurrency(saldoCert)}</strong></span>
                              <span>{pct.toFixed(1)}%</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                              <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })()}

                      {viewPagos.length > 0 ? (
                        <div className="rounded-md border overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Fecha</TableHead>
                                <TableHead className="text-xs">Método</TableHead>
                                <TableHead className="text-xs">Referencia</TableHead>
                                <TableHead className="text-xs">Banco</TableHead>
                                <TableHead className="text-xs text-right">Monto</TableHead>
                                <TableHead className="text-xs text-right">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {viewPagos.map((pago) => (
                                <TableRow key={pago.id}>
                                  <TableCell className="text-xs">{format(parseISO(pago.fecha), "dd/MM/yyyy")}</TableCell>
                                  <TableCell className="text-xs">{pago.metodo ? (METODOS_PAGO.find(m => m.value === pago.metodo)?.label || pago.metodo) : "—"}</TableCell>
                                  <TableCell className="text-xs">{pago.referencia || "—"}</TableCell>
                                  <TableCell className="text-xs">{pago.banco || "—"}</TableCell>
                                  <TableCell className="text-xs text-right font-semibold">{formatCurrency(pago.monto)}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      {pago.comprobante_url && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver comprobante" onClick={() => handleOpenComprobante(pago.comprobante_url!)}>
                                          <Eye className="w-3.5 h-3.5" />
                                        </Button>
                                      )}
                                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Recibo PDF" onClick={() => handleReciboPDF(pago, viewPagos)}>
                                        <FileText className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => handleEditPago(pago)}>
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Eliminar" onClick={() => handleDeletePago(pago)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sin pagos registrados.</p>
                      )}

                      {/* Form */}
                      <div className="border rounded-md p-3 space-y-3 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide">
                            {editingPagoId ? "Editar pago" : "Registrar nuevo pago"}
                          </span>
                          {editingPagoId && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setEditingPagoId(null); setNewPago(emptyPago()); }}>
                              Cancelar
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Fecha</Label>
                            <Input type="date" value={newPago.fecha} onChange={(e) => setNewPago((p) => ({ ...p, fecha: e.target.value }))} className="h-8 text-xs" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Monto *</Label>
                            <Input type="number" min={0} step={0.01} placeholder="0" value={newPago.monto} onChange={(e) => setNewPago((p) => ({ ...p, monto: e.target.value }))} className="h-8 text-xs" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Método</Label>
                            <Select value={newPago.metodo} onValueChange={(v) => setNewPago((p) => ({ ...p, metodo: v as MetodoPago }))}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {METODOS_PAGO.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Referencia / N°</Label>
                            <Input placeholder="N° transf, cheque..." value={newPago.referencia} onChange={(e) => setNewPago((p) => ({ ...p, referencia: e.target.value }))} className="h-8 text-xs" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Banco</Label>
                            <Input placeholder="Banco" value={newPago.banco} onChange={(e) => setNewPago((p) => ({ ...p, banco: e.target.value }))} className="h-8 text-xs" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Comprobante</Label>
                            <Input type="file" accept="image/*,application/pdf" onChange={(e) => setNewPago((p) => ({ ...p, comprobante: e.target.files?.[0] || null }))} className="h-8 text-xs" />
                          </div>
                          <div className="space-y-1 col-span-2 md:col-span-3">
                            <Label className="text-xs">Descripción</Label>
                            <Input placeholder="Notas..." value={newPago.descripcion} onChange={(e) => setNewPago((p) => ({ ...p, descripcion: e.target.value }))} className="h-8 text-xs" />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" onClick={handleSavePago} disabled={!newPago.monto || Number(newPago.monto) <= 0} className="h-8">
                            <Plus className="w-3.5 h-3.5 mr-1" /> {editingPagoId ? "Guardar cambios" : "Registrar pago"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </MainLayout>
  );
}

// ---- Certificado Card Component ----

function CertificadoCard({
  cert,
  pagado = 0,
  onView,
  onEdit,
  onEmitir,
  onCobrar,
  onDelete,
  onDownloadPDF,
}: {
  cert: Certificado;
  pagado?: number;
  onView: () => void;
  onEdit: () => void;
  onEmitir: () => void;
  onCobrar: () => void;
  onDelete: () => void;
  onDownloadPDF: () => void;
}) {
  const saldo = cert.total - pagado;
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-lg">{cert.numero}</p>
              <Badge variant="outline" className="text-xs">
                {cert.tipo === "obra" ? "Obra" : cert.tipo === "mixto" ? "Mixto" : "Servicio"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground capitalize">
              {format(parseISO(cert.periodo + "-01"), "MMMM yyyy", { locale: es })}
            </p>
            {cert.fecha_certificado && (
              <p className="text-xs text-muted-foreground">
                Fecha: {format(parseISO(cert.fecha_certificado), "dd/MM/yyyy")}
              </p>
            )}
          </div>
          <Badge variant="secondary" className={ESTADO_COLORS[cert.estado]}>
            {ESTADO_LABELS[cert.estado]}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Subtotal</p>
            <p className="font-medium">{formatCurrency(cert.subtotal)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">IVA</p>
            <p className="font-medium">{formatCurrency(cert.iva)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Total</p>
            <p className="font-bold text-foreground">{formatCurrency(cert.total)}</p>
          </div>
        </div>
        {pagado > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Pagado</p>
              <p className="font-medium text-green-600 dark:text-green-400">{formatCurrency(pagado)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Saldo</p>
              <p className="font-bold">{formatCurrency(saldo)}</p>
            </div>
          </div>
        )}
        {pagado === 0 && <div className="mb-4" />}

        {cert.fecha_emision && (
          <p className="text-xs text-muted-foreground mb-3">
            Emitido: {format(new Date(cert.fecha_emision), "dd/MM/yyyy")}
          </p>
        )}

        <div className="flex gap-1 border-t pt-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onView}>
                  <Eye className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver detalle</TooltipContent>
            </Tooltip>

            {cert.estado === "borrador" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onEdit}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar borrador</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onDownloadPDF}>
                  <Download className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Descargar PDF</TooltipContent>
            </Tooltip>

            {cert.estado === "borrador" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onEmitir}>
                    <Send className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Emitir certificado</TooltipContent>
              </Tooltip>
            )}

            {cert.estado === "emitido" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onCobrar}>
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Marcar como cobrado</TooltipContent>
              </Tooltip>
            )}

            {cert.estado === "borrador" && (
              <div className="ml-auto">
                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Eliminar</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminar certificado</AlertDialogTitle>
                      <AlertDialogDescription>
                        ¿Estás seguro de eliminar {cert.numero}? Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Inline editable concepto row ----

function ConceptoRow({
  concepto,
  onUpdate,
  onDelete,
}: {
  concepto: { id: string; nombre: string; unidad: string; precio_unitario: number; activo: boolean; categoria: string; cantidad_total: number; etapa: string | null };
  onUpdate: (u: { precio_unitario?: number; activo?: boolean; categoria?: string; nombre?: string; unidad?: string; cantidad_total?: number; etapa?: string | null }) => void;
  onDelete: () => void;
}) {
  const [nombre, setNombre] = useState(concepto.nombre);
  const [precio, setPrecio] = useState(String(concepto.precio_unitario));
  const [cantTotal, setCantTotal] = useState(String(concepto.cantidad_total || ""));
  const [etapa, setEtapa] = useState(concepto.etapa || "");

  // Sync local state when concepto changes from outside
  useEffect(() => {
    setNombre(concepto.nombre);
    setPrecio(String(concepto.precio_unitario));
    setCantTotal(String(concepto.cantidad_total || ""));
    setEtapa(concepto.etapa || "");
  }, [concepto.nombre, concepto.precio_unitario, concepto.cantidad_total, concepto.etapa]);

  const handleBlurNombre = () => {
    if (nombre.trim() && nombre !== concepto.nombre) onUpdate({ nombre: nombre.trim() });
  };
  const handleBlurPrecio = () => {
    const v = Number(precio);
    if (!isNaN(v) && v !== concepto.precio_unitario) onUpdate({ precio_unitario: v });
  };
  const handleBlurCantTotal = () => {
    const v = Number(cantTotal) || 0;
    if (v !== concepto.cantidad_total) onUpdate({ cantidad_total: v });
  };
  const handleBlurEtapa = () => {
    const v = etapa.trim() || null;
    if (v !== (concepto.etapa || null)) onUpdate({ etapa: v });
  };

  return (
    <TableRow className={!concepto.activo ? "opacity-50" : ""}>
      <TableCell className="p-1">
        <Input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={handleBlurNombre}
          className="h-8 text-sm border-transparent bg-transparent hover:border-input focus:border-input"
        />
      </TableCell>
      <TableCell className="p-1">
        <Select value={concepto.unidad} onValueChange={(v) => onUpdate({ unidad: v })}>
          <SelectTrigger className="h-8 text-sm border-transparent bg-transparent hover:border-input focus:border-input w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["HR", "DIA", "M3", "M2", "ML", "TN", "LT", "VJ", "UN", "GL"].map((u) => (
              <SelectItem key={u} value={u}>{u}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="p-1">
        <Input
          type="number"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          onBlur={handleBlurPrecio}
          className="h-8 text-sm text-right border-transparent bg-transparent hover:border-input focus:border-input w-28"
        />
      </TableCell>
      <TableCell className="p-1">
        <Input
          type="number"
          value={cantTotal}
          onChange={(e) => setCantTotal(e.target.value)}
          onBlur={handleBlurCantTotal}
          className="h-8 text-sm text-right border-transparent bg-transparent hover:border-input focus:border-input w-20"
        />
      </TableCell>
      <TableCell className="p-1">
        <Select value={concepto.categoria} onValueChange={(v) => onUpdate({ categoria: v })}>
          <SelectTrigger className="h-8 text-sm border-transparent bg-transparent hover:border-input focus:border-input w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIAS_CERTIFICADO.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="p-1">
        <Input
          value={etapa}
          onChange={(e) => setEtapa(e.target.value)}
          onBlur={handleBlurEtapa}
          placeholder="-"
          className="h-8 text-sm border-transparent bg-transparent hover:border-input focus:border-input"
        />
      </TableCell>
      <TableCell className="p-1">
        <Badge
          variant="secondary"
          className={
            concepto.activo
              ? "bg-green-500/15 text-green-700 dark:text-green-400 cursor-pointer"
              : "bg-muted text-muted-foreground cursor-pointer"
          }
          onClick={() => onUpdate({ activo: !concepto.activo })}
        >
          {concepto.activo ? "Activo" : "Inactivo"}
        </Badge>
      </TableCell>
      <TableCell className="text-right p-1">
        <TooltipProvider>
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Eliminar</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar concepto</AlertDialogTitle>
                <AlertDialogDescription>
                  ¿Eliminar "{concepto.nombre}"? Esto no afecta certificados ya emitidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TooltipProvider>
      </TableCell>
    </TableRow>
  );
}


// ---- Pagos Tab ----
function PagosTab({
  certificados,
  allPagos,
  onOpenComprobante,
  onOpenCert,
}: {
  certificados: Certificado[];
  allPagos: CertificadoPago[];
  onOpenComprobante: (path: string) => void;
  onOpenCert: (id: string) => void;
}) {
  const [fMes, setFMes] = useState("");
  const [fMetodo, setFMetodo] = useState<string>("__ALL__");
  const [fCert, setFCert] = useState<string>("__ALL__");
  const [fQ, setFQ] = useState("");

  const certMap = new Map(certificados.map((c) => [c.id, c]));

  const pagosFilt = allPagos.filter((p) => {
    if (fMes && !p.fecha.startsWith(fMes)) return false;
    if (fMetodo !== "__ALL__" && p.metodo !== fMetodo) return false;
    if (fCert !== "__ALL__" && p.certificado_id !== fCert) return false;
    if (fQ) {
      const q = fQ.toLowerCase();
      const c = certMap.get(p.certificado_id);
      if (
        !(p.referencia || "").toLowerCase().includes(q) &&
        !(p.banco || "").toLowerCase().includes(q) &&
        !(p.descripcion || "").toLowerCase().includes(q) &&
        !(c?.numero || "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const totalFacturado = certificados.reduce((s, c) => s + (c.estado !== "borrador" ? c.total : 0), 0);
  const totalCobrado = allPagos.reduce((s, p) => s + p.monto, 0);
  const totalPendiente = totalFacturado - totalCobrado;
  const hoy = Date.now();
  const totalVencido = certificados
    .filter((c) => {
      if (c.estado === "cobrado" || !c.fecha_emision) return false;
      const pagado = allPagos.filter((p) => p.certificado_id === c.id).reduce((s, p) => s + p.monto, 0);
      const dias = Math.floor((hoy - new Date(c.fecha_emision).getTime()) / 86400000);
      return dias > 30 && pagado < c.total;
    })
    .reduce((s, c) => {
      const pagado = allPagos.filter((p) => p.certificado_id === c.id).reduce((a, p) => a + p.monto, 0);
      return s + (c.total - pagado);
    }, 0);

  const exportCSV = () => {
    const headers = ["Fecha", "Certificado", "Periodo", "Monto", "Metodo", "Referencia", "Banco", "Descripcion"];
    const rows = pagosFilt.map((p) => {
      const c = certMap.get(p.certificado_id);
      return [
        p.fecha,
        c?.numero || "",
        c?.periodo || "",
        p.monto,
        p.metodo || "",
        (p.referencia || "").replace(/[",\n]/g, " "),
        (p.banco || "").replace(/[",\n]/g, " "),
        (p.descripcion || "").replace(/[",\n]/g, " "),
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pagos-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard title="Facturado" value={formatCurrency(totalFacturado)} icon={FileText} variant="primary" />
        <KPICard title="Cobrado" value={formatCurrency(totalCobrado)} icon={DollarSign} variant="success" />
        <KPICard title="Pendiente" value={formatCurrency(totalPendiente)} icon={Clock} variant="warning" />
        <KPICard title="Vencido (>30d)" value={formatCurrency(totalVencido)} icon={Clock} variant="warning" />
      </div>

      <Card>
        <CardContent className="p-3 flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[160px]">
            <Label className="text-xs">Buscar</Label>
            <Input className="h-8 text-xs" placeholder="Referencia, banco, cert..." value={fQ} onChange={(e) => setFQ(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Mes</Label>
            <Input type="month" className="h-8 text-xs w-36" value={fMes} onChange={(e) => setFMes(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Método</Label>
            <Select value={fMetodo} onValueChange={setFMetodo}>
              <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Todos</SelectItem>
                {METODOS_PAGO.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Certificado</Label>
            <Select value={fCert} onValueChange={setFCert}>
              <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Todos</SelectItem>
                {certificados.map((c) => <SelectItem key={c.id} value={c.id}>{c.numero}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={pagosFilt.length === 0}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {pagosFilt.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No hay pagos.</CardContent></Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Certificado</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Banco</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagosFilt.map((p) => {
                const c = certMap.get(p.certificado_id);
                return (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/40" onClick={() => onOpenCert(p.certificado_id)}>
                    <TableCell className="text-xs">{format(parseISO(p.fecha), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-xs font-medium">{c?.numero || "—"}</TableCell>
                    <TableCell className="text-xs">{c?.periodo || "—"}</TableCell>
                    <TableCell className="text-xs">{p.metodo ? METODOS_PAGO.find((m) => m.value === p.metodo)?.label || p.metodo : "—"}</TableCell>
                    <TableCell className="text-xs">{p.referencia || "—"}</TableCell>
                    <TableCell className="text-xs">{p.banco || "—"}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">{formatCurrency(p.monto)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {p.comprobante_url && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenComprobante(p.comprobante_url!)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

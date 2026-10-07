import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { format, parseISO } from "date-fns";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Receipt,
  Loader2,
  Truck,
  DollarSign,
  Upload,
  Package,
  Plus,
  Download,
  FileText,
  RefreshCw,
  ChevronDown,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { FilterBar, FilterState, filterByDateAndObra } from "@/components/shared/FilterBar";
import { MultiSelectFilter } from "@/components/shared/MultiSelectFilter";

import { useUrlSearch } from "@/hooks/useUrlState";
import { useRemitos, RemitoForm, RemitoWithRelations } from "@/hooks/useRemitos";
import {
  useRemitoItemsMap,
  saveRemitoItems,
  resumenItems,
  totalItems,
  RemitoItemInput,
} from "@/hooks/useRemitoItems";
import { useRemitosCreators } from "@/hooks/useRemitosCreators";
import { useRemitosFilterOptions } from "@/hooks/useRemitosFilterOptions";

import { useAuth } from "@/hooks/useAuth";
import { useRemitosCatalogs } from "@/hooks/useRemitosCatalogs";
import type { ProveedorDB } from "@/hooks/useProveedores";
import { RemitosSimpleGrid } from "@/components/remitos/RemitosSimpleGrid";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck } from "lucide-react";

// Lazy-load heavy dialogs to keep initial Remitos render snappy
const RemitosCSVImportDialog = lazy(() =>
  import("@/components/remitos/CSVImportDialog").then(m => ({ default: m.RemitosCSVImportDialog }))
);
const ImportGauchoDialog = lazy(() =>
  import("@/components/remitos/ImportGauchoDialog").then(m => ({ default: m.ImportGauchoDialog }))
);
const RemitoQuickFormDialog = lazy(() =>
  import("@/components/remitos/RemitoQuickFormDialog").then(m => ({ default: m.RemitoQuickFormDialog }))
);
const LiquidacionClienteDialog = lazy(() =>
  import("@/components/remitos/LiquidacionClienteDialog").then(m => ({ default: m.LiquidacionClienteDialog }))
);
const LiquidacionObraDialog = lazy(() =>
  import("@/components/remitos/LiquidacionObraDialog").then(m => ({ default: m.LiquidacionObraDialog }))
);
const AsignarPreciosMasivosDialog = lazy(() =>
  import("@/components/remitos/AsignarPreciosMasivosDialog").then(m => ({ default: m.AsignarPreciosMasivosDialog }))
);

// Re-export type for local usage
type RemitoEditData = import("@/components/remitos/RemitoQuickFormDialog").RemitoEditData;

export default function Remitos() {
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission("remitos.manage");
  const canViewCreators = hasPermission("users.view");
  const { remitos, loading, batchSave, createRemito, fetchRemitos, loadAll, cargarHistorico, cargandoHistorico } = useRemitos();
  const remitoIds = useMemo(() => remitos.map((remito) => remito.id), [remitos]);
  const { itemsMap, invalidateItems } = useRemitoItemsMap(remitoIds);
  const { obras, maquinarias, clientes } = useRemitosCatalogs();

  const [searchTerm, setSearchTerm] = useUrlSearch("");
  // Debounced version used by the heavy filter computation
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 250);
    return () => clearTimeout(t);
  }, [searchTerm]);
  const [filters, setFilters] = useState<FilterState>({
    fechaDesde: undefined,
    fechaHasta: undefined,
    mes: undefined,
    obraId: undefined,
    maquinariaId: undefined,
  });
  const [importOpen, setImportOpen] = useState(false);
  const [importGauchoOpen, setImportGauchoOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingRemito, setEditingRemito] = useState<RemitoEditData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [recalculando, setRecalculando] = useState(false);
  const [liquidacionOpen, setLiquidacionOpen] = useState(false);
  const [liquidacionObraOpen, setLiquidacionObraOpen] = useState(false);
  const [preciosOpen, setPreciosOpen] = useState(false);
  const [tipoFilter, setTipoFilter] = useState<string[]>([]);
  const [creadorFilter, setCreadorFilter] = useState<string[]>([]);
  const [proveedorFilter, setProveedorFilter] = useState<string[]>([]);
  const [transporteFilter, setTransporteFilter] = useState<string[]>([]);
  const [desdeFilter, setDesdeFilter] = useState<string[]>([]);
  const [hastaFilter, setHastaFilter] = useState<string[]>([]);


  const hayFiltrosDeValor =
    tipoFilter.length > 0 ||
    proveedorFilter.length > 0 ||
    transporteFilter.length > 0 ||
    desdeFilter.length > 0 ||
    hastaFilter.length > 0 ||
    creadorFilter.length > 0 ||
    (filters.obraIds?.length ?? 0) > 0 ||
    (filters.maquinariaIds?.length ?? 0) > 0 ||
    !!filters.obraId ||
    !!filters.maquinariaId;

  // Auto-extender: al filtrar por fechas viejas o por cualquier valor (obra, tipo,
  // proveedor, transporte, origen/destino, usuario) cargamos el histórico completo
  // para no mostrar resultados incompletos.
  useEffect(() => {
    if (loadAll) return;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const desde = filters.fechaDesde ? new Date(filters.fechaDesde) : null;
    const mes = filters.mes ? new Date(filters.mes + "-01") : null;
    if ((desde && desde < cutoff) || (mes && mes < cutoff) || hayFiltrosDeValor) {
      cargarHistorico();
    }
  }, [filters.fechaDesde, filters.mes, hayFiltrosDeValor, loadAll, cargarHistorico]);

  // Opciones de filtros traídas de la base completa (no solo de lo cargado en pantalla)
  const { options: filterOptions } = useRemitosFilterOptions(null, !!user);

  const creadorIds = filterOptions.creadores;
  const creadoresMap = useRemitosCreators(creadorIds, canViewCreators);

  const tiposUnicos = filterOptions.tipos;
  const proveedoresUnicos = filterOptions.proveedores;
  const transportesUnicos = filterOptions.transportes;
  const desdeUnicos = filterOptions.desde;
  const hastaUnicos = filterOptions.hasta;

  const proveedores = useMemo<ProveedorDB[]>(() => proveedoresUnicos.map((nombre) => ({
    id: nombre, nombre, cuit: null, direccion: null, localidad: null, telefono: null,
    email: null, contacto: null, rubro: null, observaciones: null, activo: true,
    created_at: "", updated_at: "",
  })), [proveedoresUnicos]);

  // Conservados únicamente para los diálogos de importación, que permanecen
  // deshabilitados hasta contar con un flujo v2 específico y validado.
  const maquinariasMap = useMemo(() => Object.fromEntries(
    maquinarias.filter((item) => item.codigo).map((item) => [item.codigo, item.id]),
  ), [maquinarias]);
  const patentesMap = useMemo(() => Object.fromEntries(
    maquinarias.filter((item) => item.patente).flatMap((item) => {
      const patente = item.patente!.toUpperCase();
      return [[patente, item.id], [patente.replace(/[-\s]/g, ""), item.id]];
    }),
  ), [maquinarias]);
  const obrasMap = useMemo(() => Object.fromEntries(
    obras.flatMap((obra) => [[obra.nombre.toLowerCase().trim(), obra.nombre], ...(obra.numero ? [[obra.numero.toLowerCase().trim(), obra.nombre]] : [])]),
  ), [obras]);
  const obrasClienteMap = useMemo(() => Object.fromEntries(
    obras.filter((obra) => obra.cliente?.nombre).map((obra) => [obra.nombre, obra.cliente!.nombre]),
  ), [obras]);
  const clientesMap = useMemo(() => Object.fromEntries(
    clientes.filter((cliente) => cliente.activo).map((cliente) => [cliente.nombre.toLowerCase().trim(), cliente.nombre]),
  ), [clientes]);



  // Maquinarias lookup for search
  const maquinariasById = useMemo(() => {
    const map: Record<string, { codigo: string | null; patente: string | null }> = {};
    maquinarias.forEach(m => { map[m.id] = { codigo: m.codigo, patente: m.patente }; });
    return map;
  }, [maquinarias]);

  // Base: filtro por fecha + búsqueda (no incluye los filtros por valor)
  const baseRemitos = useMemo(() => {
    const result = filterByDateAndObra(
      remitos.map(r => ({ ...r, fecha: r.fecha, obra_id: r.obra_id })),
      { ...filters, obraId: undefined, maquinariaId: undefined }
    );

    if (!debouncedSearch) return result;

    const term = debouncedSearch.toLowerCase();
    return result.filter((r) => {
      if (
        (r.remito_tercero?.toLowerCase() || "").includes(term) ||
        (r.remito_local?.toLowerCase() || "").includes(term) ||
        r.numero.toLowerCase().includes(term) ||
        (r.tipo_material?.toLowerCase() || "").includes(term) ||
        (r.tipo_transporte?.toLowerCase() || "").includes(term) ||
        (r.proveedor?.toLowerCase() || "").includes(term) ||
        (r.cliente?.toLowerCase() || "").includes(term) ||
        ((r as any).cliente_destino?.toLowerCase() || "").includes(term) ||
        ((r as any).cliente_cantera?.toLowerCase() || "").includes(term) ||
        (r.desde?.toLowerCase() || "").includes(term) ||
        (r.hasta?.toLowerCase() || "").includes(term)
      ) return true;

      if (r.maquinaria_id) {
        const maq = maquinariasById[r.maquinaria_id];
        if (maq) {
          if (maq.codigo?.toLowerCase().includes(term)) return true;
          if (maq.patente?.toLowerCase().includes(term)) return true;
        }
      }

      return false;
    });
  }, [remitos, filters, debouncedSearch, maquinariasById]);

  type FiltroKey = "obra" | "maquinaria" | "tipo" | "proveedor" | "transporte" | "desde" | "hasta" | "creador";

  // Predicados por filtro. La obra se compara contra desde/hasta, pero si el usuario
  // ya eligió Desde y/o Hasta explícitamente, la obra solo se aplica al lado libre
  // para que los filtros no se pisen entre sí.
  const matchers = useMemo(() => {
    const obraIds = filters.obraIds ?? (filters.obraId ? [filters.obraId] : []);
    const nombresObra = obras.filter(o => obraIds.includes(o.id)).map(o => o.nombre);
    const maqIds = filters.maquinariaIds ?? (filters.maquinariaId ? [filters.maquinariaId] : []);

    const m: Partial<Record<FiltroKey, (r: RemitoWithRelations) => boolean>> = {};

    if (nombresObra.length > 0) {
      const usaDesde = desdeFilter.length > 0;
      const usaHasta = hastaFilter.length > 0;
      m.obra = (r) => {
        if (usaDesde && usaHasta) return true; // origen y destino ya definidos por el usuario
        if (usaDesde) return nombresObra.includes(r.hasta || "");
        if (usaHasta) return nombresObra.includes(r.desde || "");
        return nombresObra.includes(r.desde || "") || nombresObra.includes(r.hasta || "");
      };
    }
    if (maqIds.length > 0) m.maquinaria = (r) => !!r.maquinaria_id && maqIds.includes(r.maquinaria_id);
    if (tipoFilter.length > 0) m.tipo = (r) => !!r.tipo_material && tipoFilter.includes(r.tipo_material);
    if (proveedorFilter.length > 0) m.proveedor = (r) => !!r.proveedor && proveedorFilter.includes(r.proveedor);
    if (transporteFilter.length > 0) m.transporte = (r) => !!r.tipo_transporte && transporteFilter.includes(r.tipo_transporte);
    if (desdeFilter.length > 0) m.desde = (r) => !!r.desde && desdeFilter.includes(r.desde);
    if (hastaFilter.length > 0) m.hasta = (r) => !!r.hasta && hastaFilter.includes(r.hasta);
    if (creadorFilter.length > 0) m.creador = (r) => creadorFilter.includes((r as any).created_by);

    return m;
  }, [filters, obras, tipoFilter, proveedorFilter, transporteFilter, desdeFilter, hastaFilter, creadorFilter]);

  const applyMatchers = (rows: RemitoWithRelations[], excluir?: FiltroKey) =>
    rows.filter(r =>
      (Object.keys(matchers) as FiltroKey[])
        .filter(k => k !== excluir)
        .every(k => matchers[k]!(r))
    );

  const filteredRemitos = useMemo(
    () => applyMatchers(baseRemitos as RemitoWithRelations[]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseRemitos, matchers]
  );

  // Conteos por opción, calculados sobre el resto de filtros activos
  const conteos = useMemo(() => {
    const contar = (excluir: FiltroKey, get: (r: RemitoWithRelations) => string | null | undefined) => {
      const map: Record<string, number> = {};
      applyMatchers(baseRemitos as RemitoWithRelations[], excluir).forEach(r => {
        const v = get(r);
        if (v) map[v] = (map[v] || 0) + 1;
      });
      return map;
    };
    return {
      tipo: contar("tipo", r => r.tipo_material),
      proveedor: contar("proveedor", r => r.proveedor),
      transporte: contar("transporte", r => r.tipo_transporte),
      desde: contar("desde", r => r.desde),
      hasta: contar("hasta", r => r.hasta),
      creador: contar("creador", r => (r as any).created_by),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseRemitos, matchers]);


  const generateNumero = () => {
    const year = new Date().getFullYear();
    const count = remitos.length + 1;
    return `REM-${year}-${count.toString().padStart(4, "0")}`;
  };

  const handleEdit = (r: RemitoWithRelations) => {
    if (!canManage) return;
    setEditingRemito({
      id: r.id,
      fecha: r.fecha,
      remito_tercero: r.remito_tercero || "",
      remito_local: r.remito_local || r.numero || "",
      desde: r.desde || "",
      hasta: r.hasta || "",
      tipo_material: r.tipo_material || r.material || "",
      tipo_transporte: r.tipo_transporte || "",
      maquinaria_id: r.maquinaria_id || "",
      patente_tercero: r.patente_tercero || "",
      cliente: r.cliente || "",
      cliente_destino: (r as any).cliente_destino || "",
      cantidad_viajes: r.cantidad_viajes || 1,
      cantidad_uni: r.cantidad_uni ?? null,
      cantidad: r.cantidad || 0,
      unidad: r.unidad || "M3",
      precio_unitario: r.precio_unitario ?? null,
      precio_total: r.precio_total || 0,
      precio_calc_mode: r.precio_calc_mode || "viajes",
      proveedor: r.proveedor || "",
      observaciones: r.observaciones || "",
      forma_pago: (r as any).forma_pago || "",
      cliente_cantera: (r as any).cliente_cantera || "",
    });
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId || !canManage) return;
    try {
      await batchSave({ created: [], updated: [], deleted: [deleteId] });
      toast.success("Remito eliminado");
    } catch {
      toast.error("Error al eliminar");
    }
    setDeleteId(null);
  };

  const handleFormSubmit = async (
    remito: RemitoForm & { id?: string; items?: RemitoItemInput[] }
  ) => {
    if (!canManage) throw new Error("Sin permiso para administrar remitos");
    const { id, items, ...data } = remito;
    const linkedObra = obras.find((obra) => obra.nombre === data.hasta)
      ?? obras.find((obra) => obra.nombre === data.desde);
    data.obra_id = linkedObra?.id;
    if (id) {
      const results = await batchSave({ created: [], updated: [{ id, data }], deleted: [] });
      if (results.errors > 0) throw new Error("Error al actualizar");
      await saveRemitoItems(id, items || []);
      invalidateItems();
      toast.success("Remito actualizado");
    } else if (items && items.length > 0) {
      const created = await createRemito(data as RemitoForm);
      if (!created) throw new Error("Error al crear");
      await saveRemitoItems((created as any).id, items);
      invalidateItems();
      toast.success("Remito creado exitosamente");
    } else {
      const results = await batchSave({ created: [data as RemitoForm], updated: [], deleted: [] });
      if (results.errors > 0) throw new Error("Error al crear");
      toast.success("Remito creado exitosamente");
    }
    setEditingRemito(null);
  };

  const getClienteForObra = (obraNombre: string | null | undefined) => {
    if (!obraNombre) return "";
    const obra = obras.find(o => o.nombre === obraNombre);
    if (!obra) return "";
    const num = parseInt(obra.numero || "0", 10);
    if (num >= 300 && obra.cliente?.nombre) return obra.cliente.nombre;
    return "";
  };

  const handleRecalcularClientes = async () => {
    setRecalculando(true);
    try {
      const updates: { id: string; data: Partial<RemitoForm> }[] = [];

      for (const remito of remitos) {
        const nuevoCliente = getClienteForObra(remito.desde);
        const nuevoDestino = getClienteForObra(remito.hasta);

        const clienteChanged = (nuevoCliente || "") !== (remito.cliente || "");
        const destinoChanged = (nuevoDestino || "") !== (remito.cliente_destino || "");

        if (clienteChanged || destinoChanged) {
          updates.push({
            id: remito.id,
            data: {
              cliente: nuevoCliente || "",
              cliente_destino: nuevoDestino || "",
            },
          });
        }
      }

      if (updates.length === 0) {
        toast.info("Todos los clientes ya están correctos");
      } else {
        const results = await batchSave({ created: [], updated: updates, deleted: [] });
        toast.success(`${updates.length} remitos actualizados (${results.errors} errores)`);
      }
    } catch (error) {
      console.error("Error recalculando:", error);
      toast.error("Error al recalcular clientes");
    } finally {
      setRecalculando(false);
    }
  };

  const exportarExcel = async () => {
    if (filteredRemitos.length === 0) {
      toast.error("No hay remitos para exportar");
      return;
    }

    // Lazy-load xlsx to keep the initial bundle small
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();

    const getMaquinariaLabel = (maqId: string | null) => {
      if (!maqId) return "-";
      const m = maquinarias.find(m => m.id === maqId);
      return m ? [m.codigo, m.patente].filter(Boolean).join(" - ") : "-";
    };

    const data = filteredRemitos.map(r => ({
      "Fecha": r.fecha ? format(parseISO(r.fecha), "dd/MM/yyyy") : "",
      "Rem. Tercero": r.remito_tercero || "",
      "Rem. Local": r.remito_local || "",
      "Desde": r.desde || "",
      "Hasta": r.hasta || "",
      "Tipo Material": r.tipo_material || "",
      "Tipo Transporte": r.tipo_transporte || "",
      "Maquinaria": getMaquinariaLabel(r.maquinaria_id),
      "Pat. Tercero": r.patente_tercero || "",
      "Cliente Origen": r.cliente || "",
      "Cliente Destino": r.cliente_destino || "",
      "Cliente Cantera": (r as any).cliente_cantera || "",
      "Cant. Viajes": r.cantidad_viajes || 1,
      "Cant. Unitaria": r.cantidad_uni || "",
      "Cantidad Total": r.cantidad || 0,
      "Unidad": r.unidad || "",
      "Precio Unitario": r.precio_unitario || "",
      "Precio Total": (r.precio_total || 0) + totalItems(itemsMap[r.id]),
      "Ítems adicionales": resumenItems(itemsMap[r.id]),
      "Importe ítems": totalItems(itemsMap[r.id]) || "",
      "Forma de Pago": r.forma_pago || "",
      "Proveedor": r.proveedor || "",
      "Observaciones": r.observaciones || "",
      ...(canViewCreators ? { "Cargado por": (r as any).created_by ? (creadoresMap[(r as any).created_by] || "") : "" } : {}),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, ...data.map(row => String((row as any)[key] || "").length).slice(0, 50)) + 2,
    }));
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(workbook, ws, "Remitos");

    // Hoja "Ítems": una fila por ítem adicional (jornadas de máquina, servicios)
    const itemsRows: Record<string, string | number>[] = [];
    filteredRemitos.forEach((r) => {
      (itemsMap[r.id] || []).forEach((it) => {
        itemsRows.push({
          "Fecha": r.fecha ? format(parseISO(r.fecha), "dd/MM/yyyy") : "",
          "Rem. Local": r.remito_local || r.numero || "",
          "Rem. Tercero": r.remito_tercero || "",
          "Desde": r.desde || "",
          "Hasta": r.hasta || "",
          "Cantidad": it.cantidad,
          "Unidad": it.unidad,
          "Concepto": it.concepto,
          "Precio Unitario": it.precio_unitario,
          "Importe": it.precio_total,
        });
      });
    });
    if (itemsRows.length > 0) {
      const wsItems = XLSX.utils.json_to_sheet(itemsRows);
      wsItems["!cols"] = Object.keys(itemsRows[0]).map((key) => ({
        wch: Math.max(key.length, ...itemsRows.map((row) => String((row as any)[key] || "").length)) + 2,
      }));
      XLSX.utils.book_append_sheet(workbook, wsItems, "Ítems");
    }

    const fileName = `Remitos_${format(new Date(), "yyyyMMdd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success("Excel exportado correctamente");
  };

  // Stats calculations
  const totalRemitos = filteredRemitos.length;
  const totalViajes = filteredRemitos.reduce((sum, r) => sum + (r.cantidad_viajes || 1), 0);
  const cantidadPorUnidad = filteredRemitos.reduce<Record<string, number>>((acc, r) => {
    const u = (r.unidad || "M3").toUpperCase();
    acc[u] = (acc[u] || 0) + (r.cantidad || 0);
    return acc;
  }, {});
  const cantidadUnidadEntries = Object.entries(cantidadPorUnidad).sort(([a], [b]) => a.localeCompare(b));
  const totalPrecio = filteredRemitos.reduce(
    (sum, r) => sum + (r.precio_total || 0) + totalItems(itemsMap[r.id]),
    0
  );

  if (loading) {
    return (
      <MainLayout title="Remitos" subtitle="Gestión de remitos y entregas">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Remitos" subtitle="Gestión de remitos y entregas">
      {/* Filter Bar */}
      <div className="mb-4">
        <FilterBar
          obras={obras}
          maquinarias={maquinarias}
          showMaquinariaFilter
          multiple
          onFilterChange={setFilters}
        />
      </div>

      {/* Filtros adicionales (selección múltiple) */}
      <div className="flex flex-wrap gap-2 mb-4">
        <MultiSelectFilter
          className="w-[200px]"
          allLabel="Todos los tipos"
          itemsLabel="tipos"
          placeholder="Buscar tipo..."
          counts={conteos.tipo}
          options={tiposUnicos.map(t => ({ value: t, label: t }))}
          selected={tipoFilter}
          onChange={setTipoFilter}
        />
        <MultiSelectFilter
          className="w-[200px]"
          allLabel="Todos los proveedores"
          itemsLabel="proveedores"
          placeholder="Buscar proveedor..."
          counts={conteos.proveedor}
          options={proveedoresUnicos.map(p => ({ value: p, label: p }))}
          selected={proveedorFilter}
          onChange={setProveedorFilter}
        />
        <MultiSelectFilter
          className="w-[200px]"
          allLabel="Todos los transportes"
          itemsLabel="transportes"
          placeholder="Buscar transporte..."
          counts={conteos.transporte}
          options={transportesUnicos.map(t => ({ value: t, label: t }))}
          selected={transporteFilter}
          onChange={setTransporteFilter}
        />
        <MultiSelectFilter
          className="w-[200px]"
          allLabel="Desde (todos)"
          itemsLabel="orígenes"
          placeholder="Buscar origen..."
          counts={conteos.desde}
          options={desdeUnicos.map(d => ({ value: d, label: d }))}
          selected={desdeFilter}
          onChange={setDesdeFilter}
        />
        <MultiSelectFilter
          className="w-[200px]"
          allLabel="Hasta (todos)"
          itemsLabel="destinos"
          placeholder="Buscar destino..."
          counts={conteos.hasta}
          options={hastaUnicos.map(h => ({ value: h, label: h }))}
          selected={hastaFilter}
          onChange={setHastaFilter}
        />
        {canViewCreators && (
          <MultiSelectFilter
            className="w-[220px]"
            allLabel="Todos los usuarios"
            itemsLabel="usuarios"
            placeholder="Buscar usuario..."
            counts={conteos.creador}
            options={creadorIds.map(uid => ({
              value: uid,
              label: creadoresMap[uid] || `Usuario ${uid.slice(0, 8)}`,
            }))}
            selected={creadorFilter}
            onChange={setCreadorFilter}
          />
        )}
        {(tipoFilter.length + proveedorFilter.length + transporteFilter.length + desdeFilter.length + hastaFilter.length + creadorFilter.length) > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground"
            onClick={() => {
              setTipoFilter([]);
              setProveedorFilter([]);
              setTransporteFilter([]);
              setDesdeFilter([]);
              setHastaFilter([]);
              setCreadorFilter([]);
            }}
          >
            Limpiar filtros
          </Button>
        )}

      </div>

      {/* Chips de filtros activos */}
      {(() => {
        const chips: { key: string; label: string; onRemove: () => void }[] = [];
        const push = (
          values: string[],
          setter: (v: string[]) => void,
          prefijo: string,
          labelOf: (v: string) => string = (v) => v
        ) =>
          values.forEach(v =>
            chips.push({
              key: `${prefijo}-${v}`,
              label: `${prefijo}: ${labelOf(v)}`,
              onRemove: () => setter(values.filter(x => x !== v)),
            })
          );
        push(tipoFilter, setTipoFilter, "Tipo");
        push(proveedorFilter, setProveedorFilter, "Proveedor");
        push(transporteFilter, setTransporteFilter, "Transporte");
        push(desdeFilter, setDesdeFilter, "Desde");
        push(hastaFilter, setHastaFilter, "Hasta");
        push(creadorFilter, setCreadorFilter, "Usuario", (uid) => creadoresMap[uid] || uid.slice(0, 8));
        if (chips.length === 0) return null;
        return (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {chips.map(c => (
              <Badge key={c.key} variant="secondary" className="gap-1 pr-1">
                <span className="max-w-[220px] truncate">{c.label}</span>
                <button
                  type="button"
                  onClick={c.onRemove}
                  className="rounded-sm p-0.5 hover:bg-muted"
                  aria-label={`Quitar ${c.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {cargandoHistorico && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Cargando histórico completo...
              </span>
            )}
          </div>
        );
      })()}


      {/* Actions Bar */}
      <Alert className="mb-4">
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Funciones avanzadas pendientes de migración</AlertTitle>
        <AlertDescription>Importaciones masivas, asignación masiva de precios, liquidaciones y combustible permanecen visibles pero deshabilitados. El CRUD e ítems de Remitos operan exclusivamente sobre v2.</AlertDescription>
      </Alert>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por remito, tipo, transporte, código o patente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Button
          onClick={() => { setEditingRemito(null); setFormOpen(true); }}
          className="gap-2"
          disabled={!canManage}
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </Button>
        <Button
          variant="outline"
          onClick={exportarExcel}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar
        </Button>
        {!loadAll && (
          <Button
            variant="outline"
            onClick={cargarHistorico}
            className="gap-2"
            title="Por defecto se cargan sólo los últimos 90 días para mayor velocidad"
          >
            <RefreshCw className="w-4 h-4" />
            Cargar histórico
          </Button>
        )}
        <>
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="gap-2"
              disabled
            >
              <Upload className="w-4 h-4" />
              Importar
            </Button>
            <Button
              variant="outline"
              onClick={() => setImportGauchoOpen(true)}
              className="gap-2"
              disabled
            >
              <Upload className="w-4 h-4" />
              Importar remitos Canteras del Gaucho
            </Button>
            <Button
              variant="outline"
              onClick={() => setPreciosOpen(true)}
              className="gap-2"
              disabled
            >
              <DollarSign className="w-4 h-4" />
              Asignar Precios
            </Button>
            <Button
              variant="outline"
              onClick={handleRecalcularClientes}
              disabled
              className="gap-2"
            >
              {recalculando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Recalcular Clientes
            </Button>
        </>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2" disabled>
              <FileText className="w-4 h-4" />
              Liquidar
              <ChevronDown className="w-4 h-4 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLiquidacionOpen(true)} disabled>
              <FileText className="w-4 h-4 mr-2" />
              Por Cliente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLiquidacionObraOpen(true)} disabled>
              <FileText className="w-4 h-4 mr-2" />
              Por Obra
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{totalRemitos}</p>
            <p className="text-sm text-muted-foreground">Total Remitos</p>
          </div>
          <Receipt className="w-8 h-8 text-primary" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{totalViajes}</p>
            <p className="text-sm text-muted-foreground">Total Viajes</p>
          </div>
          <Truck className="w-8 h-8 text-success" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div className="min-w-0">
            {cantidadUnidadEntries.length === 0 ? (
              <p className="text-2xl font-bold text-foreground">0</p>
            ) : (
              <div className="space-y-0.5">
                {cantidadUnidadEntries.map(([unidad, total]) => (
                  <p key={unidad} className="text-lg font-bold text-foreground leading-tight">
                    {total.toLocaleString("es-AR")} <span className="text-sm text-muted-foreground">{unidad}</span>
                  </p>
                ))}
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-1">Cantidad Total</p>
          </div>
          <Package className="w-8 h-8 text-warning shrink-0" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              ${totalPrecio.toLocaleString("es-AR")}
            </p>
            <p className="text-sm text-muted-foreground">Precio Total</p>
          </div>
          <DollarSign className="w-8 h-8 text-muted-foreground" />
        </div>
      </div>

      {/* Read-only Grid */}
      {filteredRemitos.length === 0 && !loading && (
        <div className="card-industrial p-4 mb-4 text-sm text-muted-foreground">
          {cargandoHistorico
            ? "Cargando histórico completo, un momento..."
            : !loadAll
              ? "No hay remitos con estos filtros en los últimos 90 días. Usá 'Cargar histórico' para buscar en todo el historial."
              : "No hay remitos que cumplan con todos los filtros aplicados. Probá quitar alguno de los chips de arriba."}
        </div>
      )}
      <div className="card-industrial p-4">

        <RemitosSimpleGrid
          remitos={filteredRemitos}
          maquinarias={maquinarias}
          obras={obras}
          onEdit={handleEdit}
          onDelete={(id) => setDeleteId(id)}
          creadoresMap={canViewCreators ? creadoresMap : undefined}
          showClienteCantera={canViewCreators}
          hideExtrasForFranco={false}
          canManage={canManage}
          itemsMap={itemsMap}
        />
      </div>

      {/* Lazy-loaded dialogs: only mount when opened to keep first paint fast */}
      <Suspense fallback={null}>
        {importOpen && (
          <RemitosCSVImportDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            onImport={async (remitosToImport) => {
              const results = await batchSave({ created: remitosToImport, updated: [], deleted: [] });
              if (results.errors > 0) {
                throw new Error(`${results.errors} errores durante la importación`);
              }
              setTimeout(() => fetchRemitos(), 500);
            }}
            maquinariasMap={maquinariasMap}
            patentesMap={patentesMap}
            obrasMap={obrasMap}
            clientesMap={clientesMap}
          />
        )}

        {importGauchoOpen && (
          <ImportGauchoDialog
            open={importGauchoOpen}
            onOpenChange={setImportGauchoOpen}
            onImport={async (remitosToImport) => {
              const results = await batchSave({ created: remitosToImport, updated: [], deleted: [] });
              if (results.errors > 0) {
                throw new Error(`${results.errors} errores durante la importación`);
              }
              setTimeout(() => fetchRemitos(), 500);
            }}
            maquinariasMap={maquinariasMap}
            patentesMap={patentesMap}
            obrasMap={obrasMap}
            obrasClienteMap={obrasClienteMap}
          />
        )}


        {(formOpen || editingRemito) && (
          <RemitoQuickFormDialog
            open={formOpen}
            onOpenChange={(open) => {
              setFormOpen(open);
              if (!open) setEditingRemito(null);
            }}
            obras={obras}
            maquinarias={maquinarias}
            clientes={clientes}
            proveedores={proveedores}
            generateNumero={generateNumero}
            onSubmit={handleFormSubmit}
            editingRemito={editingRemito}
          />
        )}

        {liquidacionOpen && (
          <LiquidacionClienteDialog
            open={liquidacionOpen}
            onOpenChange={setLiquidacionOpen}
            remitos={filteredRemitos}
          />
        )}

        {liquidacionObraOpen && (
          <LiquidacionObraDialog
            open={liquidacionObraOpen}
            onOpenChange={setLiquidacionObraOpen}
            remitos={filteredRemitos}
          />
        )}

        {preciosOpen && (
          <AsignarPreciosMasivosDialog
            open={preciosOpen}
            onOpenChange={setPreciosOpen}
            remitos={filteredRemitos}
            batchSave={batchSave}
          />
        )}
      </Suspense>

      {/* Delete Confirm Dialog (lightweight, stays eager) */}
      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={handleDelete}
        title="¿Eliminar remito?"
        description="Esta acción no se puede deshacer. Se eliminará permanentemente este remito."
      />
    </MainLayout>
  );
}

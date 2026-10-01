import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  DataSheetGrid,
  textColumn,
  floatColumn,
  keyColumn,
  intColumn,
  isoDateColumn,
} from "react-datasheet-grid";
import "react-datasheet-grid/dist/style.css";
import { Button } from "@/components/ui/button";
import { Save, Plus, Loader2, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RemitoForm, RemitoWithRelations } from "@/hooks/useRemitos";
import { ClienteDB } from "@/hooks/useClientes";
import { MaquinariaWithRelations } from "@/hooks/useMaquinarias";
import { ObraWithRelations } from "@/hooks/useObras";
import { ProveedorDB } from "@/hooks/useProveedores";
import { GridSelectCell } from "@/components/shared/GridSelectCell";
import { useGridDraftPersistence } from "@/hooks/useGridDraftPersistence";
import { DraftRestorePrompt } from "@/components/shared/DraftRestorePrompt";
import { GridFilterToolbar, ColumnFilterHeader, useGridFilters, ColumnFilterConfig } from "@/components/shared/GridFilterToolbar";
import { formatDate } from "@/lib/utils";

// Type for react-datasheet-grid operations
interface Operation {
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  fromRowIndex: number;
  toRowIndex: number;
}

interface GridRow {
  id?: string;
  remito_tercero: string;
  remito_local: string;
  fecha: string | null;
  proveedor: string;
  desde: string;
  hasta: string;
  cliente: string;
  cantidad_viajes: number | null;
  cantidad_uni: number | null;
  unidad: string;
  cantidad: number | null;
  tipo_material: string;
  precio_unitario: number | null;
  precio_calc_mode: string;
  precio_total: number | null;
  tipo_transporte: string;
  maquinaria_id: string;
  patente_tercero: string;
  observaciones: string;
  row_color: string | null;
  _isNew?: boolean;
  _isModified?: boolean;
  _isDeleted?: boolean;
}

interface RemitosDataGridProps {
  remitos: RemitoWithRelations[];
  maquinarias: MaquinariaWithRelations[];
  obras: ObraWithRelations[];
  clientes?: ClienteDB[];
  proveedores?: ProveedorDB[];
  onSave: (changes: {
    created: RemitoForm[];
    updated: { id: string; data: Partial<RemitoForm> }[];
    deleted: string[];
  }) => Promise<void>;
  generateNumero: () => string;
  fullScreen?: boolean;
  onColorChange?: (id: string, color: string | null) => Promise<boolean>;
}

const ROW_COLORS = [
  { value: "yellow", label: "Amarillo", css: "bg-yellow-400" },
  { value: "green", label: "Verde", css: "bg-green-500" },
  { value: "blue", label: "Azul", css: "bg-blue-500" },
  { value: "orange", label: "Naranja", css: "bg-orange-500" },
  { value: "red", label: "Rojo", css: "bg-red-500" },
  { value: "violet", label: "Violeta", css: "bg-violet-500" },
];

const STORAGE_KEY = "remitos-grid-draft";

// Static options
const unidadOptions = [
  { value: "TN", label: "TN" },
  { value: "KG", label: "KG" },
  { value: "M3", label: "M3" },
  { value: "M2", label: "M2" },
  { value: "U", label: "U" },
];

const tipoMaterialOptions = [
  { value: "", label: "Seleccionar..." },
  { value: "Residuos", label: "Residuos" },
  { value: "Desmonte", label: "Desmonte" },
  { value: "Cascote", label: "Cascote" },
  { value: "Escombro", label: "Escombro" },
  { value: "Tierra", label: "Tierra" },
  { value: "Piedra", label: "Piedra" },
  { value: "Movimiento interno", label: "Mov. interno" },
  { value: "Tosca", label: "Tosca" },
  { value: "Cemento", label: "Cemento" },
  { value: "Hormigon", label: "Hormigon" },
  { value: "Traslado", label: "Traslado" },
  { value: "Cubiertas", label: "Cubiertas" },
  { value: "Frezado", label: "Frezado" },
  { value: "Cobertura de residuos", label: "Cobertura de residuos" },
  { value: "Arena", label: "Arena" },
  { value: "Hormigon H30", label: "Hormigon H30" },
  { value: "Tierra negra", label: "Tierra negra" },
  { value: "Relleno", label: "Relleno" },
  { value: "Piedra 30/50", label: "Piedra 30/50" },
  { value: "Materiales varios", label: "Materiales varios" },
  { value: "Caños", label: "Caños" },
  { value: "Suelo seleccionado", label: "Suelo seleccionado" },
];

const tipoTransporteOptions = [
  { value: "", label: "Seleccionar..." },
  { value: "Calamina Sur", label: "Calamina Sur" },
  { value: "Geo hermanos", label: "Geo hermanos" },
  { value: "Diaz Neiva", label: "Diaz Neiva" },
  { value: "japones", label: "Japonés" },
  { value: "Cato", label: "Cato" },
  { value: "Tatu", label: "Tatu" },
  { value: "Patan", label: "Patan" },
  { value: "Hormicret", label: "Hormicret" },
  { value: "Lamacol", label: "Lamacol" },
  { value: "Britcom", label: "Britcom" },
  { value: "Ramon romero gomez", label: "Ramon romero gomez" },
  { value: "Duraez", label: "Duraez" },
  { value: "BERTONE", label: "BERTONE" },
  { value: "NARDONI", label: "NARDONI" },
];

export function RemitosDataGrid({
  remitos,
  maquinarias,
  obras,
  clientes,
  proveedores = [],
  onSave,
  generateNumero,
  fullScreen = false,
  onColorChange,
}: RemitosDataGridProps) {
  const createdRowIds = useRef(new Set<string>()).current;
  const deletedRowIds = useRef(new Set<string>()).current;
  const updatedRowIds = useRef(new Set<string>()).current;
  
  const [, forceUpdate] = useState(0);

  const obrasOptions = useMemo(() => {
    const options = obras.map((o) => ({
      value: o.nombre,
      label: o.numero ? `${o.numero} - ${o.nombre}` : o.nombre,
    }));
    return [{ value: "", label: "Seleccionar..." }, ...options];
  }, [obras]);

  const proveedoresOptions = useMemo(() => {
    const options = proveedores
      .filter(p => p.activo)
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(p => ({ value: p.nombre, label: p.nombre }));
    return [{ value: "", label: "Seleccionar..." }, ...options];
  }, [proveedores]);

  // Filter to only show vehicles (trucks, trailers, etc.)
  const vehiculoOptions = useMemo(() => {
    const vehicleTypes: Array<MaquinariaWithRelations["tipo"]> = [
      "camion",
      "batea",
      "acoplado",
      "carreton",
      "cisterna",
      "camioneta",
      "auto",
    ];

    const filtered = maquinarias
      .filter((m) => vehicleTypes.includes(m.tipo))
      .sort((a, b) => (a.codigo || "").localeCompare(b.codigo || "", undefined, { numeric: true }));

    const options = filtered.map((m) => ({
      value: m.id,
      label: [m.codigo || "", m.tipo, m.patente || ""].filter(Boolean).join(" - "),
    }));

    return [{ value: "", label: "Seleccionar..." }, ...options];
  }, [maquinarias]);

  const initialData = useMemo(
    () =>
      remitos.map((r) => ({
        id: r.id,
        remito_tercero: r.remito_tercero || "",
        remito_local: r.remito_local || r.numero || "",
        fecha: r.fecha,
        proveedor: r.proveedor || "",
        desde: r.desde || "",
        hasta: r.hasta || "",
        cliente: r.cliente || "",
        cantidad_viajes: r.cantidad_viajes || 1,
        cantidad_uni: r.cantidad_uni ?? null,
        unidad: r.unidad || "M3",
        cantidad: r.cantidad,
        tipo_material: r.tipo_material || r.material || "",
        precio_unitario: r.precio_unitario ?? null,
        precio_calc_mode: r.precio_calc_mode || "viajes",
        precio_total: r.precio_total || 0,
        tipo_transporte: r.tipo_transporte || "",
        maquinaria_id: r.maquinaria_id || "",
        patente_tercero: r.patente_tercero || "",
        observaciones: r.observaciones || "",
        row_color: r.row_color || null,
        _isNew: false,
        _isModified: false,
        _isDeleted: false,
      })),
    [remitos]
  );

  const [data, setData] = useState<GridRow[]>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  
  // Snapshot system: freeze filtered data during editing to prevent row jumping
  const [isEditing, setIsEditing] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState<GridRow[] | null>(null);

  // Filter configurations
  const filterConfigs: ColumnFilterConfig[] = useMemo(() => [
    { 
      column: "fecha", 
      title: "Fecha",
      getValue: (row: GridRow) => row.fecha ? formatDate(row.fecha) : ""
    },
    { column: "proveedor", title: "Proveedor" },
    { column: "desde", title: "Desde" },
    { column: "hasta", title: "Hasta" },
    { column: "cliente", title: "Cliente" },
    { column: "tipo_material", title: "Tipo Material" },
    { column: "tipo_transporte", title: "Transporte" },
  ], []);

  // Use grid filters hook
  const {
    globalSearch,
    setGlobalSearch,
    columnFilters,
    setColumnFilters,
    filteredData,
    activeFilterCount,
    getUniqueValues,
    toggleColumnFilter,
    clearColumnFilter,
    clearAllFilters,
  } = useGridFilters(
    data,
    filterConfigs,
    ["remito_tercero", "remito_local", "proveedor", "desde", "hasta", "cliente", "tipo_material", "tipo_transporte"] as (keyof GridRow)[]
  );

  // Extend search to include patente
  const searchFilteredData = useMemo(() => {
    if (!globalSearch) return filteredData;
    
    const searchLower = globalSearch.toLowerCase();
    return filteredData.filter((row) => {
      if (row.remito_tercero?.toLowerCase().includes(searchLower)) return true;
      if (row.remito_local?.toLowerCase().includes(searchLower)) return true;
      if (row.proveedor?.toLowerCase().includes(searchLower)) return true;
      if (row.desde?.toLowerCase().includes(searchLower)) return true;
      if (row.hasta?.toLowerCase().includes(searchLower)) return true;
      if (row.cliente?.toLowerCase().includes(searchLower)) return true;
      if (row.tipo_material?.toLowerCase().includes(searchLower)) return true;
      if (row.tipo_transporte?.toLowerCase().includes(searchLower)) return true;
      if (row.patente_tercero?.toLowerCase().includes(searchLower)) return true;

      // Check maquinaria patente
      const maq = maquinarias.find(m => m.id === row.maquinaria_id);
      if (maq?.patente?.toLowerCase().includes(searchLower)) return true;
      if (maq?.codigo?.toLowerCase().includes(searchLower)) return true;
      
      return false;
    });
  }, [filteredData, globalSearch, maquinarias]);

  useEffect(() => {
    setData(initialData);
    createdRowIds.clear();
    deletedRowIds.clear();
    updatedRowIds.clear();
  }, [initialData, createdRowIds, deletedRowIds, updatedRowIds]);

  const hasChanges = useMemo(() => {
    return createdRowIds.size > 0 || deletedRowIds.size > 0 || updatedRowIds.size > 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, createdRowIds.size, deletedRowIds.size, updatedRowIds.size]);

  // Draft persistence
  const {
    showRestorePrompt,
    draftTimestamp,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useGridDraftPersistence({
    storageKey: STORAGE_KEY,
    data,
    setData,
    hasChanges,
    isNewRow: (row) => !!row._isNew,
    isModifiedRow: (row) => !!row._isModified,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: any[] = useMemo(
    () => [
      { ...keyColumn("remito_tercero", textColumn), title: "Rem. Tercero", minWidth: 110 },
      { ...keyColumn("remito_local", textColumn), title: "Rem. Local", minWidth: 110 },
      { 
        ...keyColumn("fecha", isoDateColumn), 
        title: (
          <ColumnFilterHeader
            column="fecha"
            title="Fecha"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ), 
        minWidth: 140,
      },
      {
        ...keyColumn("proveedor", {
          component: ({ rowData, setRowData, focus }: { rowData: string; setRowData: (v: string) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={proveedoresOptions}
              placeholder="Proveedor..."
              focus={focus}
            />
          ),
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: string }) => rowData,
          pasteValue: ({ value }: { value: string }) => value,
          minWidth: 140,
        }),
        title: (
          <ColumnFilterHeader
            column="proveedor"
            title="Proveedor"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ),
        minWidth: 140,
      },
      {
        ...keyColumn("desde", {
          component: ({ rowData, setRowData, focus }: { rowData: string; setRowData: (v: string) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={obrasOptions}
              placeholder="Desde..."
              focus={focus}
            />
          ),
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: string }) => rowData,
          pasteValue: ({ value }: { value: string }) => value,
        }),
        title: (
          <ColumnFilterHeader
            column="desde"
            title="Desde"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ),
        minWidth: 130,
      },
      {
        ...keyColumn("hasta", {
          component: ({ rowData, setRowData, focus }: { rowData: string; setRowData: (v: string) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={obrasOptions}
              placeholder="Hasta..."
              focus={focus}
            />
          ),
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: string }) => rowData,
          pasteValue: ({ value }: { value: string }) => value,
        }),
        title: (
          <ColumnFilterHeader
            column="hasta"
            title="Hasta"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ),
        minWidth: 130,
      },
      {
        ...keyColumn("cliente", {
          component: ({ rowData, setRowData, focus }: { rowData: string; setRowData: (v: string) => void; focus: boolean }) => {
            const clienteOptions = [
              { value: "", label: "Seleccionar..." },
              ...(clientes || []).filter(c => c.activo).map(c => ({ value: c.nombre, label: c.nombre })),
            ];
            return (
              <GridSelectCell
                value={rowData}
                onChange={setRowData}
                options={clienteOptions}
                placeholder="Cliente..."
                focus={focus}
              />
            );
          },
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: string }) => rowData,
          pasteValue: ({ value }: { value: string }) => value,
        }),
        title: (
          <ColumnFilterHeader
            column="cliente"
            title="Cliente"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ),
        minWidth: 140,
      },
      { ...keyColumn("cantidad_viajes", intColumn), title: "Viajes", minWidth: 70 },
      { ...keyColumn("cantidad_uni", floatColumn), title: "Cant. Uni.", minWidth: 90 },
      {
        ...keyColumn("unidad", {
          component: ({ rowData, setRowData, focus }: { rowData: string; setRowData: (v: string) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={unidadOptions}
              placeholder="M3"
              focus={focus}
            />
          ),
          deleteValue: () => "M3",
          copyValue: ({ rowData }: { rowData: string }) => rowData,
          pasteValue: ({ value }: { value: string }) => {
            const upper = value.toUpperCase();
            return ["TN", "KG", "M3", "M2", "U"].includes(upper) ? upper : "M3";
          },
        }),
        title: "Unidad",
        minWidth: 70,
      },
      { ...keyColumn("cantidad", floatColumn), title: "Cant. Total", minWidth: 90, disabled: true },
      {
        ...keyColumn("tipo_material", {
          component: ({ rowData, setRowData, focus }: { rowData: string; setRowData: (v: string) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={tipoMaterialOptions}
              placeholder="Tipo..."
              focus={focus}
            />
          ),
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: string }) => rowData,
          pasteValue: ({ value }: { value: string }) => {
            const found = tipoMaterialOptions.find(
              (o) => o.value.toLowerCase() === value.toLowerCase() || o.label.toLowerCase() === value.toLowerCase()
            );
            return found?.value || value;
          },
        }),
        title: (
          <ColumnFilterHeader
            column="tipo_material"
            title="Tipo"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ),
        minWidth: 110,
      },
      { ...keyColumn("precio_unitario", floatColumn), title: "Precio Uni.", minWidth: 100 },
      {
        ...keyColumn("precio_calc_mode", {
          component: ({ rowData, setRowData, focus }: { rowData: string; setRowData: (v: string) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData || "viajes"}
              onChange={setRowData}
              options={[
                { value: "viajes", label: "x Viajes" },
                { value: "cantidad", label: "x Cant. Total" },
              ]}
              placeholder="Calc..."
              focus={focus}
            />
          ),
          deleteValue: () => "viajes",
          copyValue: ({ rowData }: { rowData: string }) => rowData,
          pasteValue: ({ value }: { value: string }) => {
            const lower = value.toLowerCase().trim();
            if (lower.includes("cant") || lower === "cantidad") return "cantidad";
            return "viajes";
          },
        }),
        title: "Calc.",
        minWidth: 110,
      },
      { ...keyColumn("precio_total", floatColumn), title: "Precio Total", minWidth: 100, disabled: true },
      {
        ...keyColumn("tipo_transporte", {
          component: ({ rowData, setRowData, focus }: { rowData: string; setRowData: (v: string) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData}
              onChange={setRowData}
              options={tipoTransporteOptions}
              placeholder="Transporte..."
              focus={focus}
            />
          ),
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: string }) => rowData,
          pasteValue: ({ value }: { value: string }) => {
            const found = tipoTransporteOptions.find(
              (o) => o.value.toLowerCase() === value.toLowerCase() || o.label.toLowerCase() === value.toLowerCase()
            );
            return found?.value || value;
          },
        }),
        title: (
          <ColumnFilterHeader
            column="tipo_transporte"
            title="Transporte"
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ),
        minWidth: 110,
      },
      {
        ...keyColumn("maquinaria_id", {
          component: ({ rowData, setRowData, focus }: { rowData: string; setRowData: (v: string) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData || ""}
              onChange={setRowData}
              options={vehiculoOptions}
              placeholder="Buscar vehículo..."
              focus={focus}
            />
          ),
          deleteValue: () => "",
          copyValue: ({ rowData }: { rowData: string }) => {
            const maq = maquinarias.find((m) => m.id === rowData);
            return maq?.patente || maq?.codigo || "";
          },
          pasteValue: ({ value }: { value: string }) => {
            const raw = value.trim();
            const normalized = raw.replace(/[-\s]/g, "").toLowerCase();
            const found = maquinarias.find(
              (m) =>
                m.codigo?.toLowerCase() === raw.toLowerCase() ||
                m.patente?.replace(/[-\s]/g, "").toLowerCase() === normalized
            );
            return found?.id || "";
          },
        }),
        title: "Patente Local",
        minWidth: 180,
      },
      {
        ...keyColumn("patente_tercero", textColumn),
        title: "Patente Tercero",
        minWidth: 140,
      },
      {
        ...keyColumn("observaciones", textColumn),
        title: "Descripcion",
        minWidth: 180,
      },
    ],
    [vehiculoOptions, maquinarias, obrasOptions, columnFilters, getUniqueValues, toggleColumnFilter, clearColumnFilter, setColumnFilters]
  );

  const handleChange = useCallback(
    (newData: GridRow[], operations: Operation[]) => {
      let processedData = [...newData];
      
      for (const operation of operations) {
        if (operation.type === 'DELETE') {
          const deletedRows = data.slice(operation.fromRowIndex, operation.toRowIndex);
          
          for (const row of deletedRows) {
            if (row.id && !row.id.startsWith('temp_')) {
              deletedRowIds.add(row.id);
              updatedRowIds.delete(row.id);
              
              const deletedRow = { ...row, _isDeleted: true };
              processedData.splice(operation.fromRowIndex, 0, deletedRow);
            } else if (row.id && row.id.startsWith('temp_')) {
              createdRowIds.delete(row.id);
            }
          }
        }
        
        if (operation.type === 'CREATE') {
          for (let i = operation.fromRowIndex; i < operation.toRowIndex; i++) {
            if (processedData[i] && !processedData[i].id) {
              const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              processedData[i] = { ...processedData[i], id: tempId, _isNew: true };
              createdRowIds.add(tempId);
            }
          }
        }
        
        if (operation.type === 'UPDATE') {
          for (let i = operation.fromRowIndex; i < operation.toRowIndex; i++) {
            const row = processedData[i];
            if (row) {
              // Auto-calculate totals
              const viajes = row.cantidad_viajes || 1;
              if (row.cantidad_uni != null) {
                row.cantidad = row.cantidad_uni * viajes;
              }
              if (row.precio_unitario != null) {
                const cantTotal = (row.cantidad_uni || 0) * viajes;
                row.precio_total = row.precio_calc_mode === 'cantidad'
                  ? row.precio_unitario * cantTotal
                  : row.precio_unitario * viajes;
              }
              processedData[i] = { ...row };
            }
            if (row && row.id && !row.id.startsWith('temp_') && !deletedRowIds.has(row.id)) {
              const orig = initialData.find((r) => r.id === row.id);
              if (orig) {
                const isModified =
                  row.remito_tercero !== orig.remito_tercero ||
                  row.remito_local !== orig.remito_local ||
                  row.fecha !== orig.fecha ||
                  row.proveedor !== orig.proveedor ||
                  row.desde !== orig.desde ||
                  row.hasta !== orig.hasta ||
                  row.cliente !== orig.cliente ||
                  row.cantidad_viajes !== orig.cantidad_viajes ||
                  row.cantidad_uni !== orig.cantidad_uni ||
                  row.unidad !== orig.unidad ||
                  row.cantidad !== orig.cantidad ||
                  row.tipo_material !== orig.tipo_material ||
                  row.precio_unitario !== orig.precio_unitario ||
                  row.precio_calc_mode !== orig.precio_calc_mode ||
                  row.precio_total !== orig.precio_total ||
                  row.tipo_transporte !== orig.tipo_transporte ||
                  row.maquinaria_id !== orig.maquinaria_id ||
                  row.patente_tercero !== orig.patente_tercero ||
                  row.observaciones !== orig.observaciones;

                if (isModified) {
                  updatedRowIds.add(row.id);
                } else {
                  updatedRowIds.delete(row.id);
                }
                processedData[i] = { ...processedData[i], _isModified: isModified };
              }
            }
          }
        }
      }
      
      setData(processedData);
      forceUpdate(n => n + 1);
    },
    [data, initialData, createdRowIds, deletedRowIds, updatedRowIds]
  );

  const handleAddRow = useCallback(() => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    createdRowIds.add(tempId);
    forceUpdate(n => n + 1);
    setData((prev) => [
      ...prev,
      {
        id: tempId,
        remito_tercero: "",
        remito_local: "",
        fecha: new Date().toISOString().split("T")[0],
        proveedor: "",
        desde: "",
        hasta: "",
        cliente: "",
        cantidad_viajes: 0,
        cantidad_uni: null,
        unidad: "M3",
        cantidad: 0,
        tipo_material: "",
        precio_unitario: null,
        precio_calc_mode: "cantidad",
        precio_total: 0,
        tipo_transporte: "",
        maquinaria_id: "",
        patente_tercero: "",
        observaciones: "",
        row_color: null,
        _isNew: true,
        _isModified: false,
        _isDeleted: false,
      },
    ]);
  }, [createdRowIds]);

  const handleReset = useCallback(() => {
    setData(initialData);
    createdRowIds.clear();
    deletedRowIds.clear();
    updatedRowIds.clear();
    clearDraft();
    clearAllFilters();
    forceUpdate(n => n + 1);
  }, [initialData, clearDraft, clearAllFilters, createdRowIds, deletedRowIds, updatedRowIds]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const created = data
        .filter((row) => row.id && createdRowIds.has(row.id) && !row._isDeleted)
        .map((row) => ({
          numero: row.remito_local || generateNumero(),
          fecha: row.fecha,
          obra_id: "",
          material: row.tipo_material || "",
          cantidad: row.cantidad || 0,
          unidad: row.unidad,
          recibido_por: "",
          firmado: false,
          proveedor: row.proveedor || null,
          cliente: row.cliente || null,
          remito_tercero: row.remito_tercero || null,
          remito_local: row.remito_local || null,
          desde: row.desde || null,
          hasta: row.hasta || null,
          cantidad_viajes: row.cantidad_viajes || 1,
          cantidad_uni: row.cantidad_uni ?? null,
          tipo_material: row.tipo_material || null,
          precio_unitario: row.precio_unitario ?? null,
          precio_calc_mode: row.precio_calc_mode || "viajes",
          precio_total: row.precio_total || 0,
          tipo_transporte: row.tipo_transporte || null,
          maquinaria_id: row.maquinaria_id || null,
          patente_tercero: row.patente_tercero || null,
          observaciones: row.observaciones || null,
        }));

      const updated = data
        .filter((row) => row.id && updatedRowIds.has(row.id) && !row._isDeleted)
        .map((row) => ({
          id: row.id!,
          data: {
            remito_tercero: row.remito_tercero || null,
            remito_local: row.remito_local || null,
            fecha: row.fecha,
            proveedor: row.proveedor || null,
            desde: row.desde || null,
            hasta: row.hasta || null,
            cliente: row.cliente || null,
            cantidad_viajes: row.cantidad_viajes || 1,
            cantidad_uni: row.cantidad_uni ?? null,
            unidad: row.unidad,
            cantidad: row.cantidad || 0,
            tipo_material: row.tipo_material || null,
            precio_unitario: row.precio_unitario ?? null,
            precio_calc_mode: row.precio_calc_mode || "viajes",
            precio_total: row.precio_total || 0,
            tipo_transporte: row.tipo_transporte || null,
            maquinaria_id: row.maquinaria_id || null,
            patente_tercero: row.patente_tercero || null,
            material: row.tipo_material || "",
            observaciones: row.observaciones || null,
          },
        }));

      const deleted = Array.from(deletedRowIds);

      await onSave({ created, updated, deleted });
      
      const newData = data.filter(row => !row._isDeleted);
      setData(newData);
      createdRowIds.clear();
      deletedRowIds.clear();
      updatedRowIds.clear();
      clearDraft();
      forceUpdate(n => n + 1);
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  }, [data, onSave, clearDraft, generateNumero, createdRowIds, deletedRowIds, updatedRowIds]);

  const createRow = useCallback((): GridRow => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    createdRowIds.add(tempId);
    forceUpdate(n => n + 1);
    return {
      id: tempId,
      remito_tercero: "",
      remito_local: "",
      fecha: null,
      proveedor: "",
      desde: "",
      hasta: "",
      cliente: "",
      cantidad_viajes: 0,
      cantidad_uni: null,
      unidad: "M3",
      cantidad: 0,
      tipo_material: "",
      precio_unitario: null,
      precio_calc_mode: "viajes",
      precio_total: 0,
      tipo_transporte: "",
      maquinaria_id: "",
      patente_tercero: "",
      observaciones: "",
      row_color: null,
      _isNew: true,
      _isModified: false,
      _isDeleted: false,
    };
  }, [createdRowIds]);

  const gridHeight = fullScreen ? window.innerHeight - 230 : 500;
  
  // Callback when cell becomes active - capture snapshot
  const handleActiveCellChange = useCallback(({ cell }: { cell: { col: number; row: number } | null }) => {
    if (cell && !isEditing && (globalSearch || activeFilterCount > 0)) {
      setIsEditing(true);
      setEditingSnapshot(searchFilteredData);
    }
  }, [isEditing, globalSearch, activeFilterCount, searchFilteredData]);

  // Callback when grid loses focus - release snapshot
  const handleBlur = useCallback(() => {
    setIsEditing(false);
    setEditingSnapshot(null);
  }, []);

  // Get the data to display (filtered if there are filters/search)
  // During editing with filters, use snapshot but with updated values
  // Context menu state for row coloring
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rowId: string; currentColor: string | null } | null>(null);

  const displayData = useMemo(() => {
    if (!globalSearch && activeFilterCount === 0) {
      return data;
    }
    
    if (isEditing && editingSnapshot) {
      // Update values in snapshot with current data values
      return editingSnapshot.map(snapRow => {
        const currentRow = data.find(r => r.id === snapRow.id);
        return currentRow || snapRow;
      });
    }
    
    return searchFilteredData;
  }, [data, globalSearch, activeFilterCount, isEditing, editingSnapshot, searchFilteredData]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const row = target.closest('.dsg-row');
    if (!row) return;
    
    const rowIndex = Array.from(row.parentElement?.children || []).indexOf(row);
    const dataIndex = rowIndex - 1;
    if (dataIndex < 0 || dataIndex >= displayData.length) return;
    
    const rowData = displayData[dataIndex];
    if (!rowData?.id || rowData.id.startsWith('temp_')) return;
    
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      rowId: rowData.id,
      currentColor: rowData.row_color,
    });
  }, [displayData]);

  const handleColorSelect = useCallback(async (color: string | null) => {
    if (!contextMenu || !onColorChange) return;
    
    const success = await onColorChange(contextMenu.rowId, color);
    if (success) {
      setData(prev => prev.map(row => 
        row.id === contextMenu.rowId ? { ...row, row_color: color } : row
      ));
    }
    setContextMenu(null);
  }, [contextMenu, onColorChange]);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu]);

  return (
    <div className={fullScreen ? "flex flex-col h-full" : "space-y-4"}>
      {showRestorePrompt && (
        <DraftRestorePrompt
          timestamp={draftTimestamp}
          onRestore={restoreDraft}
          onDiscard={discardDraft}
        />
      )}
      <div className="flex items-center justify-between gap-2 mb-2">
        <GridFilterToolbar
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
          columnFilters={columnFilters}
          setColumnFilters={setColumnFilters}
          data={data}
          filterConfigs={filterConfigs}
        >
          <Button onClick={handleAddRow} variant="outline" size="sm" className="h-8 border-border">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Agregar
          </Button>
          {hasChanges && (
            <Button onClick={handleReset} variant="ghost" size="sm" className="h-8 text-muted-foreground">
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Descartar
            </Button>
          )}
        </GridFilterToolbar>
        <Button onClick={handleSave} disabled={!hasChanges || isSaving} size="sm" className="h-8 bg-primary hover:bg-primary/90">
          {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
          Guardar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        💡 Usá los iconos de filtro en cada columna para filtrar. Tab para navegar. Escribí para buscar en los selectores.
      </p>
      <div 
        className={`remitos-grid-container rounded-lg overflow-hidden border border-border ${fullScreen ? "flex-1" : ""}`}
        onContextMenu={handleContextMenu}
      >
        {/* Color picker context menu */}
        {contextMenu && (
          <div 
            className="fixed z-[9999] bg-popover border border-border rounded-lg shadow-lg p-3"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-xs text-muted-foreground mb-2 font-medium">Pintar fila</p>
            <div className="flex items-center gap-1.5">
              {ROW_COLORS.map((c) => (
                <button
                  key={c.value}
                  title={c.label}
                  className={`w-6 h-6 rounded-full ${c.css} hover:scale-110 transition-transform ${contextMenu.currentColor === c.value ? "ring-2 ring-foreground ring-offset-2 ring-offset-popover" : ""}`}
                  onClick={() => handleColorSelect(c.value)}
                />
              ))}
              <button
                title="Quitar color"
                className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                onClick={() => handleColorSelect(null)}
              >
                <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
        <DataSheetGrid
          key={`remitos-grid-${obrasOptions.length}-${vehiculoOptions.length}`}
          value={displayData}
          onChange={(newData, ops) => {
            // Map changes back to full data array when filtering is active
            if (globalSearch || activeFilterCount > 0) {
              const fullData = [...data];
              for (const op of ops) {
                if (op.type === 'UPDATE') {
                  for (let i = op.fromRowIndex; i < op.toRowIndex; i++) {
                    const filteredRow = newData[i];
                    const originalIndex = data.findIndex(r => r.id === filteredRow.id);
                    if (originalIndex !== -1) {
                      fullData[originalIndex] = filteredRow;
                    }
                  }
                }
              }
              handleChange(fullData, ops);
            } else {
              handleChange(newData, ops);
            }
          }}
          columns={columns}
          createRow={createRow}
          height={gridHeight}
          onActiveCellChange={handleActiveCellChange}
          onBlur={handleBlur}
          rowClassName={({ rowData }) => {
            const classes: string[] = [];
            if (rowData._isDeleted || (rowData.id && deletedRowIds.has(rowData.id))) return "row-deleted";
            if (rowData._isNew || (rowData.id && createdRowIds.has(rowData.id))) classes.push("row-new");
            else if (rowData._isModified || (rowData.id && updatedRowIds.has(rowData.id))) classes.push("row-modified");
            if (rowData.row_color) classes.push(`row-color-${rowData.row_color}`);
            return classes.join(" ");
          }}
        />
      </div>
    </div>
  );
}

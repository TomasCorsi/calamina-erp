import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  DataSheetGrid,
  textColumn,
  intColumn,
  keyColumn,
} from "react-datasheet-grid";
import "react-datasheet-grid/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Plus, Loader2, RotateCcw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { MaquinariaWithRelations, MaquinariaForm, TipoMaquinaria, EstadoMaquinaria } from "@/hooks/useMaquinarias";
import { GridSelectCell } from "@/components/shared/GridSelectCell";
import { ColumnFilterHeader } from "@/components/shared/GridFilterToolbar";
import { Badge } from "@/components/ui/badge";

interface GridRow {
  id?: string;
  codigo: string;
  nombre: string;
  tipo: TipoMaquinaria;
  marca: string;
  anio: number | null;
  patente: string;
  estado: EstadoMaquinaria;
  horas_acumuladas: number | null;
  _isNew?: boolean;
  _isModified?: boolean;
  _isDeleted?: boolean;
}

interface MaquinariasDataGridProps {
  maquinarias: MaquinariaWithRelations[];
  onSave: (changes: {
    created: MaquinariaForm[];
    updated: { id: string; data: Partial<MaquinariaForm> }[];
    deleted: string[];
  }) => Promise<void>;
  fullScreen?: boolean;
  canManage?: boolean;
}

const tiposConfig: Record<TipoMaquinaria, string> = {
  cargadora: "Cargadora",
  compactador: "Compactador",
  retroexcavadora: "Retroexcavadora",
  minicargadora: "Minicargadora",
  motoniveladora: "Motoniveladora",
  topador: "Topador",
  pala_retro: "Pala Retro",
  batea: "Batea",
  acoplado: "Acoplado",
  camion: "Camión",
  carreton: "Carretón",
  cisterna: "Cisterna",
  tanque_cisterna: "Tanque Cisterna",
  tanque_regador_tractor: "Tanque Regador",
  soplador: "Soplador",
  zanjeadora: "Zanjeadora",
  rastra: "Rastra",
  tractor: "Tractor",
  rastra_grosspal: "Rastra Grosspal",
  auto: "Auto",
  camioneta: "Camioneta",
  grupo_electrogeno: "Grupo Electrógeno",
};

const estadoConfig: Record<EstadoMaquinaria, string> = {
  operativa: "Operativa",
  mantenimiento: "Mantenimiento",
  inactiva: "Inactiva",
  en_uso: "En Uso",
};

export function MaquinariasDataGrid({
  maquinarias,
  onSave,
  fullScreen = false,
  canManage = true,
}: MaquinariasDataGridProps) {
  const gridHeight = fullScreen ? window.innerHeight - 180 : 500;
  
  const createdRowIds = useRef(new Set<string>()).current;
  const deletedRowIds = useRef(new Set<string>()).current;
  const updatedRowIds = useRef(new Set<string>()).current;
  
  const [, forceUpdate] = useState(0);
  const [globalSearch, setGlobalSearch] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, Set<string>>>({});
  
  const tipoOptions = useMemo(
    () => Object.entries(tiposConfig).map(([value, label]) => ({ value, label })),
    []
  );

  const estadoOptions = useMemo(
    () => Object.entries(estadoConfig).map(([value, label]) => ({ value, label })),
    []
  );

  const initialData = useMemo(
    () =>
      maquinarias.map((m) => ({
        id: m.id,
        codigo: m.codigo || "",
        nombre: m.nombre || "",
        tipo: m.tipo,
        marca: m.marca || "",
        anio: m.anio,
        patente: m.patente || "",
        estado: m.estado,
        horas_acumuladas: m.horas_acumuladas,
        _isNew: false,
        _isModified: false,
        _isDeleted: false,
      })),
    [maquinarias]
  );

  const [data, setData] = useState<GridRow[]>(initialData);
  const [isSaving, setIsSaving] = useState(false);

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

  // Get unique values for each column for filtering
  const getUniqueValues = useCallback((column: string) => {
    const values = new Set<string>();
    data.forEach((row) => {
      const value = row[column as keyof GridRow];
      if (value !== null && value !== undefined && value !== "") {
        if (column === "tipo") {
          values.add(tiposConfig[value as TipoMaquinaria] || String(value));
        } else if (column === "estado") {
          values.add(estadoConfig[value as EstadoMaquinaria] || String(value));
        } else {
          values.add(String(value));
        }
      }
    });
    return Array.from(values).sort();
  }, [data]);

  // Filter data based on global search and column filters
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      // Global search
      if (globalSearch) {
        const searchLower = globalSearch.toLowerCase();
        const matchesSearch = 
          row.codigo.toLowerCase().includes(searchLower) ||
          row.nombre.toLowerCase().includes(searchLower) ||
          row.patente.toLowerCase().includes(searchLower) ||
          row.marca.toLowerCase().includes(searchLower) ||
          tiposConfig[row.tipo].toLowerCase().includes(searchLower) ||
          estadoConfig[row.estado].toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Column filters
      for (const [column, allowedValues] of Object.entries(columnFilters)) {
        if (allowedValues.size === 0) continue;
        const value = row[column as keyof GridRow];
        let displayValue: string;
        if (column === "tipo") {
          displayValue = tiposConfig[value as TipoMaquinaria] || String(value);
        } else if (column === "estado") {
          displayValue = estadoConfig[value as EstadoMaquinaria] || String(value);
        } else {
          displayValue = String(value || "");
        }
        if (!allowedValues.has(displayValue)) return false;
      }
      
      return true;
    });
  }, [data, globalSearch, columnFilters]);

  const activeFilterCount = useMemo(() => {
    return Object.values(columnFilters).filter(set => set.size > 0).length;
  }, [columnFilters]);

  const toggleColumnFilter = useCallback((column: string, value: string) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      if (!newFilters[column]) {
        newFilters[column] = new Set();
      } else {
        newFilters[column] = new Set(newFilters[column]);
      }
      
      if (newFilters[column].has(value)) {
        newFilters[column].delete(value);
      } else {
        newFilters[column].add(value);
      }
      
      return newFilters;
    });
  }, []);

  const clearColumnFilter = useCallback((column: string) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[column];
      return newFilters;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setColumnFilters({});
    setGlobalSearch("");
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: any[] = useMemo(
    () => [
      { 
        ...keyColumn("codigo", textColumn), 
        title: (
          <ColumnFilterHeader 
            column="codigo" 
            title="Código" 
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ),
        minWidth: 100 
      },
      { 
        ...keyColumn("nombre", textColumn), 
        title: (
          <ColumnFilterHeader 
            column="nombre" 
            title="Nombre" 
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ),
        minWidth: 150 
      },
      {
        ...keyColumn("tipo", {
          component: ({ rowData, setRowData, focus }: { rowData: TipoMaquinaria; setRowData: (v: TipoMaquinaria) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData}
              onChange={(v) => setRowData(v as TipoMaquinaria)}
              options={tipoOptions}
              placeholder="Seleccionar"
              focus={focus}
            />
          ),
          deleteValue: () => "cargadora" as TipoMaquinaria,
          copyValue: ({ rowData }: { rowData: TipoMaquinaria }) => tiposConfig[rowData] || "",
          pasteValue: ({ value }: { value: string }) => {
            const found = Object.entries(tiposConfig).find(([, label]) => 
              label.toLowerCase() === value.toLowerCase()
            );
            return (found?.[0] || "cargadora") as TipoMaquinaria;
          },
        }),
        title: (
          <ColumnFilterHeader 
            column="tipo" 
            title="Tipo" 
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ),
        minWidth: 160,
      },
      { 
        ...keyColumn("marca", textColumn), 
        title: (
          <ColumnFilterHeader 
            column="marca" 
            title="Marca" 
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ),
        minWidth: 120 
      },
      { 
        ...keyColumn("anio", intColumn), 
        title: "Año",
        minWidth: 80 
      },
      { 
        ...keyColumn("patente", textColumn), 
        title: (
          <ColumnFilterHeader 
            column="patente" 
            title="Patente" 
            getUniqueValues={getUniqueValues}
            columnFilters={columnFilters}
            toggleColumnFilter={toggleColumnFilter}
            clearColumnFilter={clearColumnFilter}
            setColumnFilters={setColumnFilters}
          />
        ),
        minWidth: 100 
      },
      {
        ...keyColumn("estado", {
          component: ({ rowData, setRowData, focus }: { rowData: EstadoMaquinaria; setRowData: (v: EstadoMaquinaria) => void; focus: boolean }) => (
            <GridSelectCell
              value={rowData}
              onChange={(v) => setRowData(v as EstadoMaquinaria)}
              options={estadoOptions}
              placeholder="Seleccionar"
              focus={focus}
            />
          ),
          deleteValue: () => "operativa" as EstadoMaquinaria,
          copyValue: ({ rowData }: { rowData: EstadoMaquinaria }) => estadoConfig[rowData] || "",
          pasteValue: ({ value }: { value: string }) => {
            const found = Object.entries(estadoConfig).find(([, label]) => 
              label.toLowerCase() === value.toLowerCase()
            );
            return (found?.[0] || "operativa") as EstadoMaquinaria;
          },
        }),
        title: (
          <ColumnFilterHeader 
            column="estado" 
            title="Estado" 
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
        ...keyColumn("horas_acumuladas", intColumn), 
        title: "Horas",
        minWidth: 80 
      },
    ],
    [tipoOptions, estadoOptions, columnFilters, getUniqueValues, clearColumnFilter, toggleColumnFilter, setColumnFilters]
  );

  const handleChange = useCallback(
    (newData: GridRow[], operations: { type: string; fromRowIndex: number; toRowIndex: number }[]) => {
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
            if (row && row.id && !row.id.startsWith('temp_') && !deletedRowIds.has(row.id)) {
              const orig = initialData.find((r) => r.id === row.id);
              if (orig) {
                const isModified = 
                  row.codigo !== orig.codigo ||
                  row.nombre !== orig.nombre ||
                  row.tipo !== orig.tipo ||
                  row.marca !== orig.marca ||
                  row.anio !== orig.anio ||
                  row.patente !== orig.patente ||
                  row.estado !== orig.estado ||
                  row.horas_acumuladas !== orig.horas_acumuladas;
                
                if (isModified) {
                  updatedRowIds.add(row.id);
                } else {
                  updatedRowIds.delete(row.id);
                }
                processedData[i] = { ...row, _isModified: isModified };
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

  const createRow = useCallback((): GridRow => {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    createdRowIds.add(tempId);
    forceUpdate(n => n + 1);
    return {
      id: tempId,
      codigo: "",
      nombre: "",
      tipo: "cargadora",
      marca: "",
      anio: new Date().getFullYear(),
      patente: "",
      estado: "operativa",
      horas_acumuladas: 0,
      _isNew: true,
      _isModified: false,
      _isDeleted: false,
    };
  }, [createdRowIds]);

  const handleAddRow = useCallback(() => {
    if (!canManage) return;
    setData((prev) => [...prev, createRow()]);
  }, [canManage, createRow]);

  const handleReset = useCallback(() => {
    setData(initialData);
    createdRowIds.clear();
    deletedRowIds.clear();
    updatedRowIds.clear();
    forceUpdate(n => n + 1);
  }, [initialData, createdRowIds, deletedRowIds, updatedRowIds]);

  const handleSave = useCallback(async () => {
    if (!canManage) return;
    setIsSaving(true);
    try {
      const created = data
        .filter((row) => row.id && createdRowIds.has(row.id) && !row._isDeleted)
        .map((row) => ({
          codigo: row.codigo || undefined,
          nombre: row.nombre || undefined,
          tipo: row.tipo,
          marca: row.marca || undefined,
          anio: row.anio || undefined,
          patente: row.patente || undefined,
          estado: row.estado,
          horas_acumuladas: row.horas_acumuladas || 0,
        }));
      
      const updated = data
        .filter((row) => row.id && updatedRowIds.has(row.id) && !row._isDeleted)
        .map((row) => ({
          id: row.id!,
          data: {
            codigo: row.codigo || undefined,
            nombre: row.nombre || undefined,
            tipo: row.tipo,
            marca: row.marca || undefined,
            anio: row.anio || undefined,
            patente: row.patente || undefined,
            estado: row.estado,
            horas_acumuladas: row.horas_acumuladas || 0,
          },
        }));
      
      const deleted = Array.from(deletedRowIds);
      
      await onSave({ created, updated, deleted });
      
      const newData = data.filter(row => !row._isDeleted);
      setData(newData);
      createdRowIds.clear();
      deletedRowIds.clear();
      updatedRowIds.clear();
      forceUpdate(n => n + 1);
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Error al guardar");
    } finally {
      setIsSaving(false);
    }
  }, [canManage, data, onSave, createdRowIds, deletedRowIds, updatedRowIds]);

  const gridColumns = useMemo(
    () => canManage ? columns : columns.map((column) => ({ ...column, disabled: true })),
    [canManage, columns],
  );

  return (
    <div className={`flex flex-col ${fullScreen ? 'h-full' : 'space-y-4'}`}>
      {/* Compact toolbar with search */}
      <div className={`flex items-center gap-2 ${fullScreen ? 'px-0 pb-2' : ''}`}>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="h-8 pl-7 pr-7 text-sm bg-card border-border"
          />
          {globalSearch && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
              onClick={() => setGlobalSearch("")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        
        {activeFilterCount > 0 && (
          <Badge variant="secondary" className="h-6 gap-1">
            {activeFilterCount} filtro{activeFilterCount > 1 ? 's' : ''}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 ml-1"
              onClick={clearAllFilters}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}
        
        <div className="flex-1" />
        
        <Button onClick={handleAddRow} variant="outline" size="sm" className="h-8 border-border" disabled={!canManage}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Agregar
        </Button>
        {hasChanges && (
          <Button onClick={handleReset} variant="ghost" size="sm" className="h-8 text-muted-foreground">
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Descartar
          </Button>
        )}
        <Button 
          onClick={handleSave} 
          disabled={!canManage || !hasChanges || isSaving}
          size="sm"
          className="h-8 bg-primary hover:bg-primary/90"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
          Guardar
        </Button>
      </div>
      
      <div className="text-xs text-muted-foreground">
        💡 Usá los iconos de filtro en cada columna para filtrar tipo Excel. Tab para navegar.
      </div>
      
      <div className={`maquinarias-grid-container rounded-lg overflow-hidden border border-border ${fullScreen ? 'flex-1' : ''}`}>
        <DataSheetGrid
          value={filteredData}
          onChange={(newData, ops) => {
            if (!canManage) return;
            // Map changes back to full data array
            const fullData = [...data];
            
            for (const op of ops) {
              if (op.type === 'UPDATE') {
                for (let i = op.fromRowIndex; i < op.toRowIndex; i++) {
                  const filteredRow = newData[i] as GridRow;
                  const originalIndex = data.findIndex(r => r.id === filteredRow.id);
                  if (originalIndex !== -1) {
                    fullData[originalIndex] = filteredRow;
                  }
                }
              }
            }
            
            handleChange(fullData, ops);
          }}
          columns={gridColumns}
          createRow={createRow}
          lockRows
          height={gridHeight}
          rowClassName={({ rowData }) => {
            const row = rowData as GridRow;
            if (row._isDeleted || (row.id && deletedRowIds.has(row.id))) return "row-deleted";
            if (row._isNew || (row.id && createdRowIds.has(row.id))) return "row-new";
            if (row._isModified || (row.id && updatedRowIds.has(row.id))) return "row-modified";
            return "";
          }}
        />
      </div>
    </div>
  );
}

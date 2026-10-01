import { useState, useMemo } from "react";
import { Search, Fuel, Droplets, Download, CalendarDays, X, DollarSign, Save, ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useCargasRepartidorAll, type CargaRepartidorFull } from "@/hooks/useCargasRepartidorAll";
import { HistoricoBanner } from "@/components/shared/HistoricoBanner";
import { usePreciosMes, usePreciosTodos } from "@/hooks/usePreciosMes";
import { usePersonal } from "@/hooks/usePersonal";
import { useMaquinarias } from "@/hooks/useMaquinarias";
import { useObras } from "@/hooks/useObras";
import { CargaCombustibleRepartidorDialog } from "@/components/parte-diario/CargaCombustibleRepartidorDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import type { CargaRepartidor } from "@/hooks/useCargasRepartidor";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { startOfMonth, endOfMonth, format, parseISO } from "date-fns";
import { format as formatEs } from "date-fns";
import { es } from "date-fns/locale";

const meses = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const productos = [
  { key: "combustible", label: "Combustible", emoji: "🛢️", unidad: "L" },
  { key: "grasa", label: "Grasa", emoji: "🧴", unidad: "Kg" },
  { key: "aceite", label: "Aceite", emoji: "🫗", unidad: "L" },
  { key: "uria", label: "Urea", emoji: "💧", unidad: "L" },
];

function formatOperador(op: { nombre: string | null; apellido: string | null } | null | undefined): string {
  if (!op) return "-";
  return `${op.apellido || ""}, ${op.nombre?.charAt(0) || ""}.`.trim();
}

function formatPeso(value: number): string {
  return `$${value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Panel de precios del mes
function PreciosMesPanel({
  anio,
  mes,
  mesLabel,
}: {
  anio: number;
  mes: number | undefined;
  mesLabel: string;
}) {
  const [open, setOpen] = useState(true);
  const [localPrecios, setLocalPrecios] = useState<Record<string, string>>({});
  const { preciosPorProducto, upsertPrecio, isSaving } = usePreciosMes(anio, mes);

  // Sync local state when prices load
  const getDisplayValue = (key: string) => {
    if (localPrecios[key] !== undefined) return localPrecios[key];
    const val = preciosPorProducto[key];
    return val !== undefined ? String(val) : "";
  };

  const handleSave = (key: string) => {
    const raw = localPrecios[key] ?? String(preciosPorProducto[key] ?? "");
    const precio = parseFloat(raw.replace(",", "."));
    if (isNaN(precio) || precio < 0) {
      toast.error("Precio inválido");
      return;
    }
    upsertPrecio({ producto: key, precio });
    setLocalPrecios((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  return (
    <div className="card-industrial overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          <span className="font-semibold text-foreground text-sm">
            Precios del Mes{mes ? ` — ${mesLabel} ${anio}` : ""}
          </span>
          {!mes && (
            <span className="text-xs text-muted-foreground">(seleccione un mes para configurar)</span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="border-t border-border">
          {!mes ? (
            <p className="text-center text-muted-foreground text-sm py-6">
              Seleccione un mes para ver y editar los precios.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Producto</th>
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Precio / unidad</th>
                  <th className="px-4 py-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {productos.map((prod) => {
                  const configured = preciosPorProducto[prod.key] !== undefined;
                  return (
                    <tr key={prod.key} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2">
                        <span className="mr-2">{prod.emoji}</span>
                        <span className="text-foreground">{prod.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">/ {prod.unidad}</span>
          {configured && (
                          <span className="ml-2 inline-block w-2 h-2 rounded-full bg-primary" title="Precio configurado" />
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground text-sm">$</span>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={getDisplayValue(prod.key)}
                            onChange={(e) =>
                              setLocalPrecios((prev) => ({ ...prev, [prod.key]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSave(prod.key);
                            }}
                            placeholder="Sin precio"
                            className="w-36 h-8 text-sm bg-background"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1"
                          disabled={isSaving}
                          onClick={() => handleSave(prod.key)}
                        >
                          <Save className="w-3 h-3" />
                          Guardar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export function CombustibleRepartidorTab() {
  const { cargas, isLoading, updateCarga, deleteCarga, isUpdating, isDeleting, loadAll, cargarHistorico } = useCargasRepartidorAll();
  const { personal } = usePersonal();
  const { maquinarias } = useMaquinarias();
  const { obras } = useObras();

  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");

  const [mes, setMes] = useState<string | undefined>(undefined);
  const [year, setYear] = useState(currentYear);
  const [fechaFiltro, setFechaFiltro] = useState<string>("");
  const [operadorFiltro, setOperadorFiltro] = useState<string>("all");
  const [numeroRemito, setNumeroRemito] = useState<string>("");
  const [productoFiltro, setProductoFiltro] = useState<string>("all");
  const [maquinariaFiltro, setMaquinariaFiltro] = useState<string>("all");
  const [obraFiltro, setObraFiltro] = useState<string>("all");
  const [repartidorFiltro, setRepartidorFiltro] = useState<string>("all");
  const [tipoOperadorFiltro, setTipoOperadorFiltro] = useState<string>("all");
  const [movimientoFiltro, setMovimientoFiltro] = useState<string>("all");

  // Edit / Delete state
  const [editingCarga, setEditingCarga] = useState<CargaRepartidorFull | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deletingCarga, setDeletingCarga] = useState<CargaRepartidorFull | null>(null);

  const years = useMemo(() => {
    const result = [];
    for (let y = currentYear; y >= currentYear - 5; y--) result.push(y);
    return result;
  }, [currentYear]);

  // Prices for the selected month
  const mesNum = mes ? parseInt(mes, 10) : undefined;
  const { preciosPorProducto } = usePreciosMes(year, mesNum);
  const { preciosPorMesProducto } = usePreciosTodos(year);

  const mesLabel = mes ? meses.find((m) => m.value === mes)?.label ?? "" : "";

  // Build unique operator options from all cargas
  const operadorOptions = useMemo(() => {
    const map = new Map<string, string>();
    cargas.forEach((c) => {
      if (c.operador_id && c.operador) {
        const label = formatOperador(c.operador);
        if (label !== "-") map.set(c.operador_id, label);
      }
    });
    return Array.from(map.entries())
      .map(([id, label]) => ({ value: id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [cargas]);

  // Build unique option lists from cargas
  const maquinariaOptions = useMemo(() => {
    const map = new Map<string, string>();
    cargas.forEach((c) => {
      if (c.maquinaria_id && c.maquinaria) {
        const m = c.maquinaria;
        const label = [m.codigo, m.nombre || m.tipo].filter(Boolean).join(" — ");
        if (label) map.set(c.maquinaria_id, label);
      }
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [cargas]);

  const obraOptions = useMemo(() => {
    const map = new Map<string, string>();
    cargas.forEach((c) => {
      if (c.obra_id && c.obra?.nombre) map.set(c.obra_id, c.obra.nombre);
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [cargas]);

  const repartidorOptions = useMemo(() => {
    const map = new Map<string, string>();
    cargas.forEach((c) => {
      if (c.repartidor_id && c.repartidor) {
        map.set(c.repartidor_id, formatOperador(c.repartidor));
      } else if (c.parte_diario?.personal) {
        // Use parte personal as a synthetic key
        const label = formatOperador(c.parte_diario.personal);
        if (label !== "-") map.set(`pd:${label}`, label);
      }
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [cargas]);

  const filtered = useMemo(() => {
    let result = [...cargas];

    if (fechaFiltro) {
      result = result.filter((c) => c.fecha === fechaFiltro);
    } else if (mes) {
      const monthDate = parseISO(`${year}-${mes}-01`);
      const desde = format(startOfMonth(monthDate), "yyyy-MM-dd");
      const hasta = format(endOfMonth(monthDate), "yyyy-MM-dd");
      result = result.filter((c) => c.fecha >= desde && c.fecha <= hasta);
    }

    if (operadorFiltro !== "all") {
      result = result.filter((c) => c.operador_id === operadorFiltro);
    }

    if (numeroRemito.trim()) {
      const t = numeroRemito.trim();
      result = result.filter((c) => String(c.numero_remito ?? "").includes(t));
    }

    if (productoFiltro !== "all") {
      result = result.filter((c) => (c.tipo_producto || "combustible") === productoFiltro);
    }

    if (maquinariaFiltro !== "all") {
      result = result.filter((c) => c.maquinaria_id === maquinariaFiltro);
    }

    if (obraFiltro !== "all") {
      result = result.filter((c) => c.obra_id === obraFiltro);
    }

    if (repartidorFiltro !== "all") {
      result = result.filter((c) => {
        if (c.repartidor_id === repartidorFiltro) return true;
        if (repartidorFiltro.startsWith("pd:") && !c.repartidor_id) {
          return `pd:${formatOperador(c.parte_diario?.personal)}` === repartidorFiltro;
        }
        return false;
      });
    }

    if (tipoOperadorFiltro !== "all") {
      result = result.filter((c) => (c.tipo_operador || "interno") === tipoOperadorFiltro);
    }

    if (movimientoFiltro !== "all") {
      result = result.filter((c) => (c.tipo_movimiento || "egreso") === movimientoFiltro);
    }

    return result;
  }, [cargas, mes, year, fechaFiltro, operadorFiltro, numeroRemito, productoFiltro, maquinariaFiltro, obraFiltro, repartidorFiltro, tipoOperadorFiltro, movimientoFiltro]);

  // Historial de cisternas: ingresos por cisterna y mes (sobre el filtro actual)
  const historialCisternas = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    const meses = new Set<string>();
    filtered.filter((c) => c.tipo_movimiento === "ingreso").forEach((c) => {
      const cod = c.maquinaria?.codigo || "?";
      const m = c.fecha.slice(0, 7);
      meses.add(m);
      const row = map.get(cod) || {};
      row[m] = (row[m] || 0) + (c.litros || 0);
      map.set(cod, row);
    });
    return { filas: Array.from(map.entries()).sort(), meses: Array.from(meses).sort() };
  }, [filtered]);

  // Calculate cost per row using monthly prices
  const getPrecioForCarga = (carga: (typeof filtered)[0]) => {
    const producto = carga.tipo_producto || "combustible";

    if (mes && !fechaFiltro) {
      // Mes específico seleccionado → usa los precios ya cargados del mes
      return preciosPorProducto[producto];
    }

    // Sin filtro de mes o filtro por día exacto: buscar precio según la fecha de la carga
    const fechaMes = parseInt(carga.fecha.split("-")[1], 10);
    return preciosPorMesProducto[`${fechaMes}-${producto}`];
  };

  const totalLitros = filtered.reduce((sum, c) => sum + (c.litros || 0), 0);
  const totalCosto = filtered.reduce((sum, c) => {
    const precio = getPrecioForCarga(c);
    if (precio === undefined) return sum;
    return sum + (c.litros || 0) * precio;
  }, 0);
  const hayCostos = filtered.some((c) => getPrecioForCarga(c) !== undefined);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }
    const exportData = filtered.map((c) => {
      const precio = getPrecioForCarga(c);
      return {
        "N° Remito": c.numero_remito || "-",
        Fecha: formatDate(c.fecha),
        Producto: (c.tipo_producto || "combustible").charAt(0).toUpperCase() + (c.tipo_producto || "combustible").slice(1),
        Repartidor: c.repartidor ? formatOperador(c.repartidor) : formatOperador(c.parte_diario?.personal),
        Operador: formatOperador(c.operador),
        "Tipo Operador": (c.tipo_operador || "interno").charAt(0).toUpperCase() + (c.tipo_operador || "interno").slice(1),
        Máquina: c.maquinaria?.codigo || c.maquinaria?.tipo || "-",
        Obra: c.obra?.nombre || "-",
        Cantidad: c.litros,
        Unidad: c.tipo_producto === "grasa" ? "Kg" : "L",
        Horas: c.horas || "-",
        Km: c.km || "-",
        "Precio Unit.": precio !== undefined ? precio : "Sin precio",
        "Costo Total": precio !== undefined ? (c.litros || 0) * precio : "Sin precio",
        Observaciones: c.observaciones || "-",
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Repartidor Calecita");
    const colWidths = Object.keys(exportData[0]).map((key) => ({
      wch: Math.max(key.length, 12),
    }));
    ws["!cols"] = colWidths;
    XLSX.writeFile(wb, `combustible_repartidor_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(`${exportData.length} registros exportados`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HistoricoBanner
        loadAll={loadAll}
        onCargarHistorico={cargarHistorico}
        diasMostrados={30}
        label="entregas"
      />
      {/* Date / month / year row */}
      <div className="flex flex-wrap gap-2 items-center justify-end">
        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="date"
            value={fechaFiltro}
            onChange={(e) => {
              setFechaFiltro(e.target.value);
              if (e.target.value) setMes(undefined);
            }}
            className="pl-9 w-40 bg-card border-border"
          />
          {fechaFiltro && (
            <button
              onClick={() => setFechaFiltro("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-24 bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={fechaFiltro ? "all" : (mes || "all")}
          onValueChange={(v) => {
            setMes(v === "all" ? undefined : v);
            setFechaFiltro("");
          }}
          disabled={!!fechaFiltro}
        >
          <SelectTrigger className="w-36 bg-card border-border">
            <SelectValue placeholder="Todos los meses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {meses.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExport} className="border-border">
          <Download className="w-4 h-4 mr-2" />
          Excel
        </Button>
      </div>

      {/* Dedicated column filters */}
      <div className="card-industrial p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Filtros</h3>
          {(numeroRemito || productoFiltro !== "all" || maquinariaFiltro !== "all" || obraFiltro !== "all" || operadorFiltro !== "all" || repartidorFiltro !== "all" || tipoOperadorFiltro !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNumeroRemito("");
                setProductoFiltro("all");
                setMaquinariaFiltro("all");
                setObraFiltro("all");
                setOperadorFiltro("all");
                setRepartidorFiltro("all");
                setTipoOperadorFiltro("all");
              }}
              className="h-8 text-muted-foreground"
            >
              <X className="w-3.5 h-3.5 mr-1" /> Limpiar filtros
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">N° Remito</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar remito..."
                value={numeroRemito}
                onChange={(e) => setNumeroRemito(e.target.value)}
                className="pl-8 h-9 bg-background border-border"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Producto</label>
            <Select value={productoFiltro} onValueChange={setProductoFiltro}>
              <SelectTrigger className="h-9 bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {productos.map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.emoji} {p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Máquina</label>
            <Select value={maquinariaFiltro} onValueChange={setMaquinariaFiltro}>
              <SelectTrigger className="h-9 bg-background border-border">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las máquinas</SelectItem>
                {maquinariaOptions.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Obra</label>
            <Select value={obraFiltro} onValueChange={setObraFiltro}>
              <SelectTrigger className="h-9 bg-background border-border">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las obras</SelectItem>
                {obraOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Operador</label>
            <Select value={operadorFiltro} onValueChange={setOperadorFiltro}>
              <SelectTrigger className="h-9 bg-background border-border">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los operadores</SelectItem>
                {operadorOptions.map((op) => (
                  <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Repartidor</label>
            <Select value={repartidorFiltro} onValueChange={setRepartidorFiltro}>
              <SelectTrigger className="h-9 bg-background border-border">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los repartidores</SelectItem>
                {repartidorOptions.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tipo Operador</label>
            <Select value={tipoOperadorFiltro} onValueChange={setTipoOperadorFiltro}>
              <SelectTrigger className="h-9 bg-background border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="interno">Interno</SelectItem>
                <SelectItem value="externo">Externo</SelectItem>
                <SelectItem value="fletero">Fletero</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Prices panel */}
      <PreciosMesPanel anio={year} mes={mesNum} mesLabel={mesLabel} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
            <p className="text-sm text-muted-foreground">Cargas Registradas</p>
          </div>
          <Fuel className="w-8 h-8 text-primary" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{totalLitros.toLocaleString()} L</p>
            <p className="text-sm text-muted-foreground">Litros Totales</p>
          </div>
          <Droplets className="w-8 h-8 text-primary" />
        </div>
        <div className="card-industrial p-4 flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {hayCostos ? formatPeso(totalCosto) : (filtered.length > 0 ? (totalLitros / filtered.length).toFixed(0) + " L" : "0 L")}
            </p>
            <p className="text-sm text-muted-foreground">{hayCostos ? "Costo Total" : "Promedio/Carga"}</p>
          </div>
          <DollarSign className="w-8 h-8 text-muted-foreground" />
        </div>
      </div>

      {/* Movimiento filter + historial cisternas */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Movimiento:</span>
        {[["all", "Todos"], ["ingreso", "Ingresos a cisternas"], ["egreso", "Egresos"]].map(([v, l]) => (
          <Button key={v} size="sm" variant={movimientoFiltro === v ? "default" : "outline"} onClick={() => setMovimientoFiltro(v)}>
            {l}
          </Button>
        ))}
      </div>
      {historialCisternas.filas.length > 0 && (
        <div className="card-industrial p-4 overflow-x-auto">
          <p className="font-semibold mb-2">Historial de cisternas (litros ingresados)</p>
          <table className="text-sm w-full">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-1">Cisterna</th>
                {historialCisternas.meses.map((m) => (
                  <th key={m} className="text-right py-1 px-2">{m.slice(5)}/{m.slice(0, 4)}</th>
                ))}
                <th className="text-right py-1 px-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {historialCisternas.filas.map(([cod, row]) => (
                <tr key={cod} className="border-t border-border">
                  <td className="py-1 font-medium">{cod}</td>
                  {historialCisternas.meses.map((m) => (
                    <td key={m} className="text-right px-2">{(row[m] || 0).toLocaleString("es-AR")}</td>
                  ))}
                  <td className="text-right px-2 font-bold text-primary">
                    {Object.values(row).reduce((a, b) => a + b, 0).toLocaleString("es-AR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Table */}
      <div className="card-industrial overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">N° Remito</TableHead>
              <TableHead className="text-muted-foreground font-medium">Fecha</TableHead>
              <TableHead className="text-muted-foreground font-medium">Producto</TableHead>
              <TableHead className="text-muted-foreground font-medium">Repartidor</TableHead>
              <TableHead className="text-muted-foreground font-medium">Operador</TableHead>
              <TableHead className="text-muted-foreground font-medium">Tipo Op.</TableHead>
              <TableHead className="text-muted-foreground font-medium">Máquina</TableHead>
              <TableHead className="text-muted-foreground font-medium">Obra</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Cantidad</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Precio U.</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Costo</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Horas</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Km</TableHead>
              <TableHead className="text-muted-foreground font-medium">Observaciones</TableHead>
              <TableHead className="text-muted-foreground font-medium w-20"></TableHead>
             </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                  <Fuel className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>No hay entregas de repartidor registradas</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((carga) => {
                const precio = getPrecioForCarga(carga);
                const costo = precio !== undefined ? (carga.litros || 0) * precio : undefined;
                return (
                  <TableRow key={carga.id} className="border-border hover:bg-muted/50">
                    <TableCell className="text-foreground font-mono text-xs">{carga.numero_remito || "-"}</TableCell>
                    <TableCell className="text-foreground">{formatDate(carga.fecha)}</TableCell>
                    <TableCell className="text-foreground capitalize">
                      {carga.tipo_producto || "combustible"}
                      {carga.tipo_movimiento === "ingreso" && (
                        <span className="ml-1 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary normal-case">Ingreso</span>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {carga.repartidor ? formatOperador(carga.repartidor) : formatOperador(carga.parte_diario?.personal)}
                    </TableCell>
                    <TableCell className="text-foreground">{formatOperador(carga.operador)}</TableCell>
                    <TableCell className="text-foreground capitalize">{carga.tipo_operador || "interno"}</TableCell>
                    <TableCell className="text-foreground">
                      {carga.maquinaria?.codigo || carga.maquinaria?.tipo || "-"}
                    </TableCell>
                    <TableCell className="text-foreground">{carga.obra?.nombre || "-"}</TableCell>
                    <TableCell className="text-right font-medium text-primary">
                      {carga.litros} {carga.tipo_producto === "grasa" ? "Kg" : "L"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">
                      {precio !== undefined ? formatPeso(precio) : <span className="text-muted-foreground/50 italic">Sin precio</span>}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {costo !== undefined ? (
                        <span className="text-primary font-semibold">{formatPeso(costo)}</span>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs italic">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{carga.horas || "-"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{carga.km || "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[150px] truncate" title={carga.observaciones || ""}>{carga.observaciones || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEditingCarga(carga);
                            setShowEditDialog(true);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeletingCarga(carga)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {filtered.length > 0 && hayCostos && (
            <TableFooter>
              <TableRow className="border-border">
                <TableCell colSpan={12} className="text-right font-semibold text-foreground">
                  Total del período:
                </TableCell>
                <TableCell className="text-right font-bold text-primary text-base">
                  {formatPeso(totalCosto)}
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {/* Edit Dialog */}
      <CargaCombustibleRepartidorDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setEditingCarga(null);
        }}
        carga={editingCarga as any}
        fechaParte={editingCarga?.fecha || new Date().toISOString().split("T")[0]}
        personal={personal}
        maquinarias={maquinarias}
        obras={obras}
        onSave={async (data) => {
          if (!editingCarga) return;
          await updateCarga({ id: editingCarga.id, ...data });
          setShowEditDialog(false);
          setEditingCarga(null);
        }}
        isSaving={isUpdating}
      />

      {/* Delete Dialog */}
      <DeleteConfirmDialog
        open={!!deletingCarga}
        onOpenChange={(open) => { if (!open) setDeletingCarga(null); }}
        onConfirm={async () => {
          if (!deletingCarga) return;
          await deleteCarga(deletingCarga.id);
          setDeletingCarga(null);
        }}
        title="¿Eliminar entrega?"
        description="Se eliminará permanentemente esta entrega de combustible/insumo."
      />
    </div>
  );
}

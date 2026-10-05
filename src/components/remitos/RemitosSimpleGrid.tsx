import { memo, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { RemitoWithRelations } from "@/hooks/useRemitos";
import { RemitoItem, resumenItems } from "@/hooks/useRemitoItems";
import { ObraWithRelations } from "@/hooks/useObras";
import { MaquinariaWithRelations } from "@/hooks/useMaquinarias";
import { formatDate } from "@/lib/utils";

interface RemitosSimpleGridProps {
  remitos: RemitoWithRelations[];
  obras: ObraWithRelations[];
  maquinarias: MaquinariaWithRelations[];
  onEdit: (remito: RemitoWithRelations) => void;
  onDelete: (id: string) => void;
  creadoresMap?: Record<string, string>;
  showClienteCantera?: boolean;
  hideExtrasForFranco?: boolean;
  itemsMap?: Record<string, RemitoItem[]>;
  canManage?: boolean;
}

interface RowProps {
  r: RemitoWithRelations;
  maqMap: Record<string, string>;
  itemsMap?: Record<string, RemitoItem[]>;
  creadoresMap?: Record<string, string>;
  showClienteCantera?: boolean;
  hideExtrasForFranco?: boolean;
  onEdit: (r: RemitoWithRelations) => void;
  onDelete: (id: string) => void;
  style: React.CSSProperties;
  columns: { key: string; width: number; align?: "right" | "center" }[];
  canManage: boolean;
}

const ROW_HEIGHT = 34;

function formatFormaPago(fp?: string | null) {
  if (!fp) return "-";
  if (fp === "cuenta_corriente") return "Cta. Corriente";
  return fp.charAt(0).toUpperCase() + fp.slice(1);
}

const Row = memo(function Row({
  r,
  maqMap,
  itemsMap,
  creadoresMap,
  showClienteCantera,
  hideExtrasForFranco,
  onEdit,
  onDelete,
  style,
  columns,
  canManage,
}: RowProps) {
  const cellBase = "px-3 py-2 border-b border-border text-xs truncate";
  const valByKey: Record<string, React.ReactNode> = {
    fecha: formatDate(r.fecha),
    remito_tercero: r.remito_tercero || "-",
    remito_local: r.remito_local || r.numero || "-",
    desde: r.desde || "-",
    hasta: r.hasta || "-",
    tipo: r.tipo_material || r.material || "-",
    transporte: r.tipo_transporte || "-",
    vehiculo: r.maquinaria_id ? maqMap[r.maquinaria_id] || "-" : "-",
    pat_tercero: r.patente_tercero || "-",
    cli_origen: r.cliente || "-",
    cli_destino: (r as any).cliente_destino || "-",
    cli_cantera: (r as any).cliente_cantera || "-",
    viajes: r.cantidad_viajes || 0,
    c_uni: r.cantidad_uni ?? "-",
    c_total: r.cantidad || 0,
    unidad: r.unidad || "M3",
    p_unit: r.precio_unitario != null ? `$${r.precio_unitario.toLocaleString("es-AR")}` : "-",
    p_total: `$${(r.precio_total || 0).toLocaleString("es-AR")}`,
    items: (() => {
      const its = itemsMap?.[r.id];
      if (!its || its.length === 0) return "-";
      return `+${its.length} ítem${its.length === 1 ? "" : "s"}`;
    })(),
    proveedor: r.proveedor || "-",
    forma_pago: formatFormaPago((r as any).forma_pago),
    observaciones: r.observaciones || "-",
    cargado_por: (r as any).created_by ? (creadoresMap?.[(r as any).created_by] || "-") : "-",
  };

  return (
    <div
      style={style}
      className="flex hover:bg-muted/40"
    >
      {columns.map((c) => {
        if (c.key === "acciones") {
          return (
            <div
              key={c.key}
              className={`${cellBase} flex items-center justify-center gap-1`}
              style={{ width: c.width, minWidth: c.width }}
            >
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(r)} disabled={!canManage}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(r.id)}
                disabled={!canManage}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        }
        const alignClass =
          c.align === "right" ? "justify-end text-right" : c.align === "center" ? "justify-center text-center" : "";
        return (
          <div
            key={c.key}
            className={`${cellBase} flex items-center ${alignClass}`}
            style={{ width: c.width, minWidth: c.width }}
            title={typeof valByKey[c.key] === "string" ? (valByKey[c.key] as string) : undefined}
          >
            {valByKey[c.key]}
          </div>
        );
      })}
    </div>
  );
}, (prev, next) => {
  return (
    prev.r.id === next.r.id &&
    (prev.r as any).updated_at === (next.r as any).updated_at &&
    prev.creadoresMap === next.creadoresMap &&
    prev.maqMap === next.maqMap &&
    prev.showClienteCantera === next.showClienteCantera &&
    prev.hideExtrasForFranco === next.hideExtrasForFranco &&
    prev.itemsMap === next.itemsMap &&
    prev.canManage === next.canManage &&
    prev.style.transform === next.style.transform
  );
});

export function RemitosSimpleGrid({
  remitos,
  maquinarias,
  onEdit,
  onDelete,
  creadoresMap,
  showClienteCantera = false,
  hideExtrasForFranco = false,
  itemsMap,
  canManage = true,
}: RemitosSimpleGridProps) {
  const maqMap = useMemo(() => {
    const m: Record<string, string> = {};
    maquinarias.forEach((mq) => {
      m[mq.id] = [mq.codigo, mq.patente].filter(Boolean).join(" - ");
    });
    return m;
  }, [maquinarias]);

  const columns = useMemo(() => {
    const cols: { key: string; label: string; width: number; align?: "right" | "center" }[] = [];
    cols.push({ key: "fecha", label: "Fecha", width: 95 });
    if (!hideExtrasForFranco) cols.push({ key: "remito_tercero", label: "Rem. Tercero", width: 100 });
    cols.push({ key: "remito_local", label: "Rem. Local", width: 100 });
    cols.push({ key: "desde", label: "Desde", width: 150 });
    cols.push({ key: "hasta", label: "Hasta", width: 150 });
    cols.push({ key: "tipo", label: "Tipo", width: 110 });
    cols.push({ key: "transporte", label: "Transporte", width: 110 });
    cols.push({ key: "vehiculo", label: "Vehículo", width: 140 });
    cols.push({ key: "pat_tercero", label: "Pat. Tercero", width: 100 });
    if (!hideExtrasForFranco) cols.push({ key: "cli_origen", label: "Cli. Origen", width: 130 });
    if (!hideExtrasForFranco) cols.push({ key: "cli_destino", label: "Cli. Destino", width: 130 });
    if (showClienteCantera) cols.push({ key: "cli_cantera", label: "Cli. Cantera", width: 150 });
    cols.push({ key: "viajes", label: "Viajes", width: 65, align: "right" });
    cols.push({ key: "c_uni", label: "C. Uni.", width: 75, align: "right" });
    cols.push({ key: "c_total", label: "C. Total", width: 80, align: "right" });
    cols.push({ key: "unidad", label: "Unidad", width: 65 });
    cols.push({ key: "p_unit", label: "P. Unit.", width: 90, align: "right" });
    cols.push({ key: "p_total", label: "P. Total", width: 100, align: "right" });
    cols.push({ key: "items", label: "Ítems", width: 80, align: "center" });
    if (!hideExtrasForFranco) cols.push({ key: "proveedor", label: "Proveedor", width: 110 });
    cols.push({ key: "forma_pago", label: "Forma Pago", width: 110 });
    cols.push({ key: "observaciones", label: "Observaciones", width: 140 });
    if (creadoresMap) cols.push({ key: "cargado_por", label: "Cargado por", width: 150 });
    cols.push({ key: "acciones", label: "Acciones", width: 90, align: "center" });
    return cols;
  }, [hideExtrasForFranco, showClienteCantera, creadoresMap]);

  const totalWidth = useMemo(() => columns.reduce((s, c) => s + c.width, 0), [columns]);

  const totals = useMemo(() => {
    let precio = 0;
    let viajes = 0;
    for (const r of remitos) {
      precio += r.precio_total || 0;
      viajes += r.cantidad_viajes || 0;
      for (const it of itemsMap?.[r.id] || []) {
        precio += it.precio_total || 0;
      }
    }
    return { precio, viajes };
  }, [remitos, itemsMap]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: remitos.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-muted-foreground">
        {remitos.length} remitos · {totals.viajes} viajes · ${totals.precio.toLocaleString("es-AR")}
      </div>

      <div
        ref={scrollRef}
        className="overflow-auto border rounded-md relative"
        style={{ height: "calc(100vh - 360px)", minHeight: "400px" }}
      >
        <div style={{ width: totalWidth, minWidth: "100%" }}>
          {/* Sticky header */}
          <div
            className="flex sticky top-0 z-20 bg-muted shadow-sm"
            style={{ width: totalWidth }}
          >
            {columns.map((c) => {
              const alignClass =
                c.align === "right" ? "justify-end text-right" : c.align === "center" ? "justify-center text-center" : "";
              return (
                <div
                  key={c.key}
                  className={`px-3 py-2 text-xs font-medium border-b border-border flex items-center ${alignClass}`}
                  style={{ width: c.width, minWidth: c.width }}
                >
                  {c.label}
                </div>
              );
            })}
          </div>

          {remitos.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              No hay remitos para mostrar
            </div>
          ) : (
            <div
              style={{
                height: rowVirtualizer.getTotalSize(),
                position: "relative",
                width: totalWidth,
              }}
            >
              {rowVirtualizer.getVirtualItems().map((vi) => {
                const r = remitos[vi.index];
                return (
                  <Row
                    key={r.id}
                    r={r}
                    maqMap={maqMap}
                    itemsMap={itemsMap}
                    creadoresMap={creadoresMap}
                    showClienteCantera={showClienteCantera}
                    hideExtrasForFranco={hideExtrasForFranco}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    columns={columns}
                    canManage={canManage}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: totalWidth,
                      height: ROW_HEIGHT,
                      transform: `translateY(${vi.start}px)`,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Download, Lock, CheckCircle2, AlertCircle, ChevronDown, Save } from "lucide-react";
import {
  useLiquidacion, useLiquidacionItems, useUpdateLiquidacionItem, useUpdateLiquidacion,
  type LiquidacionItem,
} from "@/hooks/useLiquidaciones";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  exportarExcelBanco, exportarExcelEfectivo, exportarExcelResumenContable,
} from "@/utils/exportLiquidacion";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const PERIODO_LABEL: Record<string, string> = {
  quincena_1: "Quincena 1 (1-15)", quincena_2: "Quincena 2 (16-fin)", mes: "Mes completo",
};
const formatARS = (n: number | string) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(n || 0));

interface Props {
  id: string | null;
  onClose: () => void;
}

// Compute net values for a row given inputs + base sueldo for proportional discount
function recalcItem(row: LiquidacionItem, monto_banco_fijo: number): Partial<LiquidacionItem> {
  const bruto_blanco = Number(row.bruto_blanco || 0);
  const bruto_negro = Number(row.bruto_negro || 0);
  const presentismo = Number(row.presentismo || 0);
  const importe_he = Number(row.importe_he || 0);
  const adelantos = Number(row.adelantos || 0);
  const cuota = Number(row.cuota_prestamo || 0);
  const otros_desc = Number(row.otros_descuentos || 0);
  const otros_adi = Number(row.otros_adicionales || 0);

  // Faltas/licencia: descuento proporcional (asumimos 30 días por mes / 15 por quincena → usar 30 base)
  const dias_falta = Number(row.dias_falta || 0);
  const dias_lic_no_pag = Number(row.dias_licencia || 0); // licencias sin goce
  const bruto = bruto_blanco + bruto_negro;
  const descDias = bruto > 0 ? (bruto / 30) * (dias_falta + dias_lic_no_pag) : 0;

  // Apply day-discount proportionally to blanco/negro
  const propB = bruto > 0 ? bruto_blanco / bruto : 0;
  const propN = 1 - propB;
  const descB = descDias * propB;
  const descN = descDias * propN;

  const neto_blanco = Math.max(0, bruto_blanco - descB + presentismo * propB + importe_he * propB - 0);
  const neto_negro = Math.max(0, bruto_negro - descN + presentismo * propN + importe_he * propN);
  // Adelantos / préstamos / otros descuentos se restan del total y se aplican al cash primero
  const neto_total_pre = neto_blanco + neto_negro + otros_adi - adelantos - cuota - otros_desc;
  const neto_total = Math.max(0, neto_total_pre);

  // Split banco/efectivo: monto banco fijo (cap a neto)
  const monto_banco = Math.min(monto_banco_fijo, neto_total);
  const monto_efectivo = Math.max(0, neto_total - monto_banco);

  return {
    neto_blanco: +neto_blanco.toFixed(2),
    neto_negro: +neto_negro.toFixed(2),
    neto_total: +neto_total.toFixed(2),
    monto_banco: +monto_banco.toFixed(2),
    monto_efectivo: +monto_efectivo.toFixed(2),
  };
}

export function LiquidacionDetalle({ id, onClose }: Props) {
  const { data: liq } = useLiquidacion(id);
  const { data: items = [] } = useLiquidacionItems(id);
  const update = useUpdateLiquidacionItem();
  const updateLiq = useUpdateLiquidacion();

  const [draft, setDraft] = useState<Record<string, Partial<LiquidacionItem>>>({});
  const [configMap, setConfigMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("liquidacion_config_personal")
        .select("personal_id, monto_banco_fijo");
      const map: Record<string, number> = {};
      (data || []).forEach((c: any) => { map[c.personal_id] = Number(c.monto_banco_fijo || 0); });
      setConfigMap(map);
    })();
  }, [id]);

  useEffect(() => { setDraft({}); }, [id]);

  if (!id || !liq) return null;
  const isLocked = liq.estado !== "borrador";

  const getRowValue = (it: LiquidacionItem, key: keyof LiquidacionItem) => {
    const d = draft[it.id];
    if (d && key in d) return (d as any)[key];
    return (it as any)[key];
  };

  const rowsComputed = useMemo(() => {
    return items.map((it) => {
      const merged: LiquidacionItem = { ...it, ...(draft[it.id] || {}) } as LiquidacionItem;
      const recalc = recalcItem(merged, configMap[it.personal_id] || 0);
      return { ...merged, ...recalc };
    });
  }, [items, draft, configMap]);

  const totals = useMemo(() => {
    let blanco = 0, negro = 0, banco = 0, efectivo = 0, neto = 0;
    rowsComputed.forEach((r) => {
      blanco += Number(r.neto_blanco || 0);
      negro += Number(r.neto_negro || 0);
      banco += Number(r.monto_banco || 0);
      efectivo += Number(r.monto_efectivo || 0);
      neto += Number(r.neto_total || 0);
    });
    return { blanco, negro, banco, efectivo, neto };
  }, [rowsComputed]);

  const setCell = (rowId: string, key: keyof LiquidacionItem, value: any) => {
    setDraft((d) => ({ ...d, [rowId]: { ...(d[rowId] || {}), [key]: value } }));
  };

  const guardarTodo = async () => {
    const ids = Object.keys(draft);
    if (ids.length === 0) {
      toast.info("No hay cambios para guardar");
      return;
    }
    for (const rowId of ids) {
      const orig = items.find((i) => i.id === rowId);
      if (!orig) continue;
      const merged: LiquidacionItem = { ...orig, ...draft[rowId] } as LiquidacionItem;
      const recalc = recalcItem(merged, configMap[orig.personal_id] || 0);
      const patch = { ...draft[rowId], ...recalc };
      await supabase.from("liquidacion_items").update(patch).eq("id", rowId);
    }
    // Update liquidacion totals
    await supabase.from("liquidaciones").update({
      total_blanco: totals.blanco,
      total_negro: totals.negro,
      total_banco: totals.banco,
      total_efectivo: totals.efectivo,
      total_neto: totals.neto,
    }).eq("id", id);

    setDraft({});
    toast.success("Cambios guardados");
    // refetch
    updateLiq.mutate({ id, patch: {} });
  };

  const cerrar = async () => {
    await guardarTodo();
    await supabase.from("liquidaciones").update({
      estado: "cerrada", cerrada_at: new Date().toISOString(),
    }).eq("id", id);
    toast.success("Liquidación cerrada");
    updateLiq.mutate({ id, patch: {} });
  };

  const marcarPagada = async () => {
    await supabase.from("liquidaciones").update({
      estado: "pagada", pagada_at: new Date().toISOString(),
    }).eq("id", id);
    // Also mark all items as paid
    await supabase.from("liquidacion_items").update({
      pagado: true, pagado_at: new Date().toISOString(),
    }).eq("liquidacion_id", id);
    toast.success("Liquidación marcada como pagada");
    updateLiq.mutate({ id, patch: {} });
  };

  const reabrir = async () => {
    await supabase.from("liquidaciones").update({
      estado: "borrador", cerrada_at: null, pagada_at: null,
    }).eq("id", id);
    toast.success("Liquidación reabierta para edición");
    updateLiq.mutate({ id, patch: {} });
  };

  const togglePagado = async (rowId: string, pagado: boolean) => {
    await supabase.from("liquidacion_items").update({
      pagado, pagado_at: pagado ? new Date().toISOString() : null,
    }).eq("id", rowId);
    updateLiq.mutate({ id, patch: {} });
  };

  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[98vw] h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <DialogTitle className="flex items-center gap-3">
              {MESES[liq.mes - 1]} {liq.anio}
              <Badge variant="outline">{PERIODO_LABEL[liq.periodo]}</Badge>
              {liq.estado === "cerrada" && <Badge className="bg-amber-600">Cerrada</Badge>}
              {liq.estado === "pagada" && <Badge className="bg-green-600">Pagada</Badge>}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {!isLocked && (
                <>
                  <Button size="sm" variant="outline" onClick={guardarTodo} className="gap-1">
                    <Save className="w-4 h-4" /> Guardar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" className="gap-1"><Lock className="w-4 h-4" /> Cerrar</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Cerrar liquidación?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Una vez cerrada no podés editar los importes. Podés reabrirla luego.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={cerrar}>Cerrar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
              {liq.estado === "cerrada" && (
                <>
                  <Button size="sm" variant="outline" onClick={reabrir}>Reabrir</Button>
                  <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700" onClick={marcarPagada}>
                    <CheckCircle2 className="w-4 h-4" /> Marcar pagada
                  </Button>
                </>
              )}
              {liq.estado === "pagada" && (
                <Button size="sm" variant="outline" onClick={reabrir}>Reabrir</Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1">
                    <Download className="w-4 h-4" /> Exportar <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportarExcelBanco(liq, rowsComputed as any)}>
                    Excel Banco
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportarExcelEfectivo(liq, rowsComputed as any)}>
                    Listado Efectivo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportarExcelResumenContable(liq, rowsComputed as any)}>
                    Resumen Contable
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex gap-4 text-xs text-muted-foreground pt-2">
            <span><b className="text-foreground">{formatARS(totals.blanco)}</b> Blanco</span>
            <span><b className="text-foreground">{formatARS(totals.negro)}</b> Negro</span>
            <span><b className="text-foreground">{formatARS(totals.banco)}</b> Banco</span>
            <span><b className="text-foreground">{formatARS(totals.efectivo)}</b> Efectivo</span>
            <span className="ml-auto"><b className="text-primary">{formatARS(totals.neto)}</b> Neto total</span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8" />
              <p>Sin empleados en esta liquidación.</p>
              <p className="text-xs">Cargá la configuración de cada empleado en "Configuración por empleado" y la modalidad debe coincidir con el período seleccionado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[180px]">Empleado</TableHead>
                  <TableHead className="text-right">Bruto Blanco</TableHead>
                  <TableHead className="text-right">Bruto Negro</TableHead>
                  <TableHead className="text-right w-[60px]">Faltas</TableHead>
                  <TableHead className="text-right w-[60px]">Lic.</TableHead>
                  <TableHead className="text-right">HE $</TableHead>
                  <TableHead className="text-right">Presentismo</TableHead>
                  <TableHead className="text-right">Adelantos</TableHead>
                  <TableHead className="text-right">Préstamo</TableHead>
                  <TableHead className="text-right">Otros Desc.</TableHead>
                  <TableHead className="text-right bg-muted">Neto</TableHead>
                  <TableHead className="text-right bg-muted">Banco</TableHead>
                  <TableHead className="text-right bg-muted">Efectivo</TableHead>
                  <TableHead className="w-[80px] text-center">Pagado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsComputed.map((r) => {
                  const orig = items.find((i) => i.id === r.id)!;
                  const numInput = (key: keyof LiquidacionItem) => (
                    <Input
                      type="number"
                      step="any"
                      disabled={isLocked}
                      value={getRowValue(orig, key) ?? 0}
                      onChange={(e) => setCell(orig.id, key, e.target.value === "" ? 0 : Number(e.target.value))}
                      className="h-8 text-right text-xs"
                    />
                  );
                  return (
                    <TableRow key={r.id} className={r.embargo ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1">
                          {r.embargo && <Badge variant="destructive" className="text-[10px] px-1 py-0">EMB</Badge>}
                          <span className="text-xs">{r.personal?.apellido}, {r.personal?.nombre}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">Leg. {r.personal?.legajo || "—"}</span>
                      </TableCell>
                      <TableCell>{numInput("bruto_blanco")}</TableCell>
                      <TableCell>{numInput("bruto_negro")}</TableCell>
                      <TableCell>{numInput("dias_falta")}</TableCell>
                      <TableCell>{numInput("dias_licencia")}</TableCell>
                      <TableCell>{numInput("importe_he")}</TableCell>
                      <TableCell>{numInput("presentismo")}</TableCell>
                      <TableCell>{numInput("adelantos")}</TableCell>
                      <TableCell>{numInput("cuota_prestamo")}</TableCell>
                      <TableCell>{numInput("otros_descuentos")}</TableCell>
                      <TableCell className="text-right bg-muted/50 font-semibold text-xs">{formatARS(r.neto_total)}</TableCell>
                      <TableCell className="text-right bg-muted/50 text-xs">{formatARS(r.monto_banco)}</TableCell>
                      <TableCell className="text-right bg-muted/50 text-xs">{formatARS(r.monto_efectivo)}</TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={orig.pagado}
                          onCheckedChange={(c) => togglePagado(orig.id, !!c)}
                          disabled={liq.estado === "borrador"}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

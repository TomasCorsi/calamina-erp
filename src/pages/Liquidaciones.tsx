import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Download, Trash2, Lock, CheckCircle2, Settings as SettingsIcon, Wallet } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useLiquidaciones, useCreateLiquidacion, useDeleteLiquidacion,
  type Liquidacion, type LiquidacionPeriodo,
} from "@/hooks/useLiquidaciones";
import { LiquidacionDetalle } from "@/components/liquidaciones/LiquidacionDetalle";
import { ConfigPersonalTab } from "@/components/liquidaciones/ConfigPersonalTab";
import { AdelantosTab } from "@/components/liquidaciones/AdelantosTab";
import { PrestamosTab } from "@/components/liquidaciones/PrestamosTab";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const PERIODO_LABEL: Record<LiquidacionPeriodo, string> = {
  quincena_1: "Quincena 1 (1-15)",
  quincena_2: "Quincena 2 (16-fin)",
  mes: "Mes completo",
};

const estadoBadge = (e: Liquidacion["estado"]) => {
  if (e === "borrador") return <Badge variant="secondary">Borrador</Badge>;
  if (e === "cerrada") return <Badge className="bg-amber-600">Cerrada</Badge>;
  return <Badge className="bg-green-600">Pagada</Badge>;
};

const formatARS = (n: number | string) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(n || 0));

export default function Liquidaciones() {
  const navigate = useNavigate();
  const { data: liquidaciones = [], isLoading } = useLiquidaciones();
  const [openDetalle, setOpenDetalle] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);

  const now = new Date();
  const [newPeriodo, setNewPeriodo] = useState<LiquidacionPeriodo>("mes");
  const [newMes, setNewMes] = useState(now.getMonth() + 1);
  const [newAnio, setNewAnio] = useState(now.getFullYear());

  const create = useCreateLiquidacion();
  const del = useDeleteLiquidacion();

  const grouped = useMemo(() => {
    const pending = liquidaciones.filter((l) => l.estado !== "pagada");
    const history = liquidaciones.filter((l) => l.estado === "pagada");
    return { pending, history };
  }, [liquidaciones]);

  const handleCreate = async () => {
    const res = await create.mutateAsync({ periodo: newPeriodo, mes: newMes, anio: newAnio });
    setOpenNew(false);
    setOpenDetalle(res.id);
  };

  return (
    <MainLayout title="Liquidación de Sueldos" subtitle="Quincena, mes, adelantos y préstamos">
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="w-6 h-6 text-primary" />
              Liquidación de Sueldos
            </h1>
            <p className="text-muted-foreground text-sm">
              Gestión de quincena, mes, adelantos, préstamos y configuración por empleado.
            </p>
          </div>
          <Button onClick={() => setOpenNew(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Nueva liquidación
          </Button>
        </div>

        <Tabs defaultValue="pendientes" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 max-w-3xl">
            <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="adelantos">Adelantos</TabsTrigger>
            <TabsTrigger value="prestamos">Préstamos</TabsTrigger>
          </TabsList>

          <TabsContent value="pendientes" className="space-y-3 mt-4">
            {isLoading && <p className="text-muted-foreground">Cargando…</p>}
            {!isLoading && grouped.pending.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No hay liquidaciones pendientes. Creá una con el botón "Nueva liquidación".
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {grouped.pending.map((l) => (
                <LiqCard key={l.id} liq={l} onOpen={() => setOpenDetalle(l.id)} onDelete={() => del.mutate(l.id)} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="historico" className="space-y-3 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {grouped.history.map((l) => (
                <LiqCard key={l.id} liq={l} onOpen={() => setOpenDetalle(l.id)} onDelete={() => del.mutate(l.id)} />
              ))}
            </div>
            {!isLoading && grouped.history.length === 0 && (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Sin liquidaciones pagadas aún.</CardContent></Card>
            )}
          </TabsContent>

          <TabsContent value="adelantos" className="mt-4">
            <AdelantosTab />
          </TabsContent>

          <TabsContent value="prestamos" className="mt-4">
            <PrestamosTab />
          </TabsContent>
        </Tabs>

        <div className="pt-4">
          <details className="border rounded-lg">
            <summary className="p-3 cursor-pointer font-semibold flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" /> Configuración por empleado
            </summary>
            <div className="p-3 border-t">
              <ConfigPersonalTab />
            </div>
          </details>
        </div>
      </div>

      {/* New liquidation dialog */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva liquidación</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Período</Label>
              <Select value={newPeriodo} onValueChange={(v) => setNewPeriodo(v as LiquidacionPeriodo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quincena_1">Quincena 1 (1-15)</SelectItem>
                  <SelectItem value="quincena_2">Quincena 2 (16-fin)</SelectItem>
                  <SelectItem value="mes">Mes completo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Mes</Label>
                <Select value={String(newMes)} onValueChange={(v) => setNewMes(+v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Año</Label>
                <Select value={String(newAnio)} onValueChange={(v) => setNewAnio(+v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Se cargan automáticamente todos los empleados cuya modalidad coincide con el período.
              Para quincena se toma el 50% del sueldo configurado.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenNew(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={create.isPending}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <LiquidacionDetalle id={openDetalle} onClose={() => setOpenDetalle(null)} />
    </MainLayout>
  );
}

function LiqCard({ liq, onOpen, onDelete }: { liq: Liquidacion; onOpen: () => void; onDelete: () => void }) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">
            {MESES[liq.mes - 1]} {liq.anio}
          </CardTitle>
          {estadoBadge(liq.estado)}
        </div>
        <p className="text-xs text-muted-foreground">{PERIODO_LABEL[liq.periodo]}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Banco:</span> <b>{formatARS(liq.total_banco)}</b></div>
          <div><span className="text-muted-foreground">Efectivo:</span> <b>{formatARS(liq.total_efectivo)}</b></div>
          <div className="col-span-2 border-t pt-1"><span className="text-muted-foreground">Neto total:</span> <b className="text-primary">{formatARS(liq.total_neto)}</b></div>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Button size="sm" variant="default" onClick={onOpen} className="flex-1">Abrir</Button>
          {liq.estado === "borrador" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost"><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar liquidación?</AlertDialogTitle>
                  <AlertDialogDescription>Se eliminan también todos los ítems cargados.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

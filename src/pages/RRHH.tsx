import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Lock, Eye } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { usePersonal } from "@/hooks/usePersonal";
import {
  useRrhhPeriodos, useCreatePeriodo, useUpdatePeriodo, useDeletePeriodo,
  useJornada, useFeriados, calcularHorasNormales, rangoPeriodo,
  PERIODO_LABEL, MESES,
  type RrhhPeriodo, type RrhhPeriodoTipo, type RrhhPeriodoEstado,
} from "@/hooks/useRrhh";
import { PanelTab } from "@/components/rrhh/PanelTab";
import { NovedadesTab } from "@/components/rrhh/NovedadesTab";
import { PlanillaTab } from "@/components/rrhh/PlanillaTab";
import { EmpleadosTab } from "@/components/rrhh/EmpleadosTab";
import { ConfigTab } from "@/components/rrhh/ConfigTab";
import type { PersonalMin } from "@/components/rrhh/planillaData";

const ESTADO_BADGE: Record<RrhhPeriodoEstado, { label: string; className: string }> = {
  abierto: { label: "Abierto", className: "bg-emerald-600" },
  revision: { label: "En revisión", className: "bg-amber-600" },
  cerrado: { label: "Cerrado", className: "bg-muted text-muted-foreground" },
};

export default function RRHH() {
  const { personal } = usePersonal();
  const { data: periodos = [] } = useRrhhPeriodos();
  const { data: jornada } = useJornada();
  const { data: feriados = [] } = useFeriados();
  const crearPeriodo = useCreatePeriodo();
  const actualizarPeriodo = useUpdatePeriodo();
  const borrarPeriodo = useDeletePeriodo();

  const [periodoId, setPeriodoId] = useState<string>("");
  const [openNuevo, setOpenNuevo] = useState(false);

  const hoy = new Date();
  const [tipo, setTipo] = useState<RrhhPeriodoTipo>(hoy.getDate() <= 15 ? "quincena_1" : "quincena_2");
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());

  useEffect(() => {
    if (!periodoId && periodos.length > 0) setPeriodoId(periodos[0].id);
  }, [periodos, periodoId]);

  const periodo: RrhhPeriodo | null = useMemo(
    () => periodos.find((p) => p.id === periodoId) ?? null,
    [periodos, periodoId],
  );

  const empleados: PersonalMin[] = useMemo(
    () => (personal as any[]).filter((p) => p.activo !== false) as PersonalMin[],
    [personal],
  );

  const rangoNuevo = rangoPeriodo(tipo, mes, anio);
  const horasNuevo = calcularHorasNormales(rangoNuevo.desde, rangoNuevo.hasta, jornada ?? null, feriados);

  const anios = Array.from({ length: 8 }, (_, i) => hoy.getFullYear() - 5 + i);

  return (
    <MainLayout title="RRHH" subtitle="Novedades, sueldos y preparación de pagos">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <div className="space-y-1.5 min-w-[240px]">
              <Label>Período de trabajo</Label>
              <Select value={periodoId} onValueChange={setPeriodoId}>
                <SelectTrigger><SelectValue placeholder="Elegir período" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {periodos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {PERIODO_LABEL[p.tipo]} {MESES[p.mes - 1]} {p.anio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {periodo && (
              <>
                <div className="text-sm">
                  <p className="text-muted-foreground">
                    {formatDate(periodo.fecha_desde)} al {formatDate(periodo.fecha_hasta)}
                  </p>
                  <p className="font-semibold">{Number(periodo.horas_normales)} hs normales</p>
                </div>
                <Badge className={ESTADO_BADGE[periodo.estado].className}>
                  {ESTADO_BADGE[periodo.estado].label}
                </Badge>
              </>
            )}

            <div className="ml-auto flex flex-wrap gap-2">
              {periodo && periodo.estado !== "cerrado" && (
                <>
                  <Button variant="outline" className="gap-2"
                    onClick={() => actualizarPeriodo.mutate({ id: periodo.id, estado: periodo.estado === "revision" ? "abierto" : "revision" })}>
                    <Eye className="w-4 h-4" /> {periodo.estado === "revision" ? "Reabrir" : "Marcar en revisión"}
                  </Button>
                  <Button variant="outline" className="gap-2"
                    onClick={() => actualizarPeriodo.mutate({ id: periodo.id, estado: "cerrado" })}>
                    <Lock className="w-4 h-4" /> Cerrar
                  </Button>
                </>
              )}
              {periodo && periodo.estado === "cerrado" && (
                <Button variant="outline" className="gap-2"
                  onClick={() => actualizarPeriodo.mutate({ id: periodo.id, estado: "abierto" })}>
                  Reabrir período
                </Button>
              )}
              {periodo && (
                <Button variant="ghost" size="icon" className="text-destructive"
                  onClick={() => { borrarPeriodo.mutate(periodo.id); setPeriodoId(""); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button className="gap-2" onClick={() => setOpenNuevo(true)}>
                <Plus className="w-4 h-4" /> Nuevo período
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="panel">
          <TabsList>
            <TabsTrigger value="panel">Panel</TabsTrigger>
            <TabsTrigger value="novedades">Novedades</TabsTrigger>
            <TabsTrigger value="planilla">Planilla</TabsTrigger>
            <TabsTrigger value="empleados">Empleados</TabsTrigger>
            <TabsTrigger value="config">Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="panel" className="pt-4">
            <PanelTab periodo={periodo} personal={empleados} />
          </TabsContent>
          <TabsContent value="novedades" className="pt-4">
            <NovedadesTab periodo={periodo} periodos={periodos} personal={empleados} />
          </TabsContent>
          <TabsContent value="planilla" className="pt-4">
            <PlanillaTab periodo={periodo} personal={empleados} />
          </TabsContent>
          <TabsContent value="empleados" className="pt-4">
            <EmpleadosTab personal={empleados} />
          </TabsContent>
          <TabsContent value="config" className="pt-4">
            <ConfigTab />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={openNuevo} onOpenChange={setOpenNuevo}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuevo período</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as RrhhPeriodoTipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quincena_1">1ª Quincena</SelectItem>
                  <SelectItem value="quincena_2">2ª Quincena</SelectItem>
                  <SelectItem value="mes">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mes</Label>
                <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {MESES.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Año</Label>
                <Select value={String(anio)} onValueChange={(v) => setAnio(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {anios.map((a) => (
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p>{formatDate(rangoNuevo.desde)} al {formatDate(rangoNuevo.hasta)}</p>
              <p className="font-semibold">Horas normales del período: {horasNuevo} hs</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNuevo(false)}>Cancelar</Button>
            <Button
              disabled={crearPeriodo.isPending}
              onClick={async () => {
                const nuevo = await crearPeriodo.mutateAsync({
                  tipo, mes, anio,
                  fecha_desde: rangoNuevo.desde,
                  fecha_hasta: rangoNuevo.hasta,
                  horas_normales: horasNuevo,
                });
                if (nuevo?.id) setPeriodoId(nuevo.id);
                setOpenNuevo(false);
              }}
            >
              Crear período
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

import { useState, useMemo, lazy, Suspense } from "react";
import { format, startOfMonth } from "date-fns";
import { Loader2, Download, BarChart3, User, Users, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { useParteDiarioRendimiento } from "@/hooks/useParteDiarioRendimiento";
import { useObras } from "@/hooks/useObras";
import { ParteDiarioResumenGeneral } from "./ParteDiarioResumenGeneral";
import { PeriodoObraFilters } from "./PeriodoObraFilters";
import type { PersonalDB } from "@/hooks/usePersonal";

const ParteDiarioRendimientoChart = lazy(() =>
  import("./ParteDiarioRendimientoChart").then(m => ({ default: m.ParteDiarioRendimientoChart }))
);

interface ParteDiarioRendimientoTabProps {
  personal: PersonalDB[];
}

const ROL_LABELS: Record<string, string> = {
  maquinista: 'Maquinista',
  chofer: 'Chofer',
  capataz: 'Capataz',
  mecanico: 'Mecánico',
  sereno: 'Sereno',
  topografo: 'Topógrafo',
  ayudante: 'Ayudante',
  administrativo: 'Administrativo',
};

export const ParteDiarioRendimientoTab = ({ personal }: ParteDiarioRendimientoTabProps) => {
  const today = new Date();
  const [activeSubTab, setActiveSubTab] = useState<string>("general");
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState<Date>(startOfMonth(today));
  const [fechaHasta, setFechaHasta] = useState<Date>(today);
  const [obraId, setObraId] = useState<string>("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { obras } = useObras();

  const { data, isLoading } = useParteDiarioRendimiento(
    selectedEmpleadoId || undefined,
    fechaDesde,
    fechaHasta,
    obraId || undefined
  );

  const empleadoOptions: ComboboxOption[] = useMemo(() => {
    return personal.map(emp => {
      const nombre = [emp.nombre, emp.apellido].filter(Boolean).join(" ");
      const rol = ROL_LABELS[emp.rol] || emp.rol;
      const legajo = emp.legajo || "";
      return {
        value: emp.id,
        label: `${nombre} (${rol})`,
        searchValue: `${legajo} ${emp.nombre || ''} ${emp.apellido || ''} ${nombre} ${rol}`,
      };
    });
  }, [personal]);

  const periodoLabel = `${format(fechaDesde, "dd/MM/yyyy")} - ${format(fechaHasta, "dd/MM/yyyy")}`;

  const handleDownloadPDF = async () => {
    if (!data.empleado || data.partes.length === 0) return;

    setIsGeneratingPDF(true);
    try {
      const { generateParteDiarioPDF } = await import("@/utils/generateParteDiarioPDF");
      const obraNombre = obraId ? obras.find(o => o.id === obraId)?.nombre : undefined;
      await generateParteDiarioPDF(
        data.empleado,
        data.partes,
        data.totales,
        fechaDesde,
        fechaHasta,
        personal,
        obraNombre
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSelectFromGeneral = (empleadoId: string) => {
    setSelectedEmpleadoId(empleadoId);
    setActiveSubTab("empleado");
  };

  const handleBackToGeneral = () => {
    setSelectedEmpleadoId("");
    setActiveSubTab("general");
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="general" className="gap-2">
            <Users className="h-4 w-4" />
            Resumen General
          </TabsTrigger>
          <TabsTrigger value="empleado" className="gap-2">
            <User className="h-4 w-4" />
            Por Empleado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <ParteDiarioResumenGeneral onSelectEmpleado={handleSelectFromGeneral} />
        </TabsContent>

        <TabsContent value="empleado" className="mt-4">
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-2">
                    {selectedEmpleadoId && (
                      <Button variant="ghost" size="icon" onClick={handleBackToGeneral}>
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <CardTitle>Detalle por Empleado</CardTitle>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Combobox
                      options={empleadoOptions}
                      value={selectedEmpleadoId}
                      onValueChange={setSelectedEmpleadoId}
                      placeholder="Seleccionar empleado"
                      searchPlaceholder="Buscar por nombre o legajo..."
                      emptyText="No se encontraron empleados"
                      className="w-[280px]"
                    />
                    <Button
                      variant="outline"
                      onClick={handleDownloadPDF}
                      disabled={!selectedEmpleadoId || data.partes.length === 0 || isGeneratingPDF}
                    >
                      {isGeneratingPDF ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Descargar PDF
                    </Button>
                  </div>
                </div>

                <PeriodoObraFilters
                  fechaDesde={fechaDesde}
                  fechaHasta={fechaHasta}
                  obraId={obraId}
                  obras={obras}
                  onFechaDesdeChange={setFechaDesde}
                  onFechaHastaChange={setFechaHasta}
                  onObraChange={setObraId}
                />
              </CardHeader>
            </Card>

            {!selectedEmpleadoId ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Seleccione un empleado para ver su rendimiento detallado</p>
                    <p className="text-sm mt-2">
                      Use el buscador para encontrar empleados por nombre o legajo
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : data.empleado ? (
              <>
                <Card className="bg-muted/50">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {[data.empleado.nombre, data.empleado.apellido].filter(Boolean).join(" ")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {ROL_LABELS[data.empleado.rol] || data.empleado.rol}
                            {data.empleado.legajo && ` · Legajo: ${data.empleado.legajo}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {periodoLabel}
                        {obraId && (
                          <div className="text-xs">
                            {obras.find(o => o.id === obraId)?.nombre}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {data.partes.length === 0 ? (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center text-muted-foreground">
                        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No hay partes diarios para este período</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
                    <ParteDiarioRendimientoChart
                      diasDelMes={data.diasDelMes}
                      totales={data.totales}
                      rol={data.empleado.rol}
                      mesLabel={periodoLabel}
                    />
                  </Suspense>
                )}
              </>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

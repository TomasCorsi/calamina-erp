import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, MessageCircle, AlertTriangle, Clock, Send, ExternalLink, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useEmpleadosSinParte } from "@/hooks/useEmpleadosSinParte";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

function formatWhatsAppUrl(phone: string, message: string): string | null {
  if (!phone) return null;
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length < 8) return null;
  const fullPhone = cleanPhone.startsWith("54") ? cleanPhone : `54${cleanPhone}`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
}

function formatFecha(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

interface EmpleadoRow {
  nombre: string;
  legajo: string | null;
  telefono: string | null;
  mensaje: string;
}

function EmpleadoTable({ empleados, plantilla, onPlantillaChange }: {
  empleados: EmpleadoRow[];
  plantilla: string;
  onPlantillaChange: (v: string) => void;
}) {
  const conTelefono = empleados.filter((e) => e.telefono);
  
  const handleEnviarTodos = () => {
    conTelefono.forEach((emp, i) => {
      setTimeout(() => {
        const url = formatWhatsAppUrl(emp.telefono!, emp.mensaje);
        if (url) window.open(url, "_blank");
      }, i * 800);
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Plantilla de mensaje</label>
        <Textarea
          value={plantilla}
          onChange={(e) => onPlantillaChange(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Variables disponibles: {"{nombre}"}, {"{fecha}"}, {"{fecha_vencimiento}"}
        </p>
      </div>

      {empleados.length === 0 ? (
        <Alert>
          <AlertDescription>No hay empleados en esta categoría.</AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {empleados.length} empleado{empleados.length !== 1 ? "s" : ""} — {conTelefono.length} con teléfono
            </p>
            {conTelefono.length > 0 && (
              <Button size="sm" onClick={handleEnviarTodos} className="gap-2">
                <Send className="h-4 w-4" />
                Enviar a todos ({conTelefono.length})
              </Button>
            )}
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Legajo</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empleados.map((emp, idx) => {
                  const url = emp.telefono ? formatWhatsAppUrl(emp.telefono, emp.mensaje) : null;
                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{emp.nombre}</TableCell>
                      <TableCell>{emp.legajo || "—"}</TableCell>
                      <TableCell>{emp.telefono || <span className="text-muted-foreground italic">Sin teléfono</span>}</TableCell>
                      <TableCell className="text-right">
                        {url ? (
                          <Button size="sm" variant="outline" asChild className="gap-2">
                            <a href={url} target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="h-4 w-4" />
                              WhatsApp
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        ) : (
                          <Badge variant="secondary">Sin teléfono</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

export default function Mensajes() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const fechaStr = format(selectedDate, "yyyy-MM-dd");
  const { destinatarios, empleadosSinParte, isLoading: loadingPartes } = useEmpleadosSinParte(fechaStr);

  const [plantillaPartes, setPlantillaPartes] = useState(
    "Hola {nombre}, te recordamos que no cargaste el parte diario del {fecha}. Por favor completalo a la brevedad."
  );
  const [plantillaVencida, setPlantillaVencida] = useState(
    "Hola {nombre}, tu registro de conducir se encuentra vencido. Por favor renovalo a la brevedad."
  );
  const [plantillaPorVencer, setPlantillaPorVencer] = useState(
    "Hola {nombre}, tu registro de conducir vence el {fecha_vencimiento}. Te pedimos que gestiones la renovación."
  );
  const APP_LINK = window.location.origin;
  const [plantillaSinRegistro, setPlantillaSinRegistro] = useState(
    "Hola {nombre}, te escribimos de la empresa.\n\n" +
      "Tu legajo es: {legajo}\n\n" +
      "Para usar el Parte Diario tenés que registrarte en la app:\n" +
      "1) Entrá a {link_app}\n" +
      "2) Tocá \"Registrarme\"\n" +
      "3) Ingresá tu legajo ({legajo}), email y contraseña\n" +
      "4) Listo: vas a poder cargar tu parte diario todos los días\n\n" +
      "Cómo instalarla en el celular:\n" +
      "- Android (Chrome): abrí el link, tocá el menú (⋮) y \"Agregar a pantalla de inicio\".\n" +
      "- iPhone (Safari): abrí el link, tocá Compartir y \"Agregar a pantalla de inicio\".\n\n" +
      "Cualquier duda, avisanos."
  );

  const hoy = useMemo(() => new Date().toISOString().split("T")[0], []);
  const in20Days = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 20);
    return d.toISOString().split("T")[0];
  }, []);

  const partesRows: EmpleadoRow[] = useMemo(() => {
    return empleadosSinParte.map((emp) => {
      const nombre = [emp.nombre, emp.apellido].filter(Boolean).join(" ");
      const msg = plantillaPartes
        .replace("{nombre}", nombre || "")
        .replace("{fecha}", formatFecha(fechaStr));
      return {
        nombre,
        legajo: emp.legajo,
        telefono: emp.telefono,
        mensaje: msg,
      };
    });
  }, [empleadosSinParte, plantillaPartes, fechaStr]);

  const licenciaVencidaRows: EmpleadoRow[] = useMemo(() => {
    return destinatarios
      .filter((p) => p.vencimientoLicencia && p.vencimientoLicencia < hoy)
      .map((p) => {
        const nombre = [p.nombre, p.apellido].filter(Boolean).join(" ");
        const msg = plantillaVencida.replace("{nombre}", nombre || "");
        return { nombre, legajo: p.legajo, telefono: p.telefono, mensaje: msg };
      });
  }, [destinatarios, hoy, plantillaVencida]);

  const licenciaPorVencerRows: EmpleadoRow[] = useMemo(() => {
    return destinatarios
      .filter((p) => p.vencimientoLicencia && p.vencimientoLicencia >= hoy && p.vencimientoLicencia <= in20Days)
      .map((p) => {
        const nombre = [p.nombre, p.apellido].filter(Boolean).join(" ");
        const msg = plantillaPorVencer
          .replace("{nombre}", nombre || "")
          .replace("{fecha_vencimiento}", formatFecha(p.vencimientoLicencia!));
        return { nombre, legajo: p.legajo, telefono: p.telefono, mensaje: msg };
      });
  }, [destinatarios, hoy, in20Days, plantillaPorVencer]);

  const sinRegistroRows: EmpleadoRow[] = useMemo(() => {
    return destinatarios
      .filter((p) => !p.tieneUsuario)
      .map((p) => {
        const nombre = [p.nombre, p.apellido].filter(Boolean).join(" ");
        const msg = plantillaSinRegistro
          .replace(/\{nombre\}/g, nombre || "")
          .replace(/\{legajo\}/g, p.legajo || "—")
          .replace(/\{link_app\}/g, APP_LINK);
        return { nombre, legajo: p.legajo, telefono: p.telefono, mensaje: msg };
      });
  }, [destinatarios, plantillaSinRegistro]);

  return (
    <MainLayout title="Mensajes">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mensajes</h1>
          <p className="text-muted-foreground mt-1">Enviar avisos a empleados por WhatsApp</p>
        </div>

        <Tabs defaultValue="partes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="partes" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Partes faltantes
              {partesRows.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{partesRows.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="vencidas" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Licencias vencidas
              {licenciaVencidaRows.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">{licenciaVencidaRows.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="por-vencer" className="gap-2">
              <Clock className="h-4 w-4" />
              Por vencer
              {licenciaPorVencerRows.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{licenciaPorVencerRows.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sin-registro" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Sin registrar
              {sinRegistroRows.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{sinRegistroRows.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="partes">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle>Partes diarios no cargados</CardTitle>
                    <CardDescription>Empleados que no completaron el parte del día seleccionado</CardDescription>
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-[200px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedDate, "dd/MM/yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(d) => d && setSelectedDate(d)}
                        locale={es}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardHeader>
              <CardContent>
                {loadingPartes ? (
                  <p className="text-muted-foreground text-sm">Cargando...</p>
                ) : (
                  <EmpleadoTable empleados={partesRows} plantilla={plantillaPartes} onPlantillaChange={setPlantillaPartes} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vencidas">
            <Card>
              <CardHeader>
                <CardTitle>Licencias de conducir vencidas</CardTitle>
                <CardDescription>Empleados activos con registro vencido</CardDescription>
              </CardHeader>
              <CardContent>
                <EmpleadoTable empleados={licenciaVencidaRows} plantilla={plantillaVencida} onPlantillaChange={setPlantillaVencida} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="por-vencer">
            <Card>
              <CardHeader>
                <CardTitle>Licencias por vencer (próximos 20 días)</CardTitle>
                <CardDescription>Empleados activos cuyo registro vence pronto</CardDescription>
              </CardHeader>
              <CardContent>
                <EmpleadoTable empleados={licenciaPorVencerRows} plantilla={plantillaPorVencer} onPlantillaChange={setPlantillaPorVencer} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="sin-registro">
            <Card>
              <CardHeader>
                <CardTitle>Empleados sin registrar en la app</CardTitle>
                <CardDescription>
                  Activos que todavía no crearon cuenta. Variables: {"{nombre}"}, {"{legajo}"}, {"{link_app}"}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EmpleadoTable empleados={sinRegistroRows} plantilla={plantillaSinRegistro} onPlantillaChange={setPlantillaSinRegistro} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

// Re-export icon for use in tabs
import { ClipboardList } from "lucide-react";

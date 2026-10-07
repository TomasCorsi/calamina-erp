import { TopNavbar } from "@/components/layout/TopNavbar";
import { useEmpleadoProfile } from "@/hooks/useEmpleadoProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DetailRow, DetailSection } from "@/components/shared/DetailRow";
import { Loader2, UserCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const rolLabels: Record<string, string> = {
  capataz: 'Capataz',
  maquinista: 'Maquinista',
  chofer: 'Chofer',
  administrativo: 'Administrativo',
  ayudante: 'Ayudante',
  sereno: 'Sereno',
  mecanico: 'Mecánico',
  topografo: 'Topógrafo',
  repartidor_calecita: 'Repartidor Calecita',
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try {
    return format(new Date(dateStr + 'T12:00:00'), "dd 'de' MMMM yyyy", { locale: es });
  } catch {
    return dateStr;
  }
}

export default function MiPerfil() {
  const { empleado, loading, error } = useEmpleadoProfile();

  return (
    <div className="min-h-screen bg-background">
      <TopNavbar title="Mi Perfil" />
      <main className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-center text-destructive">{error}</CardContent>
          </Card>
        ) : !empleado ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No se encontró un perfil de empleado vinculado a tu cuenta.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Header card */}
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCircle className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{empleado.nombreCompleto}</h2>
                  <p className="text-sm text-muted-foreground">
                    {rolLabels[empleado.rol] || empleado.rol} • Legajo {empleado.legajo || '—'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Personal info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Datos Personales</CardTitle>
              </CardHeader>
              <CardContent>
                <DetailSection title="">
                  <DetailRow label="DNI" value={empleado.dni || '—'} />
                  <DetailRow label="Teléfono" value={empleado.telefono || '—'} />
                  <DetailRow label="Email" value={empleado.email || '—'} />
                  <DetailRow label="Fecha de Ingreso" value={formatDate(empleado.fecha_ingreso)} />
                  
                </DetailSection>
              </CardContent>
            </Card>

            {/* Licencia */}
            {(empleado.licencia || empleado.vencimiento_licencia) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Licencia</CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailSection title="">
                    <DetailRow label="Licencia" value={empleado.licencia || '—'} />
                    <DetailRow label="Vencimiento" value={formatDate(empleado.vencimiento_licencia)} />
                  </DetailSection>
                </CardContent>
              </Card>
            )}

            {/* Banco */}
            {(empleado.banco || empleado.numero_cuenta) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Datos Bancarios</CardTitle>
                </CardHeader>
                <CardContent>
                  <DetailSection title="">
                    <DetailRow label="Banco" value={empleado.banco || '—'} />
                    <DetailRow label="Nº Cuenta" value={empleado.numero_cuenta || '—'} />
                  </DetailSection>
                </CardContent>
              </Card>
            )}

            {/* Notificaciones push */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Notificaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Las notificaciones push permanecen deshabilitadas hasta contar con una suscripción v2 segura.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

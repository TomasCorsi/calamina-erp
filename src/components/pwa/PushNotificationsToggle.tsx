import { Bell, BellOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushNotificationsToggle() {
  const { status, busy, subscribe, unsubscribe } = usePushNotifications();

  if (status === "loading") {
    return <div className="text-sm text-muted-foreground">Verificando...</div>;
  }

  if (status === "unsupported") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Tu navegador no soporta notificaciones push. En iPhone tenés que instalar la app
          en la pantalla de inicio primero.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "missing-vapid") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Falta configurar la clave pública VAPID.</AlertDescription>
      </Alert>
    );
  }

  if (status === "denied") {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Bloqueaste las notificaciones. Habilitalas desde la configuración del navegador
          para esta página.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === "granted-subscribed") {
    return (
      <div className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-card">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <div>
            <div className="font-medium">Notificaciones activadas</div>
            <div className="text-xs text-muted-foreground">
              Vas a recibir avisos de documentos, partes y observaciones.
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" disabled={busy} onClick={unsubscribe}>
          <BellOff className="h-4 w-4 mr-1" />
          Desactivar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-card">
      <div className="flex items-center gap-2">
        <BellOff className="h-5 w-5 text-muted-foreground" />
        <div>
          <div className="font-medium">Notificaciones desactivadas</div>
          <div className="text-xs text-muted-foreground">
            Activá para enterarte al instante de documentos para firmar, recordatorios de
            parte diario y observaciones de máquinas.
          </div>
        </div>
      </div>
      <Button size="sm" disabled={busy} onClick={subscribe}>
        <Bell className="h-4 w-4 mr-1" />
        Activar
      </Button>
    </div>
  );
}

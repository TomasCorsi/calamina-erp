import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "push-prompt-dismissed-at";
const DISMISS_DAYS = 7;

export function PushPermissionPrompt() {
  const { user } = useAuth();
  const { status, busy, subscribe } = usePushNotifications();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (status !== "granted-unsubscribed" && status !== "default") return;

    try {
      const dismissedAt = localStorage.getItem(STORAGE_KEY);
      if (dismissedAt) {
        const ageMs = Date.now() - parseInt(dismissedAt, 10);
        if (ageMs < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
      }
    } catch {
      // ignore
    }

    const t = setTimeout(() => setOpen(true), 2000);
    return () => clearTimeout(t);
  }, [user, status]);

  useEffect(() => {
    if (status === "granted-subscribed") setOpen(false);
  }, [status]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // ignore
    }
    setOpen(false);
  };

  const handleActivate = async () => {
    await subscribe();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleDismiss()}>
      <DialogContent>
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Activá las notificaciones</DialogTitle>
          <DialogDescription className="text-center">
            Te vamos a avisar al instante cuando tengas documentos para firmar,
            recordatorios de parte diario u observaciones de máquinas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={handleDismiss} disabled={busy}>
            Ahora no
          </Button>
          <Button onClick={handleActivate} disabled={busy}>
            <Bell className="mr-2 h-4 w-4" />
            Activar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

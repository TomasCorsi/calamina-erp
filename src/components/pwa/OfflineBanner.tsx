import { useEffect, useState } from "react";
import { AlertTriangle, WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const LEGACY_QUEUE_KEY = "offline_partes_queue";

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const [legacyPending, setLegacyPending] = useState(0);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(LEGACY_QUEUE_KEY) ?? "[]");
      setLegacyPending(Array.isArray(parsed) ? parsed.length : 0);
    } catch {
      setLegacyPending(0);
    }
  }, []);

  if (isOnline && legacyPending === 0) return null;

  return <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium bg-destructive text-destructive-foreground">
    {isOnline ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <WifiOff className="w-4 h-4 shrink-0" />}
    <span>{!isOnline
      ? "Sin conexión — el formulario local se conserva, pero guardar o completar requiere conexión."
      : `Hay ${legacyPending} parte${legacyPending === 1 ? "" : "s"} en la cola legacy. No se enviará${legacyPending === 1 ? "" : "n"} automáticamente.`}
    </span>
  </div>;
}

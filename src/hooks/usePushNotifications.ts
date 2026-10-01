import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VAPID_PUBLIC_KEY } from "@/lib/vapid";
import { toast } from "sonner";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer as ArrayBuffer;
}

function arrayBufferToBase64Url(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type PushStatus =
  | "unsupported"
  | "missing-vapid"
  | "denied"
  | "default"
  | "granted-unsubscribed"
  | "granted-subscribed"
  | "loading";

export function usePushNotifications() {
  const { user } = useAuth();
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);

  const computeStatus = useCallback(async (): Promise<PushStatus> => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return "unsupported";
    }
    if (!VAPID_PUBLIC_KEY) return "missing-vapid";

    if (Notification.permission === "denied") return "denied";

    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return Notification.permission === "granted" ? "granted-unsubscribed" : "default";

    const sub = await reg.pushManager.getSubscription();
    if (Notification.permission !== "granted") return "default";
    return sub ? "granted-subscribed" : "granted-unsubscribed";
  }, []);

  useEffect(() => {
    let cancelled = false;
    computeStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });
    return () => {
      cancelled = true;
    };
  }, [computeStatus]);

  const subscribe = useCallback(async () => {
    if (!user) {
      toast.error("Iniciá sesión primero");
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      toast.error("Falta configurar la clave VAPID pública");
      return;
    }
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Permiso denegado");
        setStatus(permission === "denied" ? "denied" : "default");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const p256dh = json.keys?.p256dh ?? arrayBufferToBase64Url(sub.getKey("p256dh"));
      const auth = json.keys?.auth ?? arrayBufferToBase64Url(sub.getKey("auth"));

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint,
          p256dh,
          auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: "endpoint" },
      );

      if (error) throw error;

      toast.success("Notificaciones activadas");
      setStatus("granted-subscribed");
    } catch (e) {
      console.error("subscribe error", e);
      toast.error("No se pudo activar notificaciones");
    } finally {
      setBusy(false);
    }
  }, [user]);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      toast.success("Notificaciones desactivadas");
      setStatus("granted-unsubscribed");
    } catch (e) {
      console.error("unsubscribe error", e);
      toast.error("Error al desactivar");
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, subscribe, unsubscribe };
}

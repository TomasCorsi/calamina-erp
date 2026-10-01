import { useEffect, useState, useCallback } from 'react';

/**
 * Lightweight hook to surface SW update state and provide a manual update check.
 * Registration itself is handled centrally by registerAppServiceWorker() in main.tsx.
 */
export function useServiceWorker() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const handler = () => setNeedRefresh(true);
    let reg: ServiceWorkerRegistration | undefined;

    navigator.serviceWorker.getRegistration().then((r) => {
      reg = r;
      if (!r) return;
      if (r.waiting) setNeedRefresh(true);
      r.addEventListener("updatefound", () => {
        const nw = r.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            handler();
          }
        });
      });
    }).catch(() => undefined);

    return () => {
      reg?.removeEventListener("updatefound", handler);
    };
  }, []);

  const updateServiceWorker = useCallback(() => {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      } else {
        window.location.reload();
      }
    });
  }, []);

  const dismissUpdate = useCallback(() => setNeedRefresh(false), []);
  const dismissOfflineReady = useCallback(() => undefined, []);

  const checkForUpdates = useCallback(async (): Promise<{ found: boolean; error?: string }> => {
    setIsChecking(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) await reg.update();
      setIsChecking(false);
      return { found: !!reg?.waiting };
    } catch (error) {
      setIsChecking(false);
      return { found: false, error: String(error) };
    }
  }, []);

  return {
    needRefresh,
    offlineReady: false,
    isChecking,
    checkForUpdates,
    updateServiceWorker,
    dismissUpdate,
    dismissOfflineReady,
  };
}

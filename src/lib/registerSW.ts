/**
 * Service Worker registration with strict preview/dev guards.
 * Never registers in:
 * - dev mode
 * - inside an iframe
 * - ?sw=off kill-switch URL
 */

function shouldSkipRegistration(): { skip: boolean; reason?: string } {
  if (typeof window === "undefined") return { skip: true, reason: "no window" };
  if (!import.meta.env.PROD) return { skip: true, reason: "dev mode" };
  if (window !== window.parent) return { skip: true, reason: "iframe" };

  if (new URLSearchParams(window.location.search).has("sw")) {
    const swParam = new URLSearchParams(window.location.search).get("sw");
    if (swParam === "off") return { skip: true, reason: "?sw=off" };
  }

  return { skip: false };
}

export async function unregisterAppServiceWorkers(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.waiting?.scriptURL || r.installing?.scriptURL || "";
          return url.endsWith("/sw.js");
        })
        .map((r) => r.unregister()),
    );
  } catch {
    // ignore
  }
}

export async function registerAppServiceWorker(): Promise<void> {
  const { skip, reason } = shouldSkipRegistration();
  if (skip) {
    if (import.meta.env.DEV) console.log("[SW] skipping registration:", reason);
    await unregisterAppServiceWorkers();
    return;
  }

  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

    // Auto-activate updates
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) {
          nw.postMessage({ type: "SKIP_WAITING" });
        }
      });
    });

    // Reload once when a new SW takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  } catch (e) {
    console.error("[SW] registration failed:", e);
  }
}

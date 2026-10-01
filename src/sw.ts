/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare let self: ServiceWorkerGlobalScope;

// Inject precache manifest from vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// ============================================================
// Limpieza de cachés viejos (kill-switch backward compat)
// ============================================================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      const stale = names.filter(
        (n) =>
          n.includes("supabase-reference-data") ||
          n.includes("google-fonts-cache") ||
          /(^|-)precache-v\d+-/.test(n) && !n.includes(self.registration.scope),
      );
      await Promise.allSettled(stale.map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("install", () => {
  self.skipWaiting();
});

// ============================================================
// Runtime caching
// ============================================================

// HTML navigations: NetworkFirst (siempre intenta server, cae a cache si no hay red)
const navigationHandler = new NetworkFirst({
  cacheName: "html-cache",
  networkTimeoutSeconds: 4,
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
    new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 7 }),
  ],
});

registerRoute(
  new NavigationRoute(
    async (params) => {
      // Excluir rutas de OAuth/callback
      const url = new URL(params.request.url);
      if (url.pathname.startsWith("/~oauth")) {
        return fetch(params.request);
      }
      return navigationHandler.handle(params);
    },
    {
      denylist: [/^\/api/, /^\/functions/, /^\/~oauth/],
    },
  ),
);

// Supabase REST API: NetworkFirst con timeout corto
registerRoute(
  ({ url }) => url.hostname.endsWith(".supabase.co") && url.pathname.startsWith("/rest/"),
  new NetworkFirst({
    cacheName: "supabase-api-cache",
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  }),
);

// Imágenes y fuentes: CacheFirst
registerRoute(
  ({ request }) => request.destination === "image" || request.destination === "font",
  new CacheFirst({
    cacheName: "assets-cache",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
);

// JS/CSS no precacheados: StaleWhileRevalidate
registerRoute(
  ({ request }) => request.destination === "script" || request.destination === "style",
  new StaleWhileRevalidate({ cacheName: "static-resources" }),
);

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================

self.addEventListener("push", (event) => {
  let data: { title?: string; body?: string; url?: string; tag?: string; icon?: string; badge?: string } = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Notificación", body: event.data?.text() || "" };
  }

  const title = data.title || "Calamina Sur";
  const options: NotificationOptions = {
    body: data.body || "",
    icon: data.icon || "/pwa-192x192.png",
    badge: data.badge || "/pwa-192x192.png",
    tag: data.tag,
    data: { url: data.url || "/" },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data as { url?: string })?.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // If a window with our origin is already open, focus it and navigate
      for (const client of allClients) {
        if ("focus" in client) {
          await (client as WindowClient).focus();
          if ("navigate" in client) {
            try {
              await (client as WindowClient).navigate(targetUrl);
            } catch {
              // ignore
            }
          }
          return;
        }
      }
      // Otherwise open new window
      await self.clients.openWindow(targetUrl);
    })(),
  );
});

// Allow page to trigger skipWaiting
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

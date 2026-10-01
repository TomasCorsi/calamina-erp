export type AppEnvironment = "local" | "staging" | "production";

const LOCAL_SUPABASE_URLS = new Set([
  "http://127.0.0.1:54321",
  "http://localhost:54321",
]);

function configurationError(message: string): never {
  throw new Error(`[CALAMINA ERP v2] Configuracion invalida: ${message}`);
}

function required(name: string, value: string | undefined): string {
  const normalized = value?.trim();
  if (!normalized) configurationError(`falta ${name}.`);
  return normalized;
}

function normalizeSupabaseUrl(value: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return configurationError("VITE_SUPABASE_URL no es una URL valida.");
  }

  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "/" && url.pathname !== "")
  ) {
    return configurationError(
      "VITE_SUPABASE_URL debe contener solamente protocolo, host y puerto.",
    );
  }

  return url.origin;
}

function readRuntimeEnv() {
  const appEnv = required("VITE_APP_ENV", import.meta.env.VITE_APP_ENV);

  if (!(["local", "staging", "production"] as const).includes(appEnv as AppEnvironment)) {
    return configurationError(
      "VITE_APP_ENV debe ser local, staging o production.",
    );
  }

  if (import.meta.env.DEV && appEnv !== "local") {
    return configurationError(
      "el servidor de desarrollo solo puede ejecutarse con VITE_APP_ENV=local.",
    );
  }

  const supabaseUrl = normalizeSupabaseUrl(
    required("VITE_SUPABASE_URL", import.meta.env.VITE_SUPABASE_URL),
  );
  const supabasePublishableKey = required(
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );

  if (appEnv === "local" && !LOCAL_SUPABASE_URLS.has(supabaseUrl)) {
    return configurationError(
      "el ambiente local solo admite Supabase en localhost:54321 o 127.0.0.1:54321; se rechazo un backend remoto.",
    );
  }

  if (appEnv !== "local" && new URL(supabaseUrl).protocol !== "https:") {
    return configurationError(
      "staging y production requieren una URL HTTPS.",
    );
  }

  return Object.freeze({
    appEnv: appEnv as AppEnvironment,
    supabaseUrl,
    supabasePublishableKey,
    vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim() || null,
  });
}

export const runtimeEnv = readRuntimeEnv();

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV: "local" | "staging" | "production";
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/client" />

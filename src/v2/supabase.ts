import { createClient } from "@supabase/supabase-js";
import { runtimeEnv } from "@/config/runtimeEnv";

export const v2Supabase = createClient(
  runtimeEnv.supabaseUrl,
  runtimeEnv.supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "calamina-erp-v2-auth",
    },
  },
);

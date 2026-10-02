import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { runtimeEnv } from '@/config/runtimeEnv';

// Single browser client for the legacy UI and the v2 backend. The generated
// Database type still describes the archived legacy schema, so it must not be
// used as an authority until types are regenerated from the v2 baseline.
export const supabase = createClient<Database>(
  runtimeEnv.supabaseUrl,
  runtimeEnv.supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'calamina-erp-v2-auth',
    },
  },
);

// Same runtime instance without the archived schema type, for v2 API/RPCs.
export const supabaseV2 = supabase as unknown as SupabaseClient;

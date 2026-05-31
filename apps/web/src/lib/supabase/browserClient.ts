import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readSupabasePublicConfig } from "./config";

let cachedClient: SupabaseClient | null = null;

/** Singleton browser Supabase client (null when env is not configured). */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (cachedClient !== null) {
    return cachedClient;
  }
  const config = readSupabasePublicConfig();
  if (config === null) {
    return null;
  }
  cachedClient = createClient(config.url, config.anonKey, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return cachedClient;
}

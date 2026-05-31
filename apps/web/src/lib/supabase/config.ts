/** Supabase project URL and publishable (anon) key for browser auth. */
export interface SupabasePublicConfig {
  readonly url: string;
  readonly anonKey: string;
}

export function readSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
  if (url.length === 0 || anonKey.length === 0) {
    return null;
  }
  return { url, anonKey };
}

export function isSupabaseAuthConfigured(): boolean {
  return readSupabasePublicConfig() !== null;
}

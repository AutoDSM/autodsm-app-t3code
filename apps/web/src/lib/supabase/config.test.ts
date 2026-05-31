import { afterEach, describe, expect, it, vi } from "vitest";

import { isSupabaseAuthConfigured, readSupabasePublicConfig } from "./config";

describe("supabase config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when env is missing", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    expect(readSupabasePublicConfig()).toBeNull();
    expect(isSupabaseAuthConfigured()).toBe(false);
  });

  it("reads url and anon key when set", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-key");
    expect(readSupabasePublicConfig()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "test-key",
    });
    expect(isSupabaseAuthConfigured()).toBe(true);
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase/config", () => ({
  isSupabaseAuthConfigured: vi.fn(() => false),
}));

vi.mock("./devPairingBypass", () => ({
  isLocalDevLoopbackTarget: vi.fn(() => true),
}));

import { allowFakeOnboardingAuth } from "./devSupabaseBypass";

describe("allowFakeOnboardingAuth", () => {
  it("allows fake auth in dev when Supabase is not configured", () => {
    expect(allowFakeOnboardingAuth()).toBe(import.meta.env.DEV);
  });
});

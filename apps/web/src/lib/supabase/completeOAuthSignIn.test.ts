import { describe, expect, it } from "vitest";

import { oauthSignInOutcomeToNavigation, profileToOAuthSignInOutcome } from "./completeOAuthSignIn";
import type { AutoDsmSupabaseProfile } from "./profile";

function profile(overrides: Partial<AutoDsmSupabaseProfile> = {}): AutoDsmSupabaseProfile {
  return {
    id: "user-1",
    email: "a@b.com",
    displayName: "Ada",
    avatarUrl: null,
    provider: "github",
    betaStatus: "approved",
    ...overrides,
  };
}

describe("profileToOAuthSignInOutcome", () => {
  it("returns pending for pending beta status", () => {
    expect(profileToOAuthSignInOutcome(profile({ betaStatus: "pending" }))).toEqual({
      kind: "pending",
    });
  });

  it("returns rejected for rejected beta status", () => {
    expect(profileToOAuthSignInOutcome(profile({ betaStatus: "rejected" }))).toEqual({
      kind: "rejected",
      message: "Your account is not approved for the beta yet.",
    });
  });

  it("returns approved when provider is present", () => {
    expect(profileToOAuthSignInOutcome(profile({ provider: "google" }))).toEqual({
      kind: "approved",
      provider: "google",
    });
  });

  it("returns error when provider is missing", () => {
    expect(profileToOAuthSignInOutcome(profile({ provider: null }))).toEqual({
      kind: "error",
      message: "Sign-in did not complete. Try again from the welcome screen.",
    });
  });

  it("uses fallback provider when profile row omits provider", () => {
    expect(profileToOAuthSignInOutcome(profile({ provider: null }), "google")).toEqual({
      kind: "approved",
      provider: "google",
    });
  });
});

describe("oauthSignInOutcomeToNavigation", () => {
  it("maps approved outcome to create navigation", () => {
    expect(oauthSignInOutcomeToNavigation({ kind: "approved", provider: "github" })).toEqual({
      kind: "create",
      provider: "github",
    });
  });

  it("maps pending outcome to beta navigation", () => {
    expect(oauthSignInOutcomeToNavigation({ kind: "pending" })).toEqual({
      kind: "beta",
    });
  });
});

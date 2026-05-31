import { describe, expect, it } from "vitest";

import { resolveElectronProductAuthDestination } from "./finalizeElectronProductAuth";

describe("resolveElectronProductAuthDestination", () => {
  it("routes pending beta users to the beta screen", () => {
    expect(
      resolveElectronProductAuthDestination({
        navigation: { kind: "beta" },
        onboardingCompleted: false,
        hasDesignSystemOnDisk: false,
      }),
    ).toBe("/onboarding/beta");
  });

  it("routes first-time users to project creation", () => {
    expect(
      resolveElectronProductAuthDestination({
        navigation: { kind: "create", provider: "google" },
        onboardingCompleted: false,
        hasDesignSystemOnDisk: false,
      }),
    ).toBe("/onboarding/create");
  });

  it("routes returning users with a design system to home", () => {
    expect(
      resolveElectronProductAuthDestination({
        navigation: { kind: "create", provider: "github" },
        onboardingCompleted: true,
        hasDesignSystemOnDisk: true,
      }),
    ).toBe("/home");
  });

  it("routes to home when an owner-matched workspace exists even if completed flag is false", () => {
    expect(
      resolveElectronProductAuthDestination({
        navigation: { kind: "create", provider: "github" },
        onboardingCompleted: false,
        hasDesignSystemOnDisk: true,
      }),
    ).toBe("/home");
  });
});

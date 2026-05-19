import { describe, expect, it } from "vitest";

import { shouldUseMinimalElectronLauncherChrome } from "./appSidebarLauncherChrome";

describe("shouldUseMinimalElectronLauncherChrome", () => {
  it("is true for authenticated Electron on the chat-index launcher route when hosted-static chrome is not forced", () => {
    expect(
      shouldUseMinimalElectronLauncherChrome({
        isElectron: true,
        authGateStatus: "authenticated",
        hostedStaticNeedsChrome: false,
        pathname: "/",
      }),
    ).toBe(true);
  });

  it("keeps the full sidebar on /home so the workspace home page is not treated as the launcher", () => {
    expect(
      shouldUseMinimalElectronLauncherChrome({
        isElectron: true,
        authGateStatus: "authenticated",
        hostedStaticNeedsChrome: false,
        pathname: "/home",
      }),
    ).toBe(false);
  });

  it("is false when not Electron, not authenticated, hosted-static onboarding needs chrome, or off the launcher route", () => {
    expect(
      shouldUseMinimalElectronLauncherChrome({
        isElectron: false,
        authGateStatus: "authenticated",
        hostedStaticNeedsChrome: false,
        pathname: "/",
      }),
    ).toBe(false);

    expect(
      shouldUseMinimalElectronLauncherChrome({
        isElectron: true,
        authGateStatus: "hosted-static",
        hostedStaticNeedsChrome: false,
        pathname: "/",
      }),
    ).toBe(false);

    expect(
      shouldUseMinimalElectronLauncherChrome({
        isElectron: true,
        authGateStatus: "authenticated",
        hostedStaticNeedsChrome: true,
        pathname: "/",
      }),
    ).toBe(false);

    expect(
      shouldUseMinimalElectronLauncherChrome({
        isElectron: true,
        authGateStatus: "authenticated",
        hostedStaticNeedsChrome: false,
        pathname: "/settings",
      }),
    ).toBe(false);
  });

  it("uses minimal chrome on onboarding routes", () => {
    expect(
      shouldUseMinimalElectronLauncherChrome({
        isElectron: true,
        authGateStatus: "authenticated",
        hostedStaticNeedsChrome: false,
        pathname: "/onboarding/welcome",
      }),
    ).toBe(true);
  });
});

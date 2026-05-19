import { describe, expect, it, vi } from "vitest";

import {
  shouldSkipPairingRedirect,
  shouldSkipPairingRedirectForElectronProduct,
} from "./electronProductAuth";

describe("electronProductAuth", () => {
  it("skips pairing redirect when desktop bridge is present", () => {
    vi.stubGlobal("window", {
      desktopBridge: {
        getLocalEnvironmentBootstrap: () => null,
      },
    });

    expect(shouldSkipPairingRedirectForElectronProduct()).toBe(true);
    expect(shouldSkipPairingRedirect()).toBe(true);
  });

  it("does not skip pairing redirect in a regular browser", () => {
    vi.stubGlobal("window", {});

    expect(shouldSkipPairingRedirectForElectronProduct()).toBe(false);
    expect(shouldSkipPairingRedirect()).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";

import {
  ensureDevPairingBypassAuthenticated,
  isDevPairingBypassActive,
  isElectronProductAuthPath,
  shouldSkipPairingRedirect,
} from "./devPairingBypass";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
    },
    status: 200,
    ...init,
  });
}

describe("devPairingBypass", () => {
  it("detects active dev pairing bypass from auth descriptor", () => {
    expect(
      isDevPairingBypassActive({
        policy: "loopback-browser",
        bootstrapMethods: ["one-time-token"],
        sessionMethods: ["browser-session-cookie"],
        sessionCookieName: "t3_session",
        devPairingDisabled: true,
      }),
    ).toBe(true);
    expect(
      isDevPairingBypassActive({
        policy: "loopback-browser",
        bootstrapMethods: ["one-time-token"],
        sessionMethods: ["browser-session-cookie"],
        sessionCookieName: "t3_session",
      }),
    ).toBe(false);
  });

  it("skips pairing redirect when dev bypass is active", () => {
    expect(
      shouldSkipPairingRedirect({
        policy: "loopback-browser",
        bootstrapMethods: ["one-time-token"],
        sessionMethods: ["browser-session-cookie"],
        sessionCookieName: "t3_session",
        devPairingDisabled: true,
      }),
    ).toBe(true);
  });

  it("skips pairing redirect when desktop bridge is present", () => {
    vi.stubGlobal("window", {
      desktopBridge: {
        getLocalEnvironmentBootstrap: () => null,
      },
    });

    expect(isElectronProductAuthPath()).toBe(true);
    expect(shouldSkipPairingRedirect()).toBe(true);
  });

  it("skips pairing redirect for loopback browser dev", () => {
    vi.stubGlobal("window", {
      location: new URL("http://127.0.0.1:5733/"),
    });

    expect(shouldSkipPairingRedirect()).toBe(true);
  });

  it("auto-bootstraps an owner session when dev bypass is active", async () => {
    vi.stubGlobal("window", {
      location: new URL("http://127.0.0.1:5733/"),
    });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          authenticated: false,
          auth: {
            policy: "loopback-browser",
            bootstrapMethods: ["one-time-token"],
            sessionMethods: ["browser-session-cookie"],
            sessionCookieName: "t3_session",
            devPairingDisabled: true,
          },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          authenticated: true,
          sessionMethod: "browser-session-cookie",
          expiresAt: "2026-04-05T00:00:00.000Z",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          authenticated: true,
          auth: {
            policy: "loopback-browser",
            bootstrapMethods: ["one-time-token"],
            sessionMethods: ["browser-session-cookie"],
            sessionCookieName: "t3_session",
            devPairingDisabled: true,
          },
          sessionMethod: "browser-session-cookie",
          expiresAt: "2026-04-05T00:00:00.000Z",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("VITE_DEV_SERVER_URL", "http://127.0.0.1:5733");

    await expect(ensureDevPairingBypassAuthenticated()).resolves.toEqual({
      status: "authenticated",
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://127.0.0.1:5733/api/auth/dev-auto-bootstrap");
  });
});

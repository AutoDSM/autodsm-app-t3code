import { beforeEach, describe, expect, it, vi } from "vitest";

const { openExternalMock, startOAuthCallbackServerMock } = vi.hoisted(() => ({
  openExternalMock: vi.fn(async () => true),
  startOAuthCallbackServerMock: vi.fn(),
}));

vi.mock("electron", () => ({
  shell: { openExternal: openExternalMock },
}));

vi.mock("./oauthCallbackServer.ts", async (importOriginal) => {
  const original = await importOriginal<typeof import("./oauthCallbackServer.ts")>();
  return {
    ...original,
    startOAuthCallbackServer: startOAuthCallbackServerMock,
  };
});

vi.mock("./supabaseOAuthWindow.ts", () => ({
  runSupabaseOAuthInShell: vi.fn(async () => ({ ok: true, code: "shell-code" })),
}));

import { desktopOAuthRedirectUrl } from "./oauthCallbackServer.ts";
import { runSupabaseOAuthInSystemBrowser } from "./supabaseOAuthBrowser.ts";

describe("runSupabaseOAuthInSystemBrowser", () => {
  beforeEach(() => {
    openExternalMock.mockReset();
    openExternalMock.mockResolvedValue(true);
    startOAuthCallbackServerMock.mockReset();
    startOAuthCallbackServerMock.mockImplementation(async ({ redirectTo }) => ({
      redirectTo,
      waitForResult: async () => ({ ok: true as const, code: "browser-runner-code" }),
      cancel: vi.fn(),
      close: async () => undefined,
    }));
    delete process.env.AUTODSM_OAUTH_SHELL;
  });

  it("starts the callback server before opening the browser", async () => {
    const redirectTo = desktopOAuthRedirectUrl();
    const callOrder: string[] = [];
    startOAuthCallbackServerMock.mockImplementation(async ({ redirectTo: configuredRedirect }) => {
      callOrder.push("server");
      return {
        redirectTo: configuredRedirect,
        waitForResult: async () => {
          callOrder.push("wait");
          return { ok: true as const, code: "browser-runner-code" };
        },
        cancel: vi.fn(),
        close: async () => undefined,
      };
    });
    openExternalMock.mockImplementation(async () => {
      callOrder.push("browser");
      return true;
    });

    const result = await runSupabaseOAuthInSystemBrowser({
      oauthUrl: "https://example.supabase.co/auth/v1/authorize?provider=github",
      redirectTo,
    });

    expect(startOAuthCallbackServerMock).toHaveBeenCalledWith({ redirectTo });
    expect(openExternalMock).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/authorize?provider=github",
    );
    expect(callOrder).toEqual(["server", "browser", "wait"]);
    expect(result).toEqual({ ok: true, code: "browser-runner-code" });
  });

  it("uses the legacy auth shell when AUTODSM_OAUTH_SHELL=1", async () => {
    process.env.AUTODSM_OAUTH_SHELL = "1";
    const { runSupabaseOAuthInShell } = await import("./supabaseOAuthWindow.ts");

    const result = await runSupabaseOAuthInSystemBrowser({
      oauthUrl: "https://example.supabase.co/auth/v1/authorize?provider=github",
      redirectTo: desktopOAuthRedirectUrl(),
    });

    expect(runSupabaseOAuthInShell).toHaveBeenCalled();
    expect(result).toEqual({ ok: true, code: "shell-code" });
  });
});

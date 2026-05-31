import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInWithOAuth = vi.fn();

vi.mock("./browserClient", () => ({
  getSupabaseBrowserClient: vi.fn(() => ({
    auth: {
      signInWithOAuth,
      exchangeCodeForSession: vi.fn(async () => ({ error: null })),
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: "user-1" } } },
        error: null,
      })),
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-1", app_metadata: { provider: "github" } } },
        error: null,
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: {
              id: "user-1",
              provider: "github",
              beta_status: "approved",
            },
            error: null,
          })),
        })),
      })),
    })),
  })),
}));

vi.mock("./telemetry", () => ({
  recordAutoDsmTelemetry: vi.fn(),
}));

vi.mock("./oauthAccountHints", () => ({
  readOAuthAccountHint: vi.fn(() => null),
  rememberOAuthAccountHint: vi.fn(),
}));

vi.mock("~/env", () => ({
  isElectron: true,
}));

vi.mock("./finalizeElectronProductAuth", () => ({
  finalizeElectronProductAuthAfterOAuth: vi.fn(async () => undefined),
}));

import {
  AUTODSM_DESKTOP_OAUTH_CALLBACK_URL,
  buildGoogleOAuthQueryParams,
  createSupabaseOAuthSignInUrl,
  signInWithOAuthProvider,
  supabaseAuthRedirectUrl,
} from "./auth";
import { signInWithSupabaseOAuthOnElectron } from "./electronOAuthSignIn";

describe("supabaseAuthRedirectUrl", () => {
  it("uses the dedicated desktop loopback callback port on Electron", () => {
    vi.stubGlobal("window", { location: { origin: "http://127.0.0.1:5733" } });
    expect(supabaseAuthRedirectUrl()).toBe(AUTODSM_DESKTOP_OAUTH_CALLBACK_URL);
    vi.unstubAllGlobals();
  });
});

describe("createSupabaseOAuthSignInUrl", () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
  });

  it("requests OAuth URL with skipBrowserRedirect", async () => {
    signInWithOAuth.mockResolvedValue({
      data: { url: "https://example.supabase.co/auth/v1/authorize?provider=github" },
      error: null,
    });

    const url = await createSupabaseOAuthSignInUrl("github");

    expect(url).toContain("supabase.co");
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "github",
      options: expect.objectContaining({
        skipBrowserRedirect: true,
      }),
    });
  });

  it("adds Google account-picker query params", async () => {
    signInWithOAuth.mockResolvedValue({
      data: { url: "https://example.supabase.co/auth/v1/authorize?provider=google" },
      error: null,
    });

    await createSupabaseOAuthSignInUrl("google");

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: expect.objectContaining({
        queryParams: { access_type: "offline", prompt: "select_account" },
      }),
    });
  });
});

describe("buildGoogleOAuthQueryParams", () => {
  it("includes login_hint when provided", () => {
    expect(buildGoogleOAuthQueryParams("user@gmail.com")).toEqual({
      access_type: "offline",
      prompt: "select_account",
      login_hint: "user@gmail.com",
    });
  });
});

describe("signInWithOAuthProvider", () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
  });

  it("does not set skipBrowserRedirect for browser redirect flow", async () => {
    signInWithOAuth.mockResolvedValue({ data: {}, error: null });

    await signInWithOAuthProvider("github");

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "github",
      options: expect.not.objectContaining({
        skipBrowserRedirect: true,
      }),
    });
  });
});

describe("signInWithSupabaseOAuthOnElectron", () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
    signInWithOAuth.mockResolvedValue({
      data: { url: "https://example.supabase.co/auth/v1/authorize?provider=github" },
      error: null,
    });
    vi.stubGlobal("window", { location: { origin: "http://127.0.0.1:5733" } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls desktopBridge.startSupabaseOAuth with provider-specific URL", async () => {
    const startSupabaseOAuth = vi.fn(async () => ({ ok: true as const, code: "oauth-code" }));

    const result = await signInWithSupabaseOAuthOnElectron("github", startSupabaseOAuth);

    expect(startSupabaseOAuth).toHaveBeenCalledWith({
      provider: "github",
      oauthUrl: "https://example.supabase.co/auth/v1/authorize?provider=github",
      redirectTo: AUTODSM_DESKTOP_OAUTH_CALLBACK_URL,
    });
    expect(result).toEqual({ kind: "create", provider: "github" });
  });

  it("returns cancelled when the modal closes without a code", async () => {
    const startSupabaseOAuth = vi.fn(async () => ({
      ok: false as const,
      reason: "cancelled" as const,
      message: "Sign-in was cancelled.",
    }));

    const result = await signInWithSupabaseOAuthOnElectron("google", startSupabaseOAuth);

    expect(result).toEqual({ kind: "cancelled" });
  });
});

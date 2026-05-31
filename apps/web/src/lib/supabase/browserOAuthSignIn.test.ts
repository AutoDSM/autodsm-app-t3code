import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInWithOAuth = vi.fn();
const exchangeCodeForSession = vi.fn(async () => ({ error: null }));

vi.mock("./browserClient", () => ({
  getSupabaseBrowserClient: vi.fn(() => ({
    auth: {
      signInWithOAuth,
      exchangeCodeForSession,
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

import { signInWithSupabaseOAuthInPopup } from "./browserOAuthSignIn";
import { AUTODSM_OAUTH_POPUP_MESSAGE } from "./oauthPopupProtocol";

function installWindowStub(): {
  dispatchMessage: (event: MessageEvent) => void;
} {
  const messageListeners = new Set<(event: MessageEvent) => void>();
  const stub = {
    location: { origin: "http://localhost:5733" },
    addEventListener: (type: string, listener: EventListener) => {
      if (type === "message") {
        messageListeners.add(listener as (event: MessageEvent) => void);
      }
    },
    removeEventListener: (type: string, listener: EventListener) => {
      if (type === "message") {
        messageListeners.delete(listener as (event: MessageEvent) => void);
      }
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  };

  vi.stubGlobal("window", stub);

  return {
    dispatchMessage: (event: MessageEvent) => {
      for (const listener of messageListeners) {
        listener(event);
      }
    },
  };
}

describe("signInWithSupabaseOAuthInPopup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    signInWithOAuth.mockReset();
    signInWithOAuth.mockResolvedValue({
      data: { url: "https://example.supabase.co/auth/v1/authorize?provider=github" },
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns error when the pop-up is blocked", async () => {
    installWindowStub();
    const result = await signInWithSupabaseOAuthInPopup("github", () => null);
    expect(result).toEqual({
      kind: "error",
      message: "Pop-up was blocked. Allow pop-ups for AutoDSM and try again.",
    });
  });

  it("completes sign-in when the callback pop-up posts back an auth code", async () => {
    vi.useRealTimers();
    const { dispatchMessage } = installWindowStub();
    const popup = { closed: false } as Window;
    const openWindow = vi.fn(() => popup);

    const resultPromise = signInWithSupabaseOAuthInPopup("github", openWindow);
    await Promise.resolve();
    await Promise.resolve();

    dispatchMessage({
      origin: "http://localhost:5733",
      data: {
        type: AUTODSM_OAUTH_POPUP_MESSAGE,
        search: "?code=oauth-code",
      },
    } as MessageEvent);

    const result = await resultPromise;

    expect(openWindow).toHaveBeenCalledWith(
      "https://example.supabase.co/auth/v1/authorize?provider=github",
      "autodsm-oauth",
      expect.stringContaining("popup=yes"),
    );
    expect(exchangeCodeForSession).toHaveBeenCalledWith("oauth-code");
    expect(result).toEqual({ kind: "create", provider: "github" });
  });

  it("returns cancelled when the pop-up closes without a callback", async () => {
    installWindowStub();
    const popupState = { closed: false };
    const popup = popupState as unknown as Window;
    const openWindow = vi.fn(() => popup);

    const resultPromise = signInWithSupabaseOAuthInPopup("github", openWindow);
    popupState.closed = true;

    await vi.advanceTimersByTimeAsync(500);
    await vi.runAllTimersAsync();

    expect(await resultPromise).toEqual({ kind: "cancelled" });
  });
});

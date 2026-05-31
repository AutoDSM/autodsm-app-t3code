import { beforeEach, describe, expect, it, vi } from "vitest";

type NavigationHandler = (event: { preventDefault: () => void }, url: string) => void;
type DidNavigateHandler = (_event: unknown, url: string) => void;
type BeforeRequestHandler = (
  details: { url: string; resourceType: string },
  callback: (result: { cancel?: boolean }) => void,
) => void;

type MockOAuthShell = {
  readonly options: Record<string, unknown>;
  readonly webContents: {
    setWindowOpenHandler: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    loadURL: ReturnType<typeof vi.fn>;
  };
  once: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  show: ReturnType<typeof vi.fn>;
  isDestroyed: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  navigationHandlers: {
    willNavigate?: NavigationHandler;
    willRedirect?: NavigationHandler;
    didNavigate?: DidNavigateHandler;
  };
};

const createdShells: MockOAuthShell[] = [];
const clearStorageData = vi.fn(async () => undefined);
const onBeforeRequest = vi.fn();
let beforeRequestHandler: BeforeRequestHandler | null = null;

vi.mock("electron", () => {
  class MockBrowserWindow {
    readonly options: Record<string, unknown>;
    readonly webContents = {
      setWindowOpenHandler: vi.fn(),
      on: vi.fn((event: string, handler: NavigationHandler | DidNavigateHandler) => {
        if (event === "will-navigate") {
          this.navigationHandlers.willNavigate = handler as NavigationHandler;
        }
        if (event === "will-redirect") {
          this.navigationHandlers.willRedirect = handler as NavigationHandler;
        }
        if (event === "did-navigate") {
          this.navigationHandlers.didNavigate = handler as DidNavigateHandler;
        }
      }),
      loadURL: vi.fn(async () => undefined),
    };
    once = vi.fn((event: string, handler: () => void) => {
      if (event === "ready-to-show") {
        handler();
      }
    });
    on = vi.fn();
    show = vi.fn();
    isDestroyed = vi.fn(() => false);
    removeAllListeners = vi.fn();
    close = vi.fn();
    loadURL = vi.fn(async () => undefined);
    navigationHandlers: MockOAuthShell["navigationHandlers"] = {};

    constructor(options: Record<string, unknown>) {
      this.options = options;
      createdShells.push(this as unknown as MockOAuthShell);
    }
  }

  return {
    BrowserWindow: MockBrowserWindow,
    session: {
      fromPartition: vi.fn(() => ({
        clearStorageData,
        setPermissionRequestHandler: vi.fn(),
        webRequest: {
          onBeforeRequest,
        },
      })),
    },
  };
});

import { runSupabaseOAuthInShell, clearSupabaseOAuthShellSession } from "./supabaseOAuthWindow.ts";

const redirectTo = "http://127.0.0.1:5733/auth/callback";

async function waitForShell(): Promise<MockOAuthShell> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await Promise.resolve();
    const shell = createdShells[0];
    if (shell) {
      return shell;
    }
  }
  throw new Error("Expected auth shell window to be created.");
}

function invokeBeforeRequest(details: {
  url: string;
  resourceType: string;
}): Promise<{ cancel?: boolean }> {
  return new Promise((resolve) => {
    if (beforeRequestHandler === null) {
      throw new Error("Expected onBeforeRequest handler to be registered.");
    }
    beforeRequestHandler(details, resolve);
  });
}

describe("runSupabaseOAuthInShell", () => {
  beforeEach(() => {
    createdShells.length = 0;
    beforeRequestHandler = null;
    clearStorageData.mockClear();
    onBeforeRequest.mockClear();
    onBeforeRequest.mockImplementation((_filter, listener: BeforeRequestHandler | null) => {
      if (listener === null) {
        beforeRequestHandler = null;
        return;
      }
      beforeRequestHandler = listener;
    });
  });

  it("creates a standalone shell without parent or modal", async () => {
    const resultPromise = runSupabaseOAuthInShell({
      oauthUrl: "https://example.supabase.co/auth/v1/authorize?provider=github",
      redirectTo,
    });
    await waitForShell();
    const shell = createdShells[0]!;

    expect(shell.options.parent).toBeUndefined();
    expect(shell.options.modal).toBeUndefined();
    expect(shell.options.title).toBe("Sign in — AutoDSM");
    expect(shell.options.center).toBe(true);
    expect(shell.options.width).toBe(960);
    expect(shell.options.height).toBe(720);
    expect(shell.options.backgroundColor).toBe("#0d1117");

    createdShells[0]?.navigationHandlers.willNavigate?.(
      { preventDefault: vi.fn() },
      redirectTo + "?code=abc",
    );
    await expect(resultPromise).resolves.toEqual({ ok: true, code: "abc" });
    expect(shell.close).toHaveBeenCalled();
  });

  it("returns the authorization code when the callback URL is intercepted", async () => {
    const resultPromise = runSupabaseOAuthInShell({
      oauthUrl: "https://example.supabase.co/auth/v1/authorize?provider=google",
      redirectTo,
    });
    const shell = await waitForShell();

    shell.navigationHandlers.didNavigate?.({}, redirectTo + "?code=google-code");

    await expect(resultPromise).resolves.toEqual({ ok: true, code: "google-code" });
  });

  it("intercepts localhost callback aliases when redirect is 127.0.0.1", async () => {
    const resultPromise = runSupabaseOAuthInShell({
      oauthUrl: "https://example.supabase.co/auth/v1/authorize?provider=google",
      redirectTo,
    });
    const shell = await waitForShell();

    shell.navigationHandlers.willNavigate?.(
      { preventDefault: vi.fn() },
      "http://localhost:5733/auth/callback?code=alias-code",
    );

    await expect(resultPromise).resolves.toEqual({ ok: true, code: "alias-code" });
    expect(shell.close).toHaveBeenCalled();
  });

  it("blocks disallowed navigation targets", async () => {
    void runSupabaseOAuthInShell({
      oauthUrl: "https://example.supabase.co/auth/v1/authorize?provider=github",
      redirectTo,
    });
    const shell = await waitForShell();

    const preventDefault = vi.fn();
    shell.navigationHandlers.willNavigate?.({ preventDefault }, "https://evil.example/phish");

    expect(preventDefault).toHaveBeenCalled();
  });

  it("allows subresource requests without cancelling", async () => {
    void runSupabaseOAuthInShell({
      oauthUrl: "https://example.supabase.co/auth/v1/authorize?provider=github",
      redirectTo,
    });
    await waitForShell();

    await expect(
      invokeBeforeRequest({
        resourceType: "stylesheet",
        url: "https://github.githubassets.com/assets/app.css",
      }),
    ).resolves.toEqual({});
  });

  it("cancels disallowed mainFrame requests via onBeforeRequest", async () => {
    void runSupabaseOAuthInShell({
      oauthUrl: "https://example.supabase.co/auth/v1/authorize?provider=github",
      redirectTo,
    });
    await waitForShell();

    await expect(
      invokeBeforeRequest({
        resourceType: "mainFrame",
        url: "https://evil.example/phish",
      }),
    ).resolves.toEqual({ cancel: true });
  });

  it("removes onBeforeRequest listener when OAuth completes", async () => {
    const resultPromise = runSupabaseOAuthInShell({
      oauthUrl: "https://example.supabase.co/auth/v1/authorize?provider=github",
      redirectTo,
    });
    const shell = await waitForShell();

    shell.navigationHandlers.willNavigate?.({ preventDefault: vi.fn() }, redirectTo + "?code=done");
    await resultPromise;

    expect(onBeforeRequest).toHaveBeenCalledWith({ urls: ["http://*/*", "https://*/*"] }, null);
    expect(beforeRequestHandler).toBeNull();
  });

  it("does not wipe IdP session cookies before sign-in", async () => {
    void runSupabaseOAuthInShell({
      oauthUrl: "https://example.supabase.co/auth/v1/authorize?provider=google",
      redirectTo,
    });
    await waitForShell();

    expect(clearStorageData).not.toHaveBeenCalled();
  });

  it("clears IdP session cookies when explicitly requested", async () => {
    await clearSupabaseOAuthShellSession();
    expect(clearStorageData).toHaveBeenCalled();
  });

  it("cancels when the main window closes", async () => {
    const resultPromise = runSupabaseOAuthInShell({
      oauthUrl: "https://example.supabase.co/auth/v1/authorize?provider=github",
      redirectTo,
      onMainWindowClosed: (cancel) => {
        cancel();
      },
    });

    await expect(resultPromise).resolves.toEqual({
      ok: false,
      reason: "cancelled",
      message: "Sign-in was cancelled.",
    });
  });
});

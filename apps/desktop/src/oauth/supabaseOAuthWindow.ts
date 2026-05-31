// @effect-diagnostics globalTimers:off
import { BrowserWindow, session } from "electron";

import {
  GOOGLE_PASSKEY_BYPASS_MAX_ATTEMPTS,
  GOOGLE_PASSKEY_BYPASS_RETRY_MS,
  GOOGLE_PASSKEY_BYPASS_SCRIPT,
  isAllowedOAuthNavigationUrl,
  isGooglePasskeyChallengeUrl,
  parseOAuthCallbackUrl,
  shouldBlockOAuthShellRequest,
} from "./supabaseOAuthUrl.ts";

export const OAUTH_SHELL_PARTITION = "persist:autodsm-oauth";

/** @deprecated Use OAUTH_SHELL_PARTITION */
export const OAUTH_MODAL_PARTITION = OAUTH_SHELL_PARTITION;

const OAUTH_SHELL_TITLE = "Sign in — AutoDSM";
const OAUTH_SHELL_TABBING_ID = "autodsm-auth";
const OAUTH_REQUEST_FILTER = { urls: ["http://*/*", "https://*/*"] };

/** Permissions IdP pages may request during sign-in (passkey flows still fail in Electron). */
const ALLOWED_OAUTH_PERMISSIONS = new Set([
  "clipboard-read",
  "clipboard-sanitized-write",
  "fullscreen",
  "media",
  "pointerLock",
]);

export type DesktopSupabaseOAuthResult =
  | { readonly ok: true; readonly code: string }
  | { readonly ok: false; readonly reason: "cancelled" | "failed"; readonly message: string };

let activeOAuthWindow: BrowserWindow | null = null;

function isBrowserWindowAlive(window: BrowserWindow | null): window is BrowserWindow {
  return window !== null && !window.isDestroyed();
}

async function clearOAuthSessionStorage(): Promise<void> {
  const oauthSession = session.fromPartition(OAUTH_SHELL_PARTITION);
  await oauthSession.clearStorageData();
}

/** Clears IdP cookies in the auth shell (e.g. when switching Google accounts). */
export async function clearSupabaseOAuthShellSession(): Promise<void> {
  await clearOAuthSessionStorage();
}

function closeActiveOAuthWindow(): void {
  if (!isBrowserWindowAlive(activeOAuthWindow)) {
    activeOAuthWindow = null;
    return;
  }
  activeOAuthWindow.removeAllListeners("closed");
  activeOAuthWindow.close();
  activeOAuthWindow = null;
}

export function closeSupabaseOAuthShell(): void {
  closeActiveOAuthWindow();
}

/** @deprecated Use closeSupabaseOAuthShell */
export const closeSupabaseOAuthModal = closeSupabaseOAuthShell;

function shellWindowOptions(): Electron.BrowserWindowConstructorOptions {
  return {
    width: 960,
    height: 720,
    center: true,
    resizable: true,
    minimizable: true,
    maximizable: false,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: "#0d1117",
    title: OAUTH_SHELL_TITLE,
    ...(process.platform === "darwin" ? { tabbingIdentifier: OAUTH_SHELL_TABBING_ID } : {}),
    webPreferences: {
      partition: OAUTH_SHELL_PARTITION,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  };
}

export async function runSupabaseOAuthInShell(input: {
  readonly oauthUrl: string;
  readonly redirectTo: string;
  /** Register cancel when the product main window closes (app quit). */
  readonly onMainWindowClosed?: (cancel: () => void) => void;
}): Promise<DesktopSupabaseOAuthResult> {
  closeActiveOAuthWindow();

  const oauthSession = session.fromPartition(OAUTH_SHELL_PARTITION);
  oauthSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const pageUrl = webContents.getURL();
    if (!isAllowedOAuthNavigationUrl(pageUrl, input.redirectTo)) {
      callback(false);
      return;
    }
    callback(ALLOWED_OAUTH_PERMISSIONS.has(permission));
  });

  const onBeforeRequestHandler = (
    details: Electron.OnBeforeRequestListenerDetails,
    callback: (response: Electron.CallbackResponse) => void,
  ): void => {
    if (shouldBlockOAuthShellRequest(details.resourceType, details.url, input.redirectTo)) {
      callback({ cancel: true });
      return;
    }
    callback({});
  };

  oauthSession.webRequest.onBeforeRequest(OAUTH_REQUEST_FILTER, onBeforeRequestHandler);

  return await new Promise<DesktopSupabaseOAuthResult>((resolve) => {
    let settled = false;
    let passkeyBypassTimer: ReturnType<typeof setTimeout> | null = null;
    let passkeyBypassAttempts = 0;

    const clearPasskeyBypassTimer = (): void => {
      if (passkeyBypassTimer !== null) {
        clearTimeout(passkeyBypassTimer);
        passkeyBypassTimer = null;
      }
    };

    const schedulePasskeyBypass = (authWindow: BrowserWindow): void => {
      clearPasskeyBypassTimer();
      if (authWindow.isDestroyed() || settled) {
        return;
      }
      if (!isGooglePasskeyChallengeUrl(authWindow.webContents.getURL())) {
        passkeyBypassAttempts = 0;
        return;
      }
      if (passkeyBypassAttempts >= GOOGLE_PASSKEY_BYPASS_MAX_ATTEMPTS) {
        return;
      }
      passkeyBypassAttempts += 1;
      void authWindow.webContents
        .executeJavaScript(GOOGLE_PASSKEY_BYPASS_SCRIPT)
        .catch(() => undefined);
      passkeyBypassTimer = setTimeout(() => {
        schedulePasskeyBypass(authWindow);
      }, GOOGLE_PASSKEY_BYPASS_RETRY_MS);
    };

    const finish = (result: DesktopSupabaseOAuthResult): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearPasskeyBypassTimer();
      oauthSession.webRequest.onBeforeRequest(OAUTH_REQUEST_FILTER, null);
      closeActiveOAuthWindow();
      resolve(result);
    };

    const authWindow = new BrowserWindow(shellWindowOptions());

    activeOAuthWindow = authWindow;

    const handleNavigation = (url: string, preventDefault?: () => void): void => {
      const callback = parseOAuthCallbackUrl(url, input.redirectTo);
      if (callback !== null) {
        preventDefault?.();
        if (callback.code) {
          finish({ ok: true, code: callback.code });
          return;
        }
        finish({
          ok: false,
          reason: "failed",
          message: callback.errorDescription?.trim() || callback.error || "OAuth sign-in failed.",
        });
        return;
      }

      if (!isAllowedOAuthNavigationUrl(url, input.redirectTo)) {
        preventDefault?.();
      }
    };

    authWindow.webContents.on("did-finish-load", () => {
      if (authWindow.isDestroyed()) {
        return;
      }
      const url = authWindow.webContents.getURL();
      handleNavigation(url);
      if (isGooglePasskeyChallengeUrl(url)) {
        schedulePasskeyBypass(authWindow);
      }
    });

    authWindow.webContents.on("did-navigate", (_event, url) => {
      handleNavigation(url);
      if (!isGooglePasskeyChallengeUrl(url)) {
        clearPasskeyBypassTimer();
        passkeyBypassAttempts = 0;
        return;
      }
      schedulePasskeyBypass(authWindow);
    });

    authWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

    authWindow.webContents.on("will-navigate", (event, url) => {
      handleNavigation(url, () => {
        event.preventDefault();
      });
    });

    authWindow.webContents.on("will-redirect", (event, url) => {
      handleNavigation(url, () => {
        event.preventDefault();
      });
    });

    authWindow.on("closed", () => {
      activeOAuthWindow = null;
      if (!settled) {
        finish({ ok: false, reason: "cancelled", message: "Sign-in was cancelled." });
      }
    });

    input.onMainWindowClosed?.(() => {
      finish({ ok: false, reason: "cancelled", message: "Sign-in was cancelled." });
    });

    authWindow.once("ready-to-show", () => {
      if (!authWindow.isDestroyed()) {
        authWindow.show();
      }
    });

    void authWindow.loadURL(input.oauthUrl).catch((cause: unknown) => {
      finish({
        ok: false,
        reason: "failed",
        message: cause instanceof Error ? cause.message : "Failed to open the sign-in page.",
      });
    });
  });
}

/** @deprecated Use runSupabaseOAuthInShell */
export async function runSupabaseOAuthInModal(input: {
  readonly parent: BrowserWindow;
  readonly oauthUrl: string;
  readonly redirectTo: string;
}): Promise<DesktopSupabaseOAuthResult> {
  if (!isBrowserWindowAlive(input.parent)) {
    return { ok: false, reason: "failed", message: "Main window is unavailable." };
  }

  return runSupabaseOAuthInShell({
    oauthUrl: input.oauthUrl,
    redirectTo: input.redirectTo,
    onMainWindowClosed: (cancel) => {
      input.parent.once("closed", cancel);
    },
  });
}

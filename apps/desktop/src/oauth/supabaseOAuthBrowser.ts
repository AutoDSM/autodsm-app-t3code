import { shell } from "electron";

import {
  startOAuthCallbackServer,
  type OAuthCallbackCaptureResult,
} from "./oauthCallbackServer.ts";
import type { DesktopSupabaseOAuthResult } from "./supabaseOAuthWindow.ts";
import { runSupabaseOAuthInShell } from "./supabaseOAuthWindow.ts";

export type DesktopSupabaseOAuthBrowserResult = DesktopSupabaseOAuthResult;

let activeBrowserSession: {
  readonly cancel: (message?: string) => void;
  readonly close: () => Promise<void>;
} | null = null;

export function cancelActiveSupabaseOAuthBrowser(message?: string): void {
  activeBrowserSession?.cancel(message);
}

async function closeActiveBrowserSession(): Promise<void> {
  const session = activeBrowserSession;
  activeBrowserSession = null;
  if (session) {
    await session.close();
  }
}

function mapCaptureResult(result: OAuthCallbackCaptureResult): DesktopSupabaseOAuthBrowserResult {
  if (result.ok) {
    return { ok: true, code: result.code };
  }
  return {
    ok: false,
    reason: result.reason === "timeout" ? "failed" : result.reason,
    message: result.message,
  };
}

export async function runSupabaseOAuthInSystemBrowser(input: {
  readonly oauthUrl: string;
  readonly redirectTo: string;
  readonly onMainWindowClosed?: (cancel: () => void) => void;
}): Promise<DesktopSupabaseOAuthBrowserResult> {
  // Default: complete sign-in in the system default browser. The loopback server
  // below only *captures* the returned `?code=` and hands it to the main window;
  // the main window still runs `exchangeCodeForSession` with the PKCE
  // `code_verifier` it created in its own localStorage. The browser never does the
  // exchange, so this stays single-context and PKCE-safe — and the system browser
  // (unlike the sandboxed in-app shell) supports WebAuthn, so Google passkey
  // accounts work. The legacy in-app auth shell is kept as an opt-in fallback via
  // `AUTODSM_OAUTH_SHELL=1` (e.g. environments where loopback/`openExternal` is
  // blocked); `AUTODSM_OAUTH_SHELL=0` is the explicit "browser" value.
  if (process.env.AUTODSM_OAUTH_SHELL === "1") {
    return runSupabaseOAuthInShell(input);
  }

  await closeActiveBrowserSession();

  let session: Awaited<ReturnType<typeof startOAuthCallbackServer>>;
  try {
    session = await startOAuthCallbackServer({ redirectTo: input.redirectTo });
  } catch (cause) {
    const message =
      cause instanceof Error && cause.message.includes("EADDRINUSE")
        ? "OAuth callback port is busy. Quit other AutoDSM instances and try again."
        : cause instanceof Error
          ? cause.message
          : "Failed to start OAuth callback listener.";
    return { ok: false, reason: "failed", message };
  }

  activeBrowserSession = session;
  input.onMainWindowClosed?.(() => {
    session.cancel();
  });

  try {
    await shell.openExternal(input.oauthUrl);
  } catch {
    session.cancel("Could not open your default browser.");
    await closeActiveBrowserSession();
    return { ok: false, reason: "failed", message: "Could not open your default browser." };
  }

  const result = mapCaptureResult(await session.waitForResult());
  await closeActiveBrowserSession();
  return result;
}

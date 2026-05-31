// @effect-diagnostics globalTimers:off nodeBuiltinImport:off
import * as Http from "node:http";

import { AUTODSM_AUTH_SUCCESS_URL } from "./autodsmAuthProtocol.ts";
import { parseOAuthCallbackUrl } from "./supabaseOAuthUrl.ts";

export const AUTODSM_OAUTH_CALLBACK_HOST = "127.0.0.1";
export const AUTODSM_OAUTH_CALLBACK_PORT = 53_682;
export const AUTODSM_OAUTH_CALLBACK_PATH = "/auth/callback";
export const AUTODSM_OAUTH_CALLBACK_TIMEOUT_MS = 5 * 60 * 1_000;

export function desktopOAuthRedirectUrl(): string {
  return `http://${AUTODSM_OAUTH_CALLBACK_HOST}:${AUTODSM_OAUTH_CALLBACK_PORT}${AUTODSM_OAUTH_CALLBACK_PATH}`;
}

export type OAuthCallbackCaptureResult =
  | { readonly ok: true; readonly code: string }
  | {
      readonly ok: false;
      readonly reason: "cancelled" | "failed" | "timeout";
      readonly message: string;
    };

export interface OAuthCallbackServerSession {
  readonly redirectTo: string;
  readonly waitForResult: () => Promise<OAuthCallbackCaptureResult>;
  readonly cancel: (message?: string) => void;
  readonly close: () => Promise<void>;
}

function oauthSuccessHtml(): string {
  const deepLink = AUTODSM_AUTH_SUCCESS_URL;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0;url=${deepLink}" />
  <title>Signed in — AutoDSM</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0d1117; color: #f9fafb; display: grid; place-items: center; min-height: 100vh; margin: 0; }
    main { text-align: center; max-width: 28rem; padding: 2rem; }
    a { color: #a78bfa; }
  </style>
</head>
<body>
  <main>
    <h1>Signed in</h1>
    <p>Returning to AutoDSM…</p>
    <p><a href="${deepLink}">Open AutoDSM</a> if you are not redirected automatically.</p>
  </main>
</body>
</html>`;
}

function oauthFailureHtml(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Sign-in failed — AutoDSM</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0d1117; color: #f9fafb; display: grid; place-items: center; min-height: 100vh; margin: 0; }
    main { text-align: center; max-width: 28rem; padding: 2rem; }
  </style>
</head>
<body>
  <main>
    <h1>Sign-in failed</h1>
    <p>${message}</p>
    <p>Close this tab and try again from the AutoDSM welcome screen.</p>
  </main>
</body>
</html>`;
}

export function startOAuthCallbackServer(input: {
  readonly redirectTo: string;
  readonly timeoutMs?: number;
}): Promise<OAuthCallbackServerSession> {
  const timeoutMs = input.timeoutMs ?? AUTODSM_OAUTH_CALLBACK_TIMEOUT_MS;

  return new Promise((resolveStart, rejectStart) => {
    let settled = false;
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
    let resolveWait: ((result: OAuthCallbackCaptureResult) => void) | null = null;

    const finish = (result: OAuthCallbackCaptureResult): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeoutTimer !== null) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
      resolveWait?.(result);
      resolveWait = null;
    };

    const server = Http.createServer((request, response) => {
      if (!request.url) {
        response.writeHead(400, { "Content-Type": "text/plain" });
        response.end("Bad request");
        return;
      }

      const requestUrl = new URL(request.url, desktopOAuthRedirectUrl());
      if (requestUrl.pathname !== AUTODSM_OAUTH_CALLBACK_PATH) {
        response.writeHead(404, { "Content-Type": "text/plain" });
        response.end("Not found");
        return;
      }

      const callback = parseOAuthCallbackUrl(requestUrl.href, input.redirectTo);
      if (callback === null) {
        response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        response.end(oauthFailureHtml("Missing authorization response."));
        return;
      }

      if (callback.code) {
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(oauthSuccessHtml());
        finish({ ok: true, code: callback.code });
        return;
      }

      const message =
        callback.errorDescription?.trim() || callback.error || "OAuth sign-in failed.";
      response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      response.end(oauthFailureHtml(message));
      finish({ ok: false, reason: "failed", message });
    });

    server.on("error", (cause) => {
      if (settled) {
        return;
      }
      rejectStart(
        cause instanceof Error ? cause : new Error("OAuth callback server failed to start."),
      );
    });

    server.listen(AUTODSM_OAUTH_CALLBACK_PORT, AUTODSM_OAUTH_CALLBACK_HOST, () => {
      timeoutTimer = setTimeout(() => {
        finish({
          ok: false,
          reason: "timeout",
          message: "Sign-in timed out. Try again from the welcome screen.",
        });
      }, timeoutMs);

      const session: OAuthCallbackServerSession = {
        redirectTo: input.redirectTo,
        waitForResult: () =>
          new Promise<OAuthCallbackCaptureResult>((resolve) => {
            if (settled) {
              resolve({
                ok: false,
                reason: "cancelled",
                message: "Sign-in was cancelled.",
              });
              return;
            }
            resolveWait = resolve;
          }),
        cancel: (message = "Sign-in was cancelled.") => {
          finish({ ok: false, reason: "cancelled", message });
        },
        close: () =>
          new Promise<void>((resolveClose) => {
            server.close(() => {
              resolveClose();
            });
          }),
      };

      resolveStart(session);
    });
  });
}

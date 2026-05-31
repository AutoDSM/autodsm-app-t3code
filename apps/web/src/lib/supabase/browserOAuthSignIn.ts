import type { AutoDsmFakeAuthProvider } from "~/lib/autoDsmOnboarding";

import { createSupabaseOAuthSignInUrl, type AutoDsmOAuthProvider } from "./auth";
import {
  completeSupabaseOAuthFromCodeWithTelemetry,
  oauthSignInOutcomeToNavigation,
  type OAuthSignInNavigation,
} from "./completeOAuthSignIn";
import { isAutoDsmOAuthPopupMessage } from "./oauthPopupProtocol";

export type BrowserSupabaseOAuthSignInResult =
  | { readonly kind: "cancelled" }
  | OAuthSignInNavigation;

const OAUTH_POPUP_NAME = "autodsm-oauth";
const OAUTH_POPUP_FEATURES = "popup=yes,width=480,height=640";
const OAUTH_POPUP_TIMEOUT_MS = 5 * 60 * 1000;
const OAUTH_POPUP_CLOSED_POLL_MS = 400;

async function completeOAuthFromPopupSearch(search: string): Promise<OAuthSignInNavigation> {
  const params = new URLSearchParams(search);
  const oauthError = params.get("error");
  const oauthErrorDescription = params.get("error_description");

  if (oauthError) {
    return {
      kind: "error",
      message: oauthErrorDescription?.trim() || oauthError,
    };
  }

  const code = params.get("code");
  if (code) {
    const outcome = await completeSupabaseOAuthFromCodeWithTelemetry(code);
    return oauthSignInOutcomeToNavigation(outcome);
  }

  return {
    kind: "error",
    message: "Sign-in did not complete. Try again from the welcome screen.",
  };
}

/** Opens GitHub/Google OAuth in a separate browser window; completes auth in the main app. */
export async function signInWithSupabaseOAuthInPopup(
  provider: AutoDsmOAuthProvider,
  openWindow: typeof window.open = window.open.bind(window),
): Promise<BrowserSupabaseOAuthSignInResult> {
  const oauthUrl = await createSupabaseOAuthSignInUrl(provider);
  const popup = openWindow(oauthUrl, OAUTH_POPUP_NAME, OAUTH_POPUP_FEATURES);
  if (popup === null) {
    return {
      kind: "error",
      message: "Pop-up was blocked. Allow pop-ups for AutoDSM and try again.",
    };
  }

  return await new Promise<BrowserSupabaseOAuthSignInResult>((resolve) => {
    let settled = false;

    const finish = (result: BrowserSupabaseOAuthSignInResult): void => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      window.clearInterval(closedPollId);
      window.removeEventListener("message", onMessage);
      resolve(result);
    };

    const onMessage = (event: MessageEvent): void => {
      if (event.origin !== window.location.origin || !isAutoDsmOAuthPopupMessage(event.data)) {
        return;
      }

      void completeOAuthFromPopupSearch(event.data.search)
        .then(finish)
        .catch((cause: unknown) => {
          finish({
            kind: "error",
            message: cause instanceof Error ? cause.message : "Sign-in failed. Try again.",
          });
        });
    };

    const closedPollId = window.setInterval(() => {
      if (!popup.closed) {
        return;
      }
      // Allow the popup callback page to postMessage before treating close as cancel.
      window.setTimeout(() => {
        if (!settled && popup.closed) {
          finish({ kind: "cancelled" });
        }
      }, 500);
    }, OAUTH_POPUP_CLOSED_POLL_MS);

    const timeoutId = window.setTimeout(() => {
      finish({ kind: "error", message: "Sign-in timed out. Try again." });
    }, OAUTH_POPUP_TIMEOUT_MS);

    window.addEventListener("message", onMessage);
  });
}

export function oauthOpeningLabel(provider: AutoDsmFakeAuthProvider): string {
  return provider === "github" ? "Opening GitHub…" : "Opening Google…";
}

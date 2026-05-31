import type { AutoDsmFakeAuthProvider } from "~/lib/autoDsmOnboarding";
import type { DesktopSupabaseOAuthStartResult } from "@t3tools/contracts";

import {
  createSupabaseOAuthSignInUrl,
  supabaseAuthRedirectUrl,
  type AutoDsmOAuthProvider,
} from "./auth";
import {
  completeSupabaseOAuthFromCodeWithTelemetry,
  oauthSignInOutcomeToNavigation,
  type OAuthSignInNavigation,
} from "./completeOAuthSignIn";
import { finalizeElectronProductAuthAfterOAuth } from "./finalizeElectronProductAuth";

export type ElectronSupabaseOAuthSignInResult =
  | { readonly kind: "cancelled" }
  | OAuthSignInNavigation;

export async function signInWithSupabaseOAuthOnElectron(
  provider: AutoDsmOAuthProvider,
  startSupabaseOAuth: (input: {
    readonly provider: AutoDsmOAuthProvider;
    readonly oauthUrl: string;
    readonly redirectTo: string;
  }) => Promise<DesktopSupabaseOAuthStartResult>,
): Promise<ElectronSupabaseOAuthSignInResult> {
  const oauthUrl = await createSupabaseOAuthSignInUrl(provider);
  const redirectTo = supabaseAuthRedirectUrl();
  const result = await startSupabaseOAuth({ provider, oauthUrl, redirectTo });
  if (!result.ok) {
    if (result.reason === "cancelled") {
      return { kind: "cancelled" };
    }
    return { kind: "error", message: result.message };
  }

  const outcome = await completeSupabaseOAuthFromCodeWithTelemetry(result.code, {
    fallbackProvider: provider,
  });
  const navigation = oauthSignInOutcomeToNavigation(outcome);
  await finalizeElectronProductAuthAfterOAuth(navigation);
  return navigation;
}

export function oauthOpeningLabel(provider: AutoDsmFakeAuthProvider): string {
  return provider === "github"
    ? "Opening GitHub in your browser…"
    : "Opening Google in your browser…";
}

/** @deprecated Use oauthOpeningLabel */
export const electronOAuthOpeningLabel = oauthOpeningLabel;

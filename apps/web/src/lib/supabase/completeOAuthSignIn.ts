import type { AutoDsmFakeAuthProvider } from "~/lib/autoDsmOnboarding";

import { rememberOAuthAccountHint } from "./oauthAccountHints";
import { fetchCurrentSupabaseProfile } from "./profile";
import { getSupabaseBrowserClient } from "./browserClient";
import { recordAutoDsmTelemetry } from "./telemetry";
import type { AutoDsmSupabaseProfile } from "./profile";

export type OAuthSignInOutcome =
  | { readonly kind: "approved"; readonly provider: AutoDsmFakeAuthProvider }
  | { readonly kind: "pending" }
  | { readonly kind: "rejected"; readonly message: string }
  | { readonly kind: "error"; readonly message: string };

const REJECTED_MESSAGE = "Your account is not approved for the beta yet.";

export function profileToOAuthSignInOutcome(
  profile: AutoDsmSupabaseProfile | null,
  fallbackProvider?: AutoDsmFakeAuthProvider | null,
): OAuthSignInOutcome {
  if (profile?.betaStatus === "pending") {
    return { kind: "pending" };
  }
  if (profile?.betaStatus === "rejected") {
    return { kind: "rejected", message: REJECTED_MESSAGE };
  }
  const provider = profile?.provider ?? fallbackProvider ?? null;
  if (provider) {
    return { kind: "approved", provider };
  }
  return { kind: "error", message: "Sign-in did not complete. Try again from the welcome screen." };
}

/** Exchange an OAuth authorization code for a session and resolve beta-gate outcome. */
export async function completeSupabaseOAuthFromCode(
  code: string,
  options?: { readonly fallbackProvider?: AutoDsmFakeAuthProvider },
): Promise<OAuthSignInOutcome> {
  const client = getSupabaseBrowserClient();
  if (client === null) {
    return { kind: "error", message: "Supabase is not configured for this build." };
  }

  const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return { kind: "error", message: exchangeError.message };
  }

  try {
    const profile = await fetchCurrentSupabaseProfile();
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) {
      return {
        kind: "error",
        message: "Sign-in did not complete. Try again from the welcome screen.",
      };
    }
    rememberOAuthAccountFromProfile(profile, options?.fallbackProvider);
    return profileToOAuthSignInOutcome(profile, options?.fallbackProvider);
  } catch (cause) {
    return {
      kind: "error",
      message: cause instanceof Error ? cause.message : "Authentication failed.",
    };
  }
}

function rememberOAuthAccountFromProfile(
  profile: AutoDsmSupabaseProfile | null,
  fallbackProvider?: AutoDsmFakeAuthProvider,
): void {
  const provider = profile?.provider ?? fallbackProvider ?? null;
  if (provider === "google" || provider === "github") {
    rememberOAuthAccountHint(provider, profile?.email ?? null);
  }
}

export async function resolveOAuthSignInOutcome(): Promise<OAuthSignInOutcome> {
  const client = getSupabaseBrowserClient();
  if (client === null) {
    return { kind: "error", message: "Supabase is not configured for this build." };
  }

  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    return { kind: "error", message: sessionError.message };
  }
  if (!sessionData.session) {
    return {
      kind: "error",
      message: "Sign-in did not complete. Try again from the welcome screen.",
    };
  }

  try {
    const profile = await fetchCurrentSupabaseProfile();
    rememberOAuthAccountFromProfile(profile);
    return profileToOAuthSignInOutcome(profile);
  } catch (cause) {
    return {
      kind: "error",
      message: cause instanceof Error ? cause.message : "Authentication failed.",
    };
  }
}

export async function finishSupabaseOAuthFromCallbackSearch(
  search: string,
): Promise<OAuthSignInOutcome> {
  const client = getSupabaseBrowserClient();
  if (client === null) {
    return { kind: "error", message: "Supabase is not configured for this build." };
  }

  const params = new URLSearchParams(search);
  const code = params.get("code");
  const oauthError = params.get("error");
  const oauthErrorDescription = params.get("error_description");

  if (oauthError) {
    return {
      kind: "error",
      message: oauthErrorDescription?.trim() || oauthError,
    };
  }

  if (code) {
    return completeSupabaseOAuthFromCode(code);
  }

  return resolveOAuthSignInOutcome();
}

export async function completeSupabaseOAuthFromCodeWithTelemetry(
  code: string,
  options?: { readonly fallbackProvider?: AutoDsmFakeAuthProvider },
): Promise<OAuthSignInOutcome> {
  const outcome = await completeSupabaseOAuthFromCode(code, options);
  if (outcome.kind === "approved") {
    recordAutoDsmTelemetry("autodsm.sign_in.completed", {
      provider: outcome.provider,
    });
  }
  return outcome;
}

export function oauthSignInOutcomeErrorMessage(outcome: OAuthSignInOutcome): string | null {
  if (outcome.kind === "error" || outcome.kind === "rejected") {
    return outcome.message;
  }
  return null;
}

export function oauthSignInOutcomeProvider(
  outcome: OAuthSignInOutcome,
): AutoDsmFakeAuthProvider | null {
  return outcome.kind === "approved" ? outcome.provider : null;
}

export type OAuthSignInNavigation =
  | { readonly kind: "beta" }
  | { readonly kind: "create"; readonly provider: AutoDsmFakeAuthProvider }
  | { readonly kind: "error"; readonly message: string };

export function oauthSignInOutcomeToNavigation(outcome: OAuthSignInOutcome): OAuthSignInNavigation {
  if (outcome.kind === "pending") {
    return { kind: "beta" };
  }
  if (outcome.kind === "rejected" || outcome.kind === "error") {
    return { kind: "error", message: outcome.message };
  }
  return { kind: "create", provider: outcome.provider };
}

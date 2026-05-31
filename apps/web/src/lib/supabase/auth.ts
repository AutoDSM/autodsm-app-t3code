import type { Provider } from "@supabase/supabase-js";

import type { AutoDsmFakeAuthProvider } from "~/lib/autoDsmOnboarding";

import { isElectron } from "~/env";
import { getSupabaseBrowserClient } from "./browserClient";
import { isSupabaseAuthConfigured } from "./config";
import { readOAuthAccountHint } from "./oauthAccountHints";

export type { OAuthSignInOutcome } from "./completeOAuthSignIn";
export { completeSupabaseOAuthFromCode } from "./completeOAuthSignIn";
export { fetchCurrentSupabaseProfile } from "./profile";

export type AutoDsmOAuthProvider = AutoDsmFakeAuthProvider;

function supabaseOAuthProvider(provider: AutoDsmOAuthProvider): Provider {
  return provider;
}

/** Google OAuth params that prefer account picker + existing IdP sessions over passkey step-up. */
export function buildGoogleOAuthQueryParams(loginHint?: string | null): Record<string, string> {
  const params: Record<string, string> = {
    access_type: "offline",
    prompt: "select_account",
  };
  const hint = loginHint?.trim();
  if (hint) {
    params.login_hint = hint;
  }
  return params;
}

function buildOAuthOptions(provider: AutoDsmOAuthProvider, redirectTo: string) {
  const options: {
    redirectTo: string;
    skipBrowserRedirect?: boolean;
    queryParams?: { [key: string]: string };
  } = { redirectTo };
  if (provider === "google") {
    options.queryParams = buildGoogleOAuthQueryParams(readOAuthAccountHint("google"));
  }
  return options;
}

/** Dedicated loopback callback for desktop system-browser OAuth (configure in Supabase Auth URLs). */
export const AUTODSM_DESKTOP_OAUTH_CALLBACK_URL = "http://127.0.0.1:53682/auth/callback";

function canonicalLoopbackOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "[::1]") {
      url.hostname = "127.0.0.1";
    }
    return url.origin;
  } catch {
    return origin;
  }
}

/** Loopback redirect used for OAuth PKCE return (configure in Supabase Auth URLs). */
export function supabaseAuthRedirectUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }
  if (isElectron) {
    return AUTODSM_DESKTOP_OAUTH_CALLBACK_URL;
  }
  const origin = canonicalLoopbackOrigin(window.location.origin);
  return `${origin}/auth/callback`;
}

/** Build a Supabase OAuth URL without redirecting the main window (Electron modal flow). */
export async function createSupabaseOAuthSignInUrl(
  provider: AutoDsmOAuthProvider,
): Promise<string> {
  const client = getSupabaseBrowserClient();
  if (client === null) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  const redirectTo = supabaseAuthRedirectUrl();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: supabaseOAuthProvider(provider),
    options: {
      ...buildOAuthOptions(provider, redirectTo),
      skipBrowserRedirect: true,
    },
  });
  if (error) {
    throw error;
  }
  if (!data.url) {
    throw new Error("Supabase did not return an OAuth URL.");
  }
  return data.url;
}

export async function signInWithOAuthProvider(provider: AutoDsmOAuthProvider): Promise<void> {
  const client = getSupabaseBrowserClient();
  if (client === null) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  const redirectTo = supabaseAuthRedirectUrl();
  const { error } = await client.auth.signInWithOAuth({
    provider: supabaseOAuthProvider(provider),
    options: buildOAuthOptions(provider, redirectTo),
  });
  if (error) {
    throw error;
  }
}

export async function signOutSupabase(): Promise<void> {
  const client = getSupabaseBrowserClient();
  if (client === null) {
    return;
  }
  await client.auth.signOut();
}

export function isSupabaseAuthEnabled(): boolean {
  return isSupabaseAuthConfigured();
}

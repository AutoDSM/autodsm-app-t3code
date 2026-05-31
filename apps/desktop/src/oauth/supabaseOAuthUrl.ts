export interface ParsedOAuthCallback {
  readonly code?: string;
  readonly error?: string;
  readonly errorDescription?: string;
}

function safeParseUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]";
}

/** True when both URLs are the OAuth callback on loopback (localhost vs 127.0.0.1 equivalent). */
export function isOAuthCallbackUrlMatch(callbackUrl: string, redirectTo: string): boolean {
  const parsed = safeParseUrl(callbackUrl);
  const redirect = safeParseUrl(redirectTo);
  if (parsed === null || redirect === null) {
    return false;
  }
  if (parsed.pathname !== redirect.pathname) {
    return false;
  }
  if (parsed.origin === redirect.origin) {
    return true;
  }
  return (
    isLoopbackHost(parsed.hostname) &&
    isLoopbackHost(redirect.hostname) &&
    parsed.protocol === redirect.protocol &&
    parsed.port === redirect.port
  );
}

function isSupabaseHost(hostname: string): boolean {
  return hostname === "supabase.co" || hostname.endsWith(".supabase.co");
}

function isGitHubHost(hostname: string): boolean {
  return (
    hostname === "github.com" ||
    hostname.endsWith(".github.com") ||
    hostname === "githubassets.com" ||
    hostname.endsWith(".githubassets.com") ||
    hostname.endsWith(".githubusercontent.com")
  );
}

function isGoogleHost(hostname: string): boolean {
  return (
    hostname === "google.com" ||
    hostname.endsWith(".google.com") ||
    hostname === "gstatic.com" ||
    hostname.endsWith(".gstatic.com") ||
    hostname.endsWith(".googleapis.com") ||
    hostname.endsWith(".googleusercontent.com") ||
    hostname.endsWith(".youtube.com")
  );
}

/** Returns true when top-level navigation is allowed inside the OAuth auth shell. */
export function isAllowedOAuthNavigationUrl(url: string, redirectTo: string): boolean {
  const parsed = safeParseUrl(url);
  const redirect = safeParseUrl(redirectTo);
  if (parsed === null || redirect === null) {
    return false;
  }

  if (isOAuthCallbackUrlMatch(url, redirectTo)) {
    return true;
  }

  if (parsed.origin === redirect.origin && parsed.pathname === redirect.pathname) {
    return true;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return false;
  }

  return (
    isGitHubHost(parsed.hostname) ||
    isGoogleHost(parsed.hostname) ||
    isSupabaseHost(parsed.hostname) ||
    (isLoopbackHost(parsed.hostname) && parsed.pathname === redirect.pathname)
  );
}

/** Gate only main-frame navigations; subresources must load freely for IdP styling. */
export function shouldBlockOAuthShellRequest(
  resourceType: string,
  url: string,
  redirectTo: string,
): boolean {
  if (resourceType !== "mainFrame" && resourceType !== "subFrame") {
    return false;
  }
  return !isAllowedOAuthNavigationUrl(url, redirectTo);
}

/** Google passkey/WebAuthn step-up pages fail in Electron; detect to auto-bypass. */
export function isGooglePasskeyChallengeUrl(url: string): boolean {
  const parsed = safeParseUrl(url);
  if (parsed === null || !parsed.hostname.endsWith("google.com")) {
    return false;
  }
  const haystack = `${parsed.pathname}${parsed.search}`.toLowerCase();
  return (
    haystack.includes("passkey") ||
    haystack.includes("webauthn") ||
    haystack.includes("challenge/pk")
  );
}

const PASSKEY_BYPASS_BANNER_ID = "autodsm-passkey-hint";

/** Script injected in the OAuth shell to click Google's "Try another way" link. */
export const GOOGLE_PASSKEY_BYPASS_SCRIPT = `
(() => {
  if (!document.getElementById("${PASSKEY_BYPASS_BANNER_ID}")) {
    const banner = document.createElement("div");
    banner.id = "${PASSKEY_BYPASS_BANNER_ID}";
    banner.textContent =
      "Passkeys are not supported in this window. Click Try another way and sign in with your password.";
    banner.style.cssText =
      "position:fixed;top:0;left:0;right:0;z-index:2147483647;padding:12px 16px;background:#1f2937;color:#f9fafb;font:14px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.35);";
    document.body.prepend(banner);
  }
  const candidates = [...document.querySelectorAll("button, a, div[role='button'], span[role='link']")];
  const match = candidates.find((el) => /try another way/i.test(el.textContent ?? ""));
  if (match instanceof HTMLElement) {
    match.click();
    return true;
  }
  return false;
})();
`.trim();

export const GOOGLE_PASSKEY_BYPASS_RETRY_MS = 1_500;
export const GOOGLE_PASSKEY_BYPASS_MAX_ATTEMPTS = 8;

/** Parse an OAuth callback URL when it matches the configured redirect origin/path. */
export function parseOAuthCallbackUrl(url: string, redirectTo: string): ParsedOAuthCallback | null {
  const parsed = safeParseUrl(url);
  const redirect = safeParseUrl(redirectTo);
  if (parsed === null || redirect === null) {
    return null;
  }
  if (!isOAuthCallbackUrlMatch(url, redirectTo)) {
    return null;
  }

  const code = parsed.searchParams.get("code")?.trim();
  const error = parsed.searchParams.get("error")?.trim();
  const errorDescription = parsed.searchParams.get("error_description")?.trim();

  if (!code && !error) {
    return null;
  }

  return {
    ...(code ? { code } : {}),
    ...(error ? { error } : {}),
    ...(errorDescription ? { errorDescription } : {}),
  };
}

import { describe, expect, it } from "vitest";

import {
  isAllowedOAuthNavigationUrl,
  isGooglePasskeyChallengeUrl,
  isOAuthCallbackUrlMatch,
  parseOAuthCallbackUrl,
  shouldBlockOAuthShellRequest,
} from "./supabaseOAuthUrl.ts";

const redirectTo = "http://127.0.0.1:5733/auth/callback";

describe("isAllowedOAuthNavigationUrl", () => {
  it("allows GitHub, Google, Supabase, and loopback callback hosts", () => {
    expect(
      isAllowedOAuthNavigationUrl("https://github.com/login/oauth/authorize", redirectTo),
    ).toBe(true);
    expect(
      isAllowedOAuthNavigationUrl("https://accounts.google.com/o/oauth2/v2/auth", redirectTo),
    ).toBe(true);
    expect(
      isAllowedOAuthNavigationUrl("https://example.supabase.co/auth/v1/authorize", redirectTo),
    ).toBe(true);
    expect(
      isAllowedOAuthNavigationUrl("http://127.0.0.1:5733/auth/callback?code=abc", redirectTo),
    ).toBe(true);
  });

  it("allows IdP CDN and asset hosts used during OAuth rendering", () => {
    expect(
      isAllowedOAuthNavigationUrl("https://github.githubassets.com/assets/module.css", redirectTo),
    ).toBe(true);
    expect(
      isAllowedOAuthNavigationUrl("https://avatars.githubusercontent.com/u/1", redirectTo),
    ).toBe(true);
    expect(
      isAllowedOAuthNavigationUrl("https://fonts.googleapis.com/css?family=Roboto", redirectTo),
    ).toBe(true);
    expect(
      isAllowedOAuthNavigationUrl("https://lh3.googleusercontent.com/a/default-user", redirectTo),
    ).toBe(true);
  });

  it("denies unrelated hosts", () => {
    expect(isAllowedOAuthNavigationUrl("https://evil.example/phish", redirectTo)).toBe(false);
  });
});

describe("shouldBlockOAuthShellRequest", () => {
  it("allows subresources regardless of host", () => {
    expect(
      shouldBlockOAuthShellRequest(
        "stylesheet",
        "https://github.githubassets.com/assets/app.css",
        redirectTo,
      ),
    ).toBe(false);
    expect(
      shouldBlockOAuthShellRequest("script", "https://evil.example/tracker.js", redirectTo),
    ).toBe(false);
  });

  it("blocks disallowed mainFrame navigations", () => {
    expect(
      shouldBlockOAuthShellRequest("mainFrame", "https://evil.example/phish", redirectTo),
    ).toBe(true);
    expect(shouldBlockOAuthShellRequest("mainFrame", "https://github.com/login", redirectTo)).toBe(
      false,
    );
  });
});

describe("isGooglePasskeyChallengeUrl", () => {
  it("detects Google passkey challenge URLs", () => {
    expect(
      isGooglePasskeyChallengeUrl("https://accounts.google.com/v3/signin/challenge/pk?authuser=0"),
    ).toBe(true);
  });

  it("ignores normal Google OAuth URLs", () => {
    expect(
      isGooglePasskeyChallengeUrl("https://accounts.google.com/o/oauth2/v2/auth?client_id=abc"),
    ).toBe(false);
  });
});

describe("isOAuthCallbackUrlMatch", () => {
  it("treats localhost and 127.0.0.1 as equivalent callback targets", () => {
    expect(
      isOAuthCallbackUrlMatch(
        "http://localhost:5733/auth/callback?code=abc",
        "http://127.0.0.1:5733/auth/callback",
      ),
    ).toBe(true);
  });

  it("rejects callbacks on different ports", () => {
    expect(
      isOAuthCallbackUrlMatch(
        "http://127.0.0.1:5733/auth/callback?code=abc",
        "http://127.0.0.1:3773/auth/callback",
      ),
    ).toBe(false);
  });
});

describe("parseOAuthCallbackUrl", () => {
  it("extracts authorization code from matching callback URL", () => {
    expect(parseOAuthCallbackUrl(`${redirectTo}?code=pkce-code-123`, redirectTo)).toEqual({
      code: "pkce-code-123",
    });
  });

  it("extracts code when redirect uses localhost but configured redirect is 127.0.0.1", () => {
    expect(
      parseOAuthCallbackUrl("http://localhost:5733/auth/callback?code=loopback-alias", redirectTo),
    ).toEqual({
      code: "loopback-alias",
    });
  });

  it("extracts OAuth errors from callback URL", () => {
    expect(
      parseOAuthCallbackUrl(
        `${redirectTo}?error=access_denied&error_description=User%20denied`,
        redirectTo,
      ),
    ).toEqual({
      error: "access_denied",
      errorDescription: "User denied",
    });
  });

  it("returns null for non-callback URLs", () => {
    expect(parseOAuthCallbackUrl("https://github.com/login", redirectTo)).toBeNull();
  });
});

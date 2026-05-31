import { describe, expect, it } from "vitest";

import { desktopOAuthRedirectUrl, startOAuthCallbackServer } from "./oauthCallbackServer.ts";

describe("oauthCallbackServer", () => {
  it("captures authorization codes on the desktop callback URL", async () => {
    const redirectTo = desktopOAuthRedirectUrl();
    const session = await startOAuthCallbackServer({ redirectTo, timeoutMs: 5_000 });

    const resultPromise = session.waitForResult();
    const response = await fetch(`${redirectTo}?code=desktop-browser-code`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("autodsm://auth/success");

    await expect(resultPromise).resolves.toEqual({
      ok: true,
      code: "desktop-browser-code",
    });
    await session.close();
  });

  it("accepts localhost callback aliases", async () => {
    const redirectTo = desktopOAuthRedirectUrl();
    const session = await startOAuthCallbackServer({ redirectTo, timeoutMs: 5_000 });

    const resultPromise = session.waitForResult();
    const response = await fetch("http://localhost:53682/auth/callback?code=alias-browser-code");
    expect(response.status).toBe(200);

    await expect(resultPromise).resolves.toEqual({
      ok: true,
      code: "alias-browser-code",
    });
    await session.close();
  });

  it("returns OAuth errors to the waiter", async () => {
    const redirectTo = desktopOAuthRedirectUrl();
    const session = await startOAuthCallbackServer({ redirectTo, timeoutMs: 5_000 });

    const resultPromise = session.waitForResult();
    const response = await fetch(
      `${redirectTo}?error=access_denied&error_description=User%20denied`,
    );
    expect(response.status).toBe(400);

    await expect(resultPromise).resolves.toEqual({
      ok: false,
      reason: "failed",
      message: "User denied",
    });
    await session.close();
  });
});

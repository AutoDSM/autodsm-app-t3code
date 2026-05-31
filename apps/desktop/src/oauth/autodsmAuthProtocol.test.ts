import { describe, expect, it } from "vitest";

import {
  AUTODSM_AUTH_SUCCESS_URL,
  extractAutodsmDeepLinkFromArgv,
  isAutodsmAuthSuccessDeepLink,
} from "./autodsmAuthProtocol.ts";

describe("autodsmAuthProtocol", () => {
  it("detects auth success deep links", () => {
    expect(isAutodsmAuthSuccessDeepLink(AUTODSM_AUTH_SUCCESS_URL)).toBe(true);
    expect(isAutodsmAuthSuccessDeepLink("autodsm://auth/success/")).toBe(true);
    expect(isAutodsmAuthSuccessDeepLink("autodsm://auth/callback?code=abc")).toBe(false);
  });

  it("extracts deep links from argv", () => {
    expect(
      extractAutodsmDeepLinkFromArgv(["/Applications/AutoDSM.app", "autodsm://auth/success"]),
    ).toBe("autodsm://auth/success");
  });
});

import { describe, expect, it } from "vitest";

import {
  AUTODSM_OAUTH_POPUP_MESSAGE,
  buildAutoDsmOAuthPopupMessage,
  isAutoDsmOAuthPopupMessage,
} from "./oauthPopupProtocol";

describe("oauthPopupProtocol", () => {
  it("builds and validates popup callback messages", () => {
    const message = buildAutoDsmOAuthPopupMessage("?code=abc");
    expect(message).toEqual({
      type: AUTODSM_OAUTH_POPUP_MESSAGE,
      search: "?code=abc",
    });
    expect(isAutoDsmOAuthPopupMessage(message)).toBe(true);
    expect(isAutoDsmOAuthPopupMessage({ type: "other", search: "?code=abc" })).toBe(false);
  });
});

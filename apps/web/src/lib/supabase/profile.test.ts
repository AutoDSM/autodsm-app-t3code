import { describe, expect, it } from "vitest";

import { mapSupabaseProfileRow } from "./profile";

describe("mapSupabaseProfileRow", () => {
  it("maps provider and beta status", () => {
    expect(
      mapSupabaseProfileRow({
        id: "user-1",
        email: "a@b.com",
        display_name: "Ada",
        avatar_url: "https://example.com/a.png",
        provider: "github",
        beta_status: "approved",
      }),
    ).toEqual({
      id: "user-1",
      email: "a@b.com",
      displayName: "Ada",
      avatarUrl: "https://example.com/a.png",
      provider: "github",
      betaStatus: "approved",
    });
  });

  it("defaults unknown beta to approved", () => {
    expect(
      mapSupabaseProfileRow({
        id: "user-2",
        provider: "google",
        beta_status: "unknown",
      }).betaStatus,
    ).toBe("approved");
  });
});

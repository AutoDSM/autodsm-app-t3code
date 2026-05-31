import * as Schema from "effect/Schema";
import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";

import {
  DesktopSupabaseOAuthStartInputSchema,
  DesktopSupabaseOAuthStartResultSchema,
} from "@t3tools/contracts";

const decodeSupabaseOAuthStartInput = Schema.decodeUnknownEffect(
  DesktopSupabaseOAuthStartInputSchema,
);
const decodeSupabaseOAuthStartResult = Schema.decodeUnknownEffect(
  DesktopSupabaseOAuthStartResultSchema,
);

describe("DesktopSupabaseOAuthStartInputSchema", () => {
  it("accepts valid payloads", async () => {
    const decoded = await Effect.runPromise(
      decodeSupabaseOAuthStartInput({
        provider: "github",
        oauthUrl: "https://example.supabase.co/auth/v1/authorize",
        redirectTo: "http://127.0.0.1:5733/auth/callback",
      }),
    );
    expect(decoded.provider).toBe("github");
  });

  it("rejects malformed payloads", async () => {
    await expect(
      Effect.runPromise(
        decodeSupabaseOAuthStartInput({
          provider: "twitter",
          oauthUrl: "https://example.supabase.co/auth/v1/authorize",
          redirectTo: "http://127.0.0.1:5733/auth/callback",
        }),
      ),
    ).rejects.toThrow();
  });
});

describe("DesktopSupabaseOAuthStartResultSchema", () => {
  it("accepts success and failure results", async () => {
    await expect(
      Effect.runPromise(
        decodeSupabaseOAuthStartResult({
          ok: true,
          code: "abc",
        }),
      ),
    ).resolves.toEqual({ ok: true, code: "abc" });

    await expect(
      Effect.runPromise(
        decodeSupabaseOAuthStartResult({
          ok: false,
          reason: "cancelled",
          message: "Sign-in was cancelled.",
        }),
      ),
    ).resolves.toEqual({
      ok: false,
      reason: "cancelled",
      message: "Sign-in was cancelled.",
    });
  });
});

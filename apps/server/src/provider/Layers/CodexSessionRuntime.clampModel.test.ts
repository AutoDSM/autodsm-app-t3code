import { describe, expect, it } from "vitest";

import { clampCodexModelSlug } from "./CodexSessionRuntime.ts";

describe("clampCodexModelSlug", () => {
  const supported = new Set(["gpt-5-codex", "gpt-5.3-codex", "gpt-5"]);

  it("passes through a model that is advertised", () => {
    expect(clampCodexModelSlug("gpt-5-codex", supported)).toEqual({ model: "gpt-5-codex" });
  });

  it("remaps via the alias map when the alias target is advertised", () => {
    // "gpt-5.3" → "gpt-5.3-codex" (alias), which is in the supported set.
    expect(clampCodexModelSlug("gpt-5.3", supported)).toEqual({
      model: "gpt-5.3-codex",
      clampedFrom: "gpt-5.3",
    });
  });

  it("falls back to the first advertised model when unsupported with no usable alias", () => {
    // "gpt-5.4" is not advertised and has no alias FROM it → first advertised.
    expect(clampCodexModelSlug("gpt-5.4", supported)).toEqual({
      model: "gpt-5-codex",
      clampedFrom: "gpt-5.4",
    });
  });

  it("passes through unchanged when the supported set is unknown (empty)", () => {
    expect(clampCodexModelSlug("gpt-5.4", new Set())).toEqual({ model: "gpt-5.4" });
  });

  it("leaves an undefined request undefined (default applies downstream)", () => {
    expect(clampCodexModelSlug(undefined, supported)).toEqual({ model: undefined });
  });
});

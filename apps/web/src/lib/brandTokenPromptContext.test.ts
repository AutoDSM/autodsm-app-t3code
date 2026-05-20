import { describe, expect, it } from "vitest";

import type { AutoDsmBrandProfile } from "@t3tools/contracts";

import {
  appendBrandTokenContextToPrompt,
  collectReferencedBrandTokenNames,
  formatBrandTokenPromptAppendix,
} from "./brandTokenPromptContext";

const profile: AutoDsmBrandProfile = {
  meta: {
    kind: "brand-profile",
    schemaVersion: 2,
    owner: "brand-profile-indexer",
    invalidationKey: "k",
    consumers: [],
  },
  tokens: [
    {
      id: "css-var:primary",
      category: "color",
      name: "primary",
      value: "#8a38f5",
      origin: "scanned",
      sources: ["/src/index.css"],
      color: { light: "#8a38f5", dark: "#a366ff" },
    },
  ],
  cssVariablePaths: ["/src/index.css"],
  status: "ready",
};

describe("brandTokenPromptContext", () => {
  it("collects referenced brand token names from prompt text", () => {
    expect(collectReferencedBrandTokenNames("Use @primary for the button", profile)).toEqual([
      "primary",
    ]);
    expect(collectReferencedBrandTokenNames("Use @src/foo.tsx", profile)).toEqual([]);
  });

  it("formats a design-token appendix focused on referenced tokens", () => {
    const appendix = formatBrandTokenPromptAppendix({
      profile,
      prompt: "Style with @primary",
    });
    expect(appendix).toContain("Referenced tokens:");
    expect(appendix).toContain("@primary");
    expect(appendix).not.toContain("Active brand profile");
  });

  it("includes the profile preview when no tokens are referenced", () => {
    const appendix = formatBrandTokenPromptAppendix({
      profile,
      prompt: "Style the button",
    });
    expect(appendix).toContain("Active brand profile");
  });

  it("appends the design-token block to outbound prompts", () => {
    const result = appendBrandTokenContextToPrompt({
      prompt: "Build a button",
      profile,
      tokenSourcePrompt: "Use @primary",
    });
    expect(result).toContain("Build a button");
    expect(result).toContain("--- Design tokens ---");
    expect(result).toContain("@primary");
  });
});

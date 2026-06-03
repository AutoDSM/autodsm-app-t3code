import { describe, expect, it } from "vitest";

import type { AutoDsmComponentRegistryEntry } from "@t3tools/contracts";

import {
  buildTokenUsageCountById,
  cssVarTokenId,
  tokenUsageCount,
} from "~/lib/autoDsmTokenUsage";

function entry(relativePath: string, tokenReferences: readonly string[]): AutoDsmComponentRegistryEntry {
  return {
    id: `entry:${relativePath}`,
    componentId: relativePath,
    relativePath,
    exports: [],
    propsByExport: {},
    providerHints: [],
    dependencyEdges: [],
    usageImports: {},
    tokenReferences: [...tokenReferences],
    manifest: { relativePath, exports: [], propsByExport: [], diagnostics: [] },
  } as unknown as AutoDsmComponentRegistryEntry;
}

describe("buildTokenUsageCountById", () => {
  it("counts components referencing each token by css-var id", () => {
    const counts = buildTokenUsageCountById([
      entry("Button.tsx", ["primary", "foreground"]),
      entry("IconButton.tsx", ["primary"]),
      entry("Card.tsx", ["border"]),
    ]);
    expect(counts.get(cssVarTokenId("primary"))).toBe(2);
    expect(counts.get(cssVarTokenId("foreground"))).toBe(1);
    expect(counts.get(cssVarTokenId("border"))).toBe(1);
  });

  it("counts a component once even if it references a token repeatedly", () => {
    const counts = buildTokenUsageCountById([entry("Button.tsx", ["primary", "primary", "primary"])]);
    expect(counts.get(cssVarTokenId("primary"))).toBe(1);
  });

  it("treats missing tokenReferences as no usage", () => {
    const counts = buildTokenUsageCountById([entry("Legacy.tsx", [])]);
    expect(counts.size).toBe(0);
  });
});

describe("tokenUsageCount", () => {
  const counts = buildTokenUsageCountById([
    entry("Button.tsx", ["primary"]),
    entry("IconButton.tsx", ["primary"]),
  ]);

  it("resolves by token id", () => {
    expect(tokenUsageCount({ id: cssVarTokenId("primary") }, counts)).toBe(2);
  });

  it("falls back to the token name when the id is not the css-var form", () => {
    expect(tokenUsageCount({ id: "user:abc", name: "primary" }, counts)).toBe(2);
  });

  it("returns 0 for unused tokens", () => {
    expect(tokenUsageCount({ id: cssVarTokenId("never-used") }, counts)).toBe(0);
  });
});

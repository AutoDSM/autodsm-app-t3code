import { describe, expect, it } from "vitest";

import type { AutoDsmBrandToken } from "@t3tools/contracts";

import { classifyDesignTokenColorRole, groupColorTokensByRole } from "./designTokenColorRoles";

function colorToken(name: string): AutoDsmBrandToken {
  return {
    id: `color:${name}`,
    category: "color",
    name,
    value: "#000",
    color: { light: "#000" },
    origin: "scanned",
    sources: [],
  };
}

describe("designTokenColorRoles", () => {
  it("classifies semantic shadcn roles", () => {
    expect(classifyDesignTokenColorRole(colorToken("background"))).toBe("surfaces");
    expect(classifyDesignTokenColorRole(colorToken("primary"))).toBe("action");
    expect(classifyDesignTokenColorRole(colorToken("foreground"))).toBe("foreground");
    expect(classifyDesignTokenColorRole(colorToken("destructive"))).toBe("semantic");
  });

  it("groups tokens in display order and omits empty buckets", () => {
    const groups = groupColorTokensByRole([
      colorToken("primary"),
      colorToken("background"),
      colorToken("destructive"),
    ]);
    expect(groups.map((group) => group.role)).toEqual(["surfaces", "action", "semantic"]);
  });
});

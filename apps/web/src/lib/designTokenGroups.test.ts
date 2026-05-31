import type { AutoDsmBrandToken } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  buildTokenDraft,
  DESIGN_TOKEN_CATEGORIES,
  EMPTY_TOKEN_DRAFT_FIELDS,
  groupTokensByCategory,
  normalizeTokenCategory,
  resolveTokenCategory,
} from "./designTokenGroups.ts";

function token(id: string, category: string): AutoDsmBrandToken {
  return { id, category, value: "v", sources: [] };
}

describe("normalizeTokenCategory", () => {
  it("maps synonyms onto canonical categories", () => {
    expect(normalizeTokenCategory("Colors")).toBe("color");
    expect(normalizeTokenCategory("type")).toBe("typography");
    expect(normalizeTokenCategory("animation")).toBe("motion");
    expect(normalizeTokenCategory("radii")).toBe("radius");
    expect(normalizeTokenCategory("shadows")).toBe("shadow");
    expect(normalizeTokenCategory("icons")).toBe("icon");
  });

  it("falls back to spacing for unknown categories", () => {
    expect(normalizeTokenCategory("mystery")).toBe("spacing");
  });
});

describe("resolveTokenCategory", () => {
  it("routes legacy spacing radius tokens into radius", () => {
    expect(
      resolveTokenCategory({
        id: "css-var:radius",
        category: "spacing",
        name: "radius",
        value: "0.5rem",
        sources: [],
      }),
    ).toBe("radius");
  });
});

describe("groupTokensByCategory", () => {
  it("always returns the seven canonical groups in order", () => {
    const groups = groupTokensByCategory([]);
    expect(groups.map((g) => g.category)).toEqual([...DESIGN_TOKEN_CATEGORIES]);
  });

  it("routes tokens into their normalized buckets", () => {
    const groups = groupTokensByCategory([token("a", "color"), token("b", "css-variable")]);
    const byCategory = new Map(groups.map((g) => [g.category, g.tokens]));
    expect(byCategory.get("color")).toHaveLength(1);
    expect(byCategory.get("spacing")).toHaveLength(1);
  });
});

describe("buildTokenDraft", () => {
  it("requires a token name", () => {
    const result = buildTokenDraft("spacing", EMPTY_TOKEN_DRAFT_FIELDS);
    expect(result.ok).toBe(false);
  });

  it("builds a color draft from a light value", () => {
    const result = buildTokenDraft("color", {
      ...EMPTY_TOKEN_DRAFT_FIELDS,
      name: "primary",
      light: "#8a38f5",
    });
    expect(result).toEqual({
      ok: true,
      draft: { category: "color", name: "primary", value: "#8a38f5", color: { light: "#8a38f5" } },
    });
  });

  it("rejects a color draft with no light or dark value", () => {
    const result = buildTokenDraft("color", { ...EMPTY_TOKEN_DRAFT_FIELDS, name: "primary" });
    expect(result.ok).toBe(false);
  });

  it("builds a typography draft from font fields", () => {
    const result = buildTokenDraft("typography", {
      ...EMPTY_TOKEN_DRAFT_FIELDS,
      name: "Heading 1",
      fontFamily: "Manrope",
      fontSize: "64px",
    });
    expect(result).toEqual({
      ok: true,
      draft: {
        category: "typography",
        name: "Heading 1",
        value: "Manrope 64px",
        typography: { fontFamily: "Manrope", fontSize: "64px" },
      },
    });
  });

  it("builds a spacing draft from a plain value", () => {
    const result = buildTokenDraft("spacing", {
      ...EMPTY_TOKEN_DRAFT_FIELDS,
      name: "space-4",
      value: "16px",
    });
    expect(result).toEqual({
      ok: true,
      draft: { category: "spacing", name: "space-4", value: "16px" },
    });
  });
});

import type { AutoDsmBrandToken } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  buildColorTokenScope,
  classifyColorTier,
  parseVarReference,
  partitionColorsByTier,
  resolveColorTokenValue,
} from "./colorTokenTiers";

function makeToken(
  overrides: Partial<AutoDsmBrandToken> & Pick<AutoDsmBrandToken, "id" | "value">,
): AutoDsmBrandToken {
  return {
    id: overrides.id,
    category: overrides.category ?? "color",
    name: overrides.name,
    value: overrides.value,
    color: overrides.color,
    typography: overrides.typography,
    origin: overrides.origin ?? "scanned",
    sources: overrides.sources ?? [],
  } as AutoDsmBrandToken;
}

describe("parseVarReference", () => {
  it("extracts the bare variable name", () => {
    expect(parseVarReference("var(--color-brand-500)")).toBe("color-brand-500");
  });
  it("tolerates whitespace", () => {
    expect(parseVarReference("  var(  --primary  )  ")).toBe("primary");
  });
  it("accepts a fallback argument", () => {
    expect(parseVarReference("var(--primary, #ff0000)")).toBe("primary");
  });
  it("returns null for literals", () => {
    expect(parseVarReference("#1a1a1a")).toBeNull();
    expect(parseVarReference("oklch(0.5 0.1 270)")).toBeNull();
    expect(parseVarReference("rgb(20 30 40)")).toBeNull();
    expect(parseVarReference("red")).toBeNull();
    expect(parseVarReference("")).toBeNull();
  });
  it("returns null for malformed var()", () => {
    expect(parseVarReference("var(--)")).toBeNull();
    expect(parseVarReference("var(primary)")).toBeNull();
    expect(parseVarReference("var(--bad name)")).toBeNull();
  });
});

describe("classifyColorTier", () => {
  it("classifies direct values as global", () => {
    expect(classifyColorTier(makeToken({ id: "t1", value: "#fff" }))).toBe("global");
    expect(
      classifyColorTier(makeToken({ id: "t2", value: "x", color: { light: "oklch(0.5 0 0)" } })),
    ).toBe("global");
  });
  it("classifies var() values as semantic", () => {
    expect(classifyColorTier(makeToken({ id: "primary", value: "var(--blue-500)" }))).toBe(
      "semantic",
    );
    expect(
      classifyColorTier(
        makeToken({ id: "primary", value: "ignored", color: { light: "var(--blue-500)" } }),
      ),
    ).toBe("semantic");
  });
});

describe("buildColorTokenScope", () => {
  it("indexes by both name and id", () => {
    const tokens = [
      makeToken({ id: "tok-1", name: "color-brand-500", value: "#830cfa" }),
      makeToken({ id: "tok-2", name: "primary", value: "var(--color-brand-500)" }),
    ];
    const scope = buildColorTokenScope(tokens);
    expect(scope.get("color-brand-500")?.id).toBe("tok-1");
    expect(scope.get("tok-1")?.id).toBe("tok-1");
    expect(scope.get("primary")?.id).toBe("tok-2");
  });

  it("strips a leading `--` from the lookup key", () => {
    const tokens = [makeToken({ id: "a", name: "--color-brand-500", value: "#fff" })];
    const scope = buildColorTokenScope(tokens);
    expect(scope.get("color-brand-500")?.id).toBe("a");
  });
});

describe("resolveColorTokenValue", () => {
  const brand500 = makeToken({ id: "b1", name: "color-brand-500", value: "oklch(0.65 0.2 280)" });
  const primary = makeToken({ id: "p", name: "primary", value: "var(--color-brand-500)" });
  const aliasOfPrimary = makeToken({ id: "ap", name: "interactive", value: "var(--primary)" });

  it("returns the literal value when no reference is present", () => {
    const scope = buildColorTokenScope([brand500]);
    expect(resolveColorTokenValue(brand500, scope)).toEqual({
      value: "oklch(0.65 0.2 280)",
      referenceName: null,
    });
  });

  it("resolves a single hop", () => {
    const scope = buildColorTokenScope([brand500, primary]);
    expect(resolveColorTokenValue(primary, scope)).toEqual({
      value: "oklch(0.65 0.2 280)",
      referenceName: "color-brand-500",
    });
  });

  it("resolves multi-hop chains and reports the first hop as the reference", () => {
    const scope = buildColorTokenScope([brand500, primary, aliasOfPrimary]);
    expect(resolveColorTokenValue(aliasOfPrimary, scope)).toEqual({
      value: "oklch(0.65 0.2 280)",
      referenceName: "primary",
    });
  });

  it("returns null value when a cycle is detected", () => {
    const a = makeToken({ id: "a", name: "a", value: "var(--b)" });
    const b = makeToken({ id: "b", name: "b", value: "var(--a)" });
    const scope = buildColorTokenScope([a, b]);
    expect(resolveColorTokenValue(a, scope)).toEqual({ value: null, referenceName: "b" });
  });

  it("returns null value when the referenced name is unknown", () => {
    const orphan = makeToken({ id: "x", value: "var(--missing)" });
    const scope = buildColorTokenScope([orphan]);
    expect(resolveColorTokenValue(orphan, scope)).toEqual({
      value: null,
      referenceName: "missing",
    });
  });

  it("falls back to the light channel when dark is not set", () => {
    const darkOnly = makeToken({
      id: "dark-fallback",
      name: "p",
      value: "x",
      color: { light: "#000000" },
    });
    const scope = buildColorTokenScope([darkOnly]);
    expect(resolveColorTokenValue(darkOnly, scope, "dark")).toEqual({
      value: null,
      referenceName: null,
    });
  });

  it("resolves dark-channel references against the dark color of the referent", () => {
    const brand = makeToken({
      id: "brand",
      name: "color-brand-500",
      value: "x",
      color: { light: "#aaa", dark: "#111" },
    });
    const semantic = makeToken({
      id: "p",
      name: "primary",
      value: "x",
      color: { light: "var(--color-brand-500)", dark: "var(--color-brand-500)" },
    });
    const scope = buildColorTokenScope([brand, semantic]);
    expect(resolveColorTokenValue(semantic, scope, "dark")).toEqual({
      value: "#111",
      referenceName: "color-brand-500",
    });
  });
});

describe("partitionColorsByTier", () => {
  it("splits tokens into disjoint sets in insertion order", () => {
    const tokens = [
      makeToken({ id: "g1", value: "#111" }),
      makeToken({ id: "s1", value: "var(--g1)" }),
      makeToken({ id: "g2", value: "oklch(0.5 0.1 270)" }),
      makeToken({ id: "s2", value: "var(--g2)" }),
    ];
    const { globals, semantics } = partitionColorsByTier(tokens);
    expect(globals.map((t) => t.id)).toEqual(["g1", "g2"]);
    expect(semantics.map((t) => t.id)).toEqual(["s1", "s2"]);
  });

  it("returns empty arrays for an empty input", () => {
    expect(partitionColorsByTier([])).toEqual({ globals: [], semantics: [] });
  });
});

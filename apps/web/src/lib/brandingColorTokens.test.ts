import type { AutoDsmBrandToken } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  filterBrandingColorTokens,
  filterComposerBrandTokens,
  isBrandingColorToken,
} from "./brandingColorTokens";

function makeToken(
  overrides: Partial<AutoDsmBrandToken> & Pick<AutoDsmBrandToken, "id" | "value">,
): AutoDsmBrandToken {
  return {
    id: overrides.id,
    category: overrides.category ?? "color",
    name: overrides.name,
    value: overrides.value,
    color: overrides.color,
    origin: overrides.origin ?? "scanned",
    sources: overrides.sources ?? [],
  } as AutoDsmBrandToken;
}

describe("isBrandingColorToken", () => {
  it("includes shadcn semantic colors", () => {
    expect(isBrandingColorToken(makeToken({ id: "p", name: "primary", value: "#830cfa" }))).toBe(
      true,
    );
    expect(
      isBrandingColorToken(
        makeToken({ id: "pf", name: "primary-foreground", value: "oklch(0.985 0 0)" }),
      ),
    ).toBe(true);
    expect(
      isBrandingColorToken(makeToken({ id: "bg", name: "background", value: "oklch(1 0 0)" })),
    ).toBe(true);
  });

  it("excludes tailwind palette primitives", () => {
    expect(
      isBrandingColorToken(
        makeToken({ id: "b50", name: "color-brand-50", value: "oklch(0.985 0.02 264)" }),
      ),
    ).toBe(false);
    expect(
      isBrandingColorToken(
        makeToken({ id: "b500", name: "color-brand-500", value: "oklch(0.65 0.2 280)" }),
      ),
    ).toBe(false);
    expect(
      isBrandingColorToken(
        makeToken({ id: "r600", name: "color-red-600", value: "oklch(0.5 0.2 25)" }),
      ),
    ).toBe(false);
  });

  it("always includes user-defined color tokens", () => {
    expect(
      isBrandingColorToken(
        makeToken({
          id: "user:brand",
          name: "brand",
          value: "#fff",
          origin: "user",
        }),
      ),
    ).toBe(true);
    expect(
      isBrandingColorToken(
        makeToken({
          id: "user:palette",
          name: "color-brand-500",
          value: "#fff",
          origin: "user",
        }),
      ),
    ).toBe(true);
  });

  it("ignores non-color tokens", () => {
    expect(
      isBrandingColorToken(
        makeToken({ id: "s1", name: "space-4", value: "16px", category: "spacing" }),
      ),
    ).toBe(false);
  });
});

describe("filterBrandingColorTokens", () => {
  it("returns only branding colors", () => {
    const tokens = [
      makeToken({ id: "p", name: "primary", value: "var(--color-brand-500)" }),
      makeToken({ id: "b500", name: "color-brand-500", value: "#830cfa" }),
      makeToken({ id: "bg", name: "background", value: "oklch(1 0 0)" }),
    ];
    expect(filterBrandingColorTokens(tokens).map((token) => token.name)).toEqual([
      "primary",
      "background",
    ]);
  });
});

describe("filterComposerBrandTokens", () => {
  it("keeps non-color tokens and branding colors only", () => {
    const tokens = [
      makeToken({ id: "p", name: "primary", value: "var(--color-brand-500)" }),
      makeToken({ id: "b500", name: "color-brand-500", value: "#830cfa" }),
      makeToken({ id: "s4", name: "space-4", value: "16px", category: "spacing" }),
    ];
    expect(filterComposerBrandTokens(tokens).map((token) => token.name)).toEqual([
      "primary",
      "space-4",
    ]);
  });
});

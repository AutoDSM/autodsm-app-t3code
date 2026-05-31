// @effect-diagnostics nodeBuiltinImport:off
import { describe, expect, it } from "vitest";

import { canonicalizeBrandTokenCategory, classifyBrandTokenCategory } from "./autoDsmHelpers.ts";

describe("classifyBrandTokenCategory", () => {
  it("classifies semantic colors", () => {
    expect(classifyBrandTokenCategory("primary", "#8a38f5")).toBe("color");
  });

  it("classifies typography vars", () => {
    expect(classifyBrandTokenCategory("font-sans", "Inter, sans-serif")).toBe("typography");
  });

  it("classifies motion vars", () => {
    expect(classifyBrandTokenCategory("duration-fast", "120ms")).toBe("motion");
  });

  it("classifies radius vars separately from spacing", () => {
    expect(classifyBrandTokenCategory("radius", "0.625rem")).toBe("radius");
    expect(classifyBrandTokenCategory("radius-md", "0.375rem")).toBe("radius");
  });

  it("classifies shadow vars", () => {
    expect(classifyBrandTokenCategory("shadow-sm", "0 1px 2px 0 rgb(0 0 0 / 0.05)")).toBe("shadow");
  });

  it("classifies icon vars", () => {
    expect(classifyBrandTokenCategory("icon-size-md", "1.25rem")).toBe("icon");
    expect(classifyBrandTokenCategory("icon-stroke-width", "2")).toBe("icon");
  });

  it("classifies spacing vars", () => {
    expect(classifyBrandTokenCategory("space-4", "1rem")).toBe("spacing");
  });
});

describe("canonicalizeBrandTokenCategory", () => {
  it("reclassifies scanned radius tokens stored as spacing", () => {
    expect(
      canonicalizeBrandTokenCategory({
        id: "css-var:radius",
        category: "spacing",
        name: "radius",
        value: "0.625rem",
        origin: "scanned",
        sources: ["/src/index.css"],
      }),
    ).toBe("radius");
  });

  it("preserves arbitrary user spacing tokens", () => {
    expect(
      canonicalizeBrandTokenCategory({
        id: "user:123",
        category: "spacing",
        name: "layout-gap",
        value: "12px",
        origin: "user",
        sources: ["/src/index.css"],
      }),
    ).toBe("spacing");
  });

  it("reclassifies user tokens with icon-library name", () => {
    expect(
      canonicalizeBrandTokenCategory({
        id: "user:456",
        category: "spacing",
        name: "icon-library",
        value: "lucide",
        origin: "user",
        sources: ["/components.json"],
      }),
    ).toBe("icon");
  });
});

import type { ComponentPreviewManifest, ComponentPreviewPropSpec } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import { hasPropVariants, listPropVariantCells } from "./autoDsmComponentVariantFamily";

function manifest(
  relativePath: string,
  exportName: string,
  props: readonly ComponentPreviewPropSpec[],
): ComponentPreviewManifest {
  return {
    relativePath,
    exports: [{ name: exportName, isDefault: false, kind: "function" }],
    propsByExport: [{ exportName, props }],
    diagnostics: [],
  };
}

const BUTTON = manifest("src/components/Button.tsx", "Button", [
  {
    name: "variant",
    kind: "enum",
    optional: true,
    enumValues: ["default", "outline", "ghost", "secondary", "destructive", "link"],
  },
  { name: "disabled", kind: "boolean", optional: true },
  { name: "label", kind: "string", optional: false },
]);

describe("listPropVariantCells / hasPropVariants", () => {
  it("emits a section per enum/boolean prop with a cell per value", () => {
    const cells = listPropVariantCells(BUTTON, "Button", { label: "Continue" });

    // 6 variant values + 2 disabled values = 8 cells. `label` (string) is not enumerated.
    expect(cells.length).toBe(8);

    const variantCells = cells.filter((c) => c.section === "variant");
    const disabledCells = cells.filter((c) => c.section === "disabled");
    expect(variantCells.map((c) => c.label)).toEqual([
      "default",
      "outline",
      "ghost",
      "secondary",
      "destructive",
      "link",
    ]);
    expect(disabledCells.map((c) => c.label)).toEqual(["false", "true"]);

    // baseProps carry through: each cell keeps label="Continue" and overrides its own prop.
    const outline = variantCells.find((c) => c.label === "outline")!;
    const parsed = JSON.parse(outline.propsJson) as Record<string, unknown>;
    expect(parsed.variant).toBe("outline");
    expect(parsed.label).toBe("Continue");

    // `variant` section comes first (sortPropSpecsForPanel ranks it ahead).
    expect(cells[0]!.section).toBe("variant");
  });

  it("hasPropVariants is true when an enumerable prop exists", () => {
    expect(hasPropVariants(BUTTON, "Button")).toBe(true);
  });

  it("skips single-value enums and reports no variants", () => {
    const single = manifest("src/components/Tag.tsx", "Tag", [
      { name: "variant", kind: "enum", optional: true, enumValues: ["solid"] },
      { name: "label", kind: "string", optional: false },
    ]);
    expect(hasPropVariants(single, "Tag")).toBe(false);
    expect(listPropVariantCells(single, "Tag")).toEqual([]);
  });
});

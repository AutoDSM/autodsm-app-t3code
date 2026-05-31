import type { ComponentPreviewManifest } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  hasMultipleVariants,
  listVariantExportCells,
  listVariantExports,
  resolvePrimaryExport,
  variantLabel,
} from "./componentVariantFamily.ts";

function manifest(input: {
  relativePath: string;
  exports: ReadonlyArray<{ name: string; kind?: "function" | "const" }>;
}): ComponentPreviewManifest {
  return {
    relativePath: input.relativePath,
    exports: input.exports.map((ex) => ({
      name: ex.name,
      isDefault: false,
      kind: ex.kind === "const" ? "unknown" : "function",
    })),
    propsByExport: [],
    diagnostics: [],
  };
}

describe("componentVariantFamily", () => {
  it("resolves primary export matching file stem", () => {
    const m = manifest({
      relativePath: "src/components/ShadcnButton.tsx",
      exports: [
        { name: "ShadcnButtonOutline" },
        { name: "ShadcnButton" },
        { name: "ShadcnButtonGhost" },
      ],
    });
    expect(resolvePrimaryExport(m)).toBe("ShadcnButton");
    expect(listVariantExports(m)).toEqual([
      "ShadcnButton",
      "ShadcnButtonGhost",
      "ShadcnButtonOutline",
    ]);
    expect(hasMultipleVariants(m)).toBe(true);
  });

  it("labels variant exports relative to primary", () => {
    expect(variantLabel("ShadcnButtonOutline", "ShadcnButton", ["Shadcn"])).toBe("Outline");
    expect(variantLabel("ShadcnButton", "ShadcnButton", ["Shadcn"])).toBe("Default");
    expect(variantLabel("MuiAvatarCircular", "MuiAvatar", ["Mui"])).toBe("Circular");
  });

  it("treats single-export files as non-variant", () => {
    const m = manifest({
      relativePath: "src/components/ShadcnDialog.tsx",
      exports: [{ name: "ShadcnDialog" }],
    });
    expect(hasMultipleVariants(m)).toBe(false);
    expect(listVariantExports(m)).toEqual(["ShadcnDialog"]);
  });

  it("builds labeled export cells", () => {
    const m = manifest({
      relativePath: "src/components/ShadcnButton.tsx",
      exports: [{ name: "ShadcnButton" }, { name: "ShadcnButtonGhost" }],
    });
    expect(listVariantExportCells(m, ["Shadcn"])).toEqual([
      { exportName: "ShadcnButton", label: "Default" },
      { exportName: "ShadcnButtonGhost", label: "Ghost" },
    ]);
  });
});

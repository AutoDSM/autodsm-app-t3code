import { describe, expect, it } from "vitest";

import { filterProductComponentAgentPaths } from "./filterProductComponentAgentPaths";
import type { SrcComponentsCatalogViewModel } from "./srcComponentsCatalog";

const baseCatalog: SrcComponentsCatalogViewModel = {
  folderLabel: "test",
  paths: [
    "src/components/ShadcnButton.tsx",
    "src/components/ui/button.tsx",
    "src/components/ShadcnCard.tsx",
  ],
  isPending: false,
  isError: false,
  truncated: false,
  gate: null,
};

describe("filterProductComponentAgentPaths", () => {
  it("keeps only manifest agent paths", () => {
    const filtered = filterProductComponentAgentPaths(baseCatalog, [
      "/src/components/ShadcnButton.tsx",
      "/src/components/ShadcnCard.tsx",
    ]);

    expect(filtered.paths).toEqual([
      "src/components/ShadcnButton.tsx",
      "src/components/ShadcnCard.tsx",
    ]);
  });

  it("returns empty paths when no allowed paths are provided", () => {
    const filtered = filterProductComponentAgentPaths(baseCatalog, []);
    expect(filtered.paths).toEqual([]);
  });
});

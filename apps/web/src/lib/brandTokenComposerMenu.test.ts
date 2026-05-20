import { describe, expect, it } from "vitest";

import type { AutoDsmBrandToken } from "@t3tools/contracts";

import {
  buildBrandTokenComposerMenuItems,
  groupBrandTokenComposerMenuItems,
} from "./brandTokenComposerMenu";

const tokens: AutoDsmBrandToken[] = [
  {
    id: "color:primary",
    category: "color",
    name: "primary",
    value: "#8a38f5",
    origin: "scanned",
    sources: [],
    color: { light: "#8a38f5", dark: "#a366ff" },
  },
  {
    id: "spacing:md",
    category: "spacing",
    name: "md",
    value: "16px",
    origin: "scanned",
    sources: [],
  },
];

describe("brandTokenComposerMenu", () => {
  it("builds prefix-filtered menu items grouped by category order", () => {
    const items = buildBrandTokenComposerMenuItems(tokens, "p");
    expect(items).toHaveLength(1);
    expect(items[0]?.type).toBe("brand-token");
    if (items[0]?.type === "brand-token") {
      expect(items[0].tokenName).toBe("primary");
      expect(items[0].label).toBe("@primary");
    }
  });

  it("returns all tokens when the query is empty", () => {
    expect(buildBrandTokenComposerMenuItems(tokens, "")).toHaveLength(2);
  });

  it("groups brand-token menu items by category", () => {
    const items = buildBrandTokenComposerMenuItems(tokens, "");
    const groups = groupBrandTokenComposerMenuItems(items);
    expect(groups.map((group) => group.id)).toEqual(["color", "spacing"]);
    expect(groups[0]?.label).toBe("Colors");
  });
});

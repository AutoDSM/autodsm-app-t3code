import { describe, expect, it } from "vitest";

import type { AutoDsmBrandToken } from "@t3tools/contracts";

import { detectComposerTrigger } from "~/composer-logic";
import { buildBrandTokenComposerMenuItems } from "~/lib/brandTokenComposerMenu";

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

describe("useBrandTokenComposerMenu", () => {
  it("opens brand-token menu items for active @ queries when tokens exist", () => {
    const prompt = "Use @pri";
    const trigger = detectComposerTrigger(prompt, prompt.length, { brandTokenMode: true });
    expect(trigger?.kind).toBe("brand-token");
    const items = buildBrandTokenComposerMenuItems(tokens, trigger?.query ?? "");
    expect(items).toHaveLength(1);
    expect(items[0]?.type).toBe("brand-token");
  });

  it("returns no menu items when brand tokens are unavailable", () => {
    const prompt = "Use @pri";
    const trigger = detectComposerTrigger(prompt, prompt.length, { brandTokenMode: false });
    expect(trigger?.kind).toBe("path");
    expect(buildBrandTokenComposerMenuItems([], "pri")).toEqual([]);
  });

  it("lists all tokens when @ is typed with an empty query", () => {
    const prompt = "Use @";
    const trigger = detectComposerTrigger(prompt, prompt.length, { brandTokenMode: true });
    expect(trigger?.kind).toBe("brand-token");
    expect(buildBrandTokenComposerMenuItems(tokens, trigger?.query ?? "")).toHaveLength(2);
  });
});

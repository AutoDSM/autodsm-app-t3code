import { scopeThreadRef } from "@t3tools/client-runtime";
import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import type { AutoDsmComponentAgentTab } from "./autoDsmComponentAgents";
import {
  buildAutoDsmComponentAgentGroups,
  buildComponentAgentGroupLookup,
  inferComponentAgentGroupFromTab,
} from "./autoDsmComponentAgentGroups";
import { getStarterComponentAgents } from "./autoDsmStarterComponentAgents";

const ENV = "env-1" as EnvironmentId;

function tab(id: string, title: string, componentPath: string): AutoDsmComponentAgentTab {
  const threadRef = scopeThreadRef(ENV, id as ThreadId);
  return {
    threadRef,
    threadKey: `${ENV}:${id}`,
    title,
    componentPath,
  };
}

describe("autoDsmComponentAgentGroups", () => {
  it("groups shadcn starter agents into semantic folders", () => {
    const starterAgents = getStarterComponentAgents("shadcn-ui");
    const lookup = buildComponentAgentGroupLookup(starterAgents);
    const tabs = starterAgents.map((agent, index) =>
      tab(`thr-${index}`, agent.title, agent.componentPath.replace(/^\//, "")),
    );

    const groups = buildAutoDsmComponentAgentGroups(tabs, lookup);
    const labels = groups.map((group) => group.label);

    // Robust against manifest growth: assert the semantic groups exist and that
    // membership is correct, rather than pinning the full (evolving) label list.
    expect(labels).toContain("Buttons");
    expect(labels).toContain("Cards");
    // Every starter agent lands in exactly one group (no drops, no dupes).
    const totalTabs = groups.reduce((sum, group) => sum + group.tabs.length, 0);
    expect(totalTabs).toBe(tabs.length);
    // Labels are unique and ordering is deterministic.
    expect(new Set(labels).size).toBe(labels.length);
    expect(
      groups.find((group) => group.label === "Buttons")?.tabs.map((entry) => entry.title),
    ).toContain("Button");
    expect(
      groups.find((group) => group.label === "Cards")?.tabs.map((entry) => entry.title),
    ).toContain("Card");
  });

  it("falls back to heuristics when group is missing", () => {
    const sample = tab("thr-1", "Primary button", "src/components/PrimaryButton.tsx");
    expect(inferComponentAgentGroupFromTab(sample)).toBe("Buttons");
  });
});

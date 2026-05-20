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

    expect(groups.map((group) => group.label)).toEqual(["Buttons", "Cards", "Inputs", "Badges"]);
    expect(
      groups.find((group) => group.label === "Buttons")?.tabs.map((entry) => entry.title),
    ).toEqual(["Button"]);
    expect(
      groups.find((group) => group.label === "Cards")?.tabs.map((entry) => entry.title),
    ).toEqual(["Card", "Theme card"]);
  });

  it("falls back to heuristics when group is missing", () => {
    const sample = tab("thr-1", "Primary button", "src/components/PrimaryButton.tsx");
    expect(inferComponentAgentGroupFromTab(sample)).toBe("Buttons");
  });
});

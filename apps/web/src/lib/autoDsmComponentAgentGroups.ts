import type { AutoDsmComponentAgentTab } from "~/lib/autoDsmComponentAgents";
import { normalizeSidebarComponentCatalogPath } from "~/lib/srcComponentsWorkspacePaths";

export const AUTO_DSM_COMPONENT_AGENT_GROUP_ORDER = [
  "Buttons",
  "Cards",
  "Inputs",
  "Badges",
  "Other",
] as const;

export type AutoDsmComponentAgentGroupId = (typeof AUTO_DSM_COMPONENT_AGENT_GROUP_ORDER)[number];

export interface AutoDsmComponentAgentGroup {
  readonly groupId: string;
  readonly label: string;
  readonly tabs: readonly AutoDsmComponentAgentTab[];
}

export interface ComponentAgentGroupLookupEntry {
  readonly componentPath: string;
  readonly group?: string | undefined;
}

function compareGroupOrder(a: string, b: string): number {
  const indexA = AUTO_DSM_COMPONENT_AGENT_GROUP_ORDER.indexOf(a as AutoDsmComponentAgentGroupId);
  const indexB = AUTO_DSM_COMPONENT_AGENT_GROUP_ORDER.indexOf(b as AutoDsmComponentAgentGroupId);
  const rankA = indexA === -1 ? AUTO_DSM_COMPONENT_AGENT_GROUP_ORDER.length : indexA;
  const rankB = indexB === -1 ? AUTO_DSM_COMPONENT_AGENT_GROUP_ORDER.length : indexB;
  if (rankA !== rankB) {
    return rankA - rankB;
  }
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export function inferComponentAgentGroupFromTab(tab: AutoDsmComponentAgentTab): string {
  const base =
    tab.componentPath
      .split("/")
      .pop()
      ?.replace(/\.tsx$/i, "")
      .replace(/\.jsx$/i, "") ?? tab.title;
  const lower = `${base} ${tab.title}`.toLowerCase();
  if (lower.includes("button")) {
    return "Buttons";
  }
  if (lower.includes("card")) {
    return "Cards";
  }
  if (lower.includes("input") || lower.includes("textarea") || lower.includes("select")) {
    return "Inputs";
  }
  if (lower.includes("badge") || lower.includes("pill") || lower.includes("label")) {
    return "Badges";
  }
  return "Other";
}

export function resolveComponentAgentGroupForTab(
  tab: AutoDsmComponentAgentTab,
  groupByComponentPath: ReadonlyMap<string, string>,
): string {
  const normalizedPath = normalizeSidebarComponentCatalogPath(tab.componentPath);
  const manifestGroup = groupByComponentPath.get(normalizedPath);
  if (manifestGroup?.trim()) {
    return manifestGroup.trim();
  }
  if (tab.group?.trim()) {
    return tab.group.trim();
  }
  return inferComponentAgentGroupFromTab(tab);
}

export function buildComponentAgentGroupLookup(
  entries: readonly ComponentAgentGroupLookupEntry[],
): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const entry of entries) {
    const normalizedPath = normalizeSidebarComponentCatalogPath(entry.componentPath);
    if (entry.group?.trim()) {
      lookup.set(normalizedPath, entry.group.trim());
    }
  }
  return lookup;
}

export function enrichAutoDsmComponentAgentTabsWithGroups(
  tabs: readonly AutoDsmComponentAgentTab[],
  groupByComponentPath: ReadonlyMap<string, string>,
): AutoDsmComponentAgentTab[] {
  return tabs.map((tab) => ({
    ...tab,
    group: resolveComponentAgentGroupForTab(tab, groupByComponentPath),
  }));
}

export function buildAutoDsmComponentAgentGroups(
  tabs: readonly AutoDsmComponentAgentTab[],
  groupByComponentPath: ReadonlyMap<string, string>,
): AutoDsmComponentAgentGroup[] {
  const enriched = enrichAutoDsmComponentAgentTabsWithGroups(tabs, groupByComponentPath);
  const grouped = new Map<string, AutoDsmComponentAgentTab[]>();

  for (const tab of enriched) {
    const groupId = resolveComponentAgentGroupForTab(tab, groupByComponentPath);
    const bucket = grouped.get(groupId);
    if (bucket) {
      bucket.push(tab);
    } else {
      grouped.set(groupId, [tab]);
    }
  }

  return [...grouped.entries()]
    .toSorted(([groupA], [groupB]) => compareGroupOrder(groupA, groupB))
    .map(([groupId, groupTabs]) => ({
      groupId,
      label: groupId,
      tabs: groupTabs.toSorted((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      ),
    }));
}

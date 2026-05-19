import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime";
import type { EnvironmentId, ProjectId, ScopedThreadRef } from "@t3tools/contracts";

import { sanitizeComponentPreviewPathForSearch } from "~/diffRouteSearch";
import { normalizeSidebarComponentCatalogPath } from "~/lib/srcComponentsWorkspacePaths";
import type { SidebarThreadSummary } from "~/types";

export interface AutoDsmComponentAgentTab {
  readonly threadRef: ScopedThreadRef;
  readonly threadKey: string;
  readonly title: string;
  readonly componentPath: string;
}

export interface BuildAutoDsmComponentAgentTabsInput {
  readonly environmentId: EnvironmentId;
  readonly projectId: ProjectId;
  readonly projectThreads: readonly SidebarThreadSummary[];
  readonly autoDsmThreadComponentPathById: Readonly<Record<string, string>>;
}

function basenameOfPosix(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? path : path.slice(idx + 1);
}

function resolveAgentComponentPath(
  threadKey: string,
  autoDsmThreadComponentPathById: Readonly<Record<string, string>>,
): string | null {
  const raw = autoDsmThreadComponentPathById[threadKey];
  if (!raw?.trim()) {
    return null;
  }
  const normalized = normalizeSidebarComponentCatalogPath(raw);
  return sanitizeComponentPreviewPathForSearch(normalized) ?? null;
}

function compareAgentTabs(a: AutoDsmComponentAgentTab, b: AutoDsmComponentAgentTab): number {
  const byTitle = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  if (byTitle !== 0) {
    return byTitle;
  }
  return a.componentPath.localeCompare(b.componentPath);
}

export function buildAutoDsmComponentAgentTabs(
  input: BuildAutoDsmComponentAgentTabsInput,
): AutoDsmComponentAgentTab[] {
  const { environmentId, projectId, projectThreads, autoDsmThreadComponentPathById } = input;
  const tabs: AutoDsmComponentAgentTab[] = [];

  for (const thread of projectThreads) {
    if (thread.environmentId !== environmentId || thread.projectId !== projectId) {
      continue;
    }
    const threadRef = scopeThreadRef(thread.environmentId, thread.id);
    const threadKey = scopedThreadKey(threadRef);
    const componentPath = resolveAgentComponentPath(threadKey, autoDsmThreadComponentPathById);
    if (!componentPath) {
      continue;
    }
    const title = thread.title.trim() || basenameOfPosix(componentPath).replace(/\.tsx$/i, "");
    tabs.push({ threadRef, threadKey, title, componentPath });
  }

  return tabs.toSorted(compareAgentTabs);
}

export function resolveAutoDsmAgentTabForThread(
  activeThreadKey: string | null | undefined,
  tabs: readonly AutoDsmComponentAgentTab[],
): AutoDsmComponentAgentTab | null {
  if (!activeThreadKey) {
    return null;
  }
  return tabs.find((tab) => tab.threadKey === activeThreadKey) ?? null;
}

export function resolveAutoDsmAgentTabForPath(
  componentPath: string | null | undefined,
  tabs: readonly AutoDsmComponentAgentTab[],
): AutoDsmComponentAgentTab | null {
  if (!componentPath) {
    return null;
  }
  const normalized = normalizeSidebarComponentCatalogPath(componentPath);
  return tabs.find((tab) => tab.componentPath === normalized) ?? null;
}

import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime";
import type {
  AutoDsmComponentAgentRecord,
  EnvironmentId,
  ProjectId,
  ScopedThreadRef,
  ThreadId,
} from "@t3tools/contracts";

import { sanitizeComponentPreviewPathForSearch } from "~/diffRouteSearch";
import { normalizeSidebarComponentCatalogPath } from "~/lib/srcComponentsWorkspacePaths";
import type { SidebarThreadSummary } from "~/types";

export interface AutoDsmComponentAgentTab {
  readonly threadRef: ScopedThreadRef;
  readonly threadKey: string;
  readonly title: string;
  readonly componentPath: string;
  /**
   * Named export inside `componentPath` for the primary component variant.
   * Sidebar tabs dedupe by `componentPath` — variant exploration lives on
   * the Component Page (Demo props + Variants grid).
   */
  readonly exportName?: string;
  readonly group?: string;
}

export interface BuildAutoDsmComponentAgentTabsInput {
  readonly environmentId: EnvironmentId;
  /**
   * Orchestration projectId for the active workspace. Optional — when absent,
   * the builder falls back to the server manifest as the source of truth.
   */
  readonly projectId?: ProjectId | null;
  readonly projectThreads: readonly SidebarThreadSummary[];
  readonly autoDsmThreadComponentPathById: Readonly<Record<string, string>>;
  /**
   * Optional map of threadKey → named export. Allows the sidebar to keep
   * multi-export siblings (same `componentPath`, different `exportName`)
   * distinct. Omit for legacy single-export workspaces.
   */
  readonly exportNameByThreadKey?: Readonly<Record<string, string>>;
  /**
   * Server-side `AutoDsmComponentAgentsManifest.agents`. When non-empty, the
   * builder treats it as the authoritative source for tabs and bypasses the
   * `projectThreads`-iteration path. This breaks the dependency on the t3code
   * orchestration store being fully hydrated — useful on cold boot when only
   * the active thread (out of N) has been streamed into the client store yet.
   */
  readonly serverAgents?: readonly AutoDsmComponentAgentRecord[];
}

function basenameOfPosix(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? path : path.slice(idx + 1);
}

/**
 * Hide components that are conceptually design-system primitives (e.g. the
 * type scale lives in Design Tokens → Typography, not the component sidebar).
 * Matches `ShadcnTypography.tsx`, `MuiTypography.tsx`, `TwTypography.tsx` and
 * any other `*Typography.tsx` wrapper. Mirrors the server-side scanner skip
 * list at `apps/server/src/autodsm/componentAgentScanner.ts` so workspaces
 * created before that change still see a clean sidebar.
 */
function isDesignTokenPrimitivePath(componentPath: string): boolean {
  const base = basenameOfPosix(componentPath)
    .replace(/\.tsx$/i, "")
    .toLowerCase();
  return base === "typography" || base.endsWith("typography");
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

function tabDedupeKey(tab: AutoDsmComponentAgentTab): string {
  return tab.componentPath;
}

function dedupeAutoDsmComponentAgentTabs(
  tabs: readonly AutoDsmComponentAgentTab[],
): AutoDsmComponentAgentTab[] {
  const seen = new Set<string>();
  const deduped: AutoDsmComponentAgentTab[] = [];
  for (const tab of tabs) {
    const key = tabDedupeKey(tab);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(tab);
  }
  return deduped;
}

export function buildAutoDsmComponentAgentTabs(
  input: BuildAutoDsmComponentAgentTabsInput,
): AutoDsmComponentAgentTab[] {
  const {
    environmentId,
    projectId,
    projectThreads,
    autoDsmThreadComponentPathById,
    exportNameByThreadKey,
    serverAgents,
  } = input;

  // Primary path: build tabs straight from the server-side manifest. This
  // works even before the orchestration store has hydrated the project's
  // threads, so the sidebar populates on the very first paint after launch.
  if (serverAgents && serverAgents.length > 0) {
    const tabs: AutoDsmComponentAgentTab[] = [];
    const projectThreadByKey = new Map<string, SidebarThreadSummary>();
    for (const thread of projectThreads) {
      if (thread.environmentId !== environmentId) continue;
      if (projectId && thread.projectId !== projectId) continue;
      projectThreadByKey.set(
        scopedThreadKey(scopeThreadRef(thread.environmentId, thread.id)),
        thread,
      );
    }
    for (const agent of serverAgents) {
      const componentPath = normalizeSidebarComponentCatalogPath(agent.componentPath);
      const sanitized = sanitizeComponentPreviewPathForSearch(componentPath);
      if (!sanitized) continue;
      if (isDesignTokenPrimitivePath(sanitized)) continue;
      const threadRef = scopeThreadRef(environmentId, agent.threadId as ThreadId);
      const threadKey = scopedThreadKey(threadRef);
      const enrichedTitle = projectThreadByKey.get(threadKey)?.title?.trim();
      const title =
        enrichedTitle && enrichedTitle.length > 0
          ? enrichedTitle
          : agent.title.trim().length > 0
            ? agent.title.trim()
            : basenameOfPosix(sanitized).replace(/\.tsx$/i, "");
      const exportName = agent.exportName?.trim() || undefined;
      tabs.push({
        threadRef,
        threadKey,
        title,
        componentPath: sanitized,
        ...(exportName ? { exportName } : {}),
        ...(agent.group?.trim() ? { group: agent.group.trim() } : {}),
      });
    }
    return dedupeAutoDsmComponentAgentTabs(tabs).toSorted(compareAgentTabs);
  }

  // Fallback path: orchestration-store-driven (legacy). Kept so non-AutoDSM
  // contexts (or AutoDSM routes that don't have a manifest yet) still work.
  const tabs: AutoDsmComponentAgentTab[] = [];
  for (const thread of projectThreads) {
    if (thread.environmentId !== environmentId || (projectId && thread.projectId !== projectId)) {
      continue;
    }
    const threadRef = scopeThreadRef(thread.environmentId, thread.id);
    const threadKey = scopedThreadKey(threadRef);
    const componentPath = resolveAgentComponentPath(threadKey, autoDsmThreadComponentPathById);
    if (!componentPath) {
      continue;
    }
    if (isDesignTokenPrimitivePath(componentPath)) continue;
    const exportName = exportNameByThreadKey?.[threadKey]?.trim() || undefined;
    const title = thread.title.trim() || basenameOfPosix(componentPath).replace(/\.tsx$/i, "");
    tabs.push({
      threadRef,
      threadKey,
      title,
      componentPath,
      ...(exportName ? { exportName } : {}),
    });
  }

  return dedupeAutoDsmComponentAgentTabs(tabs).toSorted(compareAgentTabs);
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

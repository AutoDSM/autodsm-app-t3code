import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime";
import type { EnvironmentId, ProjectId, ThreadId } from "@t3tools/contracts";

import { sanitizeComponentPreviewPathForSearch } from "~/diffRouteSearch";
import { getStarterComponentAgents } from "~/lib/autoDsmStarterComponentAgents";
import { isAutoDsmStarterId, type AutoDsmStarterId } from "~/lib/autoDsmStarterCatalog";
import { shouldUseAutodsmComponentAgentSidebar } from "~/lib/autodsmSidebarMode";
import { normalizeSidebarComponentCatalogPath } from "~/lib/srcComponentsWorkspacePaths";
import type { SidebarThreadSummary } from "~/types";

export interface AutoDsmComponentAgentManifestEntry {
  readonly title: string;
  readonly componentPath: string;
  readonly group?: string;
}

export interface ReconcileAutoDsmThreadComponentPathsInput {
  readonly environmentId: EnvironmentId;
  readonly projectId: ProjectId;
  readonly projectThreads: readonly SidebarThreadSummary[];
  readonly storedPaths: Readonly<Record<string, string>>;
  readonly manifestAgents: readonly AutoDsmComponentAgentManifestEntry[];
}

function resolveStoredComponentPath(
  threadKey: string,
  paths: Readonly<Record<string, string>>,
): string | null {
  const raw = paths[threadKey];
  if (!raw?.trim()) {
    return null;
  }
  const normalized = normalizeSidebarComponentCatalogPath(raw);
  return sanitizeComponentPreviewPathForSearch(normalized) ?? null;
}

export function normalizeComponentAgentTitle(title: string): string {
  return title.trim().toLocaleLowerCase();
}

function normalizeManifestComponentPath(rawPath: string): string | null {
  const normalized = normalizeSidebarComponentCatalogPath(rawPath);
  return sanitizeComponentPreviewPathForSearch(normalized) ?? null;
}

export function reconcileAutoDsmThreadComponentPaths(
  input: ReconcileAutoDsmThreadComponentPathsInput,
): Record<string, string> {
  const { environmentId, projectId, projectThreads, storedPaths, manifestAgents } = input;

  const pathByTitle = new Map<string, string>();
  for (const agent of manifestAgents) {
    const normalizedPath = normalizeManifestComponentPath(agent.componentPath);
    if (!normalizedPath) {
      continue;
    }
    pathByTitle.set(normalizeComponentAgentTitle(agent.title), normalizedPath);
  }

  const backfill: Record<string, string> = {};

  for (const thread of projectThreads) {
    if (thread.environmentId !== environmentId || thread.projectId !== projectId) {
      continue;
    }

    const threadRef = scopeThreadRef(thread.environmentId, thread.id);
    const threadKey = scopedThreadKey(threadRef);

    if (resolveStoredComponentPath(threadKey, storedPaths)) {
      continue;
    }
    if (resolveStoredComponentPath(threadKey, backfill)) {
      continue;
    }

    const titleKey = normalizeComponentAgentTitle(thread.title);
    const manifestPath = pathByTitle.get(titleKey);
    if (manifestPath) {
      backfill[threadKey] = manifestPath;
    }
  }

  return backfill;
}

export function resolveAutoDsmThreadComponentPathForNavigation(
  threadKey: string,
  paths: Readonly<Record<string, string>>,
): string | undefined {
  const resolved = resolveStoredComponentPath(threadKey, paths);
  return resolved ?? undefined;
}

export interface ResolveAutoDsmComponentPathForThreadInput {
  readonly thread: Pick<SidebarThreadSummary, "environmentId" | "projectId" | "id" | "title">;
  readonly projectCwd: string | null;
  readonly storedPaths: Readonly<Record<string, string>>;
  readonly starterId: AutoDsmStarterId | null;
}

export function resolveAutoDsmComponentPathForThread(
  input: ResolveAutoDsmComponentPathForThreadInput,
): string | undefined {
  const threadRef = scopeThreadRef(input.thread.environmentId, input.thread.id as ThreadId);
  const threadKey = scopedThreadKey(threadRef);
  const stored = resolveAutoDsmThreadComponentPathForNavigation(threadKey, input.storedPaths);
  if (stored) {
    return stored;
  }

  if (
    !input.projectCwd ||
    !shouldUseAutodsmComponentAgentSidebar({ workspaceCwd: input.projectCwd }) ||
    !input.starterId ||
    !isAutoDsmStarterId(input.starterId)
  ) {
    return undefined;
  }

  const backfill = reconcileAutoDsmThreadComponentPaths({
    environmentId: input.thread.environmentId,
    projectId: input.thread.projectId,
    projectThreads: [input.thread as SidebarThreadSummary],
    storedPaths: input.storedPaths,
    manifestAgents: getStarterComponentAgents(input.starterId),
  });

  return backfill[threadKey];
}

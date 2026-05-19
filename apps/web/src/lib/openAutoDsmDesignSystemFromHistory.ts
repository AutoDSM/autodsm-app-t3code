import { scopeProjectRef, scopeThreadRef } from "@t3tools/client-runtime";
import {
  DEFAULT_MODEL,
  type AutoDsmWorkspaceHistoryEntry,
  type EnvironmentApi,
  type EnvironmentId,
  ProviderInstanceId,
  type ScopedProjectRef,
  type SidebarThreadSortOrder,
  type ThreadId,
} from "@t3tools/contracts";

import type { DraftThreadEnvMode } from "~/composerDraftStore";
import { findProjectByPath } from "~/lib/projectPaths";
import { getLatestThreadForProject } from "~/lib/threadSort";
import { buildThreadRouteParams } from "~/threadRoutes";
import type { Project, SidebarThreadSummary } from "~/types";
import { newCommandId, newProjectId } from "~/lib/utils";

function normalizeWorkspacePath(value: string): string {
  return value.replace(/\\/g, "/").replace(/\/+$/, "");
}

export function resolveProjectRefForSystemPath(
  projects: readonly Project[],
  environmentId: EnvironmentId,
  systemPath: string,
): ScopedProjectRef | null {
  const target = normalizeWorkspacePath(systemPath);
  const project = findProjectByPath(
    projects.filter((p) => p.environmentId === environmentId),
    target,
  );
  return project ? scopeProjectRef(project.environmentId, project.id) : null;
}

export interface OpenAutoDsmDesignSystemFromHistoryArgs {
  readonly entry: AutoDsmWorkspaceHistoryEntry;
  readonly environmentId: EnvironmentId;
  readonly api: EnvironmentApi;
  readonly projects: readonly Project[];
  readonly threads: readonly SidebarThreadSummary[];
  readonly sidebarThreadSortOrder: SidebarThreadSortOrder;
  readonly navigate: (opts: {
    to: "/$environmentId/$threadId" | "/home";
    params?: { environmentId: EnvironmentId; threadId: ThreadId };
    replace?: boolean;
  }) => Promise<void>;
  readonly handleNewThread: (
    projectRef: ScopedProjectRef,
    options?: { envMode?: DraftThreadEnvMode },
  ) => Promise<void>;
  readonly defaultThreadEnvMode: DraftThreadEnvMode;
  readonly onError: (title: string, description: string) => void;
}

/**
 * Opens a materialized AutoDSM system: reuses an existing orchestration project when cwd matches,
 * otherwise registers the workspace root as a new project titled with the saved display name.
 */
export async function openAutoDsmDesignSystemFromHistory(
  args: OpenAutoDsmDesignSystemFromHistoryArgs,
): Promise<ScopedProjectRef | undefined> {
  const {
    entry,
    environmentId,
    api,
    projects,
    threads,
    sidebarThreadSortOrder,
    navigate,
    handleNewThread,
    defaultThreadEnvMode,
    onError,
  } = args;

  const cwd = normalizeWorkspacePath(entry.systemPath);
  if (cwd.length === 0) {
    onError("Could not open design system", "Workspace path is missing.");
    return undefined;
  }

  const existingRef = resolveProjectRefForSystemPath(projects, environmentId, cwd);
  if (existingRef) {
    const latestThread = getLatestThreadForProject(
      threads.filter((thread) => thread.environmentId === existingRef.environmentId),
      existingRef.projectId,
      sidebarThreadSortOrder,
    );
    if (latestThread) {
      await navigate({
        to: "/$environmentId/$threadId",
        params: buildThreadRouteParams(scopeThreadRef(latestThread.environmentId, latestThread.id)),
        replace: true,
      });
    } else {
      await handleNewThread(existingRef, { envMode: defaultThreadEnvMode }).catch(() => undefined);
    }
    return existingRef;
  }

  try {
    const projectId = newProjectId();
    await api.orchestration.dispatchCommand({
      type: "project.create",
      commandId: newCommandId(),
      projectId,
      title: entry.displayName,
      workspaceRoot: cwd,
      createWorkspaceRootIfMissing: true,
      defaultModelSelection: {
        instanceId: ProviderInstanceId.make("codex"),
        model: DEFAULT_MODEL,
      },
      createdAt: new Date().toISOString(),
    });
    const ref = scopeProjectRef(environmentId, projectId);
    await handleNewThread(ref, { envMode: defaultThreadEnvMode }).catch(() => undefined);
    return ref;
  } catch (error) {
    onError(
      "Could not open design system",
      error instanceof Error ? error.message : "An error occurred.",
    );
    return undefined;
  }
}

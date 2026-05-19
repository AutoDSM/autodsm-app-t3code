import { scopeProjectRef, scopeThreadRef } from "@t3tools/client-runtime";
import {
  DEFAULT_MODEL,
  type EnvironmentApi,
  type EnvironmentId,
  ProviderInstanceId,
  type ScopedProjectRef,
  type SidebarThreadSortOrder,
  type ThreadId,
} from "@t3tools/contracts";

import type { DraftThreadEnvMode } from "~/composerDraftStore";
import {
  findProjectByPath,
  inferProjectTitleFromPath,
  isExplicitRelativeProjectPath,
  isUnsupportedWindowsProjectPath,
  resolveProjectPathForDispatch,
} from "~/lib/projectPaths";
import { getLatestThreadForProject } from "~/lib/threadSort";
import { buildThreadRouteParams } from "~/threadRoutes";
import type { Project, SidebarThreadSummary } from "~/types";
import { newCommandId, newProjectId } from "~/lib/utils";

export interface AddProjectFromRawPathArgs {
  readonly rawCwd: string;
  readonly environmentId: EnvironmentId;
  readonly browseEnvironmentPlatform: string;
  readonly currentProjectCwdForBrowse: string | null;
  readonly api: EnvironmentApi;
  readonly projects: readonly Project[];
  readonly threads: readonly SidebarThreadSummary[];
  readonly sidebarThreadSortOrder: SidebarThreadSortOrder;
  readonly navigate: (opts: {
    to: "/$environmentId/$threadId";
    params: { environmentId: EnvironmentId; threadId: ThreadId };
  }) => Promise<void>;
  readonly handleNewThread: (
    projectRef: ScopedProjectRef,
    options?: { envMode?: DraftThreadEnvMode },
  ) => Promise<void>;
  readonly defaultThreadEnvMode: DraftThreadEnvMode;
  readonly onError: (title: string, description: string) => void;
  readonly onExistingProjectHandled?: () => void;
}

/**
 * Shared project-add flow used by the command palette and the AutoDSM launch surface.
 * Dispatches `project.create`, opens the latest thread when the folder is already known,
 * otherwise seeds a new thread in the new project.
 *
 * @returns The scoped project ref when a project was selected or created; `undefined` otherwise.
 */
export async function addProjectFromRawPath(
  args: AddProjectFromRawPathArgs,
): Promise<ScopedProjectRef | undefined> {
  const {
    rawCwd,
    environmentId,
    browseEnvironmentPlatform,
    currentProjectCwdForBrowse,
    api,
    projects,
    threads,
    sidebarThreadSortOrder,
    navigate,
    handleNewThread,
    defaultThreadEnvMode,
    onError,
    onExistingProjectHandled,
  } = args;

  if (isUnsupportedWindowsProjectPath(rawCwd.trim(), browseEnvironmentPlatform)) {
    onError("Failed to add project", "Windows-style paths are only supported on Windows.");
    return undefined;
  }

  if (isExplicitRelativeProjectPath(rawCwd.trim()) && !currentProjectCwdForBrowse) {
    onError("Failed to add project", "Relative paths require an active project.");
    return undefined;
  }

  const cwd = resolveProjectPathForDispatch(rawCwd, currentProjectCwdForBrowse);
  if (cwd.length === 0) {
    return undefined;
  }

  const existing = findProjectByPath(
    projects.filter((project) => project.environmentId === environmentId),
    cwd,
  );
  if (existing) {
    const latestThread = getLatestThreadForProject(
      threads.filter((thread) => thread.environmentId === existing.environmentId),
      existing.id,
      sidebarThreadSortOrder,
    );
    if (latestThread) {
      await navigate({
        to: "/$environmentId/$threadId",
        params: buildThreadRouteParams(scopeThreadRef(latestThread.environmentId, latestThread.id)),
      });
    } else {
      await handleNewThread(scopeProjectRef(existing.environmentId, existing.id), {
        envMode: defaultThreadEnvMode,
      }).catch(() => undefined);
    }
    onExistingProjectHandled?.();
    return scopeProjectRef(existing.environmentId, existing.id);
  }

  try {
    const projectId = newProjectId();
    await api.orchestration.dispatchCommand({
      type: "project.create",
      commandId: newCommandId(),
      projectId,
      title: inferProjectTitleFromPath(cwd),
      workspaceRoot: cwd,
      createWorkspaceRootIfMissing: true,
      defaultModelSelection: {
        instanceId: ProviderInstanceId.make("codex"),
        model: DEFAULT_MODEL,
      },
      createdAt: new Date().toISOString(),
    });
    await handleNewThread(scopeProjectRef(environmentId, projectId), {
      envMode: defaultThreadEnvMode,
    }).catch(() => undefined);
    onExistingProjectHandled?.();
    return scopeProjectRef(environmentId, projectId);
  } catch (error) {
    onError("Failed to add project", error instanceof Error ? error.message : "An error occurred.");
    return undefined;
  }
}

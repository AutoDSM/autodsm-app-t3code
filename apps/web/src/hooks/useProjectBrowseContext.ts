import type { EnvironmentId, ProjectId } from "@t3tools/contracts";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useHandleNewThread } from "~/hooks/useHandleNewThread";
import { selectProjectsAcrossEnvironments, useStore } from "~/store";

/**
 * When browsing filesystem paths for an environment, relative segments resolve against the
 * active thread's project cwd only when that project belongs to the same environment.
 */
export function useProjectBrowseContext(browseEnvironmentId: EnvironmentId | null): string | null {
  const { activeDraftThread, activeThread } = useHandleNewThread();
  const projects = useStore(useShallow(selectProjectsAcrossEnvironments));

  const projectCwdById = useMemo(
    () => new Map<ProjectId, string>(projects.map((project) => [project.id, project.cwd])),
    [projects],
  );

  const currentProjectEnvironmentId =
    activeThread?.environmentId ?? activeDraftThread?.environmentId ?? null;
  const currentProjectId = activeThread?.projectId ?? activeDraftThread?.projectId ?? null;
  const currentProjectCwd = currentProjectId
    ? (projectCwdById.get(currentProjectId) ?? null)
    : null;

  if (!browseEnvironmentId || currentProjectEnvironmentId !== browseEnvironmentId) {
    return null;
  }

  return currentProjectCwd;
}

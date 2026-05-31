import { useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { orderItemsByPreferredIds } from "~/components/Sidebar.logic";
import { usePrimaryEnvironmentId } from "~/environments/primary";
import { usePrimaryAutoDsmDesignSystemHistory } from "~/hooks/useAutoDsmDesignSystemHistory";
import {
  resolveAutoDsmWorkspace,
  type AutoDsmWorkspaceSelection,
} from "~/lib/autoDsmWorkspaceSelection";
import { getProjectOrderKey } from "~/logicalProject";
import {
  selectProjectsAcrossEnvironments,
  selectSidebarThreadsAcrossEnvironments,
  useStore,
} from "~/store";
import { useUiStateStore } from "~/uiStateStore";

export type { AutoDsmWorkspaceSelection };

/**
 * Resolves the AutoDSM workspace cwd for Components, Tokens, and preview surfaces:
 * prefers an explicit launch-page workspace selection, then the chat thread route's project
 * when `/{environmentId}/{threadId}` is active, otherwise the ordered primary project.
 */
export function useAutoDsmWorkspace(): AutoDsmWorkspaceSelection {
  const pathname = useLocation({ select: (loc) => loc.pathname });
  const projectOrder = useUiStateStore((store) => store.projectOrder);
  const explicitWorkspaceProjectRef = useUiStateStore((store) => store.autoDsmWorkspaceProjectRef);
  const projects = useStore(useShallow((store) => selectProjectsAcrossEnvironments(store)));
  const sidebarThreads = useStore(
    useShallow((store) => selectSidebarThreadsAcrossEnvironments(store)),
  );
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const designSystemHistory = usePrimaryAutoDsmDesignSystemHistory();

  const orderedProjects = useMemo(() => {
    return orderItemsByPreferredIds({
      items: projects,
      preferredIds: projectOrder,
      getId: getProjectOrderKey,
    });
  }, [projectOrder, projects]);

  return useMemo(
    () =>
      resolveAutoDsmWorkspace({
        pathname,
        sidebarThreads,
        orderedProjects,
        projects,
        explicitWorkspaceProjectRef,
        diskHistory: designSystemHistory.rows,
        primaryEnvironmentId,
      }),
    [
      explicitWorkspaceProjectRef,
      orderedProjects,
      pathname,
      projects,
      sidebarThreads,
      designSystemHistory.rows,
      primaryEnvironmentId,
    ],
  );
}

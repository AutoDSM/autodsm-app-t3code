import type { EnvironmentId, ProjectId, ScopedThreadRef } from "@t3tools/contracts";
import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";

import {
  buildAutoDsmComponentAgentTabs,
  resolveAutoDsmAgentTabForThread,
  type AutoDsmComponentAgentTab,
} from "~/lib/autoDsmComponentAgents";
import { reconcileAutoDsmThreadComponentPaths } from "~/lib/autoDsmReconcileComponentAgentPaths";
import { getStarterComponentAgents } from "~/lib/autoDsmStarterComponentAgents";
import { isAutoDsmStarterId } from "~/lib/autoDsmStarterCatalog";
import { selectSidebarThreadsForProjectRefs, useStore } from "~/store";
import { buildThreadRouteParams } from "~/threadRoutes";
import { useUiStateStore } from "~/uiStateStore";

export interface UseAutoDsmComponentAgentTabsInput {
  readonly environmentId: EnvironmentId | null;
  readonly projectId: ProjectId | null;
  readonly isMaterialized: boolean;
  readonly activeThreadKey: string | null;
}

export function useAutoDsmComponentAgentTabs(input: UseAutoDsmComponentAgentTabsInput): {
  readonly tabs: readonly AutoDsmComponentAgentTab[];
  readonly activeTab: AutoDsmComponentAgentTab | null;
  readonly selectAgentTab: (threadRef: ScopedThreadRef) => void;
} {
  const { environmentId, projectId, isMaterialized, activeThreadKey } = input;
  const autoDsmThreadComponentPathById = useUiStateStore(
    (state) => state.autoDsmThreadComponentPathById,
  );
  const mergeAutoDsmThreadComponentPaths = useUiStateStore(
    (state) => state.mergeAutoDsmThreadComponentPaths,
  );
  const starterId = useUiStateStore((state) => state.autodsmOnboarding.starterId);
  const navigate = useNavigate();

  const projectRef = useMemo(
    () => (environmentId && projectId ? { environmentId, projectId } : null),
    [environmentId, projectId],
  );

  const projectThreads = useStore(
    useShallow((state) =>
      projectRef && isMaterialized ? selectSidebarThreadsForProjectRefs(state, [projectRef]) : [],
    ),
  );

  const manifestAgents = useMemo(
    () => (starterId && isAutoDsmStarterId(starterId) ? getStarterComponentAgents(starterId) : []),
    [starterId],
  );

  const reconciledPaths = useMemo(() => {
    if (!isMaterialized || !environmentId || !projectId || manifestAgents.length === 0) {
      return {};
    }
    return reconcileAutoDsmThreadComponentPaths({
      environmentId,
      projectId,
      projectThreads,
      storedPaths: autoDsmThreadComponentPathById,
      manifestAgents,
    });
  }, [
    autoDsmThreadComponentPathById,
    environmentId,
    isMaterialized,
    manifestAgents,
    projectId,
    projectThreads,
  ]);

  const effectivePaths = useMemo(
    () => ({ ...autoDsmThreadComponentPathById, ...reconciledPaths }),
    [autoDsmThreadComponentPathById, reconciledPaths],
  );

  useEffect(() => {
    if (Object.keys(reconciledPaths).length === 0) {
      return;
    }
    mergeAutoDsmThreadComponentPaths(reconciledPaths);
  }, [mergeAutoDsmThreadComponentPaths, reconciledPaths]);

  const tabs = useMemo(() => {
    if (!isMaterialized || !environmentId || !projectId) {
      return [];
    }
    return buildAutoDsmComponentAgentTabs({
      environmentId,
      projectId,
      projectThreads,
      autoDsmThreadComponentPathById: effectivePaths,
    });
  }, [effectivePaths, environmentId, isMaterialized, projectId, projectThreads]);

  const activeTab = useMemo(
    () => resolveAutoDsmAgentTabForThread(activeThreadKey, tabs),
    [activeThreadKey, tabs],
  );

  const selectAgentTab = useCallback(
    (threadRef: ScopedThreadRef) => {
      const tab = tabs.find(
        (entry) =>
          entry.threadRef.environmentId === threadRef.environmentId &&
          entry.threadRef.threadId === threadRef.threadId,
      );
      if (!tab) {
        return;
      }
      void navigate({
        to: "/$environmentId/$threadId",
        params: buildThreadRouteParams(threadRef),
        search: (previous) => ({
          ...(previous as Record<string, unknown>),
          componentPath: tab.componentPath,
        }),
      });
    },
    [navigate, tabs],
  );

  return { tabs, activeTab, selectAgentTab };
}

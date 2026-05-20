"use client";

import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime";
import type {
  AutoDsmComponentAgentRecord,
  EnvironmentId,
  ProjectId,
  ThreadId,
} from "@t3tools/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";

import { stackedThreadToast, toastManager } from "~/components/ui/toast";
import { readEnvironmentApi } from "~/environmentApi";
import {
  buildAutoDsmComponentAgentTabs,
  resolveAutoDsmAgentTabForThread,
  type AutoDsmComponentAgentTab,
} from "~/lib/autoDsmComponentAgents";
import {
  buildComponentAgentGroupLookup,
  enrichAutoDsmComponentAgentTabsWithGroups,
} from "~/lib/autoDsmComponentAgentGroups";
import { canonicalAutoDsmComponentPreviewPath } from "~/lib/autoDsmComponentPreviewPath";
import { reconcileAutoDsmThreadComponentPaths } from "~/lib/autoDsmReconcileComponentAgentPaths";
import { getStarterComponentAgents } from "~/lib/autoDsmStarterComponentAgents";
import { isAutoDsmStarterId } from "~/lib/autoDsmStarterCatalog";
import {
  autodsmComponentAgentsQueryOptions,
  autodsmWorkspaceQueryKeys,
} from "~/lib/autodsmWorkspaceReactQuery";
import { formatUnknownErrorMessage } from "~/lib/formatUnknownErrorMessage";
import { invalidateComponentPreviewQueries } from "~/lib/invalidateComponentPreviewQueries";
import { readLocalApi } from "~/localApi";
import { selectSidebarThreadsForProjectRefs, useStore } from "~/store";
import { buildThreadRouteParams } from "~/threadRoutes";
import { useThreadActions } from "~/hooks/useThreadActions";
import { useSettings } from "~/hooks/useSettings";
import { useUiStateStore } from "~/uiStateStore";

export interface UseAutoDsmComponentAgentTabsInput {
  readonly environmentId: EnvironmentId | null;
  readonly projectId: ProjectId | null;
  readonly cwd: string | null;
  readonly isMaterialized: boolean;
  readonly activeThreadKey: string | null;
}

const EMPTY_PATHS: Record<string, string> = {};

export function pickChangedThreadComponentPaths(
  stored: Readonly<Record<string, string>>,
  candidate: Readonly<Record<string, string>>,
): Record<string, string> {
  const delta: Record<string, string> = {};
  for (const [key, value] of Object.entries(candidate)) {
    const canonical = canonicalAutoDsmComponentPreviewPath(value);
    if (!canonical) {
      continue;
    }
    const storedCanonical = canonicalAutoDsmComponentPreviewPath(stored[key]);
    if (storedCanonical !== canonical) {
      delta[key] = canonical;
    }
  }
  return delta;
}

function buildPathsFromServerAgents(
  environmentId: EnvironmentId,
  agents: readonly AutoDsmComponentAgentRecord[],
): Record<string, string> {
  const paths: Record<string, string> = {};
  for (const agent of agents) {
    const canonical = canonicalAutoDsmComponentPreviewPath(agent.componentPath);
    if (!canonical) {
      continue;
    }
    const threadRef = scopeThreadRef(environmentId, agent.threadId as ThreadId);
    paths[scopedThreadKey(threadRef)] = canonical;
  }
  return paths;
}

export function useAutoDsmComponentAgentTabs(input: UseAutoDsmComponentAgentTabsInput): {
  readonly tabs: readonly AutoDsmComponentAgentTab[];
  readonly activeTab: AutoDsmComponentAgentTab | null;
  readonly selectAgentTab: (threadRef: ReturnType<typeof scopeThreadRef>) => void;
  readonly deleteAgentTab: (tab: AutoDsmComponentAgentTab) => Promise<void>;
} {
  const { environmentId, projectId, cwd, isMaterialized, activeThreadKey } = input;
  const autoDsmThreadComponentPathById = useUiStateStore(
    (state) => state.autoDsmThreadComponentPathById,
  );
  const mergeAutoDsmThreadComponentPaths = useUiStateStore(
    (state) => state.mergeAutoDsmThreadComponentPaths,
  );
  const starterId = useUiStateStore((state) => state.autodsmOnboarding.starterId);
  const confirmThreadDelete = useSettings((settings) => settings.confirmThreadDelete);
  const { deleteThread } = useThreadActions();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const projectRef = useMemo(
    () => (environmentId && projectId ? { environmentId, projectId } : null),
    [environmentId, projectId],
  );

  const projectThreads = useStore(
    useShallow((state) =>
      projectRef && isMaterialized ? selectSidebarThreadsForProjectRefs(state, [projectRef]) : [],
    ),
  );

  const componentAgentsQuery = useQuery(
    autodsmComponentAgentsQueryOptions({
      environmentId,
      cwd,
      enabled: isMaterialized,
    }),
  );

  const serverPaths = useMemo(() => {
    if (!environmentId) {
      return EMPTY_PATHS;
    }
    const paths = buildPathsFromServerAgents(
      environmentId,
      componentAgentsQuery.data?.manifest.agents ?? [],
    );
    return Object.keys(paths).length > 0 ? paths : EMPTY_PATHS;
  }, [componentAgentsQuery.data?.manifest.agents, environmentId]);

  const manifestAgents = useMemo(
    () => (starterId && isAutoDsmStarterId(starterId) ? getStarterComponentAgents(starterId) : []),
    [starterId],
  );

  const reconciledPaths = useMemo(() => {
    if (!isMaterialized || !environmentId || !projectId || manifestAgents.length === 0) {
      return EMPTY_PATHS;
    }
    const backfill = reconcileAutoDsmThreadComponentPaths({
      environmentId,
      projectId,
      projectThreads,
      storedPaths: { ...autoDsmThreadComponentPathById, ...serverPaths },
      manifestAgents,
    });
    return Object.keys(backfill).length > 0 ? backfill : EMPTY_PATHS;
  }, [
    autoDsmThreadComponentPathById,
    environmentId,
    isMaterialized,
    manifestAgents,
    projectId,
    projectThreads,
    serverPaths,
  ]);

  const effectivePaths = useMemo(
    () => ({ ...autoDsmThreadComponentPathById, ...reconciledPaths, ...serverPaths }),
    [autoDsmThreadComponentPathById, reconciledPaths, serverPaths],
  );

  useEffect(() => {
    const merged = { ...reconciledPaths, ...serverPaths };
    const delta = pickChangedThreadComponentPaths(autoDsmThreadComponentPathById, merged);
    if (Object.keys(delta).length === 0) {
      return;
    }
    mergeAutoDsmThreadComponentPaths(delta);
  }, [
    autoDsmThreadComponentPathById,
    mergeAutoDsmThreadComponentPaths,
    reconciledPaths,
    serverPaths,
  ]);

  const groupLookup = useMemo(() => {
    const serverAgents = componentAgentsQuery.data?.manifest.agents ?? [];
    return buildComponentAgentGroupLookup([
      ...manifestAgents.map((agent) => ({
        componentPath: agent.componentPath,
        ...(agent.group ? { group: agent.group } : {}),
      })),
      ...serverAgents.map((agent) => ({
        componentPath: agent.componentPath,
        ...(agent.group ? { group: agent.group } : {}),
      })),
    ]);
  }, [componentAgentsQuery.data?.manifest.agents, manifestAgents]);

  const tabs = useMemo(() => {
    if (!isMaterialized || !environmentId || !projectId) {
      return [];
    }
    const built = buildAutoDsmComponentAgentTabs({
      environmentId,
      projectId,
      projectThreads,
      autoDsmThreadComponentPathById: effectivePaths,
    });
    return enrichAutoDsmComponentAgentTabsWithGroups(built, groupLookup);
  }, [effectivePaths, environmentId, groupLookup, isMaterialized, projectId, projectThreads]);

  const activeTab = useMemo(
    () => resolveAutoDsmAgentTabForThread(activeThreadKey, tabs),
    [activeThreadKey, tabs],
  );

  const selectAgentTab = useCallback(
    (threadRef: ReturnType<typeof scopeThreadRef>) => {
      const tab = tabs.find(
        (entry) =>
          entry.threadRef.environmentId === threadRef.environmentId &&
          entry.threadRef.threadId === threadRef.threadId,
      );
      if (!tab) {
        return;
      }
      invalidateComponentPreviewQueries(queryClient, {
        environmentId,
        projectCwd: cwd,
        relativePath: tab.componentPath,
      });
      void navigate({
        to: "/$environmentId/$threadId",
        params: buildThreadRouteParams(threadRef),
        search: (previous) => ({
          ...(previous as Record<string, unknown>),
          componentPath: tab.componentPath,
        }),
      });
    },
    [cwd, environmentId, navigate, queryClient, tabs],
  );

  const deleteAgentTab = useCallback(
    async (tab: AutoDsmComponentAgentTab) => {
      if (!environmentId || !cwd) {
        return;
      }
      const api = readEnvironmentApi(environmentId);
      const localApi = readLocalApi();
      if (!api) {
        return;
      }

      if (confirmThreadDelete && localApi) {
        const confirmed = await localApi.dialogs.confirm(
          [
            `Delete component "${tab.title}"?`,
            "This permanently clears the agent thread and removes it from the workspace.",
          ].join("\n"),
        );
        if (!confirmed) {
          return;
        }
      }

      const isActive = activeThreadKey === tab.threadKey;
      const fallbackTab = tabs.find((entry) => entry.threadKey !== tab.threadKey) ?? null;

      try {
        await api.autodsm.removeComponentAgent({
          cwd,
          threadId: tab.threadRef.threadId,
        });
      } catch {
        // Manifest cleanup is best-effort; thread deletion is authoritative.
      }

      try {
        await deleteThread(tab.threadRef);
      } catch (error) {
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: "Failed to delete component",
            description: formatUnknownErrorMessage(error),
          }),
        );
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: autodsmWorkspaceQueryKeys.componentAgents(environmentId, cwd),
      });

      if (isActive) {
        if (fallbackTab) {
          selectAgentTab(fallbackTab.threadRef);
        } else {
          void navigate({ to: "/design-components", replace: true });
        }
      }
    },
    [
      activeThreadKey,
      confirmThreadDelete,
      cwd,
      deleteThread,
      environmentId,
      navigate,
      queryClient,
      selectAgentTab,
      tabs,
    ],
  );

  return {
    tabs,
    activeTab,
    selectAgentTab,
    deleteAgentTab,
  };
}

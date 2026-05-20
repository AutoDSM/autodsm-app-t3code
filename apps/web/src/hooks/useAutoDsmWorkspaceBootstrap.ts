"use client";

import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { stackedThreadToast, toastManager } from "~/components/ui/toast";
import { readEnvironmentApi } from "~/environmentApi";
import { usePrimaryEnvironmentId } from "~/environments/primary";
import { useHandleNewThread } from "~/hooks/useHandleNewThread";
import { usePrimaryAutoDsmDesignSystemHistory } from "~/hooks/useAutoDsmDesignSystemHistory";
import { useSettings } from "~/hooks/useSettings";
import { hasAutoDsmDesignSystem } from "~/lib/autoDsmDesignSystemPresence";
import { bootstrapAutoDsmWorkspaceFromDisk } from "~/lib/autoDsmWorkspaceBootstrap";
import {
  selectProjectsAcrossEnvironments,
  selectSidebarThreadsAcrossEnvironments,
  useStore,
} from "~/store";
import { useUiStateStore } from "~/uiStateStore";

export function useAutoDsmSingleDesignSystemMode(): {
  readonly hasDesignSystemOnDisk: boolean;
  readonly isHistoryLoading: boolean;
} {
  const history = usePrimaryAutoDsmDesignSystemHistory();
  return {
    hasDesignSystemOnDisk: hasAutoDsmDesignSystem(history.rows),
    isHistoryLoading: history.isLoading,
  };
}

export function useAutoDsmWorkspaceBootstrap(options?: { readonly enabled?: boolean }): {
  readonly isBootstrapping: boolean;
  readonly hasDesignSystemOnDisk: boolean;
} {
  const enabled = options?.enabled ?? true;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const history = usePrimaryAutoDsmDesignSystemHistory();
  const settings = useSettings();
  const { handleNewThread } = useHandleNewThread();
  const projects = useStore(useShallow((state) => selectProjectsAcrossEnvironments(state)));
  const threads = useStore(useShallow((state) => selectSidebarThreadsAcrossEnvironments(state)));
  const onboardingCompleted = useUiStateStore((state) => state.autodsmOnboarding.completed);
  const hasActiveWorkspaceProject = useUiStateStore(
    (state) => state.autoDsmWorkspaceProjectRef !== null,
  );
  const setWorkspaceRef = useUiStateStore((state) => state.setAutoDsmWorkspaceProjectRef);
  const mergeAgentPaths = useUiStateStore((state) => state.mergeAutoDsmThreadComponentPaths);
  const completeOnboarding = useUiStateStore((state) => state.completeAutodsmOnboarding);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const startedRef = useRef(false);

  const hasDesignSystemOnDisk = hasAutoDsmDesignSystem(history.rows);

  const runBootstrap = useCallback(async () => {
    if (!primaryEnvironmentId || history.isLoading || !hasDesignSystemOnDisk) {
      return;
    }
    const api = readEnvironmentApi(primaryEnvironmentId);
    if (!api) {
      return;
    }

    setIsBootstrapping(true);
    try {
      await bootstrapAutoDsmWorkspaceFromDisk({
        environmentId: primaryEnvironmentId,
        api,
        historyEntries: history.rows,
        projects,
        threads,
        sidebarThreadSortOrder: settings.sidebarThreadSortOrder,
        defaultThreadEnvMode: settings.defaultThreadEnvMode,
        hasActiveWorkspaceProject,
        onboardingCompleted,
        setWorkspaceRef,
        mergeAgentPaths,
        completeOnboarding,
        handleNewThread,
        navigateToComponentAgent: async ({ environmentId, threadId, componentPath }) => {
          await navigate({
            to: "/$environmentId/$threadId",
            params: { environmentId, threadId },
            search: { componentPath },
            replace: true,
          });
        },
        navigateHome: async () => {
          await navigate({ to: "/home", replace: true });
        },
        onError: (title, description) => {
          toastManager.add(
            stackedThreadToast({
              type: "error",
              title,
              description,
            }),
          );
        },
      });
      await queryClient.invalidateQueries({
        queryKey: ["autodsm-workspace-history", primaryEnvironmentId],
      });
    } finally {
      setIsBootstrapping(false);
    }
  }, [
    completeOnboarding,
    handleNewThread,
    hasActiveWorkspaceProject,
    hasDesignSystemOnDisk,
    history.isLoading,
    history.rows,
    mergeAgentPaths,
    navigate,
    onboardingCompleted,
    primaryEnvironmentId,
    projects,
    queryClient,
    setWorkspaceRef,
    settings.defaultThreadEnvMode,
    settings.sidebarThreadSortOrder,
    threads,
  ]);

  useEffect(() => {
    if (!enabled || startedRef.current || history.isLoading) {
      return;
    }
    if (!hasDesignSystemOnDisk) {
      return;
    }
    if (hasActiveWorkspaceProject) {
      return;
    }
    startedRef.current = true;
    void runBootstrap();
  }, [enabled, hasActiveWorkspaceProject, hasDesignSystemOnDisk, history.isLoading, runBootstrap]);

  return {
    isBootstrapping,
    hasDesignSystemOnDisk,
  };
}

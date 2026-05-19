"use client";

import type { AutoDsmWorkspaceHistoryEntry } from "@t3tools/contracts";
import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";

import { stackedThreadToast, toastManager } from "~/components/ui/toast";
import { readEnvironmentApi } from "~/environmentApi";
import { usePrimaryEnvironmentId } from "~/environments/primary";
import { useHandleNewThread } from "~/hooks/useHandleNewThread";
import { useSettings } from "~/hooks/useSettings";
import { openAutoDsmDesignSystemFromHistory } from "~/lib/openAutoDsmDesignSystemFromHistory";
import {
  selectProjectsAcrossEnvironments,
  selectSidebarThreadsAcrossEnvironments,
  useStore,
} from "~/store";
import { useUiStateStore } from "~/uiStateStore";

export function useOpenAutoDsmDesignSystemHistory(options?: {
  readonly completeOnboarding?: boolean;
}) {
  const navigate = useNavigate();
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const completeOnboarding = options?.completeOnboarding ?? false;
  const complete = useUiStateStore((s) => s.completeAutodsmOnboarding);
  const setWorkspaceRef = useUiStateStore((s) => s.setAutoDsmWorkspaceProjectRef);
  const projects = useStore(useShallow((state) => selectProjectsAcrossEnvironments(state)));
  const threads = useStore(useShallow((state) => selectSidebarThreadsAcrossEnvironments(state)));
  const settings = useSettings();
  const { handleNewThread } = useHandleNewThread();
  const [isOpening, setIsOpening] = useState(false);

  const openEntry = useCallback(
    async (entry: AutoDsmWorkspaceHistoryEntry) => {
      if (!primaryEnvironmentId || isOpening) {
        return;
      }
      const api = readEnvironmentApi(primaryEnvironmentId);
      if (!api) {
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: "Environment unavailable",
            description: "Reconnect and try again.",
          }),
        );
        return;
      }

      setIsOpening(true);
      try {
        const ref = await openAutoDsmDesignSystemFromHistory({
          entry,
          environmentId: primaryEnvironmentId,
          api,
          projects,
          threads,
          sidebarThreadSortOrder: settings.sidebarThreadSortOrder,
          navigate,
          handleNewThread,
          defaultThreadEnvMode: settings.defaultThreadEnvMode,
          onError: (title, description) => {
            toastManager.add(stackedThreadToast({ type: "error", title, description }));
          },
        });
        if (ref) {
          setWorkspaceRef(ref);
          if (completeOnboarding) {
            complete();
          }
        }
      } finally {
        setIsOpening(false);
      }
    },
    [
      complete,
      completeOnboarding,
      handleNewThread,
      isOpening,
      navigate,
      primaryEnvironmentId,
      projects,
      setWorkspaceRef,
      settings.defaultThreadEnvMode,
      settings.sidebarThreadSortOrder,
      threads,
    ],
  );

  return {
    openEntry,
    isOpening,
    environmentId: primaryEnvironmentId,
  };
}

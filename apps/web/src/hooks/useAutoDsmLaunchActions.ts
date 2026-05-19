"use client";

import type { EnvironmentId } from "@t3tools/contracts";

import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";

import { useCommandPaletteStore } from "~/commandPaletteStore";
import { readEnvironmentApi } from "~/environmentApi";
import { usePrimaryEnvironmentId } from "~/environments/primary";
import { useSavedEnvironmentRegistryStore } from "~/environments/runtime";
import { useEnvironmentBrowsePlatform } from "~/hooks/useEnvironmentBrowsePlatform";
import { useHandleNewThread } from "~/hooks/useHandleNewThread";
import { useProjectBrowseContext } from "~/hooks/useProjectBrowseContext";
import { useSettings } from "~/hooks/useSettings";
import { addProjectFromRawPath } from "~/lib/projectIntake/addProjectFromRawPath";
import { readLocalApi } from "~/localApi";
import {
  selectProjectsAcrossEnvironments,
  selectSidebarThreadsAcrossEnvironments,
  useStore,
} from "~/store";
import { stackedThreadToast, toastManager } from "~/components/ui/toast";
import { useUiStateStore } from "~/uiStateStore";

export interface UseAutoDsmLaunchActionsResult {
  readonly environmentId: EnvironmentId | null;
  readonly openLocalProject: () => Promise<void>;
  readonly cloneRepository: () => void;
  readonly isPickingFolder: boolean;
  readonly pickDisabled: boolean;
  readonly cloneDisabled: boolean;
}

export function useAutoDsmLaunchActions(): UseAutoDsmLaunchActionsResult {
  const navigate = useNavigate();
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const savedEnvironmentRegistry = useSavedEnvironmentRegistryStore((state) => state.byId);
  const environmentId =
    primaryEnvironmentId ?? Object.values(savedEnvironmentRegistry)[0]?.environmentId ?? null;

  const browseEnvironmentPlatform = useEnvironmentBrowsePlatform(environmentId);
  const currentProjectCwdForBrowse = useProjectBrowseContext(environmentId);
  const projects = useStore(useShallow(selectProjectsAcrossEnvironments));
  const threads = useStore(useShallow(selectSidebarThreadsAcrossEnvironments));
  const settings = useSettings();
  const { handleNewThread } = useHandleNewThread();
  const openAddProject = useCommandPaletteStore((state) => state.openAddProject);

  const [isPickingFolder, setIsPickingFolder] = useState(false);

  const openLocalProject = useCallback(async () => {
    if (!environmentId) {
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: "No environment connected",
          description: "Pair the desktop app or add an environment before opening a project.",
        }),
      );
      return;
    }

    const api = readEnvironmentApi(environmentId);
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

    const localApi = readLocalApi();
    if (!localApi) {
      toastManager.add(
        stackedThreadToast({
          type: "error",
          title: "Local API unavailable",
          description: "Pair an environment before picking folders.",
        }),
      );
      return;
    }

    setIsPickingFolder(true);
    let pickedPath: string | null = null;
    try {
      pickedPath = await localApi.dialogs.pickFolder();
    } catch {
      setIsPickingFolder(false);
      return;
    }
    setIsPickingFolder(false);

    if (!pickedPath) {
      if (typeof window !== "undefined" && !window.desktopBridge) {
        toastManager.add(
          stackedThreadToast({
            type: "info",
            title: "Folder picker unavailable",
            description:
              "Use the command palette (⌘K) → Add project to browse paths in this browser.",
          }),
        );
      }
      return;
    }

    const projectRef = await addProjectFromRawPath({
      rawCwd: pickedPath,
      environmentId,
      browseEnvironmentPlatform,
      currentProjectCwdForBrowse,
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
    if (projectRef) {
      useUiStateStore.getState().setAutoDsmWorkspaceProjectRef(projectRef);
    }
  }, [
    browseEnvironmentPlatform,
    currentProjectCwdForBrowse,
    environmentId,
    handleNewThread,
    navigate,
    projects,
    settings.defaultThreadEnvMode,
    settings.sidebarThreadSortOrder,
    threads,
  ]);

  const cloneRepository = useCallback(() => {
    openAddProject();
  }, [openAddProject]);

  const pickDisabled = !environmentId || isPickingFolder;
  const cloneDisabled = !environmentId;

  return {
    environmentId,
    openLocalProject,
    cloneRepository,
    isPickingFolder,
    pickDisabled,
    cloneDisabled,
  };
}

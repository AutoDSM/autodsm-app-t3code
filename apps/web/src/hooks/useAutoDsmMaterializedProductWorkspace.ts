"use client";

import { scopeProjectRef } from "@t3tools/client-runtime";
import type { AutoDsmWorkspaceHistoryEntry, EnvironmentId, ProjectId } from "@t3tools/contracts";
import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { isElectron } from "~/env";
import { usePrimaryEnvironmentId } from "~/environments/primary";
import { usePrimaryAutoDsmDesignSystemHistory } from "~/hooks/useAutoDsmDesignSystemHistory";
import {
  getPrimaryAutoDsmDesignSystemEntry,
  hasAutoDsmDesignSystem,
} from "~/lib/autoDsmDesignSystemPresence";
import { isAutodsmMaterializedSystemCwd } from "~/lib/autodsmMaterializedWorkspace";
import { resolveProjectRefForSystemPath } from "~/lib/openAutoDsmDesignSystemFromHistory";
import { selectProjectsAcrossEnvironments, useStore } from "~/store";
import { useUiStateStore } from "~/uiStateStore";

export interface AutoDsmMaterializedProductWorkspace {
  readonly environmentId: EnvironmentId;
  readonly projectId: ProjectId | null;
  readonly cwd: string;
  readonly displayName: string;
  readonly historyEntry: AutoDsmWorkspaceHistoryEntry;
}

/**
 * Resolves the primary materialized AutoDSM design system for Electron product mode.
 * Unlike {@link useAutoDsmWorkspace}, this does not follow the active chat thread's project.
 */
export function useAutoDsmMaterializedProductWorkspace(): {
  readonly isElectronProductMode: boolean;
  readonly workspace: AutoDsmMaterializedProductWorkspace | null;
} {
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const history = usePrimaryAutoDsmDesignSystemHistory();
  const projects = useStore(useShallow((state) => selectProjectsAcrossEnvironments(state)));
  const setAutoDsmWorkspaceProjectRef = useUiStateStore(
    (state) => state.setAutoDsmWorkspaceProjectRef,
  );

  const resolved = useMemo(() => {
    const isElectronProductMode = isElectron && hasAutoDsmDesignSystem(history.rows);
    if (!isElectronProductMode || !primaryEnvironmentId) {
      return {
        isElectronProductMode: false,
        workspace: null as AutoDsmMaterializedProductWorkspace | null,
      };
    }

    const historyEntry = getPrimaryAutoDsmDesignSystemEntry(history.rows);
    if (!historyEntry || !isAutodsmMaterializedSystemCwd(historyEntry.systemPath)) {
      return {
        isElectronProductMode: true,
        workspace: null as AutoDsmMaterializedProductWorkspace | null,
      };
    }

    const row =
      history.rows.find((entry) => entry.workspaceId === historyEntry.workspaceId) ??
      history.rows[0] ??
      null;

    const projectRef =
      row?.projectRef ??
      resolveProjectRefForSystemPath(projects, primaryEnvironmentId, historyEntry.systemPath);

    return {
      isElectronProductMode: true,
      workspace: {
        environmentId: primaryEnvironmentId,
        projectId: projectRef?.projectId ?? null,
        cwd: historyEntry.systemPath,
        displayName: historyEntry.displayName,
        historyEntry,
      },
    };
  }, [history.rows, primaryEnvironmentId, projects]);

  useEffect(() => {
    if (
      !resolved.isElectronProductMode ||
      !resolved.workspace?.projectId ||
      !primaryEnvironmentId
    ) {
      return;
    }
    const nextRef = scopeProjectRef(primaryEnvironmentId, resolved.workspace.projectId);
    const currentRef = useUiStateStore.getState().autoDsmWorkspaceProjectRef;
    if (
      currentRef?.environmentId === nextRef.environmentId &&
      currentRef.projectId === nextRef.projectId
    ) {
      return;
    }
    setAutoDsmWorkspaceProjectRef(nextRef);
  }, [
    primaryEnvironmentId,
    resolved.isElectronProductMode,
    resolved.workspace?.projectId,
    setAutoDsmWorkspaceProjectRef,
  ]);

  return resolved;
}

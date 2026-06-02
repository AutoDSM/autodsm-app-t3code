"use client";

import type { JSX } from "react";
import { getRouteApi } from "@tanstack/react-router";

import { ElectronWorkspaceBootstrapLoading } from "~/components/autodsm/ElectronWorkspaceBootstrapLoading";
import {
  useAutoDsmSingleDesignSystemMode,
  useAutoDsmWorkspaceBootstrap,
} from "~/hooks/useAutoDsmWorkspaceBootstrap";
import { selectBootstrapCompleteForActiveEnvironment, useStore } from "~/store";
import { useUiStateStore } from "~/uiStateStore";

const rootRouteApi = getRouteApi("__root__");

/**
 * Electron authenticated chat index `/`: minimal chrome only (see AppSidebarLayout).
 * When a design system exists on disk it auto-loads to `/home`.
 */
export function ElectronAuthenticatedChatLanding(): JSX.Element {
  const { authGateState } = rootRouteApi.useRouteContext();
  const bootstrapComplete = useStore(selectBootstrapCompleteForActiveEnvironment);
  const hasActiveWorkspaceProject = useUiStateStore(
    (state) => state.autoDsmWorkspaceProjectRef !== null,
  );
  const { hasDesignSystemOnDisk, isHistoryLoading } = useAutoDsmSingleDesignSystemMode();
  const { isBootstrapping } = useAutoDsmWorkspaceBootstrap({
    enabled: bootstrapComplete && authGateState.status === "authenticated",
  });

  if (authGateState.status === "requires-auth") {
    return <ElectronWorkspaceBootstrapLoading authFailed />;
  }

  if (!bootstrapComplete || authGateState.status !== "authenticated") {
    return (
      <ElectronWorkspaceBootstrapLoading authPending={authGateState.status !== "authenticated"} />
    );
  }

  if (
    isHistoryLoading ||
    isBootstrapping ||
    (hasDesignSystemOnDisk && !hasActiveWorkspaceProject)
  ) {
    return <ElectronWorkspaceBootstrapLoading authPending={false} />;
  }

  // The "create / open a project" picker is shown as a standalone page at
  // /onboarding/create — the route's beforeLoad redirects this case there
  // before the product layout mounts, so we never render onboarding inline
  // here. Until that navigation settles, show the neutral loading state.
  return <ElectronWorkspaceBootstrapLoading authPending={false} />;
}

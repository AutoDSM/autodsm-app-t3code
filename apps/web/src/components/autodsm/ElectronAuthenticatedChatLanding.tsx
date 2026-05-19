"use client";

import type { JSX } from "react";
import { getRouteApi } from "@tanstack/react-router";

import { AutoDsmLaunchRouteBody } from "~/components/autodsm/AutoDsmLaunchRouteBody";
import { ElectronWorkspaceBootstrapLoading } from "~/components/autodsm/ElectronWorkspaceBootstrapLoading";
import { isDevPairingBypassActive } from "~/lib/devPairingBypass";
import { selectBootstrapCompleteForActiveEnvironment, useStore } from "~/store";

const rootRouteApi = getRouteApi("__root__");

/**
 * Electron authenticated chat index `/`: minimal chrome only (see AppSidebarLayout).
 * Launch tiles drive navigation to a real thread/project route where the full sidebar appears.
 * `/home` is the workspace home page (full sidebar) and renders independently.
 */
export function ElectronAuthenticatedChatLanding(): JSX.Element {
  const { authGateState } = rootRouteApi.useRouteContext();
  const bootstrapComplete = useStore(selectBootstrapCompleteForActiveEnvironment);

  if (authGateState.status === "requires-auth") {
    if (isDevPairingBypassActive(authGateState.auth)) {
      return <ElectronWorkspaceBootstrapLoading authPending />;
    }
    return <ElectronWorkspaceBootstrapLoading authFailed />;
  }

  if (!bootstrapComplete || authGateState.status !== "authenticated") {
    return (
      <ElectronWorkspaceBootstrapLoading authPending={authGateState.status !== "authenticated"} />
    );
  }

  return <AutoDsmLaunchRouteBody />;
}

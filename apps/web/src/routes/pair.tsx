import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import { ElectronWorkspaceBootstrapLoading } from "~/components/autodsm/ElectronWorkspaceBootstrapLoading";
import {
  HostedPairingRouteSurface,
  PairingPendingSurface,
  PairingRouteSurface,
} from "../components/auth/PairingRouteSurface";
import { shouldSkipPairingRedirect } from "../lib/devPairingBypass";

export const Route = createFileRoute("/pair")({
  beforeLoad: async ({ context }) => {
    const { authGateState } = context;
    if (authGateState.status === "hosted-pairing") {
      return {
        authGateState,
      };
    }

    if (
      shouldSkipPairingRedirect(
        authGateState.status === "requires-auth" ? authGateState.auth : undefined,
      )
    ) {
      throw redirect({ to: "/", replace: true });
    }

    if (authGateState.status === "authenticated" || authGateState.status === "hosted-static") {
      throw redirect({ to: "/", replace: true });
    }
    return {
      authGateState,
    };
  },
  component: PairRouteView,
  pendingComponent: PairRoutePendingView,
});

function PairRouteView() {
  const { authGateState } = Route.useRouteContext();
  const navigate = useNavigate();

  if (!authGateState) {
    return null;
  }

  if (authGateState.status === "hosted-pairing") {
    return <HostedPairingRouteSurface />;
  }

  if (
    shouldSkipPairingRedirect(
      authGateState.status === "requires-auth" ? authGateState.auth : undefined,
    )
  ) {
    return <ElectronWorkspaceBootstrapLoading authPending />;
  }

  return (
    <PairingRouteSurface
      auth={authGateState.auth}
      onAuthenticated={() => {
        void navigate({ to: "/", replace: true });
      }}
      {...(authGateState.errorMessage ? { initialErrorMessage: authGateState.errorMessage } : {})}
    />
  );
}

function PairRoutePendingView() {
  return <PairingPendingSurface />;
}

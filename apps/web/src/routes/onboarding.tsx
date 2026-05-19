import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { getOnboardingGuardRedirect, parseOnboardingPath } from "~/lib/autoDsmOnboarding";
import { shouldSkipPairingRedirect } from "~/lib/devPairingBypass";
import { useUiStateStore } from "~/uiStateStore";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async ({ context, location }) => {
    if (
      context.authGateState.status !== "authenticated" &&
      context.authGateState.status !== "hosted-static" &&
      !shouldSkipPairingRedirect(
        context.authGateState.status === "requires-auth" ? context.authGateState.auth : undefined,
      )
    ) {
      throw redirect({ to: "/pair", replace: true });
    }

    const path = location.pathname;
    if (path === "/onboarding" || path === "/onboarding/") {
      throw redirect({ to: "/onboarding/welcome", replace: true });
    }

    const onboarding = useUiStateStore.getState().autodsmOnboarding;
    if (onboarding.completed) {
      throw redirect({ to: "/home", replace: true });
    }

    const parsed = parseOnboardingPath(path);
    if (parsed === "index") {
      throw redirect({ to: "/onboarding/welcome", replace: true });
    }

    const guardTarget = getOnboardingGuardRedirect(parsed, onboarding);
    if (guardTarget && guardTarget !== path) {
      throw redirect({ to: guardTarget, replace: true });
    }
  },
  component: OnboardingLayout,
});

function OnboardingLayout() {
  return <Outlet />;
}

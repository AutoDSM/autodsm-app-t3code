import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import {
  canReenterProjectCreationOnboarding,
  getOnboardingGuardRedirect,
  parseOnboardingPath,
} from "~/lib/autoDsmOnboarding";
import { fetchHasAutoDsmDesignSystemOnDisk } from "~/lib/autoDsmDesignSystemPresence";
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
    const hasDesignSystemOnDisk = await fetchHasAutoDsmDesignSystemOnDisk();
    const parsed = parseOnboardingPath(path);

    const allowCompletedReentry = canReenterProjectCreationOnboarding({
      onboardingCompleted: onboarding.completed,
      hasDesignSystemOnDisk,
      segment: parsed,
    });

    if (onboarding.completed && !allowCompletedReentry) {
      throw redirect({ to: "/home", replace: true });
    }

    if (parsed === "index") {
      throw redirect({ to: "/onboarding/welcome", replace: true });
    }

    const guardTarget = getOnboardingGuardRedirect(parsed, onboarding, {
      allowCompletedReentry,
    });
    if (guardTarget && guardTarget !== path) {
      throw redirect({ to: guardTarget, replace: true });
    }
  },
  component: OnboardingLayout,
});

function OnboardingLayout() {
  return <Outlet />;
}

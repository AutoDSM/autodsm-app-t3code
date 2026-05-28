import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import {
  canReenterProjectCreationOnboarding,
  getOnboardingGuardRedirect,
  parseOnboardingPath,
  readOnboardingAuthContext,
} from "~/lib/autoDsmOnboarding";
import {
  fetchAutoDsmDesignSystemOnDisk,
  resolveOwnerSubjectFromSupabase,
} from "~/lib/autoDsmDesignSystemPresence";
import { isElectron } from "~/env";
import { shouldSkipPairingRedirect } from "~/lib/devPairingBypass";
import { useUiStateStore } from "~/uiStateStore";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async ({ context, location }) => {
    if (
      context.authGateState.status !== "authenticated" &&
      context.authGateState.status !== "hosted-static" &&
      !isElectron &&
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
    const ownerSubject = await resolveOwnerSubjectFromSupabase();
    const { hasMatch: hasDesignSystemOnDisk } = await fetchAutoDsmDesignSystemOnDisk({
      ownerSubject,
    });
    const authContext = await readOnboardingAuthContext();
    const parsed = parseOnboardingPath(path);

    // Presence is the source of truth: if the signed-in user already has a
    // matching design system on disk, skip the wizard entirely and let bootstrap
    // open it from /home (Electron) or / (browser).
    if (hasDesignSystemOnDisk) {
      throw redirect({ to: isElectron ? "/home" : "/", replace: true });
    }

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
      auth: authContext,
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

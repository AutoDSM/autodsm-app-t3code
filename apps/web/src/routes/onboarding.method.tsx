import { createFileRoute } from "@tanstack/react-router";

import { AutoDsmOnboardingBuildMethod } from "~/components/autodsm/onboarding/AutoDsmOnboardingBuildMethod";

function OnboardingMethodRoute() {
  return <AutoDsmOnboardingBuildMethod />;
}

export const Route = createFileRoute("/onboarding/method")({
  component: OnboardingMethodRoute,
});

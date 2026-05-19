import { createFileRoute } from "@tanstack/react-router";

import { AutoDsmOnboardingLoading } from "~/components/autodsm/onboarding/AutoDsmOnboardingLoading";

function OnboardingLoadingRoute() {
  return <AutoDsmOnboardingLoading />;
}

export const Route = createFileRoute("/onboarding/loading")({
  component: OnboardingLoadingRoute,
});

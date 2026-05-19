import { createFileRoute } from "@tanstack/react-router";

import { AutoDsmOnboardingNameProject } from "~/components/autodsm/onboarding/AutoDsmOnboardingNameProject";

function OnboardingNameRoute() {
  return <AutoDsmOnboardingNameProject />;
}

export const Route = createFileRoute("/onboarding/name")({
  component: OnboardingNameRoute,
});

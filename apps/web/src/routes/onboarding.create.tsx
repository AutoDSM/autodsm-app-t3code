import { createFileRoute } from "@tanstack/react-router";

import { AutoDsmOnboardingCreateProject } from "~/components/autodsm/onboarding/AutoDsmOnboardingCreateProject";

function OnboardingCreateRoute() {
  return <AutoDsmOnboardingCreateProject />;
}

export const Route = createFileRoute("/onboarding/create")({
  component: OnboardingCreateRoute,
});

import { createFileRoute } from "@tanstack/react-router";

import { AutoDsmOnboardingBrief } from "~/components/autodsm/onboarding/AutoDsmOnboardingBrief";

function OnboardingBriefRoute() {
  return <AutoDsmOnboardingBrief />;
}

export const Route = createFileRoute("/onboarding/brief")({
  component: OnboardingBriefRoute,
});

import { createFileRoute } from "@tanstack/react-router";

import { AutoDsmOnboardingWelcome } from "~/components/autodsm/onboarding/AutoDsmOnboardingWelcome";

function OnboardingWelcomeRoute() {
  return <AutoDsmOnboardingWelcome />;
}

export const Route = createFileRoute("/onboarding/welcome")({
  component: OnboardingWelcomeRoute,
});

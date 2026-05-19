import { createFileRoute } from "@tanstack/react-router";

import { AutoDsmOnboardingLibraryPicker } from "~/components/autodsm/onboarding/AutoDsmOnboardingLibraryPicker";

function OnboardingLibraryRoute() {
  return <AutoDsmOnboardingLibraryPicker />;
}

export const Route = createFileRoute("/onboarding/library")({
  component: OnboardingLibraryRoute,
});

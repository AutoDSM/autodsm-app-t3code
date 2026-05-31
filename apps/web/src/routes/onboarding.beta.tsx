"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { JSX } from "react";

import { AutoDsmOnboardingShell } from "~/components/autodsm/onboarding/AutoDsmOnboardingShell";
import { Button } from "~/components/ui/button";
import { signOutSupabase } from "~/lib/supabase/auth";

function OnboardingBetaGateRoute(): JSX.Element {
  const navigate = useNavigate();

  return (
    <AutoDsmOnboardingShell>
      <div className="mx-auto flex max-w-md flex-col gap-4 text-center">
        <h1 className="text-xl font-semibold text-foreground">You&apos;re on the waitlist</h1>
        <p className="text-sm text-muted-foreground">
          Thanks for signing up. We&apos;ll email you when your AutoDSM beta access is approved.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            void signOutSupabase().finally(() => {
              void navigate({ to: "/onboarding/welcome", replace: true });
            });
          }}
        >
          Sign out
        </Button>
      </div>
    </AutoDsmOnboardingShell>
  );
}

export const Route = createFileRoute("/onboarding/beta")({
  component: OnboardingBetaGateRoute,
});

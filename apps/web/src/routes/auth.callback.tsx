"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type JSX } from "react";

import { isElectron } from "~/env";
import { AutoDsmOnboardingShell } from "~/components/autodsm/onboarding/AutoDsmOnboardingShell";
import { Spinner } from "~/components/ui/spinner";
import {
  completeSupabaseOAuthFromCodeWithTelemetry,
  finishSupabaseOAuthFromCallbackSearch,
  oauthSignInOutcomeToNavigation,
} from "~/lib/supabase/completeOAuthSignIn";
import { getSupabaseBrowserClient } from "~/lib/supabase/browserClient";
import { buildAutoDsmOAuthPopupMessage } from "~/lib/supabase/oauthPopupProtocol";
import { useUiStateStore } from "~/uiStateStore";

function relayOAuthPopupResultToOpener(): boolean {
  const opener = window.opener;
  if (opener === null || opener.closed) {
    return false;
  }

  opener.postMessage(buildAutoDsmOAuthPopupMessage(window.location.search), window.location.origin);
  window.setTimeout(() => {
    window.close();
  }, 0);
  return true;
}

function AuthCallbackRoute(): JSX.Element {
  const navigate = useNavigate();
  const patchOnboarding = useUiStateStore((s) => s.patchAutodsmOnboarding);
  const [error, setError] = useState<string | null>(null);
  const [popupRelay] = useState(() => relayOAuthPopupResultToOpener());

  useEffect(() => {
    if (popupRelay) {
      return;
    }

    const client = getSupabaseBrowserClient();
    if (client === null) {
      setError("Supabase is not configured for this build.");
      return;
    }

    let cancelled = false;

    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const outcome =
        code !== null
          ? await completeSupabaseOAuthFromCodeWithTelemetry(code)
          : await finishSupabaseOAuthFromCallbackSearch(window.location.search);

      if (cancelled) {
        return;
      }

      const navigation = oauthSignInOutcomeToNavigation(outcome);
      if (navigation.kind === "beta") {
        void navigate({ to: "/onboarding/beta", replace: true });
        return;
      }
      if (navigation.kind === "error") {
        setError(navigation.message);
        return;
      }

      patchOnboarding({ fakeAuthProvider: navigation.provider });
      const onboarding = useUiStateStore.getState().autodsmOnboarding;
      if (isElectron && onboarding.completed) {
        void navigate({ to: "/", replace: true });
        return;
      }
      void navigate({ to: "/onboarding/create", replace: true });
    })().catch((cause: unknown) => {
      if (!cancelled) {
        setError(cause instanceof Error ? cause.message : "Authentication failed.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [navigate, patchOnboarding, popupRelay]);

  if (popupRelay) {
    return (
      <AutoDsmOnboardingShell>
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <Spinner className="size-8" />
          <p className="text-sm text-muted-foreground">Returning to AutoDSM…</p>
        </div>
      </AutoDsmOnboardingShell>
    );
  }

  return (
    <AutoDsmOnboardingShell>
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        {error ? (
          <>
            <p className="text-sm text-destructive">{error}</p>
            <button
              type="button"
              className="text-sm text-primary underline-offset-4 hover:underline"
              onClick={() => {
                void navigate({ to: "/onboarding/welcome", replace: true });
              }}
            >
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <Spinner className="size-8" />
            <p className="text-sm text-muted-foreground">Finishing sign-in…</p>
          </>
        )}
      </div>
    </AutoDsmOnboardingShell>
  );
}

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackRoute,
});

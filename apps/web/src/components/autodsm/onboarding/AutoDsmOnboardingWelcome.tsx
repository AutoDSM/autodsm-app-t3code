"use client";

import type { JSX } from "react";
import { useEffect, useState } from "react";

import { useNavigate } from "@tanstack/react-router";

import { GitHubIcon, GoogleIcon } from "~/components/Icons";
import {
  fetchAutoDsmDesignSystemOnDisk,
  resolveOwnerSubjectFromSupabase,
} from "~/lib/autoDsmDesignSystemPresence";
import type { AutoDsmFakeAuthProvider } from "~/lib/autoDsmOnboarding";
import { allowFakeOnboardingAuth } from "~/lib/devSupabaseBypass";
import { isElectron } from "~/env";
import { isSupabaseAuthEnabled } from "~/lib/supabase/auth";
import {
  oauthOpeningLabel,
  signInWithSupabaseOAuthInPopup,
} from "~/lib/supabase/browserOAuthSignIn";
import { signInWithSupabaseOAuthOnElectron } from "~/lib/supabase/electronOAuthSignIn";
import type { OAuthSignInNavigation } from "~/lib/supabase/completeOAuthSignIn";
import { readOAuthAccountHint } from "~/lib/supabase/oauthAccountHints";
import { useSupabaseAuth } from "~/hooks/useSupabaseAuth";
import { AutoDsmLogoMark } from "../AutoDsmLogoMark";
import { AutoDsmOnboardingShell } from "./AutoDsmOnboardingShell";
import { cn } from "~/lib/utils";
import { useUiStateStore } from "~/uiStateStore";

const authButtonLayout =
  "relative flex h-12 w-full items-center rounded-xl px-4 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60";

const authButtonLabel = "flex-1 text-center text-sm font-medium";

export function AutoDsmOnboardingWelcome(): JSX.Element {
  const navigate = useNavigate();
  const patch = useUiStateStore((s) => s.patchAutodsmOnboarding);
  const supabaseAuth = useSupabaseAuth();
  const [pendingProvider, setPendingProvider] = useState<AutoDsmFakeAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const googleAccountHint = readOAuthAccountHint("google");
  const githubAccountHint = readOAuthAccountHint("github");

  useEffect(() => {
    if (supabaseAuth.loading || !supabaseAuth.session) {
      return;
    }
    if (supabaseAuth.profile?.betaStatus === "pending") {
      void navigate({ to: "/onboarding/beta", replace: true });
      return;
    }
    if (supabaseAuth.profile?.betaStatus === "rejected") {
      setError("Your account is not approved for the beta yet.");
      return;
    }
    if (supabaseAuth.provider) {
      patch({ fakeAuthProvider: supabaseAuth.provider });
      void navigate({ to: "/onboarding/create", replace: true });
    }
  }, [navigate, patch, supabaseAuth]);

  const applyOAuthNavigation = async (navigation: OAuthSignInNavigation): Promise<void> => {
    if (navigation.kind === "beta") {
      void navigate({ to: "/onboarding/beta", replace: true });
      return;
    }
    if (navigation.kind === "error") {
      setError(navigation.message);
      return;
    }
    patch({ fakeAuthProvider: navigation.provider });
    // After OAuth, check whether the signed-in user already has a workspace on
    // disk. If so, skip the wizard and land them in `/` so bootstrap can open
    // the matched system. The fetch is owner-scoped so a different user on the
    // same machine still gets the wizard.
    const ownerSubject = await resolveOwnerSubjectFromSupabase();
    const { hasMatch } = await fetchAutoDsmDesignSystemOnDisk({ ownerSubject });
    if (hasMatch) {
      void navigate({ to: "/", replace: true });
      return;
    }
    void navigate({ to: "/onboarding/create", replace: true });
  };

  const continueWithProvider = async (provider: AutoDsmFakeAuthProvider): Promise<void> => {
    setError(null);
    setPendingProvider(provider);

    if (!isSupabaseAuthEnabled()) {
      if (!allowFakeOnboardingAuth()) {
        setError("Supabase sign-in is required for this build.");
        setPendingProvider(null);
        return;
      }
      patch({ fakeAuthProvider: provider });
      void navigate({ to: "/onboarding/create", replace: true });
      setPendingProvider(null);
      return;
    }

    try {
      if (isElectron) {
        if (typeof window.desktopBridge?.startSupabaseOAuth !== "function") {
          setError("Desktop sign-in is unavailable. Restart the app and try again.");
          setPendingProvider(null);
          return;
        }

        const navigation = await signInWithSupabaseOAuthOnElectron(
          provider,
          window.desktopBridge.startSupabaseOAuth,
        );

        if (navigation.kind === "cancelled") {
          setPendingProvider(null);
          return;
        }

        if (navigation.kind === "error") {
          setError(navigation.message);
          setPendingProvider(null);
          return;
        }

        setPendingProvider(null);
        return;
      }

      const navigation = await signInWithSupabaseOAuthInPopup(provider);

      if (navigation.kind === "cancelled") {
        setPendingProvider(null);
        return;
      }

      await applyOAuthNavigation(navigation);
      setPendingProvider(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed. Try again.");
      setPendingProvider(null);
    }
  };

  const cancelBrowserOAuth = (): void => {
    if (typeof window.desktopBridge?.cancelSupabaseOAuth === "function") {
      void window.desktopBridge.cancelSupabaseOAuth();
    }
    setPendingProvider(null);
  };

  const oauthBusy = pendingProvider !== null;

  return (
    <AutoDsmOnboardingShell>
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center">
          <AutoDsmLogoMark className="h-12 w-auto sm:h-14" />
        </div>
        <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-[1.65rem]">
          Let&apos;s build your design system
        </h1>
        {error ? <p className="max-w-sm text-sm text-destructive">{error}</p> : null}
        {oauthBusy && isElectron ? (
          <p className="max-w-sm text-sm text-muted-foreground">
            Complete sign-in in your browser tab. AutoDSM will come to the front when you&apos;re
            done.
          </p>
        ) : null}
        {!isSupabaseAuthEnabled() && allowFakeOnboardingAuth() ? (
          <p className="max-w-sm text-xs text-muted-foreground">
            Supabase is not configured — using local dev sign-in only. Set{" "}
            <span className="font-mono">VITE_SUPABASE_URL</span> and{" "}
            <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> for real OAuth.
          </p>
        ) : null}
        <div className="flex w-full max-w-sm flex-col gap-3">
          <button
            className={cn(
              authButtonLayout,
              "bg-[#24292f] text-white transition-opacity hover:opacity-90",
              "focus-visible:ring-ring/80",
            )}
            disabled={oauthBusy}
            aria-busy={pendingProvider === "github"}
            onClick={() => {
              void continueWithProvider("github");
            }}
            type="button"
          >
            <GitHubIcon className="size-5 shrink-0" />
            <span className={authButtonLabel}>
              {pendingProvider === "github"
                ? oauthOpeningLabel("github")
                : githubAccountHint
                  ? `Continue as ${githubAccountHint}`
                  : "Continue with GitHub"}
            </span>
          </button>
          <button
            className={cn(
              authButtonLayout,
              "border border-[#747775] bg-white text-[#1F1F1F] transition-colors hover:bg-[#f8f9fa]",
              "focus-visible:ring-ring/70",
            )}
            disabled={oauthBusy}
            aria-busy={pendingProvider === "google"}
            onClick={() => {
              void continueWithProvider("google");
            }}
            type="button"
          >
            <GoogleIcon className="size-[18px] shrink-0" />
            <span className={authButtonLabel}>
              {pendingProvider === "google"
                ? oauthOpeningLabel("google")
                : googleAccountHint
                  ? `Continue as ${googleAccountHint}`
                  : "Continue with Google"}
            </span>
          </button>
          {oauthBusy && isElectron ? (
            <button
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              type="button"
              onClick={cancelBrowserOAuth}
            >
              Cancel sign-in
            </button>
          ) : null}
        </div>
      </div>
    </AutoDsmOnboardingShell>
  );
}

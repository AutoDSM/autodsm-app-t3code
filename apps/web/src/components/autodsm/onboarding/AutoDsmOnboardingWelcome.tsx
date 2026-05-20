"use client";

import type { JSX } from "react";

import { useNavigate } from "@tanstack/react-router";

import { GitHubIcon, GoogleIcon } from "~/components/Icons";
import type { AutoDsmFakeAuthProvider } from "~/lib/autoDsmOnboarding";
import { AutoDsmLogoMark } from "../AutoDsmLogoMark";
import { AutoDsmOnboardingShell } from "./AutoDsmOnboardingShell";
import { cn } from "~/lib/utils";
import { useUiStateStore } from "~/uiStateStore";

const authButtonLayout =
  "relative flex h-12 w-full items-center rounded-xl px-4 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const authButtonLabel = "flex-1 text-center text-sm font-medium";

export function AutoDsmOnboardingWelcome(): JSX.Element {
  const navigate = useNavigate();
  const patch = useUiStateStore((s) => s.patchAutodsmOnboarding);

  const go = (provider: AutoDsmFakeAuthProvider) => {
    patch({ fakeAuthProvider: provider });
    void navigate({ to: "/onboarding/create", replace: true });
  };

  return (
    <AutoDsmOnboardingShell>
      <div className="flex flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center">
          <AutoDsmLogoMark className="h-12 w-auto sm:h-14" />
        </div>
        <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-[1.65rem]">
          Let&apos;s build your design system
        </h1>
        <div className="flex w-full max-w-sm flex-col gap-3">
          <button
            className={cn(
              authButtonLayout,
              "bg-[#24292f] text-white transition-opacity hover:opacity-90",
              "focus-visible:ring-ring/80",
            )}
            onClick={() => {
              go("github");
            }}
            type="button"
          >
            <GitHubIcon className="size-5 shrink-0" />
            <span className={authButtonLabel}>Continue with GitHub</span>
          </button>
          <button
            className={cn(
              authButtonLayout,
              "border border-[#747775] bg-white text-[#1F1F1F] transition-colors hover:bg-[#f8f9fa]",
              "focus-visible:ring-ring/70",
            )}
            onClick={() => {
              go("google");
            }}
            type="button"
          >
            <GoogleIcon className="size-[18px] shrink-0" />
            <span className={authButtonLabel}>Continue with Google</span>
          </button>
        </div>
      </div>
    </AutoDsmOnboardingShell>
  );
}

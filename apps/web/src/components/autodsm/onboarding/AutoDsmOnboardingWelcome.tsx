"use client";

import type { JSX } from "react";

import { useNavigate } from "@tanstack/react-router";

import type { AutoDsmFakeAuthProvider } from "~/lib/autoDsmOnboarding";
import { AutoDsmLogoMark } from "../AutoDsmLogoMark";
import { AutoDsmOnboardingShell } from "./AutoDsmOnboardingShell";
import { cn } from "~/lib/utils";
import { useUiStateStore } from "~/uiStateStore";

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
        <div className="flex flex-col items-center gap-3">
          <AutoDsmLogoMark className="size-14 sm:size-16" />
          <p className="text-[1.65rem] font-extrabold tracking-tight text-foreground sm:text-[1.75rem]">
            autoDSM
          </p>
        </div>
        <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-[1.65rem]">
          Let&apos;s build your design system
        </h1>
        <div className="flex w-full max-w-sm flex-col gap-3">
          <button
            className={cn(
              "h-12 rounded-xl bg-foreground font-semibold text-background",
              "outline-none transition-opacity hover:opacity-90",
              "focus-visible:ring-2 focus-visible:ring-ring/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
            onClick={() => {
              go("github");
            }}
            type="button"
          >
            Continue with GitHub
          </button>
          <button
            className={cn(
              "h-12 rounded-xl border border-border/60 bg-card/65 font-semibold text-foreground",
              "outline-none transition-colors hover:bg-muted/60",
              "focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
            onClick={() => {
              go("google");
            }}
            type="button"
          >
            Continue with Google
          </button>
        </div>
      </div>
    </AutoDsmOnboardingShell>
  );
}

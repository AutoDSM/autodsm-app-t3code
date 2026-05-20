"use client";

import type { JSX } from "react";

import { useNavigate } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";

import { cn } from "~/lib/utils";

import { AutoDsmLogoMark } from "../AutoDsmLogoMark";
import { AutoDsmOnboardingShell } from "./AutoDsmOnboardingShell";

export function AutoDsmOnboardingCreateProject(): JSX.Element {
  const navigate = useNavigate();

  return (
    <AutoDsmOnboardingShell>
      <div className="flex flex-col gap-6">
        <AutoDsmLogoMark className="h-10 w-auto sm:h-11" />
        <button
          className={cn(
            "flex min-h-[72px] w-full items-center justify-center gap-2 rounded-2xl",
            "border border-border/60 bg-card/65 px-4 py-4 text-lg font-bold text-foreground",
            "outline-none transition-colors hover:bg-muted/60",
            "focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          onClick={() => {
            void navigate({ to: "/onboarding/name", replace: true });
          }}
          type="button"
        >
          <PlusIcon aria-hidden className="size-6 shrink-0" strokeWidth={1.75} />
          Create new project
        </button>
      </div>
    </AutoDsmOnboardingShell>
  );
}

"use client";

import type { JSX } from "react";

import { useNavigate } from "@tanstack/react-router";
import { FolderOpenIcon, PlusIcon } from "lucide-react";

import { AutoDsmDesignSystemHistoryList } from "~/components/autodsm/AutoDsmDesignSystemHistoryList";
import { useAutoDsmLaunchActions } from "~/hooks/useAutoDsmLaunchActions";
import { useOpenAutoDsmDesignSystemHistory } from "~/hooks/useOpenAutoDsmDesignSystemHistory";
import { usePrimaryAutoDsmDesignSystemHistory } from "~/hooks/useAutoDsmDesignSystemHistory";
import { cn } from "~/lib/utils";

import { AutoDsmLogoMark } from "../AutoDsmLogoMark";
import { AutoDsmOnboardingShell } from "./AutoDsmOnboardingShell";

export function AutoDsmOnboardingCreateProject(): JSX.Element {
  const navigate = useNavigate();
  const launch = useAutoDsmLaunchActions();
  const history = usePrimaryAutoDsmDesignSystemHistory();
  const { openEntry, isOpening } = useOpenAutoDsmDesignSystemHistory({ completeOnboarding: true });

  return (
    <AutoDsmOnboardingShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <AutoDsmLogoMark className="size-10 shrink-0 sm:size-11" />
          <p className="text-[1.65rem] font-extrabold tracking-tight text-foreground sm:text-[1.75rem]">
            autoDSM
          </p>
        </div>
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
        <AutoDsmDesignSystemHistoryList
          className="mt-1"
          disabled={isOpening}
          entries={history.rows}
          isError={history.isError}
          isLoading={history.isLoading}
          onSelect={(entry) => {
            void openEntry(entry);
          }}
        />
        <button
          className={cn(
            "text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded",
          )}
          disabled={launch.pickDisabled}
          onClick={() => {
            void launch.openLocalProject();
          }}
          type="button"
        >
          <span className="inline-flex items-center justify-center gap-1.5">
            <FolderOpenIcon aria-hidden className="size-3.5 opacity-70" />
            Open existing folder
          </span>
        </button>
      </div>
    </AutoDsmOnboardingShell>
  );
}

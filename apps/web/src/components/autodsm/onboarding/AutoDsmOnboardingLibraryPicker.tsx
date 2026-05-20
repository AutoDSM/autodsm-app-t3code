"use client";

import type { JSX } from "react";
import { useState } from "react";

import { useNavigate } from "@tanstack/react-router";

import { selectedLibraryStarter } from "~/lib/autoDsmOnboarding";
import { AUTO_DSM_LIBRARY_STARTERS, type AutoDsmStarterId } from "~/lib/autoDsmStarterCatalog";
import { cn } from "~/lib/utils";
import { useUiStateStore } from "~/uiStateStore";

import { AutoDsmLogoMark } from "../AutoDsmLogoMark";
import { AutoDsmOnboardingShell } from "./AutoDsmOnboardingShell";
import { LibraryRowIcon } from "./LibraryRowIcon";

export function AutoDsmOnboardingLibraryPicker(): JSX.Element {
  const navigate = useNavigate();
  const patch = useUiStateStore((s) => s.patchAutodsmOnboarding);
  const initialStarter = useUiStateStore((s) => s.autodsmOnboarding.starterId);
  const [selectedId, setSelectedId] = useState<AutoDsmStarterId | null>(
    selectedLibraryStarter(AUTO_DSM_LIBRARY_STARTERS, initialStarter)?.id ??
      AUTO_DSM_LIBRARY_STARTERS[0]?.id ??
      null,
  );

  return (
    <AutoDsmOnboardingShell>
      <div className="flex flex-col gap-6">
        <AutoDsmLogoMark className="h-10 w-auto sm:h-11" />
        <h2 className="text-xl font-semibold text-foreground">Choose a base component library</h2>
        <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/35 p-2">
          {AUTO_DSM_LIBRARY_STARTERS.map((entry) => (
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left outline-none transition-colors",
                selectedId === entry.id
                  ? "bg-primary/10 ring-1 ring-primary/50"
                  : "hover:bg-muted/60",
                "focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
              key={entry.id}
              onClick={() => {
                setSelectedId(entry.id);
              }}
              type="button"
            >
              <LibraryRowIcon starterId={entry.id} />
              <span className="font-semibold text-foreground">{entry.label}</span>
            </button>
          ))}
        </div>
        <button
          className={cn(
            "h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-sm",
            "outline-none transition-colors hover:bg-primary/90",
            "focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
          disabled={!selectedId}
          onClick={() => {
            if (!selectedId) {
              return;
            }
            patch({ starterId: selectedId });
            void navigate({ to: "/onboarding/loading", replace: true });
          }}
          type="button"
        >
          Continue
        </button>
      </div>
    </AutoDsmOnboardingShell>
  );
}

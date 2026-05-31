"use client";

import type { JSX } from "react";
import { useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { LayersIcon, RefreshCwIcon } from "lucide-react";

import type { AutoDsmOnboardingBuildMethod } from "~/lib/autoDsmOnboarding";
import { cn } from "~/lib/utils";
import { useUiStateStore } from "~/uiStateStore";

import { AutoDsmLogoMark } from "../AutoDsmLogoMark";
import { AutoDsmOnboardingShell } from "./AutoDsmOnboardingShell";

export function AutoDsmOnboardingBuildMethod(): JSX.Element {
  const navigate = useNavigate();
  const patch = useUiStateStore((s) => s.patchAutodsmOnboarding);
  const storedMethod = useUiStateStore((s) => s.autodsmOnboarding.buildMethod);
  const [choice, setChoice] = useState<AutoDsmOnboardingBuildMethod | null>(storedMethod);

  return (
    <AutoDsmOnboardingShell>
      <div className="flex flex-col gap-6">
        <AutoDsmLogoMark className="h-10 w-auto sm:h-11" />
        <h2 className="text-xl font-semibold text-foreground">
          How would you like to build your design system?
        </h2>
        <div className="flex flex-col gap-3">
          <MethodCard
            description="Start from Shadcn, MUI, Chakra, or Tailwind"
            icon={<LayersIcon aria-hidden className="size-6 text-foreground" strokeWidth={1.5} />}
            label="Start from a popular design library"
            selected={choice === "library"}
            onSelect={() => {
              setChoice("library");
            }}
          />
          <MethodCard
            description="Empty design system workspace (Modern Starter)"
            icon={
              <RefreshCwIcon aria-hidden className="size-6 text-foreground" strokeWidth={1.5} />
            }
            label="Build from scratch"
            selected={choice === "scratch"}
            onSelect={() => {
              setChoice("scratch");
            }}
          />
        </div>
        <button
          className={cn(
            "h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-sm",
            "outline-none transition-colors hover:bg-primary/90",
            "focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
          disabled={!choice}
          onClick={() => {
            if (!choice) {
              return;
            }
            patch({ buildMethod: choice, starterId: null });
            if (choice === "library") {
              void navigate({ to: "/onboarding/library", replace: true });
              return;
            }
            // Scratch path: auto-set starter and converge on the shared brief page.
            patch({ starterId: "modern-starter" });
            void navigate({ to: "/onboarding/brief", replace: true });
          }}
          type="button"
        >
          Continue
        </button>
      </div>
    </AutoDsmOnboardingShell>
  );
}

function MethodCard(props: {
  readonly label: string;
  readonly description: string;
  readonly icon: JSX.Element;
  readonly selected: boolean;
  readonly onSelect: () => void;
}): JSX.Element {
  const { label, description, icon, selected, onSelect } = props;

  return (
    <button
      className={cn(
        "flex w-full gap-4 rounded-2xl border p-4 text-left outline-none transition-colors",
        selected ? "border-primary bg-primary/10" : "border-border/60 bg-card/65 hover:bg-muted/60",
        "focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      onClick={onSelect}
      type="button"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted/40">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-foreground">{label}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

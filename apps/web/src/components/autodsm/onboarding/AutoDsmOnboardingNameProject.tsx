"use client";

import type { JSX } from "react";
import { useState } from "react";

import { useNavigate } from "@tanstack/react-router";

import { Input } from "~/components/ui/input";
import { normalizeDesignSystemName } from "~/lib/autoDsmOnboarding";
import { cn } from "~/lib/utils";
import { useUiStateStore } from "~/uiStateStore";

import { AutoDsmLogoMark } from "../AutoDsmLogoMark";
import { AutoDsmOnboardingShell } from "./AutoDsmOnboardingShell";

export function AutoDsmOnboardingNameProject(): JSX.Element {
  const navigate = useNavigate();
  const patch = useUiStateStore((s) => s.patchAutodsmOnboarding);
  const storedName = useUiStateStore((s) => s.autodsmOnboarding.designSystemName);
  const [name, setName] = useState(storedName ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const normalized = normalizeDesignSystemName(name);
    if (!normalized) {
      setError("Enter a name between 1 and 120 characters.");
      return;
    }
    setError(null);
    patch({ designSystemName: normalized });
    void navigate({ to: "/onboarding/method", replace: true });
  };

  return (
    <AutoDsmOnboardingShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <AutoDsmLogoMark className="size-10 shrink-0 sm:size-11" />
          <p className="text-[1.65rem] font-extrabold tracking-tight text-foreground sm:text-[1.75rem]">
            autoDSM
          </p>
        </div>
        <h2 className="text-xl font-semibold text-foreground">Name your design system</h2>
        <p className="text-sm text-muted-foreground">
          This is how your workspace will appear in the sidebar and at launch.
        </p>
        <div className="flex flex-col gap-2">
          <Input
            autoFocus
            className="h-12 rounded-xl border-border/60 bg-card/65 text-base"
            placeholder="e.g. Acme Design System"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) {
                setError(null);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submit();
              }
            }}
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
        <button
          className={cn(
            "h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-sm",
            "outline-none transition-colors hover:bg-primary/90",
            "focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          onClick={submit}
          type="button"
        >
          Continue
        </button>
      </div>
    </AutoDsmOnboardingShell>
  );
}

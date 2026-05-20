"use client";

import type { JSX } from "react";

import { AutoDsmWatermark } from "./AutoDsmWatermark";

/** Legacy launch shell — single-DS mode auto-loads to `/home`; this is a minimal fallback. */
export function AutoDsmFigmaLaunchScreen(): JSX.Element {
  return (
    <div className="flex w-full max-w-[480px] flex-col gap-6">
      <AutoDsmWatermark className="size-10 sm:size-11" />
      <p className="text-sm text-muted-foreground">Loading your design system…</p>
    </div>
  );
}

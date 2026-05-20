"use client";

import type { JSX } from "react";

import { AutoDsmWatermark } from "~/components/autodsm/AutoDsmWatermark";

const MAX_RESTARTS_IN_WINDOW = 4;

export interface BackendRestartingOverlayProps {
  readonly attempt: number;
  readonly maxAttempts?: number;
}

/**
 * Non-blocking overlay shown while the desktop backend child is restarting.
 * Keeps the underlying React tree mounted so in-flight RPC state survives reconnects.
 */
export function BackendRestartingOverlay({
  attempt,
  maxAttempts = MAX_RESTARTS_IN_WINDOW,
}: BackendRestartingOverlayProps): JSX.Element {
  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-[2px]"
    >
      <div className="pointer-events-auto flex max-w-sm flex-col items-center gap-3 rounded-lg border bg-card px-6 py-5 shadow-lg">
        <AutoDsmWatermark className="size-12" />
        <p className="text-center text-sm text-foreground">Reconnecting to workspace…</p>
        <p className="text-center text-xs text-muted-foreground">
          Attempt {attempt} of {maxAttempts}
        </p>
      </div>
    </div>
  );
}

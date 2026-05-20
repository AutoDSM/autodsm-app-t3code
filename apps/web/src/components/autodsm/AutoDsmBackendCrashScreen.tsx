"use client";

import type { JSX } from "react";

import { AutoDsmWatermark } from "~/components/autodsm/AutoDsmWatermark";
import { Button } from "~/components/ui/button";
import { isElectron } from "~/env";

export interface AutoDsmBackendCrashScreenProps {
  readonly reason: string;
  readonly attempts: number;
  readonly logDir: string;
}

export function AutoDsmBackendCrashScreen({
  reason,
  attempts,
  logDir,
}: AutoDsmBackendCrashScreenProps): JSX.Element {
  const openLogsFolder = () => {
    const bridge = window.desktopBridge;
    if (!bridge || typeof bridge.openExternal !== "function") {
      return;
    }

    void bridge.openExternal(`file://${logDir}`);
  };

  const restartApp = () => {
    const bridge = window.desktopBridge;
    if (bridge && typeof bridge.restartDesktopBackend === "function") {
      void bridge.restartDesktopBackend();
      return;
    }
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {isElectron ? (
        <div
          aria-hidden
          className="drag-region flex h-[52px] shrink-0 items-center justify-center wco:h-[env(titlebar-area-height)]"
        />
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-4 py-10">
        <AutoDsmWatermark className="size-16 opacity-80" />
        <div className="max-w-md space-y-2 text-center">
          <h1 className="text-lg font-semibold tracking-tight">
            Backend crashed and could not recover
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The local server stopped after {attempts} restart attempt
            {attempts === 1 ? "" : "s"}.
          </p>
          <p className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-left text-xs text-foreground/90">
            {reason}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" size="sm" onClick={restartApp}>
            Restart app
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={openLogsFolder}>
            Open logs folder
          </Button>
        </div>
      </div>
    </div>
  );
}

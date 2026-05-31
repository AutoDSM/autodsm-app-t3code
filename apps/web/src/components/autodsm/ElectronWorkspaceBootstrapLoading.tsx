"use client";

import type { JSX } from "react";

import { AutoDsmWatermark } from "~/components/autodsm/AutoDsmWatermark";
import { Button } from "~/components/ui/button";
import { isElectron } from "~/env";

export interface ElectronWorkspaceBootstrapLoadingProps {
  readonly authPending?: boolean;
  readonly authFailed?: boolean;
  readonly backendRestarting?: boolean;
  readonly backendRestartAttempt?: number;
  readonly backendRestartMaxAttempts?: number;
}

/**
 * Shown on Electron while workspace shell snapshot or auth bootstrap is in flight.
 * Avoids flashing launch tiles before the desktop shell is ready.
 */
export function ElectronWorkspaceBootstrapLoading(
  props: ElectronWorkspaceBootstrapLoadingProps,
): JSX.Element {
  const {
    authPending = false,
    authFailed = false,
    backendRestarting = false,
    backendRestartAttempt = 1,
    backendRestartMaxAttempts = 3,
  } = props;

  const loadingMessage = backendRestarting
    ? `Reconnecting (attempt ${backendRestartAttempt} of ${backendRestartMaxAttempts})…`
    : authPending
      ? "Connecting to workspace…"
      : "Connecting to workspace…";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isElectron ? (
        <div
          aria-hidden
          className="drag-region flex h-[52px] shrink-0 items-center justify-center wco:h-[env(titlebar-area-height)]"
        />
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-muted-foreground">
        {authFailed ? (
          <>
            <p className="max-w-sm text-center text-sm text-foreground">
              Couldn&apos;t connect to this workspace yet. The app will keep retrying, or you can
              reload to try again.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              Reload app
            </Button>
          </>
        ) : (
          <>
            <AutoDsmWatermark className="size-16" />
            <p className="text-sm">{loadingMessage}</p>
          </>
        )}
      </div>
    </div>
  );
}

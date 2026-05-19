"use client";

import type { JSX } from "react";

import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { isElectron } from "~/env";

export interface ElectronWorkspaceBootstrapLoadingProps {
  readonly authPending?: boolean;
  readonly authFailed?: boolean;
}

/**
 * Shown on Electron while workspace shell snapshot or auth bootstrap is in flight.
 * Avoids flashing launch tiles or the browser pairing form before the desktop shell is ready.
 */
export function ElectronWorkspaceBootstrapLoading(
  props: ElectronWorkspaceBootstrapLoadingProps,
): JSX.Element {
  const { authPending = false, authFailed = false } = props;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isElectron ? (
        <div
          aria-hidden
          className="drag-region flex h-[52px] shrink-0 items-center justify-center wco:h-[env(titlebar-area-height)]"
        />
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-10 text-muted-foreground">
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
            <Spinner className="size-8 text-muted-foreground/80" />
            <p className="text-sm">
              {authPending ? "Connecting to workspace…" : "Connecting to workspace…"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

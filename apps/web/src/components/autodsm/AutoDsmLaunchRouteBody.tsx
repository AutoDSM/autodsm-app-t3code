"use client";

import type { JSX } from "react";

import { AutoDsmFigmaLaunchScreen } from "~/components/autodsm/AutoDsmFigmaLaunchScreen";
import { isElectron } from "~/env";

/**
 * AutoDSM launchpad fallback when no design system is on disk yet.
 *
 * @param embedded When true, skips the Electron titlebar drag strip (use inside layouts that already provide window chrome).
 */
export function AutoDsmLaunchRouteBody(props?: { readonly embedded?: boolean }): JSX.Element {
  const embedded = props?.embedded ?? false;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isElectron && !embedded ? (
        <div
          aria-hidden
          className="drag-region flex h-[52px] shrink-0 items-center justify-center wco:h-[env(titlebar-area-height)]"
        />
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <AutoDsmFigmaLaunchScreen />
      </div>
    </div>
  );
}

"use client";

import type { JSX } from "react";

import { AutoDsmLaunchRouteBody } from "~/components/autodsm/AutoDsmLaunchRouteBody";
import { SidebarNavInsetPage } from "~/components/SidebarNavInsetPage";
import { isElectron } from "~/env";

/**
 * Launch surface for chat routes that keep the thread sidebar: dark inset header + AutoDSM tiles.
 * Uses an embedded launch body so Electron window chrome is not duplicated under the inset header.
 */
export function ChatLaunchEmptyState(): JSX.Element {
  return (
    <SidebarNavInsetPage navLabel="Home" variant="autoDsmLaunch" electronTitlebarDrag={isElectron}>
      <AutoDsmLaunchRouteBody embedded />
    </SidebarNavInsetPage>
  );
}

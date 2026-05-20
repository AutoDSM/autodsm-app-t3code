"use client";

import type { JSX } from "react";

import { AutoDsmLaunchRouteBody } from "~/components/autodsm/AutoDsmLaunchRouteBody";
import { AutoDsmOnboardingCreateProject } from "~/components/autodsm/onboarding/AutoDsmOnboardingCreateProject";
import { SidebarNavInsetPage } from "~/components/SidebarNavInsetPage";
import { isElectron } from "~/env";
import { useAutoDsmSingleDesignSystemMode } from "~/hooks/useAutoDsmWorkspaceBootstrap";
import { shouldShowAutoDsmProjectPicker } from "~/lib/projectIntake/closeActiveWorkspaceProject";
import { useUiStateStore } from "~/uiStateStore";

/**
 * Launch surface for chat routes that keep the thread sidebar: dark inset header + AutoDSM tiles.
 */
export function ChatLaunchEmptyState(): JSX.Element {
  const onboardingCompleted = useUiStateStore((state) => state.autodsmOnboarding.completed);
  const { hasDesignSystemOnDisk } = useAutoDsmSingleDesignSystemMode();
  const showProjectPicker = shouldShowAutoDsmProjectPicker({
    onboardingCompleted,
    hasDesignSystemOnDisk,
  });

  return (
    <SidebarNavInsetPage navLabel="Home" variant="autoDsmLaunch" electronTitlebarDrag={isElectron}>
      {showProjectPicker ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
          <AutoDsmOnboardingCreateProject />
        </div>
      ) : (
        <AutoDsmLaunchRouteBody embedded />
      )}
    </SidebarNavInsetPage>
  );
}

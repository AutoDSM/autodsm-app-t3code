import { createFileRoute, redirect } from "@tanstack/react-router";
import { LinkIcon, PlusIcon } from "lucide-react";

import { ChatLaunchEmptyState } from "~/components/autodsm/ChatLaunchEmptyState";
import { ElectronAuthenticatedChatLanding } from "~/components/autodsm/ElectronAuthenticatedChatLanding";
import { ElectronWorkspaceBootstrapLoading } from "~/components/autodsm/ElectronWorkspaceBootstrapLoading";
import { resolveChatIndexOnboarding } from "~/lib/autoDsmOnboarding";
import { shouldShowAutoDsmProjectPicker } from "~/lib/projectIntake/closeActiveWorkspaceProject";
import {
  fetchAutoDsmDesignSystemOnDisk,
  resolveOwnerSubjectFromSupabase,
} from "~/lib/autoDsmDesignSystemPresence";
import { Button } from "../components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "../components/ui/empty";
import { SidebarInset, SidebarTrigger } from "../components/ui/sidebar";
import { isElectron } from "../env";
import { useSavedEnvironmentRegistryStore } from "../environments/runtime";
import { APP_DISPLAY_NAME } from "~/branding";
import { useUiStateStore } from "~/uiStateStore";

function ChatIndexRouteView() {
  const { authGateState } = Route.useRouteContext();
  const savedEnvironmentCount = useSavedEnvironmentRegistryStore(
    (state) => Object.keys(state.byId).length,
  );

  if (authGateState.status === "hosted-static" && savedEnvironmentCount === 0) {
    return <HostedStaticOnboardingState />;
  }

  if (isElectron) {
    if (authGateState.status === "requires-auth") {
      return <ElectronWorkspaceBootstrapLoading authFailed />;
    }
    if (authGateState.status === "authenticated") {
      return <ElectronAuthenticatedChatLanding />;
    }
    return <ElectronWorkspaceBootstrapLoading authPending />;
  }

  return <ChatLaunchEmptyState />;
}

export const Route = createFileRoute("/_chat/")({
  beforeLoad: async ({ context }) => {
    if (!isElectron) {
      return;
    }
    if (context.authGateState.status !== "authenticated") {
      return;
    }
    const onboarding = useUiStateStore.getState().autodsmOnboarding;
    const hasActiveWorkspaceProject =
      useUiStateStore.getState().autoDsmWorkspaceProjectRef !== null;
    const ownerSubject = await resolveOwnerSubjectFromSupabase();
    const { hasMatch: hasDesignSystemOnDisk } = await fetchAutoDsmDesignSystemOnDisk({
      ownerSubject,
    });
    const resolution = resolveChatIndexOnboarding(onboarding, true, true, {
      hasActiveWorkspaceProject,
      hasDesignSystemOnDisk,
    });
    if (resolution?.kind === "onboarding") {
      throw redirect({ to: resolution.to, replace: true });
    }
    if (resolution?.kind === "home") {
      throw redirect({ to: resolution.to, replace: true });
    }
    // Completed onboarding but no open workspace and no design system on disk:
    // send the user to the standalone create/open-project page rather than
    // rendering the picker inline inside the product chrome.
    if (
      !hasActiveWorkspaceProject &&
      shouldShowAutoDsmProjectPicker({
        onboardingCompleted: onboarding.completed,
        hasDesignSystemOnDisk,
      })
    ) {
      throw redirect({ to: "/onboarding/create", replace: true });
    }
  },
  component: ChatIndexRouteView,
});

function HostedStaticOnboardingState() {
  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-background">
        <header className="border-b border-border px-3 py-2 sm:px-5 sm:py-3">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="size-7 shrink-0 md:hidden" />
            <span className="text-sm font-medium text-foreground md:text-muted-foreground/60">
              {APP_DISPLAY_NAME}
            </span>
          </div>
        </header>

        <Empty className="flex-1">
          <div className="w-full max-w-xl rounded-3xl border border-border/55 bg-card/20 px-8 py-12 shadow-sm/5">
            <EmptyHeader className="max-w-none">
              <div className="mx-auto mb-5 flex size-11 items-center justify-center rounded-xl border border-border/70 bg-background/70 text-muted-foreground">
                <LinkIcon className="size-5" />
              </div>
              <EmptyTitle className="text-foreground text-xl">
                Connect an environment to get started
              </EmptyTitle>
              <EmptyDescription className="mt-2 text-sm leading-relaxed text-muted-foreground/78">
                Open a pairing link from your AutoDSM desktop app or add a reachable backend
                manually. Your saved environments stay in this browser.
              </EmptyDescription>
              <div className="mt-6 flex justify-center">
                <Button render={<a href="/settings/connections" />} size="sm">
                  <PlusIcon className="size-4" />
                  Add environment
                </Button>
              </div>
            </EmptyHeader>
          </div>
        </Empty>
      </div>
    </SidebarInset>
  );
}

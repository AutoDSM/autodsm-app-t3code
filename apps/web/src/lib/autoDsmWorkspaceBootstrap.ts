import type {
  AutoDsmWorkspaceHistoryEntry,
  EnvironmentApi,
  EnvironmentId,
  ScopedProjectRef,
  SidebarThreadSortOrder,
  ThreadId,
} from "@t3tools/contracts";

import type { DraftThreadEnvMode } from "~/composerDraftStore";
import { fetchAutoDsmComponentAgentLaunch } from "~/lib/autoDsmComponentAgentLaunch";
import {
  getPrimaryAutoDsmDesignSystemEntry,
  hasAutoDsmDesignSystem,
} from "~/lib/autoDsmDesignSystemPresence";
import { openAutoDsmDesignSystemFromHistory } from "~/lib/openAutoDsmDesignSystemFromHistory";
import type { Project, SidebarThreadSummary } from "~/types";

export interface AutoDsmWorkspaceBootstrapArgs {
  readonly environmentId: EnvironmentId;
  readonly api: EnvironmentApi;
  readonly historyEntries: readonly AutoDsmWorkspaceHistoryEntry[];
  readonly projects: readonly Project[];
  readonly threads: readonly SidebarThreadSummary[];
  readonly sidebarThreadSortOrder: SidebarThreadSortOrder;
  readonly defaultThreadEnvMode: DraftThreadEnvMode;
  readonly hasActiveWorkspaceProject: boolean;
  readonly onboardingCompleted: boolean;
  readonly handleNewThread: (
    projectRef: ScopedProjectRef,
    options?: { envMode?: DraftThreadEnvMode },
  ) => Promise<void>;
  readonly setWorkspaceRef: (ref: ScopedProjectRef) => void;
  readonly mergeAgentPaths: (paths: Record<string, string>) => void;
  readonly completeOnboarding: () => void;
  readonly navigateToComponentAgent: (input: {
    readonly environmentId: EnvironmentId;
    readonly threadId: ThreadId;
    readonly componentPath: string;
  }) => Promise<void>;
  readonly navigateHome: () => Promise<void>;
  readonly onError: (title: string, description: string) => void;
}

export interface AutoDsmWorkspaceBootstrapResult {
  readonly didBootstrap: boolean;
  readonly navigatedHome: boolean;
  readonly projectRef: ScopedProjectRef | null;
}

export async function bootstrapAutoDsmWorkspaceFromDisk(
  args: AutoDsmWorkspaceBootstrapArgs,
): Promise<AutoDsmWorkspaceBootstrapResult> {
  if (!hasAutoDsmDesignSystem(args.historyEntries)) {
    return { didBootstrap: false, navigatedHome: false, projectRef: null };
  }

  const entry = getPrimaryAutoDsmDesignSystemEntry(args.historyEntries);
  if (!entry) {
    return { didBootstrap: false, navigatedHome: false, projectRef: null };
  }

  if (!args.onboardingCompleted) {
    args.completeOnboarding();
  }

  let projectRef: ScopedProjectRef | null = null;
  if (!args.hasActiveWorkspaceProject) {
    projectRef =
      (await openAutoDsmDesignSystemFromHistory({
        entry,
        environmentId: args.environmentId,
        api: args.api,
        projects: args.projects,
        threads: args.threads,
        sidebarThreadSortOrder: args.sidebarThreadSortOrder,
        navigate: async (opts) => {
          if (opts.to === "/home") {
            await args.navigateHome();
          }
        },
        handleNewThread: args.handleNewThread,
        defaultThreadEnvMode: args.defaultThreadEnvMode,
        onError: args.onError,
      })) ?? null;

    if (projectRef) {
      args.setWorkspaceRef(projectRef);
    }

    const launch = await fetchAutoDsmComponentAgentLaunch(
      args.api,
      entry.systemPath,
      args.environmentId,
    );
    args.mergeAgentPaths(launch.paths);

    if (launch.launchTarget) {
      await args.navigateToComponentAgent({
        environmentId: args.environmentId,
        threadId: launch.launchTarget.threadId,
        componentPath: launch.launchTarget.componentPath,
      });
    } else {
      await args.navigateHome();
    }
  }

  return {
    didBootstrap: true,
    navigatedHome: !args.hasActiveWorkspaceProject,
    projectRef,
  };
}

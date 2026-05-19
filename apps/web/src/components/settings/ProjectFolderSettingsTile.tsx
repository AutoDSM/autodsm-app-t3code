"use client";

import { scopeProjectRef } from "@t3tools/client-runtime";
import type { AutoDsmProjectProfile } from "@t3tools/contracts";
import { DEFAULT_UNIFIED_SETTINGS } from "@t3tools/contracts/settings";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { JSX } from "react";
import { useCallback, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { DraftInput } from "~/components/ui/draft-input";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { stackedThreadToast, toastManager } from "~/components/ui/toast";
import { readEnvironmentApi } from "~/environmentApi";
import {
  useSavedEnvironmentRegistryStore,
  useSavedEnvironmentRuntimeStore,
} from "~/environments/runtime";
import { useAutoDsmLaunchActions } from "~/hooks/useAutoDsmLaunchActions";
import { useSettings, useUpdateSettings } from "~/hooks/useSettings";
import {
  formatCommaList,
  formatPackageManagerLabel,
  formatProjectProfileStatus,
  pickDisplayPackageVersions,
} from "~/lib/projectFolderSettingsFormat";
import { disconnectProjectFromWorkspace } from "~/lib/projectIntake/disconnectProject";
import { readLocalApi } from "~/localApi";
import {
  selectProjectsAcrossEnvironments,
  selectSidebarThreadsForProjectRefs,
  useStore,
} from "~/store";
import type { Project } from "~/types";
import { useUiStateStore } from "~/uiStateStore";
import { SettingResetButton, SettingsRow, SettingsSection } from "./settingsLayout";

export function ProjectFolderTechStackDetails(props: {
  readonly profile: AutoDsmProjectProfile;
}): JSX.Element {
  const { profile } = props;
  const pkgVersions = pickDisplayPackageVersions(profile.packageVersions);

  return (
    <div className="space-y-4 px-4 pb-4 pt-0 sm:px-5" data-testid="project-folder-tech-stack">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Frameworks
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {profile.frameworks.length > 0 ? (
            profile.frameworks.map((framework) => (
              <Badge key={framework} variant="secondary" size="sm" className="font-normal">
                {framework}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">None detected</span>
          )}
        </div>
      </div>

      <dl className="grid gap-3 text-xs sm:grid-cols-2">
        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
          <dt className="text-muted-foreground">Package manager</dt>
          <dd className="mt-1 font-medium text-foreground">
            {formatPackageManagerLabel(profile.packageManager)}
          </dd>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
          <dt className="text-muted-foreground">Profile status</dt>
          <dd className="mt-1 font-medium text-foreground">
            {formatProjectProfileStatus(profile.status)}
          </dd>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2 sm:col-span-2">
          <dt className="text-muted-foreground">TypeScript configs</dt>
          <dd className="mt-1 font-mono text-[11px] text-foreground/90">
            {formatCommaList(profile.typescriptProjectHints, "None found")}
          </dd>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2 sm:col-span-2">
          <dt className="text-muted-foreground">Tailwind configs</dt>
          <dd className="mt-1 font-mono text-[11px] text-foreground/90">
            {formatCommaList(profile.tailwindHintPaths, "None found")}
          </dd>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2 sm:col-span-2">
          <dt className="text-muted-foreground">Component roots</dt>
          <dd className="mt-1 font-mono text-[11px] text-foreground/90">
            {formatCommaList(profile.componentRoots, "None")}
          </dd>
        </div>
      </dl>

      {pkgVersions.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Key package versions
          </p>
          <ul className="mt-2 space-y-1 font-mono text-[11px] text-foreground/85">
            {pkgVersions.map(({ name, version }) => (
              <li key={name}>
                <span className="text-muted-foreground">{name}</span>{" "}
                <span className="text-foreground">{version}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function ProjectFolderSettingsTile(): JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const autoDsmWorkspaceProjectRef = useUiStateStore((s) => s.autoDsmWorkspaceProjectRef);
  const setAutoDsmWorkspaceProjectRef = useUiStateStore((s) => s.setAutoDsmWorkspaceProjectRef);
  const projects = useStore(useShallow(selectProjectsAcrossEnvironments));
  const savedEnvironmentRegistry = useSavedEnvironmentRegistryStore((s) => s.byId);
  const savedEnvironmentRuntimeById = useSavedEnvironmentRuntimeStore((s) => s.byId);

  const activeWorkspaceProject = useMemo((): Project | null => {
    if (!autoDsmWorkspaceProjectRef) {
      return null;
    }
    return (
      projects.find(
        (project) =>
          project.environmentId === autoDsmWorkspaceProjectRef.environmentId &&
          project.id === autoDsmWorkspaceProjectRef.projectId,
      ) ?? null
    );
  }, [autoDsmWorkspaceProjectRef, projects]);

  const workspaceProjectRef = useMemo(
    () =>
      activeWorkspaceProject
        ? scopeProjectRef(activeWorkspaceProject.environmentId, activeWorkspaceProject.id)
        : null,
    [activeWorkspaceProject],
  );

  const activeThreads = useStore(
    useShallow((state) =>
      workspaceProjectRef
        ? selectSidebarThreadsForProjectRefs(state, [workspaceProjectRef]).filter(
            (thread) => thread.archivedAt === null,
          )
        : [],
    ),
  );

  const environmentApiAvailable =
    activeWorkspaceProject !== null &&
    readEnvironmentApi(activeWorkspaceProject.environmentId) !== undefined;

  const environmentLabel =
    activeWorkspaceProject !== null
      ? (savedEnvironmentRuntimeById[activeWorkspaceProject.environmentId]?.descriptor?.label ??
        savedEnvironmentRegistry[activeWorkspaceProject.environmentId]?.label ??
        null)
      : null;

  const profileQuery = useQuery({
    queryKey: [
      "project-folder-profile",
      activeWorkspaceProject?.environmentId ?? null,
      activeWorkspaceProject?.cwd ?? null,
    ],
    enabled: environmentApiAvailable && activeWorkspaceProject !== null,
    queryFn: async (): Promise<AutoDsmProjectProfile> => {
      const api = readEnvironmentApi(activeWorkspaceProject!.environmentId);
      if (!api) {
        throw new Error("Environment unavailable.");
      }
      return api.autodsm.getProjectProfile({ cwd: activeWorkspaceProject!.cwd });
    },
  });

  const { openLocalProject, pickDisabled, isPickingFolder } = useAutoDsmLaunchActions();
  const settings = useSettings();
  const { updateSettings } = useUpdateSettings();
  const [disconnectPending, setDisconnectPending] = useState(false);

  const invalidateProjectQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["autodsm"] });
    void queryClient.invalidateQueries({ queryKey: ["autodsm-home-index-summary"] });
    void queryClient.invalidateQueries({ queryKey: ["project-folder-profile"] });
  }, [queryClient]);

  const handleDisconnect = useCallback(async () => {
    if (!activeWorkspaceProject || !autoDsmWorkspaceProjectRef) {
      return;
    }

    const confirmMessageSimple = [
      `Disconnect folder "${activeWorkspaceProject.name}"?`,
      `Path: ${activeWorkspaceProject.cwd}`,
      ...(environmentLabel ? [`Environment: ${environmentLabel}`] : []),
      "This removes the project entry from T3 Code. Local files are not deleted.",
      "You can open another folder from the launch screen afterward.",
    ].join("\n");

    const confirmMessageForce = [
      `Disconnect "${activeWorkspaceProject.name}" and delete ${activeThreads.length} active thread${
        activeThreads.length === 1 ? "" : "s"
      }?`,
      `Path: ${activeWorkspaceProject.cwd}`,
      ...(environmentLabel ? [`Environment: ${environmentLabel}`] : []),
      "This permanently clears conversation history for those threads.",
      "This removes only this project entry from T3 Code.",
      "This action cannot be undone.",
    ].join("\n");

    const localApi = readLocalApi();
    const confirmed =
      activeThreads.length > 0
        ? localApi
          ? await localApi.dialogs.confirm(confirmMessageForce)
          : window.confirm(confirmMessageForce)
        : localApi
          ? await localApi.dialogs.confirm(confirmMessageSimple)
          : window.confirm(confirmMessageSimple);

    if (!confirmed) {
      return;
    }

    setDisconnectPending(true);
    try {
      await disconnectProjectFromWorkspace({
        environmentId: activeWorkspaceProject.environmentId,
        projectId: activeWorkspaceProject.id,
        ...(activeThreads.length > 0 ? { force: true } : {}),
      });
      setAutoDsmWorkspaceProjectRef(null);
      invalidateProjectQueries();
      toastManager.add(
        stackedThreadToast({
          type: "success",
          title: "Workspace disconnected",
          description: `"${activeWorkspaceProject.name}" was removed. Open a folder from the launch screen to continue.`,
        }),
      );
      void navigate({ to: "/", replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not disconnect folder.";
      toastManager.add(
        stackedThreadToast({ type: "error", title: "Disconnect failed", description: message }),
      );
    } finally {
      setDisconnectPending(false);
    }
  }, [
    activeThreads.length,
    activeWorkspaceProject,
    autoDsmWorkspaceProjectRef,
    environmentLabel,
    invalidateProjectQueries,
    navigate,
    setAutoDsmWorkspaceProjectRef,
  ]);

  return (
    <SettingsSection title="Project folder" data-testid="project-folder-settings-tile">
      {activeWorkspaceProject === null ? (
        <SettingsRow
          title="No workspace folder selected"
          description="Open or clone a folder from the AutoDSM launch screen (or add a project via ⌘K) to set the workspace AutoDSM uses for components, previews, and stack detection. Disconnect returns you to the launch screen."
          control={
            <Button
              size="xs"
              variant="default"
              disabled={pickDisabled || isPickingFolder}
              onClick={() => void openLocalProject()}
            >
              Connect folder
            </Button>
          }
        />
      ) : (
        <SettingsRow
          title={activeWorkspaceProject.name}
          description={
            <span className="block space-y-1">
              <span className="block break-all font-mono text-[11px] text-muted-foreground">
                {activeWorkspaceProject.cwd}
              </span>
              {environmentLabel ? (
                <span className="block text-[11px] text-muted-foreground">
                  Environment: {environmentLabel}
                </span>
              ) : (
                <span className="block text-[11px] text-muted-foreground">
                  Environment ID:{" "}
                  <span className="font-mono">{activeWorkspaceProject.environmentId}</span>
                </span>
              )}
            </span>
          }
          status={
            <span className="text-[11px] text-muted-foreground">
              {activeThreads.length} active thread{activeThreads.length === 1 ? "" : "s"}
              {activeThreads.length > 0
                ? " · disconnect will clear chat history for those threads"
                : null}
            </span>
          }
          control={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                size="xs"
                variant="outline"
                disabled={pickDisabled || isPickingFolder}
                onClick={() => void openLocalProject()}
              >
                Reconnect folder
              </Button>
              <Button
                size="xs"
                variant="destructive"
                disabled={disconnectPending || !environmentApiAvailable}
                onClick={() => void handleDisconnect()}
              >
                Disconnect folder
              </Button>
            </div>
          }
        />
      )}

      {activeWorkspaceProject !== null ? (
        <SettingsRow
          title="Detected stack"
          description="Signals read from package.json and workspace files on the connected environment."
        >
          {profileQuery.isPending ? (
            <p className="px-4 pb-4 text-xs text-muted-foreground sm:px-5">Loading profile…</p>
          ) : null}
          {profileQuery.isError ? (
            <p className="px-4 pb-4 text-xs text-destructive sm:px-5">
              Could not read project profile. Reconnect to the environment or open the folder again.
            </p>
          ) : null}
          {profileQuery.data ? <ProjectFolderTechStackDetails profile={profileQuery.data} /> : null}
        </SettingsRow>
      ) : null}

      <SettingsRow
        title="Add project starts in"
        description='Leave empty to use "~/" when the Add Project browser opens.'
        resetAction={
          settings.addProjectBaseDirectory !== DEFAULT_UNIFIED_SETTINGS.addProjectBaseDirectory ? (
            <SettingResetButton
              label="add project base directory"
              onClick={() =>
                updateSettings({
                  addProjectBaseDirectory: DEFAULT_UNIFIED_SETTINGS.addProjectBaseDirectory,
                })
              }
            />
          ) : null
        }
        control={
          <DraftInput
            className="w-full sm:w-72"
            value={settings.addProjectBaseDirectory}
            onCommit={(next) => updateSettings({ addProjectBaseDirectory: next })}
            placeholder="~/"
            spellCheck={false}
            aria-label="Add project base directory"
          />
        }
      />
    </SettingsSection>
  );
}

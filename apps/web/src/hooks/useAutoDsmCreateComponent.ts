"use client";

import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime";
import type { ModelSelection, ProviderDriverKind } from "@t3tools/contracts";
import type { UnifiedSettings } from "@t3tools/contracts/settings";
import { truncate } from "@t3tools/shared/String";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useShallow } from "zustand/react/shallow";

import { waitForStartedServerThread } from "~/components/ChatView.logic";
import { getComposerProviderState } from "~/components/chat/composerProviderState";
import { stackedThreadToast, toastManager } from "~/components/ui/toast";
import { readEnvironmentApi } from "~/environmentApi";
import { useAutoDsmWorkspace } from "~/hooks/useAutoDsmWorkspace";
import { useSettings } from "~/hooks/useSettings";
import { useSrcComponentsCatalog } from "~/hooks/useSrcComponentsCatalog";
import { inferCreateComponentMetadata } from "~/lib/autoDsmCreateComponentRequest";
import { formatCreateComponentOutgoingPrompt } from "~/lib/autoDsmCreateComponentPrompt";
import { formatUnknownErrorMessage } from "~/lib/formatUnknownErrorMessage";
import { DEFAULT_INTERACTION_MODE, DEFAULT_RUNTIME_MODE } from "~/types";
import { newCommandId, newMessageId, newThreadId } from "~/lib/utils";
import { resolveAppModelSelectionState } from "~/modelSelection";
import { deriveProviderInstanceEntries } from "~/providerInstances";
import { useServerProviders } from "~/rpc/serverState";
import { selectProjectsAcrossEnvironments, useStore } from "~/store";
import { useUiStateStore } from "~/uiStateStore";

export interface UseAutoDsmCreateComponentResult {
  readonly isSubmitting: boolean;
  readonly submitCreateComponent: (prompt: string) => Promise<void>;
}

function resolveModelSelectionForCreate(
  projectDefault: ModelSelection | null | undefined,
  settings: UnifiedSettings,
  providers: ReturnType<typeof useServerProviders>,
): ModelSelection {
  if (projectDefault?.instanceId && projectDefault.model) {
    return projectDefault;
  }
  return resolveAppModelSelectionState(settings, providers);
}

export function useAutoDsmCreateComponent(): UseAutoDsmCreateComponentResult {
  const navigate = useNavigate();
  const { cwd, environmentId, projectId } = useAutoDsmWorkspace();
  const mergePaths = useUiStateStore((state) => state.mergeAutoDsmThreadComponentPaths);
  const settings = useSettings();
  const providers = useServerProviders();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const project = useStore(
    useShallow((state) => {
      if (!environmentId || !projectId) {
        return null;
      }
      return (
        selectProjectsAcrossEnvironments(state).find(
          (candidate) => candidate.environmentId === environmentId && candidate.id === projectId,
        ) ?? null
      );
    }),
  );

  const { catalog } = useSrcComponentsCatalog({
    environmentId,
    cwd,
    enabled: Boolean(cwd && environmentId),
  });

  const providerInstanceEntries = useMemo(
    () => deriveProviderInstanceEntries(providers),
    [providers],
  );

  const submitCreateComponent = useCallback(
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      if (!prompt || isSubmitting) {
        return;
      }
      if (!environmentId || !projectId || !cwd || !project) {
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: "Workspace unavailable",
            description: "Open a project from Home before creating a component.",
          }),
        );
        return;
      }

      const api = readEnvironmentApi(environmentId);
      if (!api) {
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: "Environment unavailable",
            description: "Could not connect to the workspace environment.",
          }),
        );
        return;
      }

      const metadata = inferCreateComponentMetadata(prompt, catalog.paths);
      const modelSelection = resolveModelSelectionForCreate(
        project.defaultModelSelection,
        settings,
        providers,
      );
      const instanceEntry = providerInstanceEntries.find(
        (entry) => entry.instanceId === modelSelection.instanceId,
      );
      const selectedProvider: ProviderDriverKind =
        instanceEntry?.driverKind ??
        providerInstanceEntries[0]?.driverKind ??
        ("codex" as ProviderDriverKind);
      const selectedModel = modelSelection.model;
      const selectedModels = instanceEntry?.models ?? [];
      const composerState = getComposerProviderState({
        provider: selectedProvider,
        model: selectedModel,
        models: selectedModels,
        prompt,
        modelOptions: modelSelection.options,
      });

      const outgoingPrompt = formatCreateComponentOutgoingPrompt({
        provider: selectedProvider,
        model: selectedModel,
        models: selectedModels,
        effort: composerState.promptEffort,
        userPrompt: prompt,
        componentPath: metadata.componentPath,
      });

      const createdAt = new Date().toISOString();
      const nextThreadId = newThreadId();
      const nextThreadTitle = truncate(metadata.title);
      const threadRef = scopeThreadRef(environmentId, nextThreadId);
      const threadKey = scopedThreadKey(threadRef);

      setIsSubmitting(true);
      let turnStarted = false;

      try {
        await api.orchestration.dispatchCommand({
          type: "thread.create",
          commandId: newCommandId(),
          threadId: nextThreadId,
          projectId: project.id,
          title: nextThreadTitle,
          modelSelection,
          runtimeMode: DEFAULT_RUNTIME_MODE,
          interactionMode: DEFAULT_INTERACTION_MODE,
          branch: null,
          worktreePath: cwd,
          createdAt,
        });

        await api.autodsm.registerComponentAgent({
          cwd,
          threadId: nextThreadId,
          title: nextThreadTitle,
          componentPath: metadata.componentPath,
          source: "user",
          status: "creating",
        });

        mergePaths({
          [threadKey]: metadata.componentPath,
        });

        await api.orchestration.dispatchCommand({
          type: "thread.turn.start",
          commandId: newCommandId(),
          threadId: nextThreadId,
          message: {
            messageId: newMessageId(),
            role: "user",
            text: outgoingPrompt,
            attachments: [],
          },
          modelSelection,
          titleSeed: nextThreadTitle,
          runtimeMode: DEFAULT_RUNTIME_MODE,
          interactionMode: DEFAULT_INTERACTION_MODE,
          createdAt,
        });
        turnStarted = true;

        await waitForStartedServerThread(threadRef);

        await navigate({
          to: "/$environmentId/$threadId",
          params: {
            environmentId,
            threadId: nextThreadId,
          },
          search: {
            componentPath: metadata.componentPath,
          },
        });
      } catch (error) {
        const message = formatUnknownErrorMessage(error);
        if (turnStarted) {
          toastManager.add(
            stackedThreadToast({
              type: "warning",
              title: "Component thread started with errors",
              description: message,
            }),
          );
          await navigate({
            to: "/$environmentId/$threadId",
            params: {
              environmentId,
              threadId: nextThreadId,
            },
            search: {
              componentPath: metadata.componentPath,
            },
          });
        } else {
          toastManager.add(
            stackedThreadToast({
              type: "error",
              title: "Could not create component",
              description: message,
            }),
          );
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      catalog.paths,
      cwd,
      environmentId,
      isSubmitting,
      mergePaths,
      navigate,
      project,
      projectId,
      providerInstanceEntries,
      providers,
      settings,
    ],
  );

  return {
    isSubmitting,
    submitCreateComponent,
  };
}

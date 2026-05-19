"use client";

import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";

import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime";
import { useNavigate } from "@tanstack/react-router";

import { stackedThreadToast, toastManager } from "~/components/ui/toast";
import { readEnvironmentApi } from "~/environmentApi";
import { usePrimaryEnvironmentId } from "~/environments/primary";
import { loadingLabelForStarter } from "~/lib/autoDsmOnboarding";
import {
  createWorkspaceInflightKey,
  persistCreateWorkspaceRequestId,
  readPersistedCreateWorkspaceRequestId,
  runCreateWorkspaceOnce,
} from "~/lib/autoDsmCreateWorkspaceRequest";
import { formatUnknownErrorMessage } from "~/lib/formatUnknownErrorMessage";
import { normalizeSidebarComponentCatalogPath } from "~/lib/srcComponentsWorkspacePaths";
import { cn } from "~/lib/utils";
import { useUiStateStore } from "~/uiStateStore";

import { AutoDsmLogoMark } from "../AutoDsmLogoMark";
import { AutoDsmOnboardingShell } from "./AutoDsmOnboardingShell";

const STAGES = [
  "Copying template",
  "Installing packages",
  "Indexing components",
  "Preparing preview",
] as const;

const STAGE_ADVANCE_MS = 1200;

export function AutoDsmOnboardingLoading(): JSX.Element {
  const navigate = useNavigate();
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const complete = useUiStateStore((s) => s.completeAutodsmOnboarding);
  const mergePaths = useUiStateStore((s) => s.mergeAutoDsmThreadComponentPaths);
  const setWorkspaceRef = useUiStateStore((s) => s.setAutoDsmWorkspaceProjectRef);
  const starterId = useUiStateStore((s) => s.autodsmOnboarding.starterId);
  const designSystemName = useUiStateStore((s) => s.autodsmOnboarding.designSystemName);
  const onboardingCompleted = useUiStateStore((s) => s.autodsmOnboarding.completed);
  const workspaceProjectRef = useUiStateStore((s) => s.autoDsmWorkspaceProjectRef);
  const [stageIndex, setStageIndex] = useState(0);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const runGenerationRef = useRef(0);
  const requestIdRef = useRef<string | null>(null);
  const workspaceCreateCompletedRef = useRef(false);

  useEffect(() => {
    if (!starterId) {
      void navigate({ to: "/onboarding/method", replace: true });
      return;
    }
    if (!primaryEnvironmentId) {
      return;
    }

    if (onboardingCompleted && workspaceProjectRef !== null) {
      void navigate({ to: "/home", replace: true });
      return;
    }

    if (workspaceCreateCompletedRef.current) {
      return;
    }

    const runGeneration = ++runGenerationRef.current;
    let cancelled = false;
    const stageTimer = window.setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, STAGES.length - 2));
    }, STAGE_ADVANCE_MS);

    const displayName = designSystemName?.trim() || undefined;
    if (requestIdRef.current === null) {
      requestIdRef.current =
        readPersistedCreateWorkspaceRequestId(starterId, primaryEnvironmentId, displayName) ??
        crypto.randomUUID();
      persistCreateWorkspaceRequestId(
        starterId,
        primaryEnvironmentId,
        requestIdRef.current,
        displayName,
      );
    }
    const requestId = requestIdRef.current;
    const inflightKey = createWorkspaceInflightKey(starterId, primaryEnvironmentId, displayName);

    void (async () => {
      const api = readEnvironmentApi(primaryEnvironmentId);
      if (!api) {
        if (!cancelled && runGeneration === runGenerationRef.current) {
          setFatalError("Connect to your workspace environment, then try again.");
          toastManager.add(
            stackedThreadToast({
              type: "error",
              title: "Environment unavailable",
              description: "Could not open an API for the primary environment.",
            }),
          );
        }
        return;
      }

      try {
        const result = await runCreateWorkspaceOnce(inflightKey, () =>
          api.autodsm.createWorkspace({
            starterId,
            environmentId: primaryEnvironmentId,
            requestId,
            ...(displayName ? { displayName } : {}),
          }),
        );
        if (cancelled || runGeneration !== runGenerationRef.current) {
          return;
        }

        window.clearInterval(stageTimer);
        setStageIndex(STAGES.length - 1);

        const paths: Record<string, string> = {};
        for (const row of result.threads) {
          const ref = scopeThreadRef(primaryEnvironmentId, row.threadId);
          paths[scopedThreadKey(ref)] = normalizeSidebarComponentCatalogPath(row.componentPath);
        }
        mergePaths(paths);
        setWorkspaceRef({
          environmentId: primaryEnvironmentId,
          projectId: result.projectId,
        });
        complete();
        workspaceCreateCompletedRef.current = true;
        const firstAgent = result.threads[0];
        if (firstAgent) {
          void navigate({
            to: "/$environmentId/$threadId",
            params: {
              environmentId: primaryEnvironmentId,
              threadId: firstAgent.threadId,
            },
            search: {
              componentPath: normalizeSidebarComponentCatalogPath(firstAgent.componentPath),
            },
            replace: true,
          });
        } else {
          void navigate({ to: "/home", replace: true });
        }
      } catch (error) {
        window.clearInterval(stageTimer);
        if (cancelled || runGeneration !== runGenerationRef.current) {
          return;
        }
        const message = formatUnknownErrorMessage(error);
        setFatalError(message);
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: "Could not create workspace",
            description: message,
          }),
        );
      }
    })();

    return () => {
      cancelled = true;
      window.clearInterval(stageTimer);
    };
  }, [
    complete,
    mergePaths,
    navigate,
    onboardingCompleted,
    primaryEnvironmentId,
    setWorkspaceRef,
    starterId,
    workspaceProjectRef,
    designSystemName,
  ]);

  const headline = loadingLabelForStarter(starterId);

  return (
    <AutoDsmOnboardingShell>
      <div className="flex flex-col items-center gap-10 text-center">
        <AutoDsmLogoMark className="size-20 sm:size-24" />
        <div className="space-y-2">
          <p className="text-lg font-semibold text-foreground sm:text-xl">{headline}</p>
          <p className="text-sm text-muted-foreground">
            {fatalError
              ? fatalError
              : !primaryEnvironmentId
                ? "Waiting for environment…"
                : starterId
                  ? STAGES[Math.min(stageIndex, STAGES.length - 1)]
                  : "…"}
          </p>
        </div>
        <div className="flex w-full max-w-xs gap-1">
          {STAGES.map((label, i) => (
            <span
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                fatalError ? "bg-muted" : i <= stageIndex ? "bg-primary" : "bg-muted/70",
              )}
              key={label}
            />
          ))}
        </div>
      </div>
    </AutoDsmOnboardingShell>
  );
}

"use client";

import type { JSX } from "react";
import { useEffect, useRef, useState } from "react";

import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime";
import { useNavigate } from "@tanstack/react-router";

import { stackedThreadToast, toastManager } from "~/components/ui/toast";
import { readEnvironmentApi } from "~/environmentApi";
import { usePrimaryEnvironmentId, ensurePrimaryEnvironmentReady } from "~/environments/primary";
import { loadingLabelForStarter } from "~/lib/autoDsmOnboarding";
import { estimateAutoDsmEta, recordAutoDsmInstallTiming } from "~/lib/autoDsmEtaEstimator";
import {
  createWorkspaceInflightKey,
  clearCreateWorkspaceSessionCache,
  clearPersistedCreateWorkspaceRequestId,
  persistCreateWorkspaceRequestId,
  readPersistedCreateWorkspaceRequestId,
  runCreateWorkspaceWithTransportRetry,
} from "~/lib/autoDsmCreateWorkspaceRequest";
import {
  hasAutoDsmDesignSystem,
  isAutoDsmDesignSystemAlreadyExistsError,
} from "~/lib/autoDsmDesignSystemPresence";
import { formatUnknownErrorMessage } from "~/lib/formatUnknownErrorMessage";
import { normalizeSidebarComponentCatalogPath } from "~/lib/srcComponentsWorkspacePaths";
import { waitForOnboardingEnvironmentApi } from "~/lib/waitForOnboardingEnvironment";
import {
  waitForOrchestrationThreadInStore,
  waitForProjectCwdInStore,
} from "~/lib/waitForOrchestrationThread";
import { cn } from "~/lib/utils";
import { getSupabaseBrowserClient } from "~/lib/supabase/browserClient";
import { recordAutoDsmTelemetry } from "~/lib/supabase/telemetry";
import { useUiStateStore } from "~/uiStateStore";

import { AutoDsmWatermark } from "../AutoDsmWatermark";
import { AutoDsmOnboardingShell } from "./AutoDsmOnboardingShell";
import { Button } from "~/components/ui/button";

const STAGES = [
  "Copying template",
  "Installing packages",
  "Indexing components",
  "Preparing preview",
] as const;

const STAGE_ADVANCE_MS = 1200;
const CREATE_WORKSPACE_TIMEOUT_MS = 120_000;
const ENVIRONMENT_READY_TIMEOUT_MS = 120_000;

export function AutoDsmOnboardingLoading(): JSX.Element {
  const navigate = useNavigate();
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const complete = useUiStateStore((s) => s.completeAutodsmOnboarding);
  const mergePaths = useUiStateStore((s) => s.mergeAutoDsmThreadComponentPaths);
  const setWorkspaceRef = useUiStateStore((s) => s.setAutoDsmWorkspaceProjectRef);
  const setPendingDesignBrief = useUiStateStore((s) => s.setPendingDesignBriefMarkdown);
  const starterId = useUiStateStore((s) => s.autodsmOnboarding.starterId);
  const designSystemName = useUiStateStore((s) => s.autodsmOnboarding.designSystemName);
  const authProvider = useUiStateStore((s) => s.autodsmOnboarding.fakeAuthProvider);
  const [stageIndex, setStageIndex] = useState(0);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [environmentWaiting, setEnvironmentWaiting] = useState(false);
  const [showResetWorkspace, setShowResetWorkspace] = useState(false);
  const [isResettingWorkspace, setIsResettingWorkspace] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const runGenerationRef = useRef(0);
  const requestIdRef = useRef<string | null>(null);
  const workspaceCreateCompletedRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (workspaceCreateCompletedRef.current) {
      return;
    }

    if (!starterId) {
      void navigate({ to: "/onboarding/method", replace: true });
      return;
    }
    if (!primaryEnvironmentId) {
      setEnvironmentWaiting(true);
      void ensurePrimaryEnvironmentReady().finally(() => {
        if (!cancelled && runGeneration === runGenerationRef.current) {
          setEnvironmentWaiting(false);
        }
      });
      return;
    }
    setEnvironmentWaiting(false);

    const runGeneration = ++runGenerationRef.current;
    let cancelled = false;
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    const stageTimer = window.setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, STAGES.length - 2));
    }, STAGE_ADVANCE_MS);
    const elapsedTimer = window.setInterval(() => {
      if (startedAtRef.current === null) return;
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 500);

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
      recordAutoDsmTelemetry("autodsm.onboarding.step", {
        step: "loading",
        outcome: "started",
        starterId,
      });

      const api = await waitForOnboardingEnvironmentApi(primaryEnvironmentId, {
        timeoutMs: ENVIRONMENT_READY_TIMEOUT_MS,
      });
      if (!api) {
        if (!cancelled && runGeneration === runGenerationRef.current) {
          setFatalError(
            "Could not connect to the workspace environment. Check that AutoDSM is running and try again.",
          );
          recordAutoDsmTelemetry("autodsm.onboarding.step", {
            step: "loading",
            outcome: "environment_unavailable",
            starterId,
          });
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
        const supabaseUserId =
          (await getSupabaseBrowserClient()?.auth.getUser())?.data.user?.id ?? undefined;
        const createWorkspacePromise = runCreateWorkspaceWithTransportRetry(inflightKey, () =>
          api.autodsm.createWorkspace({
            starterId,
            environmentId: primaryEnvironmentId,
            requestId,
            ...(displayName ? { displayName } : {}),
            ...(supabaseUserId ? { ownerSubject: supabaseUserId } : {}),
            ...(authProvider ? { authProvider } : {}),
          }),
        );
        const timeoutPromise = new Promise<never>((_resolve, reject) => {
          setTimeout(() => {
            reject(new Error("Workspace creation timed out. Try again."));
          }, CREATE_WORKSPACE_TIMEOUT_MS);
        });
        const result = await Promise.race([createWorkspacePromise, timeoutPromise]);
        if (cancelled || runGeneration !== runGenerationRef.current) {
          return;
        }

        window.clearInterval(stageTimer);
        window.clearInterval(elapsedTimer);
        setStageIndex(STAGES.length - 1);

        workspaceCreateCompletedRef.current = true;
        if (startedAtRef.current !== null) {
          recordAutoDsmInstallTiming(starterId, Date.now() - startedAtRef.current);
        }
        recordAutoDsmTelemetry("autodsm.workspace.create.completed", {
          starterId,
          durationMs: startedAtRef.current !== null ? Date.now() - startedAtRef.current : 0,
        });
        recordAutoDsmTelemetry("autodsm.onboarding.step", {
          step: "loading",
          outcome: "completed",
          starterId,
        });

        const pendingBrief = useUiStateStore.getState().pendingDesignBriefMarkdown?.trim();
        if (pendingBrief) {
          try {
            await api.autodsm.uploadDesignBrief({
              cwd: result.cwd,
              markdown: pendingBrief,
            });
            setPendingDesignBrief(null);
          } catch (briefError) {
            recordAutoDsmTelemetry("autodsm.onboarding.step", {
              step: "loading",
              outcome: "brief_upload_failed",
              starterId,
              error: formatUnknownErrorMessage(briefError, "Brief upload failed."),
            });
          }
        }

        const paths: Record<string, string> = {};
        for (const row of result.threads) {
          const ref = scopeThreadRef(primaryEnvironmentId, row.threadId);
          paths[scopedThreadKey(ref)] = normalizeSidebarComponentCatalogPath(row.componentPath);
        }
        mergePaths(paths);
        const projectRef = {
          environmentId: primaryEnvironmentId,
          projectId: result.projectId,
        };
        setWorkspaceRef(projectRef);
        complete();
        const firstAgent = result.threads[0];
        if (firstAgent) {
          const firstThreadRef = scopeThreadRef(primaryEnvironmentId, firstAgent.threadId);
          const [synced, projectReady] = await Promise.all([
            waitForOrchestrationThreadInStore(firstThreadRef),
            waitForProjectCwdInStore(projectRef),
          ]);
          if (cancelled || runGeneration !== runGenerationRef.current) {
            return;
          }
          if (!synced || !projectReady) {
            setFatalError(
              "Workspace created, but the project did not sync in time. Open Home and try again.",
            );
            toastManager.add(
              stackedThreadToast({
                type: "warning",
                title: "Thread sync timed out",
                description: "Your design system was created. Open Home to continue.",
              }),
            );
            void navigate({ to: "/home", replace: true });
            return;
          }
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
        window.clearInterval(elapsedTimer);
        if (cancelled || runGeneration !== runGenerationRef.current) {
          return;
        }
        if (isAutoDsmDesignSystemAlreadyExistsError(error)) {
          const history = await api.autodsm.listWorkspaceHistory({});
          if (hasAutoDsmDesignSystem(history.entries)) {
            workspaceCreateCompletedRef.current = true;
            toastManager.add(
              stackedThreadToast({
                type: "success",
                title: "Design system already exists",
                description:
                  "Opening your existing workspace. If components look out of date, click Resync from template in the Components workspace.",
              }),
            );
            complete();
            void navigate({ to: "/home", replace: true });
            return;
          }

          setShowResetWorkspace(true);
          setFatalError("Workspace metadata is inconsistent. Reset the workspace and try again.");
          return;
        }
        const message = formatUnknownErrorMessage(
          error,
          "Workspace creation failed. Please retry.",
        );
        recordAutoDsmTelemetry("autodsm.workspace.create.failed", {
          starterId,
          error: message,
        });
        recordAutoDsmTelemetry("autodsm.onboarding.step", {
          step: "loading",
          outcome: "failed",
          starterId,
          error: message,
        });
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
      window.clearInterval(elapsedTimer);
    };
  }, [
    complete,
    mergePaths,
    navigate,
    primaryEnvironmentId,
    setWorkspaceRef,
    starterId,
    designSystemName,
    retryNonce,
    setPendingDesignBrief,
  ]);

  const handleResetWorkspace = () => {
    if (!starterId || !primaryEnvironmentId || isResettingWorkspace) {
      return;
    }

    const displayName = designSystemName?.trim() || undefined;
    const inflightKey = createWorkspaceInflightKey(starterId, primaryEnvironmentId, displayName);
    const api = readEnvironmentApi(primaryEnvironmentId);
    if (!api) {
      setFatalError(
        "Could not connect to the workspace environment. Check that AutoDSM is running and try again.",
      );
      return;
    }

    void (async () => {
      setIsResettingWorkspace(true);
      try {
        const history = await api.autodsm.listWorkspaceHistory({});
        for (const entry of history.entries) {
          await api.autodsm.deleteWorkspace({ workspaceId: entry.workspaceId });
        }
        clearCreateWorkspaceSessionCache(inflightKey);
        clearPersistedCreateWorkspaceRequestId(starterId, primaryEnvironmentId, displayName);
        requestIdRef.current = null;
        workspaceCreateCompletedRef.current = false;
        setFatalError(null);
        setShowResetWorkspace(false);
        setStageIndex(0);
        setRetryNonce((value) => value + 1);
      } catch (resetError) {
        setFatalError(
          formatUnknownErrorMessage(resetError, "Workspace creation failed. Please retry."),
        );
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: "Could not reset workspace",
            description: formatUnknownErrorMessage(
              resetError,
              "Workspace creation failed. Please retry.",
            ),
          }),
        );
      } finally {
        setIsResettingWorkspace(false);
      }
    })();
  };

  const handleRetry = (): void => {
    setFatalError(null);
    setShowResetWorkspace(false);
    setStageIndex(0);
    workspaceCreateCompletedRef.current = false;
    setRetryNonce((value) => value + 1);
  };

  const headline = loadingLabelForStarter(starterId);
  const eta =
    starterId && !fatalError
      ? estimateAutoDsmEta({
          starterId,
          elapsedMs,
          progressFraction: stageIndex / Math.max(1, STAGES.length - 1),
        })
      : null;

  return (
    <AutoDsmOnboardingShell>
      <div className="flex flex-col items-center gap-10 text-center">
        <AutoDsmWatermark className="size-20 sm:size-24" />
        <div className="space-y-2">
          <p className="text-lg font-semibold text-foreground sm:text-xl">{headline}</p>
          <p className="text-sm text-muted-foreground">
            {fatalError
              ? fatalError
              : environmentWaiting || !primaryEnvironmentId
                ? "Connecting to environment…"
                : starterId
                  ? STAGES[Math.min(stageIndex, STAGES.length - 1)]
                  : "…"}
          </p>
          {eta?.visible ? (
            <p className="text-xs text-muted-foreground/80" aria-live="polite">
              About {Math.max(1, Math.round(eta.remainingSeconds))}s remaining
            </p>
          ) : null}
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
        {fatalError && !showResetWorkspace ? (
          <Button onClick={handleRetry} type="button">
            Retry
          </Button>
        ) : null}
        {showResetWorkspace ? (
          <Button disabled={isResettingWorkspace} onClick={handleResetWorkspace} type="button">
            {isResettingWorkspace ? "Resetting workspace…" : "Reset workspace"}
          </Button>
        ) : null}
      </div>
    </AutoDsmOnboardingShell>
  );
}

import type {
  AutoDsmListWorkspaceHistoryResult,
  EnvironmentId,
} from "@t3tools/contracts";
import { useEffect, useRef, useState } from "react";

import { readEnvironmentApi } from "~/environmentApi";
import { useStore } from "~/store";

const STAGING_REJECTION_MARKER = "staging directory";

/**
 * Detects whether an arbitrary error value (from React Query's `error` field,
 * which is unknown) is the canonical `.staging/` rejection produced by the
 * AutoDSM RPC guards in `ws.ts` + `AutoDsmWorkspaceService.ts`. Exported for
 * test coverage; the React hook below is the only runtime caller.
 */
export function isStagingRejectionError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes(STAGING_REJECTION_MARKER);
  }
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message.includes(STAGING_REJECTION_MARKER);
    }
  }
  return false;
}

/**
 * Pulls the workspace UUID out of an autodsm workspace cwd. The autodsm
 * directory layout is owned by
 * `apps/server/src/autodsm/autodsmWorkspaceStaging.ts` and is one of:
 *
 *   `<systems-root>/<workspaceId>/system`          (final)
 *   `<systems-root>/.staging/<workspaceId>/system` (staging)
 *
 * In both cases the workspaceId is the directory immediately above `system`,
 * which is what we need to look up the FINAL `systemPath` in workspace
 * history. Returns `null` for paths that don't match the layout — the caller
 * treats that as a recoverable "no-match" instead of patching the store.
 */
export function extractWorkspaceIdFromAutodsmCwd(cwd: string | null): string | null {
  if (!cwd) return null;
  const segments = cwd.split("/").filter((segment) => segment.length > 0);
  // Walk past a trailing `system` (or `system/`) segment.
  let i = segments.length - 1;
  if (i < 0) return null;
  if (segments[i] === "system") {
    i -= 1;
  }
  if (i < 0) return null;
  const candidate = segments[i];
  if (!candidate || candidate === ".staging" || candidate === "systems") {
    return null;
  }
  return candidate;
}

/**
 * Looks up the FINAL `systemPath` for a given workspaceId in a history
 * result. Returns `null` if the workspace has no history entry (which means
 * the workspace was deleted or never committed — the user needs to pick a
 * different one).
 */
export function findFinalSystemPathForWorkspaceId(
  entries: AutoDsmListWorkspaceHistoryResult["entries"],
  workspaceId: string,
): { readonly projectId: string | null; readonly systemPath: string } | null {
  for (const entry of entries) {
    if (entry.workspaceId === workspaceId) {
      return { projectId: entry.projectId ?? null, systemPath: entry.systemPath };
    }
  }
  return null;
}

type RecoveryStatus =
  | "idle"
  | "healing"
  | "healed"
  | "no-matching-project"
  | "no-matching-workspace"
  | "error";

export interface StaleStagingCwdRecoveryState {
  readonly status: RecoveryStatus;
}

export interface UseStaleStagingCwdRecoveryOptions {
  readonly environmentId: EnvironmentId | null;
  readonly workspaceCwd: string | null;
  readonly error: unknown;
}

/**
 * Detects the server-side `.staging/` rejection ("Workspace path lives in the
 * staging directory; …") emitted by the AutoDSM RPC guards and heals the stale
 * project cwd in the frontend store.
 *
 * Why this hook keys on the cwd rather than a separate projectRef: the only
 * authoritative "this is the project we need to heal" signal is the cwd that's
 * currently failing — `workspaceCwd` flows down from ChatView's
 * `activeProject.cwd`, and the project with that cwd in the Zustand store IS
 * the one we need to patch. Looking it up via `autoDsmWorkspaceProjectRef`
 * (uiStateStore) used to leave the hook a no-op whenever the user navigated to
 * a thread URL directly, because that ref is only populated by product-launch
 * flows.
 *
 * The heal flow runs at most once per `workspaceCwd`. When an RPC error
 * matching the staging marker is observed, the hook finds the project whose
 * cwd matches the failing cwd, extracts the workspaceId from the cwd, fetches
 * workspace history (FINAL-only by server contract), looks up the entry by
 * workspaceId, and dispatches `setProjectCwd` with the FINAL `systemPath`.
 * The React Query keys that include `workspaceCwd` then refetch automatically.
 */
export function useStaleStagingCwdRecovery(
  options: UseStaleStagingCwdRecoveryOptions,
): StaleStagingCwdRecoveryState {
  const { environmentId, workspaceCwd, error } = options;
  const setProjectCwd = useStore((state) => state.setProjectCwd);
  // Reactive lookup: any future store update for this environment's project
  // map re-runs the selector. Returns the projectId whose cwd currently
  // matches the failing cwd (or null).
  const matchedProjectId = useStore((state) => {
    if (!environmentId || !workspaceCwd) return null;
    const envState = state.environmentStateById[environmentId];
    if (!envState) return null;
    for (const projectId of envState.projectIds) {
      if (envState.projectById[projectId]?.cwd === workspaceCwd) {
        return projectId;
      }
    }
    return null;
  });

  const healedCwdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<RecoveryStatus>("idle");

  const hasStagingError = isStagingRejectionError(error);

  useEffect(() => {
    if (!hasStagingError || !environmentId || !workspaceCwd) {
      return;
    }
    if (healedCwdRef.current === workspaceCwd) {
      return;
    }
    if (matchedProjectId === null) {
      setStatus("no-matching-project");
      return;
    }
    healedCwdRef.current = workspaceCwd;

    const workspaceId = extractWorkspaceIdFromAutodsmCwd(workspaceCwd);
    if (workspaceId === null) {
      setStatus("no-matching-workspace");
      return;
    }

    let cancelled = false;
    setStatus("healing");

    void (async () => {
      try {
        const api = readEnvironmentApi(environmentId);
        if (!api) {
          if (!cancelled) setStatus("error");
          return;
        }
        // No ownerSubject filter: in the recovery path we trust workspaceId
        // uniqueness more than the in-flight Supabase session state. The
        // server still skips staging entries inside listWorkspaceHistory.
        const result = (await api.autodsm.listWorkspaceHistory(
          {},
        )) as AutoDsmListWorkspaceHistoryResult;
        if (cancelled) return;

        const match = findFinalSystemPathForWorkspaceId(result.entries, workspaceId);
        if (match === null) {
          setStatus("no-matching-workspace");
          return;
        }
        setProjectCwd(environmentId, matchedProjectId, match.systemPath);
        setStatus("healed");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasStagingError, environmentId, workspaceCwd, matchedProjectId, setProjectCwd]);

  // Reset the once-per-cwd guard when the error clears so the next stale
  // cwd (e.g. user switches workspaces) gets its own heal attempt.
  useEffect(() => {
    if (!hasStagingError) {
      healedCwdRef.current = null;
      setStatus((prev) => (prev === "healed" ? "idle" : prev));
    }
  }, [hasStagingError]);

  return { status };
}

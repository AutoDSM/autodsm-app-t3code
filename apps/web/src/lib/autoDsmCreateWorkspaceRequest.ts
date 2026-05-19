import type { AutoDsmCreateWorkspaceResult, AutoDsmWorkspaceStarterId } from "@t3tools/contracts";
import type { EnvironmentId } from "@t3tools/contracts";

const inFlightByKey = new Map<string, Promise<AutoDsmCreateWorkspaceResult>>();
const completedByKey = new Map<string, AutoDsmCreateWorkspaceResult>();

const CREATE_WORKSPACE_REQUEST_ID_STORAGE_PREFIX = "autodsm:createWorkspace:requestId:";

export function createWorkspaceInflightKey(
  starterId: AutoDsmWorkspaceStarterId,
  environmentId: EnvironmentId,
  displayName?: string | null,
): string {
  const namePart = displayName?.trim() ? `:${displayName.trim()}` : "";
  return `${environmentId}:${starterId}${namePart}`;
}

export function createWorkspaceRequestIdStorageKey(
  starterId: AutoDsmWorkspaceStarterId,
  environmentId: EnvironmentId,
  displayName?: string | null,
): string {
  const namePart = displayName?.trim() ? `:${displayName.trim()}` : "";
  return `${CREATE_WORKSPACE_REQUEST_ID_STORAGE_PREFIX}${environmentId}:${starterId}${namePart}`;
}

/** Reuse the same server idempotency key across remounts (StrictMode, HMR). */
export function readPersistedCreateWorkspaceRequestId(
  starterId: AutoDsmWorkspaceStarterId,
  environmentId: EnvironmentId,
  displayName?: string | null,
): string | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  try {
    const value = sessionStorage.getItem(
      createWorkspaceRequestIdStorageKey(starterId, environmentId, displayName),
    );
    return value?.trim() ? value : null;
  } catch {
    return null;
  }
}

export function persistCreateWorkspaceRequestId(
  starterId: AutoDsmWorkspaceStarterId,
  environmentId: EnvironmentId,
  requestId: string,
  displayName?: string | null,
): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(
      createWorkspaceRequestIdStorageKey(starterId, environmentId, displayName),
      requestId,
    );
  } catch {
    // Ignore quota / private-mode failures.
  }
}

/**
 * Ensures only one `autodsm.createWorkspace` RPC runs per starter/environment pair
 * while an earlier call is still in flight (React StrictMode, HMR remounts).
 * Returns a cached result when the same key already completed in this session.
 */
export function runCreateWorkspaceOnce(
  key: string,
  run: () => Promise<AutoDsmCreateWorkspaceResult>,
): Promise<AutoDsmCreateWorkspaceResult> {
  const completed = completedByKey.get(key);
  if (completed) {
    return Promise.resolve(completed);
  }

  const existing = inFlightByKey.get(key);
  if (existing) {
    return existing;
  }

  const promise = run()
    .then((result) => {
      completedByKey.set(key, result);
      return result;
    })
    .finally(() => {
      if (inFlightByKey.get(key) === promise) {
        inFlightByKey.delete(key);
      }
    });
  inFlightByKey.set(key, promise);
  return promise;
}

/** Test-only reset for module-level in-flight state. */
export function resetCreateWorkspaceInflightForTests(): void {
  inFlightByKey.clear();
  completedByKey.clear();
}

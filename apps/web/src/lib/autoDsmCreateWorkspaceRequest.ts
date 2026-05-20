import type { AutoDsmCreateWorkspaceResult, AutoDsmWorkspaceStarterId } from "@t3tools/contracts";
import type { EnvironmentId } from "@t3tools/contracts";
import { AutoDsmRpcError } from "@t3tools/contracts";

import { formatUnknownErrorMessage } from "~/lib/formatUnknownErrorMessage";
import { isTransportConnectionErrorMessage } from "~/rpc/transportError";

const inFlightByKey = new Map<string, Promise<AutoDsmCreateWorkspaceResult>>();
const completedByKey = new Map<string, AutoDsmCreateWorkspaceResult>();
const transportInterruptedKeys = new Set<string>();

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

export function clearPersistedCreateWorkspaceRequestId(
  starterId: AutoDsmWorkspaceStarterId,
  environmentId: EnvironmentId,
  displayName?: string | null,
): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(
      createWorkspaceRequestIdStorageKey(starterId, environmentId, displayName),
    );
  } catch {
    // Ignore quota / private-mode failures.
  }
}

/** Clears cached create results so a deliberate retry can run again. */
export function clearCreateWorkspaceSessionCache(key: string): void {
  inFlightByKey.delete(key);
  completedByKey.delete(key);
  transportInterruptedKeys.delete(key);
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

export function isCreateWorkspaceTransportInterrupted(key: string): boolean {
  return transportInterruptedKeys.has(key);
}

/** Clears the transport-interrupted guard so the user can retry deliberately. */
export function clearCreateWorkspaceTransportInterrupted(key: string): void {
  transportInterruptedKeys.delete(key);
}

function isAutoDsmRpcError(error: unknown): error is AutoDsmRpcError {
  return (
    typeof error === "object" &&
    error !== null &&
    "_tag" in error &&
    (error as { _tag?: unknown })._tag === "AutoDsmRpcError"
  );
}

function isCreateWorkspaceTransportError(error: unknown): boolean {
  if (isAutoDsmRpcError(error)) {
    return false;
  }
  return isTransportConnectionErrorMessage(formatUnknownErrorMessage(error));
}

export function waitForDesktopBackendReady(timeoutMs: number): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  const bridge = window.desktopBridge;
  if (!bridge || typeof bridge.onBackendStatus !== "function") {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;
    let sawRestarting = false;

    const finish = (ready: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(quickReadyTimer);
      clearTimeout(timer);
      unsubscribe?.();
      resolve(ready);
    };

    const unsubscribe = bridge.onBackendStatus((status) => {
      if (status.kind === "restarting") {
        sawRestarting = true;
      }
      if (status.kind === "ready") {
        finish(true);
      }
    });

    const quickReadyTimer = setTimeout(() => {
      if (!sawRestarting) {
        finish(true);
      }
    }, 250);

    const timer = setTimeout(() => finish(false), timeoutMs);
  });
}

/**
 * Retries createWorkspace across transient backend/WebSocket disconnects (desktop backend
 * restart overlay). Server idempotency via requestId makes retries safe.
 */
export async function runCreateWorkspaceWithTransportRetry(
  key: string,
  run: () => Promise<AutoDsmCreateWorkspaceResult>,
  options?: {
    readonly maxAttempts?: number;
    readonly backendReadyTimeoutMs?: number;
    readonly retryDelayMs?: number;
  },
): Promise<AutoDsmCreateWorkspaceResult> {
  const maxAttempts = options?.maxAttempts ?? 6;
  const backendReadyTimeoutMs = options?.backendReadyTimeoutMs ?? 60_000;
  const retryDelayMs = options?.retryDelayMs ?? null;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    clearCreateWorkspaceTransportInterrupted(key);
    try {
      return await runCreateWorkspaceOnce(key, run);
    } catch (error) {
      lastError = error;
      if (!isCreateWorkspaceTransportError(error) || attempt === maxAttempts) {
        throw error;
      }
      clearCreateWorkspaceTransportInterrupted(key);
      await waitForDesktopBackendReady(backendReadyTimeoutMs);
      const delayMs = retryDelayMs ?? Math.min(1_000 * attempt, 4_000);
      if (delayMs > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, delayMs);
        });
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
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
  if (transportInterruptedKeys.has(key)) {
    return Promise.reject(
      new Error(
        "Workspace creation was interrupted by a backend reconnect. Reload the app or retry from onboarding.",
      ),
    );
  }

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
    .catch((error: unknown) => {
      if (isCreateWorkspaceTransportError(error)) {
        transportInterruptedKeys.add(key);
        inFlightByKey.delete(key);
        completedByKey.delete(key);
      }
      throw error;
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
  transportInterruptedKeys.clear();
}

"use client";

import { useEffect } from "react";

import { isElectron } from "~/env";
import { useDesktopBackendStatus } from "~/hooks/useDesktopBackendStatus";
import { retryDesktopProductAuthUntilAuthenticated } from "~/environments/primary";

const DESKTOP_AUTH_RECOVERY_INTERVAL_MS = 1_000;
const DESKTOP_AUTH_RECOVERY_MAX_WAIT_MS = 60_000;

/**
 * Keeps retrying silent auth when the renderer loaded before the local backend
 * handoff was ready. Reloads once authenticated so route context and WebSocket
 * bootstrap pick up the session.
 */
export function ElectronDesktopAuthRecovery(): null {
  const status = useDesktopBackendStatus();

  useEffect(() => {
    if (!isElectron) {
      return;
    }
    // We only attempt recovery if backend is ready
    if (status?.kind !== "ready") {
      return;
    }

    let cancelled = false;
    const startedAt = Date.now();

    const attemptRecovery = async () => {
      while (Date.now() - startedAt < DESKTOP_AUTH_RECOVERY_MAX_WAIT_MS) {
        if (cancelled) {
          break;
        }
        try {
          const result = await retryDesktopProductAuthUntilAuthenticated({
            maxWaitMs: DESKTOP_AUTH_RECOVERY_INTERVAL_MS + 500,
          });
          if (cancelled) {
            break;
          }
          if (result.status === "authenticated") {
            window.location.reload();
            return;
          }
        } catch (error) {
          console.error("Auth recovery cycle failed:", error);
        }
        await new Promise((resolve) => {
          setTimeout(resolve, DESKTOP_AUTH_RECOVERY_INTERVAL_MS);
        });
      }
    };

    void attemptRecovery();

    return () => {
      cancelled = true;
    };
  }, [status?.kind]);

  return null;
}

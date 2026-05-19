"use client";

import { useEffect, useRef } from "react";

import { isElectron } from "~/env";
import {
  ensureDevPairingBypassAuthenticated,
  isDevPairingBypassActive,
} from "~/lib/devPairingBypass";
import {
  fetchSessionState,
  retryDesktopProductAuthUntilAuthenticated,
} from "~/environments/primary";

const DESKTOP_AUTH_RECOVERY_INTERVAL_MS = 1_000;
const DESKTOP_AUTH_RECOVERY_MAX_WAIT_MS = 60_000;

/**
 * Keeps retrying silent auth when the renderer loaded before the local backend
 * handoff was ready. Reloads once authenticated so route context and WebSocket
 * bootstrap pick up the session.
 */
export function ElectronDesktopAuthRecovery(): null {
  const recoveryStartedRef = useRef(false);

  useEffect(() => {
    if (!isElectron || recoveryStartedRef.current) {
      return;
    }
    recoveryStartedRef.current = true;

    let cancelled = false;
    const startedAt = Date.now();

    const attemptRecovery = async () => {
      while (!cancelled && Date.now() - startedAt < DESKTOP_AUTH_RECOVERY_MAX_WAIT_MS) {
        const session = await fetchSessionState();
        const result = isDevPairingBypassActive(session.auth)
          ? await ensureDevPairingBypassAuthenticated()
          : await retryDesktopProductAuthUntilAuthenticated({
              maxWaitMs: DESKTOP_AUTH_RECOVERY_INTERVAL_MS + 500,
            });
        if (result.status === "authenticated") {
          window.location.reload();
          return;
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
  }, []);

  return null;
}

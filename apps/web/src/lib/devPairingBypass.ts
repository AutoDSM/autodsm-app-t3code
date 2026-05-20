import type { ServerAuthDescriptor } from "@t3tools/contracts";

import {
  isLoopbackHostname,
  resolvePrimaryEnvironmentHttpUrl,
} from "../environments/primary/target";

export type DevPairingBypassAuthGateState =
  | { status: "authenticated" }
  | {
      status: "requires-auth";
      auth: ServerAuthDescriptor;
      errorMessage?: string;
    };

export function isDevPairingBypassActive(auth: ServerAuthDescriptor): boolean {
  return auth.devPairingDisabled === true;
}

/** Electron ships a silent desktop-bootstrap token; never send builders to /pair. */
export function shouldSkipPairingRedirectForElectronProduct(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.desktopBridge !== undefined || window.nativeApi !== undefined)
  );
}

export function shouldSkipPairingRedirect(auth?: ServerAuthDescriptor): boolean {
  if (auth && isDevPairingBypassActive(auth)) {
    return true;
  }
  if (shouldSkipPairingRedirectForElectronProduct()) {
    return true;
  }
  return isLocalDevLoopbackTarget();
}

export function isLocalDevLoopbackTarget(): boolean {
  if (typeof window === "undefined" || !import.meta.env.DEV) {
    return false;
  }

  try {
    return isLoopbackHostname(new URL(window.location.href).hostname);
  } catch {
    return false;
  }
}

async function requestDevAutoBootstrap(): Promise<void> {
  const response = await fetch(resolvePrimaryEnvironmentHttpUrl("/api/auth/dev-auto-bootstrap"), {
    credentials: "include",
    method: "POST",
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Dev auto-bootstrap failed (${response.status}).`);
  }
}

export async function ensureDevPairingBypassAuthenticated(): Promise<DevPairingBypassAuthGateState> {
  const { fetchSessionState } = await import("../environments/primary/auth");
  const session = await fetchSessionState();
  if (session.authenticated) {
    return { status: "authenticated" };
  }

  if (!shouldAttemptSilentLoopbackAuth(session.auth)) {
    return { status: "requires-auth", auth: session.auth };
  }

  try {
    await requestDevAutoBootstrap();
    const afterBootstrap = await fetchSessionState();
    if (afterBootstrap.authenticated) {
      return { status: "authenticated" };
    }
    return {
      status: "requires-auth",
      auth: afterBootstrap.auth,
      errorMessage: "Timed out waiting for dev auto-bootstrap session.",
    };
  } catch (error) {
    return {
      status: "requires-auth",
      auth: session.auth,
      errorMessage: error instanceof Error ? error.message : "Dev auto-bootstrap failed.",
    };
  }
}

export function shouldAttemptSilentLoopbackAuth(auth: ServerAuthDescriptor): boolean {
  return isDevPairingBypassActive(auth);
}

"use client";

import type { ReactNode } from "react";

import { AutoDsmBackendCrashScreen } from "~/components/autodsm/AutoDsmBackendCrashScreen";
import { BackendRestartingOverlay } from "~/components/autodsm/BackendRestartingOverlay";
import { useDesktopBackendStatus } from "~/hooks/useDesktopBackendStatus";
import { isElectron } from "~/env";

export function DesktopBackendStatusGate({ children }: { readonly children: ReactNode }) {
  const backendStatus = useDesktopBackendStatus();

  if (!isElectron) {
    return children;
  }

  if (backendStatus?.kind === "fatal") {
    return (
      <AutoDsmBackendCrashScreen
        reason={backendStatus.reason}
        attempts={backendStatus.attempts}
        logDir={backendStatus.logDir}
      />
    );
  }

  return (
    <>
      {children}
      {backendStatus?.kind === "restarting" ? (
        <BackendRestartingOverlay attempt={backendStatus.attempt} />
      ) : null}
    </>
  );
}

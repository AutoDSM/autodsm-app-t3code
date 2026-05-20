import type { DesktopBackendStatus } from "@t3tools/contracts";
import { useEffect, useState } from "react";

import { isElectron } from "~/env";

export function subscribeDesktopBackendStatus(
  listener: (status: DesktopBackendStatus) => void,
): (() => void) | undefined {
  const bridge = window.desktopBridge;
  if (!bridge || typeof bridge.onBackendStatus !== "function") {
    return undefined;
  }

  return bridge.onBackendStatus(listener);
}

export function useDesktopBackendStatus(): DesktopBackendStatus | null {
  const [status, setStatus] = useState<DesktopBackendStatus | null>(null);

  useEffect(() => {
    if (!isElectron) {
      return;
    }

    return subscribeDesktopBackendStatus(setStatus);
  }, []);

  return status;
}

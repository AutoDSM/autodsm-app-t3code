import type { EnvironmentId } from "@t3tools/contracts";
import { useMemo } from "react";

import { readPrimaryEnvironmentDescriptor, usePrimaryEnvironmentId } from "~/environments/primary";
import { useSavedEnvironmentRuntimeStore } from "~/environments/runtime";

export function getBrowsePlatformFromOs(os: string | null | undefined): string {
  if (os === "windows") {
    return "Win32";
  }
  if (os === "darwin") {
    return "MacIntel";
  }
  if (os === "linux") {
    return "Linux";
  }
  return typeof navigator === "undefined" ? "" : navigator.platform;
}

export function useEnvironmentBrowsePlatform(environmentId: EnvironmentId | null): string {
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const savedEnvironmentRuntimeById = useSavedEnvironmentRuntimeStore((state) => state.byId);

  return useMemo(() => {
    const os =
      environmentId && primaryEnvironmentId && environmentId === primaryEnvironmentId
        ? (readPrimaryEnvironmentDescriptor()?.platform.os ?? null)
        : environmentId
          ? (savedEnvironmentRuntimeById[environmentId]?.descriptor?.platform.os ??
            savedEnvironmentRuntimeById[environmentId]?.serverConfig?.environment.platform.os ??
            null)
          : null;
    return getBrowsePlatformFromOs(os);
  }, [environmentId, primaryEnvironmentId, savedEnvironmentRuntimeById]);
}

import type {
  AutoDsmWorkspaceHistoryEntry,
  EnvironmentId,
  ScopedProjectRef,
} from "@t3tools/contracts";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { readEnvironmentApi } from "~/environmentApi";
import { usePrimaryEnvironmentId } from "~/environments/primary";
import { resolveProjectRefForSystemPath } from "~/lib/openAutoDsmDesignSystemFromHistory";
import { selectProjectsAcrossEnvironments, useStore } from "~/store";

export interface AutoDsmDesignSystemHistoryRow extends AutoDsmWorkspaceHistoryEntry {
  readonly projectRef: ScopedProjectRef | null;
}

export function useAutoDsmDesignSystemHistory(environmentId: EnvironmentId | null) {
  const projects = useStore(useShallow((state) => selectProjectsAcrossEnvironments(state)));

  const query = useQuery({
    queryKey: ["autodsm-workspace-history", environmentId],
    enabled: Boolean(environmentId),
    queryFn: async () => {
      if (!environmentId) {
        return { entries: [] as AutoDsmWorkspaceHistoryEntry[] };
      }
      const api = readEnvironmentApi(environmentId);
      if (!api) {
        return { entries: [] as AutoDsmWorkspaceHistoryEntry[] };
      }
      return api.autodsm.listWorkspaceHistory({});
    },
    staleTime: 30_000,
  });

  const rows = useMemo((): readonly AutoDsmDesignSystemHistoryRow[] => {
    if (!environmentId || !query.data) {
      return [];
    }
    return query.data.entries.map((entry) => ({
      ...entry,
      projectRef: resolveProjectRefForSystemPath(projects, environmentId, entry.systemPath),
    }));
  }, [environmentId, projects, query.data]);

  return {
    ...query,
    rows,
  };
}

/** Convenience hook using the primary environment id. */
export function usePrimaryAutoDsmDesignSystemHistory() {
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  return useAutoDsmDesignSystemHistory(primaryEnvironmentId);
}

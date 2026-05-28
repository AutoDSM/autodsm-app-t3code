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
import { useSupabaseAuth } from "~/hooks/useSupabaseAuth";
import { resolveProjectRefForSystemPath } from "~/lib/openAutoDsmDesignSystemFromHistory";
import { selectProjectsAcrossEnvironments, useStore } from "~/store";

export interface AutoDsmDesignSystemHistoryRow extends AutoDsmWorkspaceHistoryEntry {
  readonly projectRef: ScopedProjectRef | null;
}

export interface UseAutoDsmDesignSystemHistoryOptions {
  /**
   * Optional Supabase user id to filter by. When supplied, only workspaces whose
   * `meta.json.ownerSubject` matches are returned. Omit (or pass `undefined`) to
   * fall back to today's unfiltered behavior — used by Settings and other
   * surfaces that intentionally show legacy/untagged workspaces.
   */
  readonly ownerSubject?: string | undefined;
  /** Disable the query (e.g. while Supabase session is still resolving). */
  readonly enabled?: boolean;
}

export function useAutoDsmDesignSystemHistory(
  environmentId: EnvironmentId | null,
  options: UseAutoDsmDesignSystemHistoryOptions = {},
) {
  const projects = useStore(useShallow((state) => selectProjectsAcrossEnvironments(state)));
  const ownerSubject = options.ownerSubject?.trim() || undefined;
  const enabled = (options.enabled ?? true) && Boolean(environmentId);

  const query = useQuery({
    queryKey: ["autodsm-workspace-history", environmentId, ownerSubject ?? null],
    enabled,
    queryFn: async () => {
      if (!environmentId) {
        return { entries: [] as AutoDsmWorkspaceHistoryEntry[] };
      }
      const api = readEnvironmentApi(environmentId);
      if (!api) {
        return { entries: [] as AutoDsmWorkspaceHistoryEntry[] };
      }
      return api.autodsm.listWorkspaceHistory(ownerSubject ? { ownerSubject } : {});
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

/** Convenience hook using the primary environment id (unfiltered). */
export function usePrimaryAutoDsmDesignSystemHistory() {
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  return useAutoDsmDesignSystemHistory(primaryEnvironmentId);
}

/**
 * Owner-scoped variant: filters workspace history by the currently signed-in
 * Supabase user id. While the Supabase session is still loading, the query is
 * disabled to avoid a flash of "no workspaces" state. When Supabase is not
 * configured (fake-auth / dev), falls back to the unfiltered list so existing
 * dev flows are unaffected.
 */
export function useOwnerScopedPrimaryAutoDsmDesignSystemHistory() {
  const primaryEnvironmentId = usePrimaryEnvironmentId();
  const supabaseAuth = useSupabaseAuth();
  const supabaseUserId = supabaseAuth.session?.user.id;
  const ownerSubject = supabaseAuth.enabled ? supabaseUserId : undefined;
  const enabled = !supabaseAuth.enabled || !supabaseAuth.loading;
  return useAutoDsmDesignSystemHistory(primaryEnvironmentId, {
    ownerSubject,
    enabled,
  });
}

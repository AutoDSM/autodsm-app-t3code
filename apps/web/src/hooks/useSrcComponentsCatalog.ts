"use client";

import type { AutoDsmComponentRegistry, EnvironmentId } from "@t3tools/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { ensureEnvironmentApi } from "~/environmentApi";
import {
  autodsmWorkspaceQueryKeys,
  autodsmComponentRegistryQueryOptions,
} from "~/lib/autodsmWorkspaceReactQuery";
import { projectSearchEntriesQueryOptions } from "~/lib/projectReactQuery";
import { filterProductComponentAgentPaths } from "~/lib/filterProductComponentAgentPaths";
import {
  SIDEBAR_COMPONENTS_SEARCH_PATH_INCLUDES,
  mergeSidebarComponentsCatalogViewModel,
  type SrcComponentsCatalogViewModel,
} from "~/lib/srcComponentsCatalog";

export interface UseSrcComponentsCatalogOptions {
  readonly environmentId: EnvironmentId | null;
  readonly cwd: string | null;
  /** When false, skip registry/search queries entirely (still safe merge helpers unused). */
  readonly enabled: boolean;
  /** When set, catalog paths are intersected with component-agent manifest paths (product mode). */
  readonly productAgentPaths?: readonly string[] | null;
}

export interface UseSrcComponentsCatalogResult {
  readonly catalog: SrcComponentsCatalogViewModel;
  readonly registry: AutoDsmComponentRegistry | undefined;
  readonly registryPending: boolean;
  readonly registryError: boolean;
  readonly retryWorkspaceBuild: () => void;
  readonly workspaceBuildRetryPending: boolean;
}

/**
 * Shared registry + path-search fallback for `src/components` listings (sidebar, tabs, workspaces).
 */
export function useSrcComponentsCatalog(
  options: UseSrcComponentsCatalogOptions,
): UseSrcComponentsCatalogResult {
  const { environmentId, cwd, enabled, productAgentPaths } = options;
  const queryClient = useQueryClient();

  const baseCatalogEnabled = Boolean(enabled && environmentId !== null && cwd !== null);

  const registryQuery = useQuery({
    ...autodsmComponentRegistryQueryOptions({
      environmentId,
      cwd,
      enabled: baseCatalogEnabled,
    }),
  });

  const registryData = registryQuery.data;
  const gated = Boolean(registryData?.gate);

  const fallbackEnabled =
    baseCatalogEnabled &&
    registryQuery.isSuccess &&
    !gated &&
    registryData !== undefined &&
    registryData.entries.length === 0;

  const fallbackQuery = useQuery(
    projectSearchEntriesQueryOptions({
      environmentId,
      cwd,
      query: "",
      limit: 800,
      entryKind: "file",
      entryPathSubstring: SIDEBAR_COMPONENTS_SEARCH_PATH_INCLUDES,
      enabled: fallbackEnabled,
    }),
  );

  const mergedCatalog = useMemo(
    () =>
      mergeSidebarComponentsCatalogViewModel({
        registry: registryData,
        registryPending: registryQuery.isPending,
        registryError: registryQuery.isError,
        fallbackRankedEntries: fallbackQuery.data?.entries,
        fallbackQueryTruncated: fallbackQuery.data?.truncated,
        fallbackPending: fallbackQuery.isPending,
        fallbackError: fallbackQuery.isError,
      }),
    [
      fallbackQuery.data?.entries,
      fallbackQuery.data?.truncated,
      fallbackQuery.isError,
      fallbackQuery.isPending,
      registryData,
      registryQuery.isError,
      registryQuery.isPending,
    ],
  );

  const catalog = useMemo(() => {
    if (!productAgentPaths || productAgentPaths.length === 0) {
      return mergedCatalog;
    }
    return filterProductComponentAgentPaths(mergedCatalog, productAgentPaths);
  }, [mergedCatalog, productAgentPaths]);

  const retryWorkspaceBuild = useMutation({
    mutationFn: async () => {
      if (!environmentId || !cwd) {
        throw new Error("Workspace unavailable.");
      }
      const api = ensureEnvironmentApi(environmentId);
      return api.autodsm.runWorkspaceBuild({ cwd, force: true });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: autodsmWorkspaceQueryKeys.componentRegistry(environmentId, cwd),
      });
    },
  });

  return {
    catalog,
    registry: registryData,
    registryPending: registryQuery.isPending,
    registryError: registryQuery.isError,
    retryWorkspaceBuild: () => {
      void retryWorkspaceBuild.mutateAsync().catch(() => undefined);
    },
    workspaceBuildRetryPending: retryWorkspaceBuild.isPending,
  };
}

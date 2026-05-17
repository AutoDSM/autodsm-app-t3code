import { type EnvironmentId, type ScopedThreadRef } from "@t3tools/contracts";
import { useQuery } from "@tanstack/react-query";
import { memo, useCallback, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";

import { SrcComponentsSidebarCatalogBlock } from "~/components/SidebarSrcComponentsCatalog";
import { parseDiffRouteSearch } from "~/diffRouteSearch";
import {
  buildSrcComponentsCatalogViewModel,
  SIDEBAR_COMPONENTS_SEARCH_PATH_INCLUDES,
} from "~/lib/srcComponentsCatalog";
import { projectSearchEntriesQueryOptions } from "~/lib/projectReactQuery";
import { buildThreadRouteParams } from "~/threadRoutes";

export interface SidebarSrcComponentsSectionProps {
  readonly catalogEnvironmentId: EnvironmentId | null;
  readonly catalogCwd: string | null;
  readonly sectionVisible: boolean;
  readonly resolveTargetThreadRef: () => ScopedThreadRef | null;
  readonly closeMobileSidebar: () => void;
}

export const SidebarSrcComponentsSection = memo(function SidebarSrcComponentsSection(
  props: SidebarSrcComponentsSectionProps,
) {
  const {
    catalogEnvironmentId,
    catalogCwd,
    sectionVisible,
    resolveTargetThreadRef,
    closeMobileSidebar,
  } = props;

  const navigate = useNavigate();
  const previewPathActive = useSearch({
    strict: false,
    select: (record) => parseDiffRouteSearch(record as Record<string, unknown>).componentPath,
  });

  const { data, isPending, isError } = useQuery(
    projectSearchEntriesQueryOptions({
      environmentId: catalogEnvironmentId,
      cwd: catalogCwd,
      query: "",
      limit: 800,
      entryKind: "file",
      entryPathSubstring: SIDEBAR_COMPONENTS_SEARCH_PATH_INCLUDES,
      enabled: Boolean(sectionVisible) && catalogEnvironmentId !== null && catalogCwd !== null,
    }),
  );

  const catalog = useMemo(
    () =>
      buildSrcComponentsCatalogViewModel({
        rankedEntries: data?.entries,
        queryTruncated: data?.truncated,
        isPending,
        isError,
      }),
    [data?.entries, data?.truncated, isError, isPending],
  );

  const [folderExpanded, setFolderExpanded] = useState(true);
  const toggleFolder = useCallback(() => {
    setFolderExpanded((value) => !value);
  }, []);

  const navigateToPreview = useCallback(
    (relativePath: string) => {
      const threadRef = resolveTargetThreadRef();
      if (!threadRef) {
        return;
      }
      closeMobileSidebar();
      void navigate({
        to: "/$environmentId/$threadId",
        params: buildThreadRouteParams(threadRef),
        search: (previous) => ({
          ...(previous as Record<string, unknown>),
          componentPath: relativePath,
        }),
      });
    },
    [closeMobileSidebar, navigate, resolveTargetThreadRef],
  );

  const threadRefForSidebarActions = resolveTargetThreadRef();
  const canPickThreads = threadRefForSidebarActions !== null;

  if (!sectionVisible) {
    return null;
  }

  return (
    <SrcComponentsSidebarCatalogBlock
      catalog={catalog}
      folderExpanded={folderExpanded}
      onToggleFolderExpanded={toggleFolder}
      previewPathActive={previewPathActive}
      canPickThreads={canPickThreads}
      onPickComponentPath={navigateToPreview}
    />
  );
});

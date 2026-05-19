import { type EnvironmentId, type ScopedThreadRef } from "@t3tools/contracts";
import { memo, useCallback, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";

import { SrcComponentsSidebarCatalogBlock } from "~/components/SidebarSrcComponentsCatalog";
import { parseDiffRouteSearch } from "~/diffRouteSearch";
import { useSrcComponentsCatalog } from "~/hooks/useSrcComponentsCatalog";
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

  const baseCatalogEnabled =
    Boolean(sectionVisible) && catalogEnvironmentId !== null && catalogCwd !== null;

  const { catalog, retryWorkspaceBuild, workspaceBuildRetryPending } = useSrcComponentsCatalog({
    environmentId: catalogEnvironmentId,
    cwd: catalogCwd,
    enabled: baseCatalogEnabled,
  });

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
      onRetryWorkspaceBuild={retryWorkspaceBuild}
      workspaceBuildRetryPending={workspaceBuildRetryPending}
    />
  );
});

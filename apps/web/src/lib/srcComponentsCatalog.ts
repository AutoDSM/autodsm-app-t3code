/**
 * Sidebar `src/components` catalog view-model shared by prod (workspace search) and dev sandbox.
 */

import type {
  AutoDsmComponentRegistry,
  AutoDsmComponentRegistryGateReason,
  ProjectEntry,
} from "@t3tools/contracts";

import {
  dedupeStableSorted,
  isWorkspaceSrcComponentsUiRelativePath,
  normalizeSidebarComponentCatalogPath,
  normalizeWorkspaceRelativePathPosix,
} from "./srcComponentsWorkspacePaths";

/** Server-side substring filter (`projects.searchEntries`); leading `/` avoids `evil-src/components` matches. */
export const SIDEBAR_COMPONENTS_SEARCH_PATH_INCLUDES = "/src/components/";

export const DEFAULT_SRC_COMPONENTS_FOLDER_LABEL = ".tsx / .jsx previews under …/src/components/";

export interface SrcComponentsCatalogViewModel {
  readonly folderLabel: string;
  readonly paths: readonly string[];
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly truncated: boolean;
  /** Workspace package build gate blocking full registry indexing. */
  readonly gate: AutoDsmComponentRegistryGateReason | null;
}

export function buildSrcComponentsCatalogViewModel(input: {
  readonly rankedEntries: readonly ProjectEntry[] | undefined;
  readonly queryTruncated: boolean | undefined;
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly folderLabel?: string;
}): SrcComponentsCatalogViewModel {
  const folderLabel = input.folderLabel ?? DEFAULT_SRC_COMPONENTS_FOLDER_LABEL;

  if (input.isPending || input.isError) {
    return {
      folderLabel,
      paths: [],
      isPending: input.isPending,
      isError: input.isError,
      truncated: Boolean(input.queryTruncated),
      gate: null,
    };
  }

  const ranked = input.rankedEntries ?? [];
  const files = ranked
    .filter((entry) => entry.kind === "file")
    .map((entry) =>
      normalizeSidebarComponentCatalogPath(normalizeWorkspaceRelativePathPosix(entry.path)),
    )
    .filter((pathValue) => isWorkspaceSrcComponentsUiRelativePath(pathValue));

  return {
    folderLabel,
    paths: dedupeStableSorted(files),
    isPending: false,
    isError: false,
    truncated: Boolean(input.queryTruncated),
    gate: null,
  };
}

/**
 * Production sidebar: registry (after workspace build gate) with search fallback when the registry
 * is empty but not gated.
 */
export function mergeSidebarComponentsCatalogViewModel(input: {
  readonly registry: AutoDsmComponentRegistry | undefined;
  readonly registryPending: boolean;
  readonly registryError: boolean;
  readonly fallbackRankedEntries: readonly ProjectEntry[] | undefined;
  readonly fallbackQueryTruncated: boolean | undefined;
  readonly fallbackPending: boolean;
  readonly fallbackError: boolean;
  readonly folderLabel?: string;
}): SrcComponentsCatalogViewModel {
  const folderLabel = input.folderLabel ?? DEFAULT_SRC_COMPONENTS_FOLDER_LABEL;

  if (input.registryPending) {
    return {
      folderLabel,
      paths: [],
      isPending: true,
      isError: false,
      truncated: false,
      gate: null,
    };
  }

  if (input.registryError) {
    return {
      folderLabel,
      paths: [],
      isPending: false,
      isError: true,
      truncated: false,
      gate: null,
    };
  }

  const registry = input.registry;
  if (!registry) {
    return {
      folderLabel,
      paths: [],
      isPending: true,
      isError: false,
      truncated: false,
      gate: null,
    };
  }

  const gate = registry.gate ?? null;

  const registryPaths = dedupeStableSorted(
    registry.entries
      .map((entry) => normalizeSidebarComponentCatalogPath(entry.relativePath))
      .filter((pathValue) => isWorkspaceSrcComponentsUiRelativePath(pathValue)),
  );

  if (registryPaths.length > 0) {
    return {
      folderLabel,
      paths: registryPaths,
      isPending: false,
      isError: false,
      truncated: false,
      gate,
    };
  }

  if (gate) {
    return {
      folderLabel,
      paths: [],
      isPending: false,
      isError: false,
      truncated: false,
      gate,
    };
  }

  if (input.fallbackPending) {
    return {
      folderLabel,
      paths: [],
      isPending: true,
      isError: false,
      truncated: Boolean(input.fallbackQueryTruncated),
      gate: null,
    };
  }

  if (input.fallbackError) {
    return {
      folderLabel,
      paths: [],
      isPending: false,
      isError: true,
      truncated: false,
      gate: null,
    };
  }

  const fallbackVm = buildSrcComponentsCatalogViewModel({
    rankedEntries: input.fallbackRankedEntries,
    queryTruncated: input.fallbackQueryTruncated,
    isPending: false,
    isError: false,
    folderLabel,
  });

  return {
    ...fallbackVm,
    gate: null,
  };
}

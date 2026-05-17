/**
 * Sidebar `src/components` catalog view-model shared by prod (workspace search) and dev sandbox.
 */

import type { ProjectEntry } from "@t3tools/contracts";

import {
  dedupeStableSorted,
  isWorkspaceSrcComponentsUiRelativePath,
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
    };
  }

  const ranked = input.rankedEntries ?? [];
  const files = ranked
    .filter((entry) => entry.kind === "file")
    .map((entry) => normalizeWorkspaceRelativePathPosix(entry.path))
    .filter((pathValue) => isWorkspaceSrcComponentsUiRelativePath(pathValue));

  return {
    folderLabel,
    paths: dedupeStableSorted(files),
    isPending: false,
    isError: false,
    truncated: Boolean(input.queryTruncated),
  };
}

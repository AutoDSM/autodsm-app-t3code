import { TurnId } from "@t3tools/contracts";

import {
  normalizeWorkspaceRelativePathPosix,
  isWorkspaceSrcComponentsUiRelativePath,
} from "./lib/srcComponentsWorkspacePaths";

export interface DiffRouteSearch {
  diff?: "1" | undefined;
  diffTurnId?: TurnId | undefined;
  diffFilePath?: string | undefined;
  /**
   * Workspace-relative POSIX path pointing at `.tsx`/`.jsx` anywhere under an
   * `src/components` directory tree inside the workspace (including monorepos like
   * `apps/web/src/components`), used for the sidebar component preview pane.
   */
  componentPath?: string | undefined;
}

function isDiffOpenValue(value: unknown): boolean {
  return value === "1" || value === 1 || value === true;
}

function normalizeSearchString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function stripDiffSearchParams<T extends Record<string, unknown>>(
  params: T,
): Omit<T, "diff" | "diffTurnId" | "diffFilePath"> {
  const { diff: _diff, diffTurnId: _diffTurnId, diffFilePath: _diffFilePath, ...rest } = params;
  return rest as Omit<T, "diff" | "diffTurnId" | "diffFilePath">;
}

export function stripComponentPreviewSearchParams<T extends Record<string, unknown>>(
  params: T,
): Omit<T, "componentPath"> {
  const { componentPath: _componentPath, ...rest } = params;
  return rest as Omit<T, "componentPath">;
}

/**
 * Drops invalid or abusive values so `componentPath` never leaves the sandboxed subtree.
 */
export function sanitizeComponentPreviewPathForSearch(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = normalizeWorkspaceRelativePathPosix(value);
  return isWorkspaceSrcComponentsUiRelativePath(normalized) ? normalized : undefined;
}

export function parseDiffRouteSearch(search: Record<string, unknown>): DiffRouteSearch {
  const diff = isDiffOpenValue(search.diff) ? "1" : undefined;
  const diffTurnIdRaw = diff ? normalizeSearchString(search.diffTurnId) : undefined;
  const diffTurnId = diffTurnIdRaw ? TurnId.make(diffTurnIdRaw) : undefined;
  const diffFilePath = diff && diffTurnId ? normalizeSearchString(search.diffFilePath) : undefined;
  const componentPath = sanitizeComponentPreviewPathForSearch(search.componentPath);

  return {
    ...(diff ? { diff } : {}),
    ...(diffTurnId ? { diffTurnId } : {}),
    ...(diffFilePath ? { diffFilePath } : {}),
    ...(componentPath ? { componentPath } : {}),
  };
}

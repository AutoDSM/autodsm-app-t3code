/**
 * Sidebar `src/components` catalog — deterministic filtering of indexed workspace paths.
 */

const SRC_COMPONENTS_PREFIX = "src/components/";
/** Monorepo and nested packages: segment boundary, not `evil-src/components/` */
const SRC_COMPONENTS_SEGMENT = "/src/components/";

function basenameOfposix(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? path : path.slice(idx + 1);
}

export function normalizeWorkspaceRelativePathPosix(raw: string): string {
  return raw.replace(/\\/g, "/").trim();
}

/**
 * Canonical catalog / URL search form: POSIX relative path with no leading slash so sidebar rows,
 * `componentPath` search params, and registry `relativePath` values agree after normalization.
 */
export function normalizeSidebarComponentCatalogPath(raw: string): string {
  let normalized = normalizeWorkspaceRelativePathPosix(raw).trim();
  while (normalized.startsWith("/")) {
    normalized = normalized.slice(1);
  }
  return normalized;
}

/** True for `.tsx`/`.jsx` workspace paths under some `src/components/` subtree. */
export function isWorkspaceSrcComponentsUiRelativePath(rawPath: string): boolean {
  const normalized = normalizeWorkspaceRelativePathPosix(rawPath).trim();
  if (!normalized || normalized.includes("../")) {
    return false;
  }

  const posix = normalized.replace(/\\/g, "/");
  const inSubtree =
    posix.startsWith(SRC_COMPONENTS_PREFIX) || posix.includes(SRC_COMPONENTS_SEGMENT);
  if (!inSubtree) {
    return false;
  }

  const base = basenameOfposix(posix);

  const hasForbiddenSegment = posix.includes("../") || posix.includes("..\\");
  return (
    base.length > 0 && (base.endsWith(".tsx") || base.endsWith(".jsx")) && !hasForbiddenSegment
  );
}

export function dedupeStableSorted(paths: readonly string[]): string[] {
  return [...new Set(paths)].toSorted((a, b) => {
    const bn = basenameOfposix(a).localeCompare(basenameOfposix(b));
    return bn !== 0 ? bn : a.localeCompare(b);
  });
}

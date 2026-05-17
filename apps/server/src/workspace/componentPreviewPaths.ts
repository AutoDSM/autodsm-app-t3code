/**
 * Mirrors web `srcComponentsWorkspacePaths` rules so preview RPCs only touch UI components.
 */

const SRC_COMPONENTS_PREFIX = "src/components/";
const SRC_COMPONENTS_SEGMENT = "/src/components/";

function basenameOfPosix(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? path : path.slice(idx + 1);
}

export function normalizeWorkspaceRelativePathPosix(raw: string): string {
  return raw.replace(/\\/g, "/").trim();
}

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

  const base = basenameOfPosix(posix);

  const hasForbiddenSegment = posix.includes("../") || posix.includes("..\\");
  return (
    base.length > 0 && (base.endsWith(".tsx") || base.endsWith(".jsx")) && !hasForbiddenSegment
  );
}

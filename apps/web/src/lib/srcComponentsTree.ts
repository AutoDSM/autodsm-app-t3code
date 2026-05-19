/**
 * Build nested trees under each workspace `src/components/` root for sidebar rendering.
 */

import { normalizeSidebarComponentCatalogPath } from "./srcComponentsWorkspacePaths";

const SRC_COMPONENTS_SEGMENT = "/src/components/";
const TOP_LEVEL_SRC_COMPONENTS_PREFIX = "src/components/";

const SORT_LOCALE_OPTIONS: Intl.CollatorOptions = { numeric: true, sensitivity: "base" };

export interface SrcComponentsTreeFileNode {
  readonly kind: "file";
  readonly name: string;
  /** Full workspace-relative path (matches catalog.paths entries). */
  readonly relativePath: string;
}

export interface SrcComponentsTreeDirectoryNode {
  readonly kind: "directory";
  readonly name: string;
  /** Workspace-relative directory path (no trailing slash). */
  readonly path: string;
  readonly children: SrcComponentsTreeNode[];
}

export type SrcComponentsTreeNode = SrcComponentsTreeFileNode | SrcComponentsTreeDirectoryNode;

export interface SrcComponentsTreeRoot {
  readonly rootLabel: string;
  /** Unique key for expansion state / React keys. */
  readonly rootPath: string;
  readonly nodes: SrcComponentsTreeNode[];
}

interface MutableDirectoryNode {
  readonly segmentName: string;
  readonly workspacePath: string;
  readonly directories: Map<string, MutableDirectoryNode>;
  readonly files: SrcComponentsTreeFileNode[];
}

function compareSegment(a: string, b: string): number {
  return a.localeCompare(b, undefined, SORT_LOCALE_OPTIONS);
}

function workspaceRootPathFromPrefix(prefix: string): string {
  return prefix.length > 0 ? `${prefix}/src/components` : "src/components";
}

function splitAtComponentsSegment(fullPath: string): { prefix: string; tail: string } | null {
  const normalized = normalizeSidebarComponentCatalogPath(fullPath);

  if (normalized.startsWith(TOP_LEVEL_SRC_COMPONENTS_PREFIX)) {
    return {
      prefix: "",
      tail: normalized.slice(TOP_LEVEL_SRC_COMPONENTS_PREFIX.length),
    };
  }

  const idx = normalized.indexOf(SRC_COMPONENTS_SEGMENT);
  if (idx === -1) {
    return null;
  }
  return {
    prefix: normalized.slice(0, idx),
    tail: normalized.slice(idx + SRC_COMPONENTS_SEGMENT.length),
  };
}

function mutableDirToNodes(directory: MutableDirectoryNode): SrcComponentsTreeNode[] {
  const subdirectories: SrcComponentsTreeDirectoryNode[] = Array.from(
    directory.directories.values(),
  )
    .toSorted((a, b) => compareSegment(a.segmentName, b.segmentName))
    .map<SrcComponentsTreeDirectoryNode>((sub) => ({
      kind: "directory",
      name: sub.segmentName,
      path: sub.workspacePath,
      children: mutableDirToNodes(sub),
    }));

  const files = directory.files.toSorted((a, b) => compareSegment(a.name, b.name));
  return [...subdirectories, ...files];
}

/**
 * Groups flat catalog paths into one subtree per `…/src/components` package root.
 * Directories are not compacted — each segment is its own folder row.
 */
export function buildSrcComponentsTree(paths: readonly string[]): SrcComponentsTreeRoot[] {
  const byPrefix = new Map<string, string[]>();

  for (const rawPath of paths) {
    const split = splitAtComponentsSegment(rawPath);
    if (!split) {
      continue;
    }
    const { prefix, tail } = split;
    if (tail.length === 0) {
      continue;
    }

    let bucket = byPrefix.get(prefix);
    if (!bucket) {
      bucket = [];
      byPrefix.set(prefix, bucket);
    }
    bucket.push(normalizeSidebarComponentCatalogPath(rawPath));
  }

  const sortedPrefixes = [...byPrefix.keys()].toSorted((a, b) =>
    compareSegment(workspaceRootPathFromPrefix(a), workspaceRootPathFromPrefix(b)),
  );

  const roots: SrcComponentsTreeRoot[] = [];

  for (const prefix of sortedPrefixes) {
    const rootPath = workspaceRootPathFromPrefix(prefix);
    const mutableRoot: MutableDirectoryNode = {
      segmentName: "",
      workspacePath: rootPath,
      directories: new Map(),
      files: [],
    };

    const bucket = byPrefix.get(prefix);
    if (!bucket) {
      continue;
    }

    for (const fullPath of bucket) {
      const tailParts = splitAtComponentsSegment(fullPath);
      if (!tailParts) {
        continue;
      }
      const segments = tailParts.tail.split("/").filter((segment) => segment.length > 0);
      if (segments.length === 0) {
        continue;
      }

      let cursor = mutableRoot;
      let cursorPath = rootPath;

      for (let index = 0; index < segments.length - 1; index++) {
        const segment = segments[index];
        if (!segment) {
          continue;
        }
        cursorPath = `${cursorPath}/${segment}`;
        let nextDir = cursor.directories.get(segment);
        if (!nextDir) {
          nextDir = {
            segmentName: segment,
            workspacePath: cursorPath,
            directories: new Map(),
            files: [],
          };
          cursor.directories.set(segment, nextDir);
        }
        cursor = nextDir;
      }

      const fileName = segments[segments.length - 1];
      if (!fileName) {
        continue;
      }

      cursor.files.push({
        kind: "file",
        name: fileName,
        relativePath: fullPath,
      });
    }

    roots.push({
      rootLabel: rootPath,
      rootPath,
      nodes: mutableDirToNodes(mutableRoot),
    });
  }

  return roots;
}

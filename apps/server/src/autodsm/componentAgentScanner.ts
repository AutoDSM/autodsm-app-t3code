// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as path from "node:path";

import type { AutoDsmWorkspaceStarterId } from "@t3tools/contracts";
import { resolvePrimaryExportName } from "@t3tools/shared/componentVariantFamily";

export interface ScannedComponentAgent {
  readonly title: string;
  readonly componentPath: string;
  /**
   * Named export within {@link componentPath} that this agent represents.
   * Omitted when the file has a single discoverable export (legacy / default
   * shape — preserves back-compat for the existing 40+ agents). Stamped per
   * variant when a single wrapper file exposes multiple named exports.
   */
  readonly exportName?: string;
  readonly group?: string;
}

export interface ScannerOverlayEntry {
  readonly title?: string;
  readonly componentPath: string;
  /**
   * Optional named export the overlay entry targets. When omitted, the
   * overlay applies to the file's default agent (sole-export case). When
   * present, it picks a specific variant export within a multi-export file.
   */
  readonly exportName?: string;
  readonly group?: string;
}

export interface ScannerOverlay {
  readonly agents: ReadonlyArray<ScannerOverlayEntry>;
}

export interface ScanTemplateComponentAgentsInput {
  readonly systemDir: string;
  readonly starterId: AutoDsmWorkspaceStarterId;
  readonly overlay?: ScannerOverlay | null;
}

const ATOMIC_GROUP_NAMES: ReadonlySet<string> = new Set([
  "atoms",
  "molecules",
  "organisms",
  "templates",
  "pages",
]);

const STARTER_PREFIX_BY_ID: Record<AutoDsmWorkspaceStarterId, readonly string[]> = {
  "shadcn-ui": ["Shadcn"],
  mui: ["Mui"],
  "chakra-ui": ["Chakra"],
  "tailwind-css": ["Tw", "Tailwind"],
  "modern-starter": [],
};

const SKIP_FILE_SUFFIXES: readonly string[] = [".test.tsx", ".stories.tsx", ".spec.tsx"];

/**
 * Component basenames that AutoDSM treats as design-system primitives rather
 * than composed components. Their styles live in the Design Tokens dashboard
 * (e.g. typography lives in `DesignTokenTypographySection`) and they are
 * intentionally hidden from the component sidebar.
 *
 * Matched case-insensitively against the file basename with the `.tsx`
 * extension stripped. Trailing match is intentional so prefixed wrappers like
 * `ShadcnTypography.tsx`, `MuiTypography.tsx`, and `TwTypography.tsx` all hit.
 */
const SKIP_BASENAME_SUFFIXES_CI: ReadonlySet<string> = new Set(["typography"]);

const EXPORT_DEFAULT_RE = /\bexport\s+default\b/;
const EXPORT_NAMED_PASCAL_RE = /\bexport\s+(?:function|const|class|let|var)\s+([A-Z][A-Za-z0-9_]*)/;
const EXPORT_NAMED_PASCAL_GLOBAL_RE =
  /\bexport\s+(?:function|const|class|let|var)\s+([A-Z][A-Za-z0-9_]*)/g;

function normalizeComponentPath(rel: string): string {
  const normalized = rel.replace(/\\/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function isHidden(name: string): boolean {
  return name.startsWith(".") || name.startsWith("_");
}

function shouldSkipFile(name: string): boolean {
  if (isHidden(name)) return true;
  if (!name.endsWith(".tsx")) return true;
  if (SKIP_FILE_SUFFIXES.some((suffix) => name.endsWith(suffix))) return true;
  const baseLower = name.replace(/\.tsx$/i, "").toLowerCase();
  for (const skipSuffix of SKIP_BASENAME_SUFFIXES_CI) {
    if (baseLower === skipSuffix || baseLower.endsWith(skipSuffix)) {
      return true;
    }
  }
  return false;
}

function fileHasComponentExport(absPath: string): boolean {
  try {
    const contents = fs.readFileSync(absPath, "utf8").slice(0, 16_000);
    if (EXPORT_DEFAULT_RE.test(contents)) return true;
    return EXPORT_NAMED_PASCAL_RE.test(contents);
  } catch {
    return false;
  }
}

/**
 * Collect every PascalCase named export the file declares (deduplicated).
 * Returns an empty array when the file has only a default export — callers
 * fall back to the file-level (no `exportName`) agent in that case.
 */
function collectNamedPascalExports(absPath: string): readonly string[] {
  let contents: string;
  try {
    contents = fs.readFileSync(absPath, "utf8").slice(0, 64_000);
  } catch {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of contents.matchAll(EXPORT_NAMED_PASCAL_GLOBAL_RE)) {
    const name = match[1];
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

function stripStarterPrefix(base: string, starterId: AutoDsmWorkspaceStarterId): string {
  const prefixes = STARTER_PREFIX_BY_ID[starterId];
  for (const prefix of prefixes) {
    if (base.length > prefix.length && base.startsWith(prefix)) {
      const rest = base.slice(prefix.length);
      if (rest[0] && rest[0] >= "A" && rest[0] <= "Z") {
        return rest;
      }
    }
  }
  return base;
}

function titleCaseFromIdentifier(identifier: string): string {
  // Insert spaces between camel/Pascal humps; keep acronyms readable.
  const spaced = identifier
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
  return spaced.length === 0 ? identifier : spaced;
}

function deriveTitle(fileBase: string, starterId: AutoDsmWorkspaceStarterId): string {
  const noExt = fileBase.replace(/\.tsx$/, "");
  const stripped = stripStarterPrefix(noExt, starterId);
  return titleCaseFromIdentifier(stripped);
}

/**
 * Title for a per-export agent — strips starter prefix from the export name
 * directly (e.g. `ShadcnButtonOutline` → `Button Outline`).
 */
function deriveTitleFromExportName(
  exportName: string,
  starterId: AutoDsmWorkspaceStarterId,
): string {
  return titleCaseFromIdentifier(stripStarterPrefix(exportName, starterId));
}

function deriveGroup(dirSegments: readonly string[]): string | undefined {
  if (dirSegments.length === 0) {
    return undefined;
  }
  const first = dirSegments[0]!.toLowerCase();
  if (ATOMIC_GROUP_NAMES.has(first)) {
    return first.charAt(0).toUpperCase() + first.slice(1);
  }
  return dirSegments[0];
}

function walk(
  componentsRoot: string,
  starterId: AutoDsmWorkspaceStarterId,
): ScannedComponentAgent[] {
  const out: ScannedComponentAgent[] = [];

  const visit = (absDir: string, relSegments: readonly string[]): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (isHidden(entry.name)) {
        continue;
      }
      const childAbs = path.join(absDir, entry.name);
      if (entry.isDirectory()) {
        visit(childAbs, [...relSegments, entry.name]);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      if (shouldSkipFile(entry.name)) {
        continue;
      }
      if (!fileHasComponentExport(childAbs)) {
        continue;
      }
      const componentPath = normalizeComponentPath(
        path.posix.join("src/components", ...relSegments, entry.name),
      );
      const dirGroup = deriveGroup(relSegments);
      const namedExports = collectNamedPascalExports(childAbs);
      // One agent per component file. Multi-export wrappers stamp the primary
      // export so preview defaults to the canonical component.
      if (namedExports.length > 1) {
        const exportSpecs = namedExports.map((name) => ({
          name,
          isDefault: false,
          kind: "function" as const,
        }));
        const primaryExportName = resolvePrimaryExportName(exportSpecs, componentPath);
        out.push({
          title: deriveTitle(entry.name, starterId),
          componentPath,
          exportName: primaryExportName,
          ...(dirGroup ? { group: dirGroup } : {}),
        });
      } else {
        out.push({
          title: deriveTitle(entry.name, starterId),
          componentPath,
          ...(dirGroup ? { group: dirGroup } : {}),
        });
      }
    }
  };

  visit(componentsRoot, []);
  return out;
}

/**
 * Merge key for overlay ↔ scanned matching. Agents are uniquely identified
 * by `componentPath` (one agent per file). Optional `exportName` on overlay
 * entries is legacy and matches when it equals the scanned primary export.
 */
function overlayMatchesAgent(entry: ScannerOverlayEntry, agent: ScannedComponentAgent): boolean {
  const componentPath = normalizeComponentPath(entry.componentPath);
  if (componentPath !== agent.componentPath) {
    return false;
  }
  const overlayExport = entry.exportName?.trim();
  if (!overlayExport) {
    return true;
  }
  return overlayExport === agent.exportName;
}

function applyOverlay(
  scanned: readonly ScannedComponentAgent[],
  overlay: ScannerOverlay | null | undefined,
): ScannedComponentAgent[] {
  if (!overlay || !Array.isArray(overlay.agents) || overlay.agents.length === 0) {
    return [...scanned];
  }
  const merged: ScannedComponentAgent[] = [];
  const consumedOverlayIndices = new Set<number>();
  for (const agent of scanned) {
    let override: ScannerOverlayEntry | undefined;
    let overrideIndex = -1;
    overlay.agents.forEach((entry, index) => {
      if (consumedOverlayIndices.has(index)) {
        return;
      }
      if (!overlayMatchesAgent(entry, agent)) {
        return;
      }
      // Prefer file-level overlay rows (no exportName) over legacy variant rows.
      if (override && override.exportName?.trim() && !entry.exportName?.trim()) {
        override = entry;
        overrideIndex = index;
        return;
      }
      if (!override) {
        override = entry;
        overrideIndex = index;
      }
    });
    if (override && overrideIndex >= 0) {
      consumedOverlayIndices.add(overrideIndex);
      merged.push({
        title: override.title?.trim() || agent.title,
        componentPath: agent.componentPath,
        ...(agent.exportName ? { exportName: agent.exportName } : {}),
        ...(override.group?.trim()
          ? { group: override.group.trim() }
          : agent.group
            ? { group: agent.group }
            : {}),
      });
    } else {
      merged.push(agent);
    }
  }
  // Overlay entries that did not match a scanned agent get appended (curated
  // entries can still seed an agent before its file lands on disk).
  overlay.agents.forEach((entry, index) => {
    if (consumedOverlayIndices.has(index)) {
      return;
    }
    const componentPath = normalizeComponentPath(entry.componentPath);
    const exportName = entry.exportName?.trim() || undefined;
    // Legacy per-variant overlay rows are ignored once the file is scanned.
    if (exportName && scanned.some((agent) => agent.componentPath === componentPath)) {
      return;
    }
    merged.push({
      title:
        entry.title?.trim() ||
        (exportName
          ? deriveTitleFromExportName(exportName, "modern-starter")
          : titleCaseFromIdentifier(
              stripStarterPrefix(
                path.posix.basename(componentPath).replace(/\.tsx$/, ""),
                "modern-starter",
              ),
            )),
      componentPath,
      ...(exportName ? { exportName } : {}),
      ...(entry.group?.trim() ? { group: entry.group.trim() } : {}),
    });
  });
  return merged;
}

/**
 * Scan a materialized template `system/src/components/**\/*.tsx` tree and produce the
 * full set of component-agent seeds. The optional overlay (parsed from a curated
 * `component-agents.json`) supplies title overrides and group assignments by
 * `componentPath`. Curated entries that point at files which do not exist yet are
 * still emitted so they can seed an agent for an in-progress component.
 */
export function scanTemplateComponentAgents(
  input: ScanTemplateComponentAgentsInput,
): readonly ScannedComponentAgent[] {
  const componentsRoot = path.join(input.systemDir, "src", "components");
  if (!fs.existsSync(componentsRoot)) {
    return applyOverlay([], input.overlay ?? null);
  }
  const scanned = walk(componentsRoot, input.starterId);
  return applyOverlay(scanned, input.overlay ?? null);
}

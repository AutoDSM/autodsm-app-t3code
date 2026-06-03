import type { AutoDsmComponentRegistryEntry } from "@t3tools/contracts";

import type { AutoDsmComponentAgentGroup } from "~/lib/autoDsmComponentAgentGroups";
import { normalizeSidebarComponentCatalogPath } from "~/lib/srcComponentsWorkspacePaths";

// Render health is derived from the component preview analysis already produced
// for the workspace component registry (`manifest.diagnostics`). A component with
// no diagnostics renders cleanly ("ok"); any diagnostics (e.g. "could not load
// source file") mean the preview is degraded ("warning"). "error" is reserved for
// a hard preview failure should the registry start surfacing one — aggregation and
// the UI already handle it.
export type RenderHealthStatus = "ok" | "warning" | "error";

const STATUS_RANK: Record<RenderHealthStatus, number> = { ok: 0, warning: 1, error: 2 };

export interface ComponentRenderHealth {
  readonly status: RenderHealthStatus;
  readonly diagnosticsCount: number;
  /** First diagnostic message, surfaced as a tooltip on the sidebar badge. */
  readonly firstDiagnostic: string | null;
}

export interface GroupRenderHealth {
  readonly status: RenderHealthStatus;
  /** Number of components in the group whose status is not "ok". */
  readonly affectedCount: number;
  /** First diagnostic across the group's affected components, for a tooltip. */
  readonly firstDiagnostic: string | null;
}

/** A component is healthy when its preview analysis produced no diagnostics. */
export function componentRenderHealthStatus(diagnostics: readonly string[]): RenderHealthStatus {
  return diagnostics.length > 0 ? "warning" : "ok";
}

function worse(a: RenderHealthStatus, b: RenderHealthStatus): RenderHealthStatus {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

/**
 * Build a normalized-path → health map from the workspace component registry.
 * Multiple entries mapping to the same normalized path keep the worst status.
 */
export function buildRenderHealthByPath(
  entries: readonly AutoDsmComponentRegistryEntry[],
): Map<string, ComponentRenderHealth> {
  const byPath = new Map<string, ComponentRenderHealth>();
  for (const entry of entries) {
    const diagnostics = entry.manifest.diagnostics;
    const health: ComponentRenderHealth = {
      status: componentRenderHealthStatus(diagnostics),
      diagnosticsCount: diagnostics.length,
      firstDiagnostic: diagnostics[0] ?? null,
    };
    const key = normalizeSidebarComponentCatalogPath(entry.relativePath);
    const existing = byPath.get(key);
    if (!existing || STATUS_RANK[health.status] > STATUS_RANK[existing.status]) {
      byPath.set(key, health);
    }
  }
  return byPath;
}

/** Aggregate per-component health into a single status + summary for one group. */
export function resolveGroupRenderHealth(
  group: AutoDsmComponentAgentGroup,
  healthByPath: ReadonlyMap<string, ComponentRenderHealth>,
): GroupRenderHealth {
  let status: RenderHealthStatus = "ok";
  let affectedCount = 0;
  let firstDiagnostic: string | null = null;
  for (const tab of group.tabs) {
    const key = normalizeSidebarComponentCatalogPath(tab.componentPath);
    const health = healthByPath.get(key);
    if (!health || health.status === "ok") {
      continue;
    }
    affectedCount += 1;
    status = worse(status, health.status);
    if (firstDiagnostic === null) {
      firstDiagnostic = health.firstDiagnostic;
    }
  }
  return { status, affectedCount, firstDiagnostic };
}

/** Per-group health keyed by groupId, for the sidebar tree to render badges. */
export function buildGroupRenderHealth(
  groups: readonly AutoDsmComponentAgentGroup[],
  healthByPath: ReadonlyMap<string, ComponentRenderHealth>,
): Map<string, GroupRenderHealth> {
  const result = new Map<string, GroupRenderHealth>();
  for (const group of groups) {
    result.set(group.groupId, resolveGroupRenderHealth(group, healthByPath));
  }
  return result;
}

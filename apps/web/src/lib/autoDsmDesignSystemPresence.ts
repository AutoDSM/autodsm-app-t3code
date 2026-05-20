import type { AutoDsmWorkspaceHistoryEntry, AutoDsmWorkspaceStarterId } from "@t3tools/contracts";

import {
  getStarterCatalogEntry,
  isAutoDsmStarterId,
  type AutoDsmStarterId,
} from "~/lib/autoDsmStarterCatalog";

export function hasAutoDsmDesignSystem(entries: readonly AutoDsmWorkspaceHistoryEntry[]): boolean {
  return entries.length >= 1;
}

/** Newest entry by createdAt (history is pre-sorted desc on server). */
export function getPrimaryAutoDsmDesignSystemEntry(
  entries: readonly AutoDsmWorkspaceHistoryEntry[],
): AutoDsmWorkspaceHistoryEntry | null {
  return entries[0] ?? null;
}

export function formatAutoDsmStarterLabel(starterId: AutoDsmWorkspaceStarterId): string {
  if (isAutoDsmStarterId(starterId)) {
    return getStarterCatalogEntry(starterId as AutoDsmStarterId).label;
  }
  return starterId;
}

export function findAutoDsmDesignSystemEntryForPath(
  entries: readonly AutoDsmWorkspaceHistoryEntry[],
  cwd: string | null | undefined,
): AutoDsmWorkspaceHistoryEntry | null {
  if (!cwd?.trim()) {
    return getPrimaryAutoDsmDesignSystemEntry(entries);
  }
  const normalized = cwd.replace(/\\/g, "/").replace(/\/+$/, "");
  const match = entries.find(
    (entry) => entry.systemPath.replace(/\\/g, "/").replace(/\/+$/, "") === normalized,
  );
  return match ?? getPrimaryAutoDsmDesignSystemEntry(entries);
}

export function isAutoDsmDesignSystemAlreadyExistsError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.includes("A design system already exists on this machine");
}

export async function fetchHasAutoDsmDesignSystemOnDisk(): Promise<boolean> {
  const { readPrimaryEnvironmentDescriptor } = await import("~/environments/primary");
  const { readEnvironmentApi } = await import("~/environmentApi");
  const environmentId = readPrimaryEnvironmentDescriptor()?.environmentId;
  if (!environmentId) {
    return false;
  }
  const api = readEnvironmentApi(environmentId);
  if (!api) {
    return false;
  }
  try {
    const result = await api.autodsm.listWorkspaceHistory({});
    return hasAutoDsmDesignSystem(result.entries);
  } catch {
    return false;
  }
}

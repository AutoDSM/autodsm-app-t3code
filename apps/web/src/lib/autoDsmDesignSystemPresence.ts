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

export interface FetchAutoDsmDesignSystemOnDiskResult {
  readonly hasMatch: boolean;
  readonly entries: readonly AutoDsmWorkspaceHistoryEntry[];
}

/**
 * Looks up workspace history on disk, optionally filtered to the signed-in user's
 * `ownerSubject`. When `ownerSubject` is omitted (unauth / fake auth / Supabase
 * disabled), falls back to the unfiltered list — preserving today's behavior for
 * dev/local flows.
 */
export async function fetchAutoDsmDesignSystemOnDisk(
  input: { readonly ownerSubject?: string | undefined } = {},
): Promise<FetchAutoDsmDesignSystemOnDiskResult> {
  const { readPrimaryEnvironmentDescriptor } = await import("~/environments/primary");
  const { readEnvironmentApi } = await import("~/environmentApi");
  const environmentId = readPrimaryEnvironmentDescriptor()?.environmentId;
  if (!environmentId) {
    return { hasMatch: false, entries: [] };
  }
  const api = readEnvironmentApi(environmentId);
  if (!api) {
    return { hasMatch: false, entries: [] };
  }
  try {
    const owner = input.ownerSubject?.trim();
    const result = await api.autodsm.listWorkspaceHistory(
      owner ? { ownerSubject: owner } : {},
    );
    return { hasMatch: hasAutoDsmDesignSystem(result.entries), entries: result.entries };
  } catch {
    return { hasMatch: false, entries: [] };
  }
}

/** Back-compat boolean shape. Prefer `fetchAutoDsmDesignSystemOnDisk` for new code. */
export async function fetchHasAutoDsmDesignSystemOnDisk(
  input: { readonly ownerSubject?: string | undefined } = {},
): Promise<boolean> {
  return (await fetchAutoDsmDesignSystemOnDisk(input)).hasMatch;
}

/**
 * Reads the signed-in Supabase user id, or `undefined` when Supabase is not
 * configured / no session exists. Callers should treat `undefined` as "no owner
 * filter" so legacy/fake-auth flows keep working.
 */
export async function resolveOwnerSubjectFromSupabase(): Promise<string | undefined> {
  try {
    const { getSupabaseBrowserClient } = await import("./supabase/browserClient");
    const client = getSupabaseBrowserClient();
    if (client === null) {
      return undefined;
    }
    const { data } = await client.auth.getUser();
    return data.user?.id ?? undefined;
  } catch {
    return undefined;
  }
}

import type { EnvironmentId, ProjectSearchEntriesResult } from "@t3tools/contracts";
import { queryOptions } from "@tanstack/react-query";
import { ensureEnvironmentApi } from "~/environmentApi";

export type ProjectSearchEntriesEntryKindFilter = "file" | "all";

export const projectQueryKeys = {
  all: ["projects"] as const,
  searchEntries: (
    environmentId: EnvironmentId | null,
    cwd: string | null,
    query: string,
    limit: number,
    entryKind: ProjectSearchEntriesEntryKindFilter,
    entryPathSubstring: string,
  ) =>
    [
      "projects",
      "search-entries",
      environmentId ?? null,
      cwd,
      query,
      limit,
      entryKind,
      entryPathSubstring,
    ] as const,
};

const DEFAULT_SEARCH_ENTRIES_LIMIT = 80;
const DEFAULT_SEARCH_ENTRIES_STALE_TIME = 15_000;
const EMPTY_SEARCH_ENTRIES_RESULT: ProjectSearchEntriesResult = {
  entries: [],
  truncated: false,
};

export function projectSearchEntriesQueryOptions(input: {
  environmentId: EnvironmentId | null;
  cwd: string | null;
  query: string;
  enabled?: boolean;
  limit?: number;
  staleTime?: number;
  /** When `"file"`, server skips directories before ranking (sidebar file-only lists). */
  entryKind?: "file";
  /** When set, scopes server-side indexing to paths containing this fragment (slash-prefixed). */
  entryPathSubstring?: string;
}) {
  const limit = input.limit ?? DEFAULT_SEARCH_ENTRIES_LIMIT;
  const trimmedQuery = input.query.trim();
  const substring = input.entryPathSubstring?.trim() ?? "";
  const entryKindFilter: ProjectSearchEntriesEntryKindFilter =
    input.entryKind === "file" ? "file" : "all";
  return queryOptions({
    queryKey: projectQueryKeys.searchEntries(
      input.environmentId,
      input.cwd,
      input.query,
      limit,
      entryKindFilter,
      substring,
    ),
    queryFn: async () => {
      if (!input.cwd || !input.environmentId) {
        throw new Error("Workspace entry search is unavailable.");
      }
      const api = ensureEnvironmentApi(input.environmentId);
      return api.projects.searchEntries({
        cwd: input.cwd,
        query: trimmedQuery.length > 0 ? trimmedQuery : "",
        limit,
        ...(input.entryKind === "file" ? { entryKind: "file" as const } : {}),
        ...(substring.length > 0 ? { entryPathSubstring: substring } : {}),
      });
    },
    enabled:
      (input.enabled ?? true) &&
      input.environmentId !== null &&
      input.cwd !== null &&
      (trimmedQuery.length > 0 || substring.length > 0),
    staleTime: input.staleTime ?? DEFAULT_SEARCH_ENTRIES_STALE_TIME,
    placeholderData: (previous) => previous ?? EMPTY_SEARCH_ENTRIES_RESULT,
  });
}

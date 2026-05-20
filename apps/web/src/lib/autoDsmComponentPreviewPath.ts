import { sanitizeComponentPreviewPathForSearch } from "~/diffRouteSearch";
import { normalizeSidebarComponentCatalogPath } from "~/lib/srcComponentsWorkspacePaths";

/** Canonical slashless `src/components/...` path for store, tabs, and URL search. */
export function canonicalAutoDsmComponentPreviewPath(
  raw: string | null | undefined,
): string | null {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return null;
  }
  const normalized = normalizeSidebarComponentCatalogPath(raw);
  return sanitizeComponentPreviewPathForSearch(normalized) ?? null;
}

export function canonicalAutoDsmComponentPreviewPaths(
  paths: Readonly<Record<string, string>>,
): Record<string, string> {
  const canonical: Record<string, string> = {};
  for (const [key, value] of Object.entries(paths)) {
    const path = canonicalAutoDsmComponentPreviewPath(value);
    if (path) {
      canonical[key] = path;
    }
  }
  return canonical;
}

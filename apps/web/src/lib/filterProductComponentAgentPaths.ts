import type { SrcComponentsCatalogViewModel } from "~/lib/srcComponentsCatalog";
import {
  dedupeStableSorted,
  normalizeSidebarComponentCatalogPath,
} from "~/lib/srcComponentsWorkspacePaths";

/**
 * Restricts a src/components catalog to paths declared in the component-agents manifest.
 * Used in materialized AutoDSM product mode so registry indexing does not drive navigation.
 */
export function filterProductComponentAgentPaths(
  catalog: SrcComponentsCatalogViewModel,
  allowedPaths: readonly string[],
): SrcComponentsCatalogViewModel {
  if (allowedPaths.length === 0) {
    return { ...catalog, paths: [] };
  }

  const allowed = new Set(
    allowedPaths.map((pathValue) => normalizeSidebarComponentCatalogPath(pathValue)),
  );
  const filtered = catalog.paths.filter((pathValue) =>
    allowed.has(normalizeSidebarComponentCatalogPath(pathValue)),
  );

  return {
    ...catalog,
    paths: dedupeStableSorted(filtered),
  };
}

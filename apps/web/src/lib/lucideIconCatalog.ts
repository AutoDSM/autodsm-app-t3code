import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";

const LUCIDE_EXPORT_SKIP = new Set([
  "createLucideIcon",
  "default",
  "icons",
  "Icon",
  "LucideIcon",
  "DynamicIcon",
]);

function exportNameToKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

function isLucideIconComponent(value: unknown): value is LucideIcon {
  if (typeof value === "function") {
    return true;
  }
  return typeof value === "object" && value !== null && ("render" in value || "$$typeof" in value);
}

export interface LucideCatalogEntry {
  readonly id: string;
  readonly Icon: LucideIcon;
}

let cachedCatalog: readonly LucideCatalogEntry[] | null = null;

/** Lazily-built list of lucide-react icons for the Icons tab grid. */
export function listLucideIconCatalog(): readonly LucideCatalogEntry[] {
  if (cachedCatalog !== null) {
    return cachedCatalog;
  }
  const entries: LucideCatalogEntry[] = [];
  for (const [exportName, component] of Object.entries(LucideIcons)) {
    if (LUCIDE_EXPORT_SKIP.has(exportName)) {
      continue;
    }
    if (!/^[A-Z]/.test(exportName) || !isLucideIconComponent(component)) {
      continue;
    }
    entries.push({ id: exportNameToKebab(exportName), Icon: component });
  }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  cachedCatalog = entries;
  return cachedCatalog;
}

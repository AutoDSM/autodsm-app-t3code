import type { AutoDsmProjectProfile } from "@t3tools/contracts";

/** Dependency keys surfaced as human-readable versions in settings. */
export const PROJECT_FOLDER_DISPLAY_PACKAGE_KEYS = [
  "react",
  "react-dom",
  "next",
  "vite",
  "typescript",
  "tailwindcss",
  "@tanstack/react-router",
  "@tanstack/react-query",
  "react-router-dom",
  "zustand",
] as const;

export function pickDisplayPackageVersions(packageVersions: Record<string, string>): ReadonlyArray<{
  readonly name: string;
  readonly version: string;
}> {
  const out: { name: string; version: string }[] = [];
  for (const key of PROJECT_FOLDER_DISPLAY_PACKAGE_KEYS) {
    const version = packageVersions[key];
    if (version) {
      out.push({ name: key, version });
    }
  }
  return out;
}

export function formatProjectProfileStatus(status: AutoDsmProjectProfile["status"]): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "indexing":
      return "Indexing";
    case "failed":
      return "Failed";
    case "partial":
      return "Partial";
    case "stale":
      return "Stale";
    case "not_started":
      return "Not started";
    default:
      return status;
  }
}

export function formatPackageManagerLabel(
  packageManager: AutoDsmProjectProfile["packageManager"],
): string {
  return packageManager === "unknown" ? "Unknown" : packageManager;
}

export function formatCommaList(items: readonly string[], emptyLabel = "None detected"): string {
  return items.length > 0 ? items.join(", ") : emptyLabel;
}

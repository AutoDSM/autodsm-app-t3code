import type { AutoDsmBrandToken } from "@t3tools/contracts";

import { tokenDisplayName } from "~/lib/designTokenGroups";

/** Semantic color subgroups for the Colors tab. */
export type DesignTokenColorRole = "surfaces" | "action" | "foreground" | "semantic";

export const DESIGN_TOKEN_COLOR_ROLE_ORDER = [
  "surfaces",
  "action",
  "foreground",
  "semantic",
] as const satisfies readonly DesignTokenColorRole[];

export const DESIGN_TOKEN_COLOR_ROLE_LABEL: Record<DesignTokenColorRole, string> = {
  surfaces: "Surfaces",
  action: "Action",
  foreground: "Foreground",
  semantic: "Semantic",
};

const SURFACE_NAMES = new Set(["background", "card", "popover"]);
const ACTION_NAMES = new Set(["primary", "accent", "ring", "secondary"]);
const FOREGROUND_NAMES = new Set(["foreground", "muted-foreground"]);
const SEMANTIC_NAMES = new Set([
  "destructive",
  "success",
  "warning",
  "info",
  "destructive-foreground",
  "success-foreground",
  "warning-foreground",
  "info-foreground",
]);

function normalizedName(token: AutoDsmBrandToken): string {
  return tokenDisplayName(token).toLowerCase();
}

/** Classify a branding color token into a UI subgroup. */
export function classifyDesignTokenColorRole(token: AutoDsmBrandToken): DesignTokenColorRole {
  const name = normalizedName(token);
  const base = name.endsWith("-foreground") ? name.slice(0, -"-foreground".length) : name;

  if (SEMANTIC_NAMES.has(name) || SEMANTIC_NAMES.has(base)) {
    return "semantic";
  }
  if (SURFACE_NAMES.has(name) || SURFACE_NAMES.has(base)) {
    return "surfaces";
  }
  if (FOREGROUND_NAMES.has(name)) {
    return "foreground";
  }
  if (ACTION_NAMES.has(name) || ACTION_NAMES.has(base)) {
    return "action";
  }
  if (name.includes("destructive") || name.includes("success") || name.includes("warning")) {
    return "semantic";
  }
  if (name.includes("foreground") || name.endsWith("-foreground")) {
    return "foreground";
  }
  if (
    name.includes("background") ||
    name.includes("card") ||
    name.includes("popover") ||
    name.includes("surface")
  ) {
    return "surfaces";
  }
  if (
    name.includes("primary") ||
    name.includes("accent") ||
    name.includes("ring") ||
    name.includes("secondary")
  ) {
    return "action";
  }
  return "semantic";
}

export interface DesignTokenColorRoleGroup {
  readonly role: DesignTokenColorRole;
  readonly tokens: readonly AutoDsmBrandToken[];
}

/** Partition color tokens into ordered semantic subgroups. */
export function groupColorTokensByRole(
  tokens: readonly AutoDsmBrandToken[],
): readonly DesignTokenColorRoleGroup[] {
  const buckets = new Map<DesignTokenColorRole, AutoDsmBrandToken[]>(
    DESIGN_TOKEN_COLOR_ROLE_ORDER.map((role) => [role, []]),
  );
  for (const token of tokens) {
    const role = classifyDesignTokenColorRole(token);
    buckets.get(role)?.push(token);
  }
  return DESIGN_TOKEN_COLOR_ROLE_ORDER.map((role) => ({
    role,
    tokens: buckets.get(role) ?? [],
  })).filter((group) => group.tokens.length > 0);
}

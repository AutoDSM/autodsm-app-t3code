/**
 * Launch starter templates for AutoDSM workspace creation (onboarding + future ForkService).
 * IDs align with future `~/.autodsm/cache/<starterId>/` and server-side fork templates.
 */
export const AUTO_DSM_STARTER_IDS = [
  "modern-starter",
  "shadcn-ui",
  "mui",
  "chakra-ui",
  "tailwind-css",
] as const;

export type AutoDsmStarterId = (typeof AUTO_DSM_STARTER_IDS)[number];

export interface AutoDsmStarterCatalogEntry {
  readonly id: AutoDsmStarterId;
  /** Single line shown in pickers and loading copy */
  readonly label: string;
  /** Path: scratch maps to modern-starter only */
  readonly path: "scratch" | "library";
}

export const AUTO_DSM_STARTER_CATALOG: readonly AutoDsmStarterCatalogEntry[] = [
  { id: "modern-starter", label: "Build from scratch", path: "scratch" },
  { id: "shadcn-ui", label: "Shadcn UI", path: "library" },
  { id: "mui", label: "Material UI", path: "library" },
  { id: "chakra-ui", label: "Chakra UI", path: "library" },
  { id: "tailwind-css", label: "Tailwind CSS", path: "library" },
];

const STARTER_BY_ID = new Map<AutoDsmStarterId, AutoDsmStarterCatalogEntry>(
  AUTO_DSM_STARTER_CATALOG.map((e) => [e.id, e]),
);

export function isAutoDsmStarterId(value: unknown): value is AutoDsmStarterId {
  return typeof value === "string" && (AUTO_DSM_STARTER_IDS as readonly string[]).includes(value);
}

export function getStarterCatalogEntry(id: AutoDsmStarterId): AutoDsmStarterCatalogEntry {
  return STARTER_BY_ID.get(id)!;
}

/** Library pickers: all starters except modern-starter */
export const AUTO_DSM_LIBRARY_STARTERS: readonly AutoDsmStarterCatalogEntry[] =
  AUTO_DSM_STARTER_CATALOG.filter((e) => e.path === "library");

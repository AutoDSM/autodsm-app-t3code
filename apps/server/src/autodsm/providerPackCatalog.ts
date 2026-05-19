import type { AutoDsmProviderCatalogEntry } from "@t3tools/contracts";

export type ProviderPackLayer =
  | "theme"
  | "i18n"
  | "router"
  | "data"
  | "state"
  | "portals"
  | "component";

export interface ProviderPackDefinition extends AutoDsmProviderCatalogEntry {
  readonly layer: ProviderPackLayer;
  readonly matchFrameworks: readonly string[];
}

/** Canonical deterministic catalog — ids align with skills/rendering/provider-packs.md */
export const PROVIDER_PACK_CATALOG = [
  {
    id: "pack:shadcn-radix",
    layer: "theme",
    description: "Radix + Tailwind / shadcn-style helpers",
    matchFrameworks: ["radix", "tailwindcss"],
  },
  {
    id: "pack:mui",
    layer: "theme",
    description: "MUI ThemeProvider stack",
    matchFrameworks: ["mui"],
  },
  {
    id: "pack:chakra",
    layer: "theme",
    description: "Chakra UI providers",
    matchFrameworks: ["chakra"],
  },
  {
    id: "pack:mantine",
    layer: "theme",
    description: "Mantine providers",
    matchFrameworks: ["mantine"],
  },
  {
    id: "pack:antd",
    layer: "theme",
    description: "Ant Design ConfigProvider",
    matchFrameworks: ["antd"],
  },
  {
    id: "pack:react-router",
    layer: "router",
    description: "React Router memory/browser harness",
    matchFrameworks: ["react-router"],
  },
  {
    id: "pack:next-router",
    layer: "router",
    description: "Next.js router shim",
    matchFrameworks: ["next"],
  },
  {
    id: "pack:tanstack-router",
    layer: "router",
    description: "TanStack Router harness",
    matchFrameworks: ["tanstack-router"],
  },
  {
    id: "pack:react-query",
    layer: "data",
    description: "TanStack Query provider",
    matchFrameworks: ["react-query"],
  },
  {
    id: "pack:swr",
    layer: "data",
    description: "SWR configuration",
    matchFrameworks: ["swr"],
  },
  {
    id: "pack:redux",
    layer: "state",
    description: "React Redux provider",
    matchFrameworks: ["redux"],
  },
  {
    id: "pack:zustand",
    layer: "state",
    description: "Zustand store initialization",
    matchFrameworks: ["zustand"],
  },
  {
    id: "pack:jotai",
    layer: "state",
    description: "Jotai provider",
    matchFrameworks: ["jotai"],
  },
  {
    id: "pack:recoil",
    layer: "state",
    description: "Recoil root",
    matchFrameworks: ["recoil"],
  },
].toSorted((a, b) => a.id.localeCompare(b.id)) as readonly ProviderPackDefinition[];

export function matchProviderPacks(
  frameworks: readonly string[],
): readonly ProviderPackDefinition[] {
  const hit = new Set<string>();
  const resolved: ProviderPackDefinition[] = [];
  for (const pack of PROVIDER_PACK_CATALOG) {
    const matches = pack.matchFrameworks.some((needle) => frameworks.includes(needle));
    if (matches && !hit.has(pack.id)) {
      hit.add(pack.id);
      resolved.push(pack);
    }
  }
  return resolved;
}

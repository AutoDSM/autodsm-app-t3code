import type { AutoDsmStarterId } from "./autoDsmStarterCatalog";

import chakraUiManifest from "./starter-manifests/chakra-ui.json";
import modernStarterManifest from "./starter-manifests/modern-starter.json";
import muiManifest from "./starter-manifests/mui.json";
import shadcnUiManifest from "./starter-manifests/shadcn-ui.json";
import tailwindCssManifest from "./starter-manifests/tailwind-css.json";

export interface AutoDsmStarterComponentAgent {
  readonly title: string;
  readonly componentPath: string;
  /**
   * Named export within the wrapper file. Omitted for single-export files
   * (legacy back-compat); required when a file exposes multiple variants.
   */
  readonly exportName?: string;
  readonly group?: string;
}

interface StarterComponentAgentsManifest {
  readonly agents: ReadonlyArray<AutoDsmStarterComponentAgent>;
}

const STARTER_COMPONENT_AGENTS_BY_ID: Record<AutoDsmStarterId, StarterComponentAgentsManifest> = {
  "chakra-ui": chakraUiManifest,
  "modern-starter": modernStarterManifest,
  mui: muiManifest,
  "shadcn-ui": shadcnUiManifest,
  "tailwind-css": tailwindCssManifest,
};

export function getStarterComponentAgents(
  starterId: AutoDsmStarterId,
): readonly AutoDsmStarterComponentAgent[] {
  return STARTER_COMPONENT_AGENTS_BY_ID[starterId].agents;
}

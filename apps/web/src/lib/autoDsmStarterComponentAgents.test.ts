import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { AUTO_DSM_STARTER_IDS } from "./autoDsmStarterCatalog";
import { getStarterComponentAgents } from "./autoDsmStarterComponentAgents";

const here = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = path.resolve(here, "../../../..");
const serverTemplatesRoot = path.join(repoRoot, "apps/server/workspace-templates");

describe("autoDsmStarterComponentAgents", () => {
  it("mirrors server workspace-templates component-agents.json manifests", () => {
    for (const starterId of AUTO_DSM_STARTER_IDS) {
      const serverManifestPath = path.join(serverTemplatesRoot, starterId, "component-agents.json");
      const serverRaw = fs.readFileSync(serverManifestPath, "utf8");
      const serverManifest = JSON.parse(serverRaw) as {
        agents: ReadonlyArray<{ title: string; componentPath: string }>;
      };

      expect(getStarterComponentAgents(starterId)).toEqual(serverManifest.agents);
    }
  });
});

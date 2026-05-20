// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { AutoDsmComponentId, ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  loadComponentAgentsManifest,
  registerComponentAgent,
  removeComponentAgent,
  seedComponentAgentsManifest,
  updateComponentAgent,
} from "./componentAgentStore.ts";

function makeSystemCwd(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-agents-"));
  const systemDir = path.join(root, "system");
  fs.mkdirSync(systemDir, { recursive: true });
  fs.writeFileSync(path.join(root, "meta.json"), JSON.stringify({ workspaceId: "workspace-test" }));
  return systemDir;
}

describe("componentAgentStore", () => {
  it("seeds starter agents and registers user agents", () => {
    const cwd = makeSystemCwd();
    const threadId = "11111111-1111-4111-8111-111111111111" as ThreadId;

    seedComponentAgentsManifest({
      cwd,
      agents: [
        {
          threadId,
          title: "Button",
          componentPath: "/src/components/Button.tsx",
          source: "starter",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    const seeded = loadComponentAgentsManifest(cwd);
    expect(seeded.agents).toHaveLength(1);
    expect(seeded.agents[0]?.source).toBe("starter");

    const userThreadId = "22222222-2222-4222-8222-222222222222" as ThreadId;
    const registered = registerComponentAgent({
      cwd,
      threadId: userThreadId,
      title: "Primary Button",
      componentPath: "src/components/PrimaryButton.tsx",
      source: "user",
      status: "creating",
    });
    expect(registered.agent.status).toBe("creating");
    expect(registered.session.threadId).toBe(userThreadId);

    const updated = updateComponentAgent({
      cwd,
      threadId: userThreadId,
      status: "active",
      componentId: AutoDsmComponentId.make("cmp-primary-button"),
    });
    expect(updated.status).toBe("active");
    expect(updated.componentId).toBe("cmp-primary-button");
  });

  it("removes a component agent by thread id", () => {
    const cwd = makeSystemCwd();
    const threadId = "11111111-1111-4111-8111-111111111111" as ThreadId;

    seedComponentAgentsManifest({
      cwd,
      agents: [
        {
          threadId,
          title: "Button",
          componentPath: "/src/components/Button.tsx",
          source: "starter",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    expect(removeComponentAgent({ cwd, threadId })).toEqual({ removed: true });
    expect(loadComponentAgentsManifest(cwd).agents).toHaveLength(0);
    expect(removeComponentAgent({ cwd, threadId })).toEqual({ removed: false });
  });
});

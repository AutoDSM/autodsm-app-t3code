// @effect-diagnostics nodeBuiltinImport:off
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { AutoDsmChangeSetId, ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import { registerComponentAgent } from "./componentAgentStore.ts";
import {
  hydrateChangeSetFromDisk,
  listPersistedChangeSetsForSession,
  persistChangeSet,
} from "./changeSetStore.ts";

function makeSystemCwd(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-changeset-"));
  const systemDir = path.join(root, "system");
  fs.mkdirSync(systemDir, { recursive: true });
  return systemDir;
}

describe("changeSetStore", () => {
  it("persists and reloads session change sets", () => {
    const cwd = makeSystemCwd();
    const threadId = "11111111-1111-4111-8111-111111111111" as ThreadId;
    const { session } = registerComponentAgent({
      cwd,
      threadId,
      title: "Button",
      componentPath: "/src/components/Button.tsx",
      source: "user",
      status: "creating",
    });

    const changeSetId = AutoDsmChangeSetId.make(crypto.randomUUID());
    persistChangeSet({
      cwd,
      sessionId: session.sessionId,
      changeSet: {
        id: changeSetId,
        meta: {
          kind: "change-set",
          schemaVersion: 1,
          owner: "changeset-service",
          invalidationKey: "test-key",
          consumers: ["diff-panel"],
        },
        cwd,
        ops: [],
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });

    const listed = listPersistedChangeSetsForSession(cwd, session.sessionId);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(changeSetId);

    const hydrated = hydrateChangeSetFromDisk(cwd, changeSetId, threadId);
    expect(hydrated?.cwd).toBe(cwd);
  });
});

// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { describe, expect, it, afterEach, beforeEach } from "vitest";
import * as Effect from "effect/Effect";

import {
  listAutodsmWorkspaceHistoryFromDisk,
  resolveAutodsmUserRoot,
} from "./autodsmWorkspaceHistory.ts";

function writeReadyWorkspaceFixture(workspaceRoot: string, meta: Record<string, unknown>): void {
  fs.mkdirSync(path.join(workspaceRoot, "system"), { recursive: true });
  fs.writeFileSync(path.join(workspaceRoot, "meta.json"), JSON.stringify(meta));
  fs.writeFileSync(
    path.join(workspaceRoot, "component-agents.json"),
    JSON.stringify({
      schemaVersion: 1,
      workspaceId: meta.workspaceId,
      agents: [],
    }),
  );
}

describe("autodsmWorkspaceHistory", () => {
  let previousHome: string | undefined;

  beforeEach(() => {
    previousHome = process.env.AUTODSM_HOME;
    process.env.AUTODSM_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-history-test-"));
  });

  afterEach(() => {
    if (previousHome === undefined) {
      delete process.env.AUTODSM_HOME;
    } else {
      process.env.AUTODSM_HOME = previousHome;
    }
  });

  it("returns empty list when no systems exist", async () => {
    const result = await Effect.runPromise(listAutodsmWorkspaceHistoryFromDisk({}));
    expect(result.entries).toEqual([]);
  });

  it("reads meta.json entries sorted by createdAt desc", async () => {
    const root = resolveAutodsmUserRoot();
    const olderId = "11111111-1111-4111-8111-111111111111";
    const newerId = "22222222-2222-4222-8222-222222222222";
    const olderDir = path.join(root, "systems", olderId);
    const newerDir = path.join(root, "systems", newerId);
    writeReadyWorkspaceFixture(olderDir, {
      workspaceId: olderId,
      starterId: "modern-starter",
      createdAt: "2026-01-01T00:00:00.000Z",
      systemPath: path.join(olderDir, "system"),
      displayName: "Older DS",
      status: "ready",
    });
    writeReadyWorkspaceFixture(newerDir, {
      workspaceId: newerId,
      starterId: "shadcn-ui",
      createdAt: "2026-06-01T00:00:00.000Z",
      systemPath: path.join(newerDir, "system"),
      displayName: "Newer DS",
      status: "ready",
    });

    const result = await Effect.runPromise(listAutodsmWorkspaceHistoryFromDisk({}));
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]?.displayName).toBe("Newer DS");
    expect(result.entries[1]?.displayName).toBe("Older DS");
  });

  it("falls back display name from starter when meta omits displayName", async () => {
    const root = resolveAutodsmUserRoot();
    const id = "33333333-3333-4333-8333-333333333333";
    const dir = path.join(root, "systems", id);
    writeReadyWorkspaceFixture(dir, {
      workspaceId: id,
      starterId: "mui",
      createdAt: "2026-03-01T00:00:00.000Z",
      systemPath: path.join(dir, "system"),
      status: "ready",
    });

    const result = await Effect.runPromise(listAutodsmWorkspaceHistoryFromDisk({}));
    expect(result.entries[0]?.displayName).toBe("Material UI workspace");
  });
});

// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { describe, expect, it, afterEach, beforeEach } from "vitest";
import * as Effect from "effect/Effect";

import { autodsmDeleteWorkspaceFromDisk } from "./autodsmDeleteWorkspace.ts";
import {
  listAutodsmWorkspaceHistoryFromDisk,
  resolveAutodsmUserRoot,
} from "./autodsmWorkspaceHistory.ts";

describe("autodsmDeleteWorkspace", () => {
  let previousHome: string | undefined;

  beforeEach(() => {
    previousHome = process.env.AUTODSM_HOME;
    process.env.AUTODSM_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-delete-test-"));
  });

  afterEach(() => {
    if (previousHome === undefined) {
      delete process.env.AUTODSM_HOME;
    } else {
      process.env.AUTODSM_HOME = previousHome;
    }
  });

  it("removes a workspace directory under systems/", async () => {
    const workspaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const root = resolveAutodsmUserRoot();
    const workspaceDir = path.join(root, "systems", workspaceId);
    fs.mkdirSync(path.join(workspaceDir, "system"), { recursive: true });
    fs.writeFileSync(
      path.join(workspaceDir, "meta.json"),
      JSON.stringify({
        workspaceId,
        starterId: "modern-starter",
        createdAt: "2026-01-01T00:00:00.000Z",
        systemPath: path.join(workspaceDir, "system"),
        displayName: "Test DS",
      }),
    );

    const result = await Effect.runPromise(autodsmDeleteWorkspaceFromDisk({ workspaceId }));
    expect(result.workspaceId).toBe(workspaceId);
    expect(fs.existsSync(workspaceDir)).toBe(false);

    const history = await Effect.runPromise(listAutodsmWorkspaceHistoryFromDisk({}));
    expect(history.entries).toEqual([]);
  });

  it("rejects path traversal workspace ids", async () => {
    await expect(
      Effect.runPromise(autodsmDeleteWorkspaceFromDisk({ workspaceId: "../escape" })),
    ).rejects.toThrow();
  });
});

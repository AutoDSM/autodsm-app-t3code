// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { describe, expect, it, afterEach, beforeEach } from "vitest";
import * as Effect from "effect/Effect";

import { listAutodsmWorkspaceHistoryFromDisk } from "./autodsmWorkspaceHistory.ts";
import {
  isReadyAutodsmWorkspaceDir,
  resolveStagingWorkspaceParent,
  sweepAutodsmStagingDirectories,
  sweepBrokenAutodsmWorkspaces,
} from "./autodsmWorkspaceStaging.ts";
import { resolveAutodsmUserRoot } from "./autodsmWorkspaceHistory.ts";

describe("autodsmWorkspaceStaging", () => {
  let previousHome: string | undefined;

  beforeEach(() => {
    previousHome = process.env.AUTODSM_HOME;
    process.env.AUTODSM_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-staging-test-"));
  });

  afterEach(() => {
    if (previousHome === undefined) {
      delete process.env.AUTODSM_HOME;
    } else {
      process.env.AUTODSM_HOME = previousHome;
    }
  });

  it("detects ready workspaces and ignores partial metadata", () => {
    const workspaceId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const workspaceRoot = path.join(resolveAutodsmUserRoot(), "systems", workspaceId);
    fs.mkdirSync(path.join(workspaceRoot, "system"), { recursive: true });
    fs.writeFileSync(
      path.join(workspaceRoot, "meta.json"),
      JSON.stringify({
        workspaceId,
        starterId: "shadcn-ui",
        createdAt: "2026-01-01T00:00:00.000Z",
        systemPath: path.join(workspaceRoot, "system"),
        displayName: "Ready DS",
        status: "ready",
      }),
    );
    fs.writeFileSync(
      path.join(workspaceRoot, "component-agents.json"),
      JSON.stringify({ schemaVersion: 1, workspaceId, agents: [] }),
    );

    expect(isReadyAutodsmWorkspaceDir(workspaceRoot)).toBe(true);
  });

  it("removes staging and broken workspaces on sweep", async () => {
    const workspaceId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const stagingParent = resolveStagingWorkspaceParent(workspaceId);
    fs.mkdirSync(path.join(stagingParent, "system"), { recursive: true });
    fs.writeFileSync(path.join(stagingParent, "meta.json"), JSON.stringify({ status: "creating" }));

    const brokenRoot = path.join(resolveAutodsmUserRoot(), "systems", "broken-workspace");
    fs.mkdirSync(path.join(brokenRoot, "system"), { recursive: true });
    fs.writeFileSync(path.join(brokenRoot, "meta.json"), JSON.stringify({ status: "creating" }));

    await Effect.runPromise(sweepAutodsmStagingDirectories());
    await Effect.runPromise(sweepBrokenAutodsmWorkspaces());

    expect(fs.existsSync(stagingParent)).toBe(false);
    expect(fs.existsSync(brokenRoot)).toBe(false);
  });

  it("does not list staging directories in workspace history", async () => {
    const workspaceId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
    const stagingParent = resolveStagingWorkspaceParent(workspaceId);
    fs.mkdirSync(path.join(stagingParent, "system"), { recursive: true });
    fs.writeFileSync(
      path.join(stagingParent, "meta.json"),
      JSON.stringify({
        workspaceId,
        starterId: "shadcn-ui",
        createdAt: "2026-01-01T00:00:00.000Z",
        systemPath: path.join(stagingParent, "system"),
        displayName: "Staging DS",
        status: "ready",
      }),
    );
    fs.writeFileSync(
      path.join(stagingParent, "component-agents.json"),
      JSON.stringify({ schemaVersion: 1, workspaceId, agents: [] }),
    );

    const history = await Effect.runPromise(listAutodsmWorkspaceHistoryFromDisk({}));
    expect(history.entries).toHaveLength(0);
  });
});

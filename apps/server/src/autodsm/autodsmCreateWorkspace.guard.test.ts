// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { AUTODSM_DESIGN_SYSTEM_ALREADY_EXISTS_MESSAGE } from "@t3tools/contracts";
import { describe, expect, it, afterEach, beforeEach } from "vitest";
import * as Effect from "effect/Effect";

import {
  listAutodsmWorkspaceHistoryFromDisk,
  resolveAutodsmUserRoot,
} from "./autodsmWorkspaceHistory.ts";

describe("autodsmCreateWorkspace one-DS guard", () => {
  let previousHome: string | undefined;

  beforeEach(() => {
    previousHome = process.env.AUTODSM_HOME;
    process.env.AUTODSM_HOME = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-create-guard-test-"));
  });

  afterEach(() => {
    if (previousHome === undefined) {
      delete process.env.AUTODSM_HOME;
    } else {
      process.env.AUTODSM_HOME = previousHome;
    }
  });

  it("uses the stable already-exists message contract", () => {
    expect(AUTODSM_DESIGN_SYSTEM_ALREADY_EXISTS_MESSAGE).toBe(
      "A design system already exists on this machine.",
    );
  });

  it("lists an existing workspace before create would be blocked", async () => {
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
        displayName: "Existing DS",
        status: "ready",
      }),
    );
    fs.writeFileSync(
      path.join(workspaceDir, "component-agents.json"),
      JSON.stringify({
        schemaVersion: 1,
        workspaceId,
        agents: [
          {
            threadId: "11111111-1111-4111-8111-111111111111",
            sessionId: "22222222-2222-4222-8222-222222222222",
            title: "Button",
            componentPath: "/src/components/Button.tsx",
            status: "active",
            source: "starter",
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    );

    const history = await Effect.runPromise(listAutodsmWorkspaceHistoryFromDisk({}));
    expect(history.entries).toHaveLength(1);
  });

  it("ignores partial workspaces without ready metadata or component agents", async () => {
    const workspaceId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
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
        displayName: "Partial DS",
      }),
    );

    const history = await Effect.runPromise(listAutodsmWorkspaceHistoryFromDisk({}));
    expect(history.entries).toHaveLength(0);
  });
});

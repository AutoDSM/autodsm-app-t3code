// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { describe, expect, it } from "vitest";

import {
  conversationFilePath,
  resolveAutodsmWorkspaceLayout,
  sessionChangeSetPath,
  sessionManifestPath,
} from "./autodsmWorkspacePaths.ts";

describe("autodsmWorkspacePaths", () => {
  it("resolves workspace-owned paths from system cwd", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-paths-"));
    const workspaceRoot = path.join(root, "systems", "abc123");
    const systemDir = path.join(workspaceRoot, "system");
    fs.mkdirSync(systemDir, { recursive: true });
    fs.writeFileSync(
      path.join(workspaceRoot, "meta.json"),
      JSON.stringify({ workspaceId: "custom-workspace-id" }),
    );

    const layout = resolveAutodsmWorkspaceLayout(systemDir);
    expect(layout.systemDir).toBe(systemDir);
    expect(layout.workspaceRoot).toBe(workspaceRoot);
    expect(layout.workspaceId).toBe("custom-workspace-id");
    expect(layout.componentAgentsPath).toBe(path.join(workspaceRoot, "component-agents.json"));
    expect(layout.conversationsDir).toBe(path.join(workspaceRoot, "conversations"));
    expect(layout.sessionsDir).toBe(path.join(workspaceRoot, "sessions"));
    expect(layout.prsDir).toBe(path.join(workspaceRoot, "prs"));
    expect(layout.activityLogPath).toBe(path.join(workspaceRoot, "activity-log.jsonl"));
  });

  it("derives conversation and session file paths", () => {
    const conversationsDir = "/tmp/conversations";
    expect(conversationFilePath(conversationsDir, "/src/components/PrimaryButton.tsx")).toBe(
      path.join(conversationsDir, "primarybutton.json"),
    );
    expect(sessionManifestPath("/tmp/sessions", "sess-1")).toBe(
      path.join("/tmp/sessions", "sess-1", "manifest.json"),
    );
    expect(sessionChangeSetPath("/tmp/sessions", "sess-1", "cs-1")).toBe(
      path.join("/tmp/sessions", "sess-1", "changesets", "cs-1.json"),
    );
  });
});

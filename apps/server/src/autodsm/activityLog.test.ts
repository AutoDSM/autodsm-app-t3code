// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { describe, expect, it } from "vitest";

import { appendWorkspaceActivity, listWorkspaceActivity } from "./activityLog.ts";

function makeSystemCwd(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-activity-"));
  const systemDir = path.join(root, "system");
  fs.mkdirSync(systemDir, { recursive: true });
  return systemDir;
}

describe("activityLog", () => {
  it("appends and lists activity newest-first", () => {
    const cwd = makeSystemCwd();
    appendWorkspaceActivity({
      cwd,
      kind: "component.created",
      summary: "Created Button",
      payload: { componentPath: "/src/components/Button.tsx" },
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    appendWorkspaceActivity({
      cwd,
      kind: "component.rendered",
      summary: "Rendered Button",
      payload: { componentPath: "/src/components/Button.tsx" },
      createdAt: "2026-01-02T00:00:00.000Z",
    });

    const result = listWorkspaceActivity({ cwd, limit: 10 });
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]?.kind).toBe("component.rendered");
    expect(result.entries[1]?.kind).toBe("component.created");
  });
});

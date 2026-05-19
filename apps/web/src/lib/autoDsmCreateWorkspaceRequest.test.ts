import { describe, expect, it, vi } from "vitest";

import {
  createWorkspaceInflightKey,
  resetCreateWorkspaceInflightForTests,
  runCreateWorkspaceOnce,
} from "./autoDsmCreateWorkspaceRequest";

describe("runCreateWorkspaceOnce", () => {
  it("dedupes concurrent calls for the same key", async () => {
    resetCreateWorkspaceInflightForTests();
    let calls = 0;
    const run = vi.fn(async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        workspaceId: "ws-1",
        cwd: "/tmp/system",
        projectId: "proj-1" as never,
        starterId: "shadcn-ui" as const,
        threads: [],
      };
    });

    const key = createWorkspaceInflightKey("shadcn-ui", "env-1" as never);
    const [first, second] = await Promise.all([
      runCreateWorkspaceOnce(key, run),
      runCreateWorkspaceOnce(key, run),
    ]);

    expect(first).toEqual(second);
    expect(run).toHaveBeenCalledTimes(1);
    expect(calls).toBe(1);
  });

  it("returns cached result after the prior promise settles without re-running", async () => {
    resetCreateWorkspaceInflightForTests();
    const run = vi.fn(async () => ({
      workspaceId: "ws-1",
      cwd: "/tmp/system",
      projectId: "proj-1" as never,
      starterId: "shadcn-ui" as const,
      threads: [],
    }));

    const key = createWorkspaceInflightKey("shadcn-ui", "env-1" as never);
    const first = await runCreateWorkspaceOnce(key, run);
    const second = await runCreateWorkspaceOnce(key, run);

    expect(first).toEqual(second);
    expect(run).toHaveBeenCalledTimes(1);
  });
});

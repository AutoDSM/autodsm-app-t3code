import { describe, expect, it, vi } from "vitest";

import {
  clearCreateWorkspaceTransportInterrupted,
  createWorkspaceInflightKey,
  isCreateWorkspaceTransportInterrupted,
  resetCreateWorkspaceInflightForTests,
  runCreateWorkspaceOnce,
  runCreateWorkspaceWithTransportRetry,
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

  it("blocks transparent retries after a transport failure until cleared", async () => {
    resetCreateWorkspaceInflightForTests();
    const run = vi.fn(async () => {
      throw new Error("SocketCloseError: 1006");
    });

    const key = createWorkspaceInflightKey("shadcn-ui", "env-1" as never);
    await expect(runCreateWorkspaceOnce(key, run)).rejects.toThrow("SocketCloseError");
    expect(isCreateWorkspaceTransportInterrupted(key)).toBe(true);
    await expect(runCreateWorkspaceOnce(key, run)).rejects.toThrow(
      "Workspace creation was interrupted",
    );
    expect(run).toHaveBeenCalledTimes(1);

    clearCreateWorkspaceTransportInterrupted(key);
    expect(isCreateWorkspaceTransportInterrupted(key)).toBe(false);
  });

  it("retries createWorkspace after a transport failure", async () => {
    resetCreateWorkspaceInflightForTests();
    let calls = 0;
    const run = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        throw new Error("SocketCloseError: 1006");
      }
      return {
        workspaceId: "ws-1",
        cwd: "/tmp/system",
        projectId: "proj-1" as never,
        starterId: "shadcn-ui" as const,
        threads: [],
      };
    });

    const key = createWorkspaceInflightKey("shadcn-ui", "env-1" as never);
    const result = await runCreateWorkspaceWithTransportRetry(key, run, {
      maxAttempts: 3,
      backendReadyTimeoutMs: 50,
      retryDelayMs: 0,
    });

    expect(result.workspaceId).toBe("ws-1");
    expect(run).toHaveBeenCalledTimes(2);
    expect(calls).toBe(2);
  });
});

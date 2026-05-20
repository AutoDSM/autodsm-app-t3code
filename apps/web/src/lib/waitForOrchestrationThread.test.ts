import { scopeThreadRef } from "@t3tools/client-runtime";
import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

const ENV = "env-1" as EnvironmentId;
const THREAD = "thread-1" as ThreadId;

const { selectThreadExistsByRef, selectProjectByRef, useStore } = vi.hoisted(() => ({
  selectThreadExistsByRef: vi.fn(),
  selectProjectByRef: vi.fn(),
  useStore: {
    getState: vi.fn(),
  },
}));

vi.mock("~/store", () => ({
  useStore,
  selectThreadExistsByRef,
  selectProjectByRef,
}));

import {
  waitForOrchestrationThreadInStore,
  waitForProjectCwdInStore,
} from "./waitForOrchestrationThread";

describe("waitForOrchestrationThreadInStore", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns true once the thread exists in orchestration state", async () => {
    selectThreadExistsByRef.mockReturnValueOnce(false).mockReturnValueOnce(true);

    const result = await waitForOrchestrationThreadInStore(scopeThreadRef(ENV, THREAD), {
      timeoutMs: 500,
      intervalMs: 10,
    });

    expect(result).toBe(true);
    expect(selectThreadExistsByRef.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("returns false when the thread never appears before timeout", async () => {
    selectThreadExistsByRef.mockReturnValue(false);

    const result = await waitForOrchestrationThreadInStore(scopeThreadRef(ENV, THREAD), {
      timeoutMs: 40,
      intervalMs: 10,
    });

    expect(result).toBe(false);
  });
});

describe("waitForProjectCwdInStore", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns true once the project cwd is available", async () => {
    selectProjectByRef
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce({ cwd: "/tmp/workspace" });

    const result = await waitForProjectCwdInStore(
      { environmentId: ENV, projectId: "project-1" as never },
      { timeoutMs: 500, intervalMs: 10 },
    );

    expect(result).toBe(true);
  });
});

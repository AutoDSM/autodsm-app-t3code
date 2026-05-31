import type {
  AutoDsmWorkspaceHistoryEntry,
  ProjectId,
} from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  extractWorkspaceIdFromAutodsmCwd,
  findFinalSystemPathForWorkspaceId,
  isStagingRejectionError,
} from "./useStaleStagingCwdRecovery";

const PROJECT_A = "11111111-1111-1111-1111-111111111111" as ProjectId;

function makeEntry(
  overrides: Partial<AutoDsmWorkspaceHistoryEntry> & {
    readonly workspaceId: string;
    readonly systemPath: string;
  },
): AutoDsmWorkspaceHistoryEntry {
  return {
    workspaceId: overrides.workspaceId,
    displayName: overrides.displayName ?? "test",
    starterId: overrides.starterId ?? "shadcn-ui",
    createdAt: overrides.createdAt ?? "2026-05-28T00:00:00.000Z",
    systemPath: overrides.systemPath,
    ...(overrides.projectId !== undefined ? { projectId: overrides.projectId } : {}),
    ...(overrides.ownerSubject !== undefined ? { ownerSubject: overrides.ownerSubject } : {}),
    ...(overrides.authProvider !== undefined ? { authProvider: overrides.authProvider } : {}),
  };
}

describe("isStagingRejectionError", () => {
  it("matches Error instances whose message contains the canonical marker", () => {
    const error = new Error(
      "Workspace path lives in the staging directory (/Users/x/.autodsm/systems/.staging/abc/system); reload the app to refresh the workspace list.",
    );
    expect(isStagingRejectionError(error)).toBe(true);
  });

  it("matches plain objects with a string message", () => {
    expect(
      isStagingRejectionError({
        message: "Workspace path lives in the staging directory; reload the app…",
      }),
    ).toBe(true);
  });

  it("does not match unrelated errors", () => {
    expect(isStagingRejectionError(new Error("Failed to analyze component."))).toBe(false);
    expect(isStagingRejectionError(new Error("Workspace not initialized: …"))).toBe(false);
  });

  it("returns false for non-error inputs", () => {
    expect(isStagingRejectionError(null)).toBe(false);
    expect(isStagingRejectionError(undefined)).toBe(false);
    expect(isStagingRejectionError("staging directory string error")).toBe(false);
    expect(isStagingRejectionError({})).toBe(false);
    expect(isStagingRejectionError({ message: 123 })).toBe(false);
  });
});

describe("extractWorkspaceIdFromAutodsmCwd", () => {
  it("returns the workspaceId from a final-location cwd", () => {
    expect(
      extractWorkspaceIdFromAutodsmCwd(
        "/Users/me/.autodsm/systems/e4aa4912-3d24-4249-b094-37ffbbdc76dc/system",
      ),
    ).toBe("e4aa4912-3d24-4249-b094-37ffbbdc76dc");
  });

  it("returns the workspaceId from a staging cwd", () => {
    expect(
      extractWorkspaceIdFromAutodsmCwd(
        "/Users/me/.autodsm/systems/.staging/e4aa4912-3d24-4249-b094-37ffbbdc76dc/system",
      ),
    ).toBe("e4aa4912-3d24-4249-b094-37ffbbdc76dc");
  });

  it("handles a trailing slash", () => {
    expect(
      extractWorkspaceIdFromAutodsmCwd(
        "/Users/me/.autodsm/systems/.staging/abc-123/system/",
      ),
    ).toBe("abc-123");
  });

  it("falls back to the last segment when the path doesn't end with `system`", () => {
    // Heuristic quirk: any path's last (or, for `…/system`, second-to-last)
    // segment is returned. Callers gate the heal on `isStagingRejectionError`
    // plus a matching history entry, so a false-positive here just becomes a
    // "no-matching-workspace" recovery state — never a write.
    expect(extractWorkspaceIdFromAutodsmCwd("/some/other/path")).toBe("path");
  });

  it("returns null for null / empty inputs", () => {
    expect(extractWorkspaceIdFromAutodsmCwd(null)).toBeNull();
    expect(extractWorkspaceIdFromAutodsmCwd("")).toBeNull();
    expect(extractWorkspaceIdFromAutodsmCwd("/")).toBeNull();
  });

  it("does not return literal scaffold/sentinel segments", () => {
    expect(extractWorkspaceIdFromAutodsmCwd("/.staging/system")).toBeNull();
    expect(extractWorkspaceIdFromAutodsmCwd("/systems/system")).toBeNull();
  });
});

describe("findFinalSystemPathForWorkspaceId", () => {
  it("returns the systemPath and projectId for the matching workspaceId", () => {
    const entries = [
      makeEntry({
        workspaceId: "ws-a",
        projectId: PROJECT_A,
        systemPath: "/Users/x/.autodsm/systems/ws-a/system",
      }),
      makeEntry({
        workspaceId: "ws-b",
        systemPath: "/Users/x/.autodsm/systems/ws-b/system",
      }),
    ];

    const result = findFinalSystemPathForWorkspaceId(entries, "ws-a");
    expect(result?.systemPath).toBe("/Users/x/.autodsm/systems/ws-a/system");
    expect(result?.projectId).toBe(PROJECT_A);
  });

  it("returns null when no entry matches the workspaceId", () => {
    const entries = [
      makeEntry({
        workspaceId: "ws-a",
        systemPath: "/Users/x/.autodsm/systems/ws-a/system",
      }),
    ];
    expect(findFinalSystemPathForWorkspaceId(entries, "ws-other")).toBeNull();
  });

  it("handles entries without a projectId", () => {
    const entries = [
      makeEntry({
        workspaceId: "ws-a",
        systemPath: "/Users/x/.autodsm/systems/ws-a/system",
      }),
    ];
    expect(findFinalSystemPathForWorkspaceId(entries, "ws-a")?.projectId).toBeNull();
  });

  it("handles empty history", () => {
    expect(findFinalSystemPathForWorkspaceId([], "ws-a")).toBeNull();
  });

  it("never picks a staging-directory path (sanity: history is FINAL-only by server contract)", () => {
    // listAutodsmWorkspaceHistoryFromDisk skips .staging/, so this is a
    // pin on the server contract: if a future change ever ships a
    // staging entry, we still wouldn't return it as the heal target.
    const entries = [
      makeEntry({
        workspaceId: "ws-a",
        systemPath: "/Users/x/.autodsm/systems/ws-a/system",
      }),
    ];
    const found = findFinalSystemPathForWorkspaceId(entries, "ws-a");
    expect(found).not.toBeNull();
    expect(found?.systemPath.includes("/.staging/")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import type { AutoDsmWorkspaceHistoryEntry } from "@t3tools/contracts";

import {
  findAutoDsmDesignSystemEntryForPath,
  formatAutoDsmStarterLabel,
  getPrimaryAutoDsmDesignSystemEntry,
  hasAutoDsmDesignSystem,
  isAutoDsmDesignSystemAlreadyExistsError,
} from "./autoDsmDesignSystemPresence";

const sampleEntry = (
  overrides?: Partial<AutoDsmWorkspaceHistoryEntry>,
): AutoDsmWorkspaceHistoryEntry => ({
  workspaceId: "11111111-1111-4111-8111-111111111111",
  displayName: "Acme DS",
  starterId: "shadcn-ui",
  createdAt: "2026-06-01T00:00:00.000Z",
  systemPath: "/tmp/systems/one/system",
  ...overrides,
});

describe("autoDsmDesignSystemPresence", () => {
  it("detects design system presence", () => {
    expect(hasAutoDsmDesignSystem([])).toBe(false);
    expect(hasAutoDsmDesignSystem([sampleEntry()])).toBe(true);
  });

  it("returns the first history entry as primary", () => {
    const newer = sampleEntry({ displayName: "Newer" });
    const older = sampleEntry({
      displayName: "Older",
      workspaceId: "22222222-2222-4222-8222-222222222222",
    });
    expect(getPrimaryAutoDsmDesignSystemEntry([newer, older])).toEqual(newer);
  });

  it("matches entries by cwd with normalization", () => {
    const entry = sampleEntry({ systemPath: "/tmp/systems/one/system/" });
    expect(findAutoDsmDesignSystemEntryForPath([entry], "/tmp/systems/one/system")).toEqual(entry);
  });

  it("formats starter labels from the catalog", () => {
    expect(formatAutoDsmStarterLabel("modern-starter")).toBe("Build from scratch");
    expect(formatAutoDsmStarterLabel("shadcn-ui")).toBe("Shadcn UI");
  });

  it("detects already-exists create errors", () => {
    expect(
      isAutoDsmDesignSystemAlreadyExistsError(
        new Error("A design system already exists on this machine."),
      ),
    ).toBe(true);
    expect(isAutoDsmDesignSystemAlreadyExistsError(new Error("other"))).toBe(false);
  });
});

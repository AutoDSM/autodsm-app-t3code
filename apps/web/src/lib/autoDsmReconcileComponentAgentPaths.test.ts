import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime";
import type { EnvironmentId, ProjectId, ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  normalizeComponentAgentTitle,
  reconcileAutoDsmThreadComponentPaths,
  resolveAutoDsmComponentPathForThread,
  resolveAutoDsmThreadComponentPathForNavigation,
} from "./autoDsmReconcileComponentAgentPaths";
import { getStarterComponentAgents } from "./autoDsmStarterComponentAgents";
import { buildAutoDsmComponentAgentTabs } from "./autoDsmComponentAgents";
import type { SidebarThreadSummary } from "~/types";

const ENV = "env-1" as EnvironmentId;
const PROJECT = "proj-1" as ProjectId;

function stubThread(
  id: string,
  title: string,
  overrides: Partial<SidebarThreadSummary> = {},
): SidebarThreadSummary {
  return {
    id: id as ThreadId,
    environmentId: ENV,
    projectId: PROJECT,
    title,
    interactionMode: "default",
    session: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
    branch: null,
    worktreePath: null,
    latestUserMessageAt: null,
    hasPendingApprovals: false,
    hasPendingUserInput: false,
    hasActionableProposedPlan: false,
    latestTurn: null,
    ...overrides,
  };
}

describe("normalizeComponentAgentTitle", () => {
  it("trims and lowercases titles", () => {
    expect(normalizeComponentAgentTitle("  Theme card  ")).toBe("theme card");
  });
});

describe("reconcileAutoDsmThreadComponentPaths", () => {
  const shadcnAgents = getStarterComponentAgents("shadcn-ui");

  it("backfills missing mappings for all six shadcn threads when one is stored", () => {
    const buttonRef = scopeThreadRef(ENV, "thr-button" as ThreadId);
    const storedPaths = {
      [scopedThreadKey(buttonRef)]: "src/components/ShadcnButton.tsx",
    };

    const backfill = reconcileAutoDsmThreadComponentPaths({
      environmentId: ENV,
      projectId: PROJECT,
      projectThreads: [
        stubThread("thr-button", "Button"),
        stubThread("thr-card", "Card"),
        stubThread("thr-badge", "Badge"),
        stubThread("thr-input", "Input"),
        stubThread("thr-theme", "Theme card"),
        stubThread("thr-pill", "Pill label"),
      ],
      storedPaths,
      manifestAgents: shadcnAgents,
    });

    expect(Object.keys(backfill)).toHaveLength(5);
    expect(backfill[scopedThreadKey(scopeThreadRef(ENV, "thr-card" as ThreadId))]).toBe(
      "src/components/ShadcnCard.tsx",
    );
    expect(backfill[scopedThreadKey(scopeThreadRef(ENV, "thr-theme" as ThreadId))]).toBe(
      "src/components/ThemeCard.tsx",
    );
    expect(backfill[scopedThreadKey(buttonRef)]).toBeUndefined();
  });

  it("matches titles case-insensitively", () => {
    const backfill = reconcileAutoDsmThreadComponentPaths({
      environmentId: ENV,
      projectId: PROJECT,
      projectThreads: [stubThread("thr-theme", "THEME CARD")],
      storedPaths: {},
      manifestAgents: shadcnAgents,
    });

    expect(backfill[scopedThreadKey(scopeThreadRef(ENV, "thr-theme" as ThreadId))]).toBe(
      "src/components/ThemeCard.tsx",
    );
  });

  it("does not overwrite existing stored mappings", () => {
    const cardRef = scopeThreadRef(ENV, "thr-card" as ThreadId);
    const storedPaths = {
      [scopedThreadKey(cardRef)]: "src/components/CustomCard.tsx",
    };

    const backfill = reconcileAutoDsmThreadComponentPaths({
      environmentId: ENV,
      projectId: PROJECT,
      projectThreads: [stubThread("thr-card", "Card")],
      storedPaths,
      manifestAgents: shadcnAgents,
    });

    expect(backfill).toEqual({});
  });
});

describe("resolveAutoDsmThreadComponentPathForNavigation", () => {
  it("returns normalized paths for navigation", () => {
    const threadRef = scopeThreadRef(ENV, "thr-input" as ThreadId);
    const threadKey = scopedThreadKey(threadRef);

    expect(
      resolveAutoDsmThreadComponentPathForNavigation(threadKey, {
        [threadKey]: "/src/components/ShadcnInput.tsx",
      }),
    ).toBe("src/components/ShadcnInput.tsx");
  });
});

describe("resolveAutoDsmComponentPathForThread", () => {
  it("falls back to manifest title match for materialized workspaces", () => {
    const path = resolveAutoDsmComponentPathForThread({
      thread: stubThread("thr-badge", "Badge"),
      projectCwd: "/Users/me/.autodsm/systems/ws-1/system",
      storedPaths: {},
      starterId: "shadcn-ui",
    });

    expect(path).toBe("src/components/ShadcnBadge.tsx");
  });
});

describe("effective component agent tabs", () => {
  it("produces six tabs when only one path is stored and reconciliation runs", () => {
    const shadcnAgents = getStarterComponentAgents("shadcn-ui");
    const threads = [
      stubThread("thr-button", "Button"),
      stubThread("thr-card", "Card"),
      stubThread("thr-badge", "Badge"),
      stubThread("thr-input", "Input"),
      stubThread("thr-theme", "Theme card"),
      stubThread("thr-pill", "Pill label"),
    ];
    const storedPaths = {
      [scopedThreadKey(scopeThreadRef(ENV, "thr-button" as ThreadId))]:
        "src/components/ShadcnButton.tsx",
    };
    const reconciled = reconcileAutoDsmThreadComponentPaths({
      environmentId: ENV,
      projectId: PROJECT,
      projectThreads: threads,
      storedPaths,
      manifestAgents: shadcnAgents,
    });
    const effectivePaths = { ...storedPaths, ...reconciled };

    const tabs = buildAutoDsmComponentAgentTabs({
      environmentId: ENV,
      projectId: PROJECT,
      projectThreads: threads,
      autoDsmThreadComponentPathById: effectivePaths,
    });

    expect(tabs).toHaveLength(6);
    expect(tabs.map((tab) => tab.title)).toEqual([
      "Badge",
      "Button",
      "Card",
      "Input",
      "Pill label",
      "Theme card",
    ]);
  });
});

import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime";
import type { EnvironmentId, ProjectId, ThreadId } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  buildAutoDsmComponentAgentTabs,
  resolveAutoDsmAgentTabForPath,
  resolveAutoDsmAgentTabForThread,
} from "./autoDsmComponentAgents";
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

describe("buildAutoDsmComponentAgentTabs", () => {
  it("keeps only threads with mapped component paths and sorts by title", () => {
    const buttonRef = scopeThreadRef(ENV, "thr-button" as ThreadId);
    const cardRef = scopeThreadRef(ENV, "thr-card" as ThreadId);

    const tabs = buildAutoDsmComponentAgentTabs({
      environmentId: ENV,
      projectId: PROJECT,
      projectThreads: [
        stubThread("thr-card", "Card"),
        stubThread("thr-button", "Button"),
        stubThread("thr-orphan", "Orphan"),
      ],
      autoDsmThreadComponentPathById: {
        [scopedThreadKey(buttonRef)]: "/src/components/ShadcnButton.tsx",
        [scopedThreadKey(cardRef)]: "src/components/ShadcnCard.tsx",
      },
    });

    expect(tabs.map((tab) => tab.title)).toEqual(["Button", "Card"]);
    expect(tabs[0]?.componentPath).toBe("src/components/ShadcnButton.tsx");
    expect(tabs[1]?.componentPath).toBe("src/components/ShadcnCard.tsx");
  });

  it("includes dynamically registered create-flow threads once path mapping exists", () => {
    const createdRef = scopeThreadRef(ENV, "thr-new" as ThreadId);
    const tabs = buildAutoDsmComponentAgentTabs({
      environmentId: ENV,
      projectId: PROJECT,
      projectThreads: [stubThread("thr-new", "Primary Button")],
      autoDsmThreadComponentPathById: {
        [scopedThreadKey(createdRef)]: "src/components/PrimaryButton.tsx",
      },
    });

    expect(tabs).toHaveLength(1);
    expect(tabs[0]?.title).toBe("Primary Button");
    expect(tabs[0]?.componentPath).toBe("src/components/PrimaryButton.tsx");
  });

  it("includes server manifest paths merged into effective path map", () => {
    const starterRef = scopeThreadRef(ENV, "thr-server" as ThreadId);
    const tabs = buildAutoDsmComponentAgentTabs({
      environmentId: ENV,
      projectId: PROJECT,
      projectThreads: [stubThread("thr-server", "Server Tab")],
      autoDsmThreadComponentPathById: {
        [scopedThreadKey(starterRef)]: "/src/components/ServerTab.tsx",
      },
    });

    expect(tabs).toHaveLength(1);
    expect(tabs[0]?.componentPath).toBe("src/components/ServerTab.tsx");
  });

  it("dedupes tabs that map to the same component path", () => {
    const primaryRef = scopeThreadRef(ENV, "thr-primary" as ThreadId);
    const duplicateRef = scopeThreadRef(ENV, "thr-duplicate" as ThreadId);
    const tabs = buildAutoDsmComponentAgentTabs({
      environmentId: ENV,
      projectId: PROJECT,
      projectThreads: [
        stubThread("thr-primary", "Button"),
        stubThread("thr-duplicate", "Button copy"),
      ],
      autoDsmThreadComponentPathById: {
        [scopedThreadKey(primaryRef)]: "/src/components/ShadcnButton.tsx",
        [scopedThreadKey(duplicateRef)]: "src/components/ShadcnButton.tsx",
      },
    });

    expect(tabs).toHaveLength(1);
    expect(tabs[0]?.title).toBe("Button");
  });
});

describe("resolveAutoDsmAgentTabForThread", () => {
  it("returns the tab matching the active thread key", () => {
    const threadRef = scopeThreadRef(ENV, "thr-badge" as ThreadId);
    const tabs = buildAutoDsmComponentAgentTabs({
      environmentId: ENV,
      projectId: PROJECT,
      projectThreads: [stubThread("thr-badge", "Badge")],
      autoDsmThreadComponentPathById: {
        [scopedThreadKey(threadRef)]: "src/components/ShadcnBadge.tsx",
      },
    });

    expect(resolveAutoDsmAgentTabForThread(scopedThreadKey(threadRef), tabs)?.title).toBe("Badge");
    expect(resolveAutoDsmAgentTabForThread("missing", tabs)).toBeNull();
  });
});

describe("resolveAutoDsmAgentTabForPath", () => {
  it("matches normalized component paths", () => {
    const threadRef = scopeThreadRef(ENV, "thr-input" as ThreadId);
    const tabs = buildAutoDsmComponentAgentTabs({
      environmentId: ENV,
      projectId: PROJECT,
      projectThreads: [stubThread("thr-input", "Input")],
      autoDsmThreadComponentPathById: {
        [scopedThreadKey(threadRef)]: "/src/components/ShadcnInput.tsx",
      },
    });

    expect(
      resolveAutoDsmAgentTabForPath("src/components/ShadcnInput.tsx", tabs)?.threadRef,
    ).toEqual(threadRef);
  });
});

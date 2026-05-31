import { scopedThreadKey, scopeThreadRef } from "@t3tools/client-runtime";
import type {
  AutoDsmComponentAgentRecord,
  AutoDsmSessionId,
  EnvironmentId,
  ProjectId,
  ThreadId,
} from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  buildAutoDsmComponentAgentTabs,
  resolveAutoDsmAgentTabForPath,
  resolveAutoDsmAgentTabForThread,
} from "./autoDsmComponentAgents";
import type { SidebarThreadSummary } from "~/types";

function stubServerAgent(input: {
  threadId: string;
  title: string;
  componentPath: string;
  exportName?: string;
  group?: string;
}): AutoDsmComponentAgentRecord {
  return {
    threadId: input.threadId as ThreadId,
    sessionId: `sess-${input.threadId}` as AutoDsmSessionId,
    title: input.title,
    componentPath: input.componentPath,
    ...(input.exportName ? { exportName: input.exportName } : {}),
    ...(input.group ? { group: input.group } : {}),
    status: "active",
    source: "starter",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

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

  it("builds tabs from the server manifest when projectThreads is empty (cold-boot)", () => {
    const tabs = buildAutoDsmComponentAgentTabs({
      environmentId: ENV,
      projectId: PROJECT,
      projectThreads: [],
      autoDsmThreadComponentPathById: {},
      serverAgents: [
        stubServerAgent({
          threadId: "thr-ctx",
          title: "Context menu",
          componentPath: "/src/components/ShadcnContextMenu.tsx",
          group: "Overlays",
        }),
        stubServerAgent({
          threadId: "thr-btn-contained",
          title: "Button — Contained",
          componentPath: "/src/components/MuiPrimaryButton.tsx",
          exportName: "MuiButtonContained",
          group: "Buttons",
        }),
        stubServerAgent({
          threadId: "thr-btn-outlined",
          title: "Button — Outlined",
          componentPath: "/src/components/MuiPrimaryButton.tsx",
          exportName: "MuiButtonOutlined",
          group: "Buttons",
        }),
      ],
    });

    expect(tabs.map((tab) => tab.title).toSorted()).toEqual(["Button — Contained", "Context menu"]);
    const contextTab = tabs.find((tab) => tab.title === "Context menu");
    expect(contextTab?.componentPath).toBe("src/components/ShadcnContextMenu.tsx");
    expect(contextTab?.group).toBe("Overlays");
    expect(contextTab?.exportName).toBeUndefined();
    const buttonTab = tabs.find(
      (tab) => tab.componentPath === "src/components/MuiPrimaryButton.tsx",
    );
    expect(buttonTab?.exportName).toBe("MuiButtonContained");
    expect(buttonTab?.group).toBe("Buttons");
  });

  it("treats the server manifest as authoritative when projectThreads only has the active thread", () => {
    const tabs = buildAutoDsmComponentAgentTabs({
      environmentId: ENV,
      projectId: PROJECT,
      projectThreads: [stubThread("thr-ctx", "Context menu (renamed by user)")],
      autoDsmThreadComponentPathById: {},
      serverAgents: [
        stubServerAgent({
          threadId: "thr-ctx",
          title: "Context menu",
          componentPath: "/src/components/ShadcnContextMenu.tsx",
          group: "Overlays",
        }),
        stubServerAgent({
          threadId: "thr-card",
          title: "Card",
          componentPath: "/src/components/ShadcnCard.tsx",
          group: "Cards",
        }),
        stubServerAgent({
          threadId: "thr-label",
          title: "Label",
          componentPath: "/src/components/ShadcnLabel.tsx",
          group: "Forms",
        }),
      ],
    });

    expect(tabs).toHaveLength(3);
    // The orchestration-store title takes precedence for threads it knows about
    // (e.g. user-renamed threads); other threads use their server-side title.
    const contextTab = tabs.find(
      (tab) => tab.componentPath === "src/components/ShadcnContextMenu.tsx",
    );
    expect(contextTab?.title).toBe("Context menu (renamed by user)");
  });

  it("falls back to the projectThreads path when serverAgents is empty", () => {
    const threadRef = scopeThreadRef(ENV, "thr-legacy" as ThreadId);
    const tabs = buildAutoDsmComponentAgentTabs({
      environmentId: ENV,
      projectId: PROJECT,
      projectThreads: [stubThread("thr-legacy", "Legacy")],
      autoDsmThreadComponentPathById: {
        [scopedThreadKey(threadRef)]: "/src/components/Legacy.tsx",
      },
      serverAgents: [],
    });

    expect(tabs).toHaveLength(1);
    expect(tabs[0]?.title).toBe("Legacy");
  });

  it("hides Typography wrappers from the sidebar (server-agents path)", () => {
    const tabs = buildAutoDsmComponentAgentTabs({
      environmentId: ENV,
      projectId: PROJECT,
      projectThreads: [],
      autoDsmThreadComponentPathById: {},
      serverAgents: [
        stubServerAgent({
          threadId: "thr-button",
          title: "Button",
          componentPath: "/src/components/ShadcnButton.tsx",
        }),
        stubServerAgent({
          threadId: "thr-typo-h1",
          title: "Typography H1",
          componentPath: "/src/components/ShadcnTypography.tsx",
          exportName: "ShadcnTypographyH1",
        }),
        stubServerAgent({
          threadId: "thr-typo-h2",
          title: "Typography H2",
          componentPath: "/src/components/ShadcnTypography.tsx",
          exportName: "ShadcnTypographyH2",
        }),
      ],
    });

    expect(tabs.map((t) => t.title)).toEqual(["Button"]);
  });

  it("hides Typography wrappers from the sidebar (projectThreads fallback path)", () => {
    const buttonRef = scopeThreadRef(ENV, "thr-button" as ThreadId);
    const typoRef = scopeThreadRef(ENV, "thr-typo" as ThreadId);
    const tabs = buildAutoDsmComponentAgentTabs({
      environmentId: ENV,
      projectId: PROJECT,
      projectThreads: [stubThread("thr-button", "Button"), stubThread("thr-typo", "Typography")],
      autoDsmThreadComponentPathById: {
        [scopedThreadKey(buttonRef)]: "/src/components/ShadcnButton.tsx",
        [scopedThreadKey(typoRef)]: "/src/components/ShadcnTypography.tsx",
      },
    });

    expect(tabs.map((t) => t.title)).toEqual(["Button"]);
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

import { EnvironmentId, ProjectId } from "@t3tools/contracts";
import { describe, expect, it, vi } from "vitest";

import { bootstrapAutoDsmWorkspaceFromDisk } from "./autoDsmWorkspaceBootstrap";

describe("bootstrapAutoDsmWorkspaceFromDisk", () => {
  it("no-ops when no design system exists", async () => {
    const navigateHome = vi.fn(async () => undefined);
    const result = await bootstrapAutoDsmWorkspaceFromDisk({
      environmentId: EnvironmentId.make("env-1"),
      api: {} as never,
      historyEntries: [],
      projects: [],
      threads: [],
      sidebarThreadSortOrder: "updated_at",
      defaultThreadEnvMode: "local",
      hasActiveWorkspaceProject: false,
      onboardingCompleted: true,
      handleNewThread: vi.fn(async () => undefined),
      setWorkspaceRef: vi.fn(),
      mergeAgentPaths: vi.fn(),
      completeOnboarding: vi.fn(),
      navigateToComponentAgent: vi.fn(async () => undefined),
      navigateHome,
      onError: vi.fn(),
    });

    expect(result.didBootstrap).toBe(false);
    expect(navigateHome).not.toHaveBeenCalled();
  });

  it("binds workspace ref, merges agent paths, and navigates to the first component agent", async () => {
    const setWorkspaceRef = vi.fn();
    const mergeAgentPaths = vi.fn();
    const completeOnboarding = vi.fn();
    const navigateHome = vi.fn(async () => undefined);
    const navigateToComponentAgent = vi.fn(async () => undefined);
    const entry = {
      workspaceId: "11111111-1111-4111-8111-111111111111",
      displayName: "Acme DS",
      starterId: "modern-starter" as const,
      createdAt: "2026-06-01T00:00:00.000Z",
      systemPath: "/tmp/acme/system",
      projectId: ProjectId.make("proj-1"),
    };

    const result = await bootstrapAutoDsmWorkspaceFromDisk({
      environmentId: EnvironmentId.make("env-1"),
      api: {
        orchestration: {
          dispatchCommand: vi.fn(),
        },
        autodsm: {
          listComponentAgents: vi.fn(async () => ({
            manifest: {
              agents: [
                {
                  threadId: "thr-badge",
                  componentPath: "src/components/ui/badge.tsx",
                  title: "Badge",
                  createdAt: "2026-01-01T00:00:00.000Z",
                  updatedAt: "2026-01-01T00:00:00.000Z",
                },
              ],
            },
          })),
        },
      } as never,
      historyEntries: [entry],
      projects: [
        {
          id: ProjectId.make("proj-1"),
          environmentId: EnvironmentId.make("env-1"),
          name: "Acme DS",
          cwd: "/tmp/acme/system",
          defaultModelSelection: null,
          scripts: [],
        },
      ],
      threads: [],
      sidebarThreadSortOrder: "updated_at",
      defaultThreadEnvMode: "local",
      hasActiveWorkspaceProject: false,
      onboardingCompleted: false,
      handleNewThread: vi.fn(async () => undefined),
      setWorkspaceRef,
      mergeAgentPaths,
      completeOnboarding,
      navigateToComponentAgent,
      navigateHome,
      onError: vi.fn(),
    });

    expect(completeOnboarding).toHaveBeenCalled();
    expect(setWorkspaceRef).toHaveBeenCalledWith({
      environmentId: EnvironmentId.make("env-1"),
      projectId: ProjectId.make("proj-1"),
    });
    expect(mergeAgentPaths).toHaveBeenCalledWith({
      "env-1:thr-badge": "src/components/ui/badge.tsx",
    });
    expect(navigateToComponentAgent).toHaveBeenCalledWith({
      environmentId: EnvironmentId.make("env-1"),
      threadId: "thr-badge",
      componentPath: "src/components/ui/badge.tsx",
    });
    expect(navigateHome).not.toHaveBeenCalled();
    expect(result.navigatedHome).toBe(true);
  });

  it("falls back to home when no component agents exist", async () => {
    const navigateHome = vi.fn(async () => undefined);
    const navigateToComponentAgent = vi.fn(async () => undefined);
    const entry = {
      workspaceId: "11111111-1111-4111-8111-111111111111",
      displayName: "Acme DS",
      starterId: "modern-starter" as const,
      createdAt: "2026-06-01T00:00:00.000Z",
      systemPath: "/tmp/acme/system",
      projectId: ProjectId.make("proj-1"),
    };

    await bootstrapAutoDsmWorkspaceFromDisk({
      environmentId: EnvironmentId.make("env-1"),
      api: {
        orchestration: {
          dispatchCommand: vi.fn(),
        },
        autodsm: {
          listComponentAgents: vi.fn(async () => ({ manifest: { agents: [] } })),
        },
      } as never,
      historyEntries: [entry],
      projects: [
        {
          id: ProjectId.make("proj-1"),
          environmentId: EnvironmentId.make("env-1"),
          name: "Acme DS",
          cwd: "/tmp/acme/system",
          defaultModelSelection: null,
          scripts: [],
        },
      ],
      threads: [],
      sidebarThreadSortOrder: "updated_at",
      defaultThreadEnvMode: "local",
      hasActiveWorkspaceProject: false,
      onboardingCompleted: true,
      handleNewThread: vi.fn(async () => undefined),
      setWorkspaceRef: vi.fn(),
      mergeAgentPaths: vi.fn(),
      completeOnboarding: vi.fn(),
      navigateToComponentAgent,
      navigateHome,
      onError: vi.fn(),
    });

    expect(navigateHome).toHaveBeenCalled();
    expect(navigateToComponentAgent).not.toHaveBeenCalled();
  });

  it("skips navigateHome when workspace ref is already active", async () => {
    const navigateHome = vi.fn(async () => undefined);
    const completeOnboarding = vi.fn();
    const entry = {
      workspaceId: "11111111-1111-4111-8111-111111111111",
      displayName: "Acme DS",
      starterId: "modern-starter" as const,
      createdAt: "2026-06-01T00:00:00.000Z",
      systemPath: "/tmp/acme/system",
      projectId: ProjectId.make("proj-1"),
    };

    const result = await bootstrapAutoDsmWorkspaceFromDisk({
      environmentId: EnvironmentId.make("env-1"),
      api: {} as never,
      historyEntries: [entry],
      projects: [],
      threads: [],
      sidebarThreadSortOrder: "updated_at",
      defaultThreadEnvMode: "local",
      hasActiveWorkspaceProject: true,
      onboardingCompleted: true,
      handleNewThread: vi.fn(async () => undefined),
      setWorkspaceRef: vi.fn(),
      mergeAgentPaths: vi.fn(),
      completeOnboarding,
      navigateToComponentAgent: vi.fn(async () => undefined),
      navigateHome,
      onError: vi.fn(),
    });

    expect(completeOnboarding).not.toHaveBeenCalled();
    expect(navigateHome).not.toHaveBeenCalled();
    expect(result.didBootstrap).toBe(true);
    expect(result.navigatedHome).toBe(false);
  });
});

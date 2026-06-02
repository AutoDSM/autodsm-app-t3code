import { scopeProjectRef, scopeThreadRef } from "@t3tools/client-runtime";
import type { EnvironmentId, ProjectId } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  parseScopedThreadRefFromChatPathname,
  resolveAutoDsmWorkspace,
} from "~/lib/autoDsmWorkspaceSelection";
import type { Project, SidebarThreadSummary } from "~/types";

const env = "env_a" as EnvironmentId;
const thread = "thread_z" as import("@t3tools/contracts").ThreadId;

function stubThread(overrides: Partial<SidebarThreadSummary>): SidebarThreadSummary {
  return {
    id: thread,
    environmentId: env,
    projectId: "proj-1" as ProjectId,
    title: "t",
    interactionMode: "default",
    session: null,
    createdAt: "",
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

function stubProject(input: Pick<Project, "id" | "environmentId" | "cwd" | "name">): Project {
  return {
    id: input.id as Project["id"],
    environmentId: input.environmentId,
    cwd: input.cwd,
    name: input.name,
    scripts: [],
    defaultModelSelection: null,
    repositoryIdentity: null,
  };
}

describe("parseScopedThreadRefFromChatPathname", () => {
  it("parses chat thread pathname", () => {
    expect(parseScopedThreadRefFromChatPathname("/env_a/thread_z")).toEqual(
      scopeThreadRef(env, thread),
    );
  });

  it("returns null for design routes", () => {
    expect(parseScopedThreadRefFromChatPathname("/design-components")).toBeNull();
  });

  it("returns null for draft route", () => {
    expect(parseScopedThreadRefFromChatPathname("/draft/abc")).toBeNull();
  });
});

describe("resolveAutoDsmWorkspace", () => {
  it("prefers pathname thread project when on thread route", () => {
    const pSecondary = stubProject({
      id: "proj-0" as ProjectId,
      environmentId: env,
      cwd: "/home/u/.autodsm/systems/first-order/system",
      name: "First",
    });
    const pThread = stubProject({
      id: "proj-1" as ProjectId,
      environmentId: env,
      cwd: "/home/u/.autodsm/systems/thread-ws/system",
      name: "ThreadProj",
    });
    const ordered = [pSecondary, pThread];
    const out = resolveAutoDsmWorkspace({
      pathname: "/env_a/thread_z",
      sidebarThreads: [stubThread({ id: thread, projectId: pThread.id })],
      orderedProjects: ordered,
      projects: ordered,
      explicitWorkspaceProjectRef: null,
    });

    expect(out.cwd).toBe("/home/u/.autodsm/systems/thread-ws/system");
    expect(out.projectName).toBe("ThreadProj");
    expect(out.environmentId).toBe(env);
  });

  it("falls back to ordered primary when not on thread route", () => {
    const primary = stubProject({
      id: "p-main" as ProjectId,
      environmentId: env,
      cwd: "/home/u/.autodsm/systems/main/system",
      name: "Main",
    });
    const out = resolveAutoDsmWorkspace({
      pathname: "/design-components",
      sidebarThreads: [stubThread({ projectId: "other" as ProjectId })],
      orderedProjects: [primary],
      projects: [primary],
      explicitWorkspaceProjectRef: null,
    });

    expect(out.cwd).toBe("/home/u/.autodsm/systems/main/system");
    expect(out.projectName).toBe("Main");
  });

  it("prefers explicit launch workspace over thread route and ordering", () => {
    const pSecondary = stubProject({
      id: "proj-0" as ProjectId,
      environmentId: env,
      cwd: "/home/u/.autodsm/systems/explicit-ws/system",
      name: "Explicit",
    });
    const pThread = stubProject({
      id: "proj-1" as ProjectId,
      environmentId: env,
      cwd: "/home/u/.autodsm/systems/thread-ws/system",
      name: "ThreadProj",
    });
    const ordered = [pThread, pSecondary];
    const out = resolveAutoDsmWorkspace({
      pathname: "/env_a/thread_z",
      sidebarThreads: [stubThread({ id: thread, projectId: pThread.id })],
      orderedProjects: ordered,
      projects: ordered,
      explicitWorkspaceProjectRef: scopeProjectRef(env, pSecondary.id),
    });

    expect(out.cwd).toBe("/home/u/.autodsm/systems/explicit-ws/system");
    expect(out.projectName).toBe("Explicit");
  });

  it("ignores explicit ref when project is missing and falls back to thread route", () => {
    const pThread = stubProject({
      id: "proj-1" as ProjectId,
      environmentId: env,
      cwd: "/home/u/.autodsm/systems/thread-ws/system",
      name: "ThreadProj",
    });
    const ordered = [pThread];
    const out = resolveAutoDsmWorkspace({
      pathname: "/env_a/thread_z",
      sidebarThreads: [stubThread({ id: thread, projectId: pThread.id })],
      orderedProjects: ordered,
      projects: ordered,
      explicitWorkspaceProjectRef: scopeProjectRef(env, "proj-missing" as ProjectId),
    });

    expect(out.cwd).toBe("/home/u/.autodsm/systems/thread-ws/system");
    expect(out.projectName).toBe("ThreadProj");
  });
});

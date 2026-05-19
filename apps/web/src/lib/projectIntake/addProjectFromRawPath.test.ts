import { scopeProjectRef } from "@t3tools/client-runtime";
import type { EnvironmentApi } from "@t3tools/contracts";
import { EnvironmentId, ProjectId } from "@t3tools/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DraftThreadEnvMode } from "~/composerDraftStore";
import * as utils from "~/lib/utils";
import type { Project } from "~/types";

import { addProjectFromRawPath } from "./addProjectFromRawPath";

const env = EnvironmentId.make("env-intake");
const defaultThreadEnvMode: DraftThreadEnvMode = "local";

describe("addProjectFromRawPath", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns scoped ref for an existing project without creating again", async () => {
    const existingId = ProjectId.make("existing-proj");
    const navigate = vi.fn().mockResolvedValue(undefined);
    const handleNewThread = vi.fn().mockResolvedValue(undefined);
    const dispatchCommand = vi.fn();
    const api = { orchestration: { dispatchCommand } } as unknown as EnvironmentApi;

    const projects: Project[] = [
      {
        id: existingId,
        environmentId: env,
        name: "Existing",
        cwd: "/repo/existing",
        scripts: [],
        defaultModelSelection: null,
      },
    ];

    const out = await addProjectFromRawPath({
      rawCwd: "/repo/existing",
      environmentId: env,
      browseEnvironmentPlatform: "darwin",
      currentProjectCwdForBrowse: null,
      api,
      projects,
      threads: [],
      sidebarThreadSortOrder: "updated_at",
      navigate,
      handleNewThread,
      defaultThreadEnvMode,
      onError: () => {},
    });

    expect(out).toEqual(scopeProjectRef(env, existingId));
    expect(dispatchCommand).not.toHaveBeenCalled();
    expect(handleNewThread).toHaveBeenCalledTimes(1);
  });

  it("returns scoped ref after project.create for a new workspace path", async () => {
    const assignedId = ProjectId.make("assigned-new-proj");
    vi.spyOn(utils, "newProjectId").mockReturnValue(assignedId);

    const navigate = vi.fn().mockResolvedValue(undefined);
    const handleNewThread = vi.fn().mockResolvedValue(undefined);
    const dispatchCommand = vi.fn().mockResolvedValue(undefined);
    const api = { orchestration: { dispatchCommand } } as unknown as EnvironmentApi;

    const out = await addProjectFromRawPath({
      rawCwd: "/repo/brand-new",
      environmentId: env,
      browseEnvironmentPlatform: "darwin",
      currentProjectCwdForBrowse: null,
      api,
      projects: [],
      threads: [],
      sidebarThreadSortOrder: "updated_at",
      navigate,
      handleNewThread,
      defaultThreadEnvMode,
      onError: () => {},
    });

    expect(out).toEqual(scopeProjectRef(env, assignedId));
    expect(dispatchCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "project.create",
        projectId: assignedId,
        workspaceRoot: "/repo/brand-new",
      }),
    );
    expect(handleNewThread).toHaveBeenCalledTimes(1);
  });
});

import { scopeProjectRef } from "@t3tools/client-runtime";
import type { EnvironmentId, ProjectId } from "@t3tools/contracts";

import { useComposerDraftStore } from "~/composerDraftStore";
import { readEnvironmentApi } from "~/environmentApi";
import { newCommandId } from "~/lib/utils";

/**
 * Removes a project from orchestration (sidebar entry) and clears composer drafts for it.
 * Does not delete files on disk. When {@link force} is true, the server may delete active threads first.
 */
export async function disconnectProjectFromWorkspace(input: {
  readonly environmentId: EnvironmentId;
  readonly projectId: ProjectId;
  readonly force?: boolean;
}): Promise<void> {
  const projectRef = scopeProjectRef(input.environmentId, input.projectId);
  const draftStore = useComposerDraftStore.getState();
  const projectDraftThread = draftStore.getDraftThreadByProjectRef(projectRef);
  if (projectDraftThread) {
    draftStore.clearDraftThread(projectDraftThread.draftId);
  }
  draftStore.clearProjectDraftThreadId(projectRef);

  const projectApi = readEnvironmentApi(input.environmentId);
  if (!projectApi) {
    throw new Error("Project API unavailable.");
  }

  await projectApi.orchestration.dispatchCommand({
    type: "project.delete",
    commandId: newCommandId(),
    projectId: input.projectId,
    ...(input.force === true ? { force: true } : {}),
  });
}

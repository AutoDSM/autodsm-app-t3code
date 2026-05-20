import type { ScopedProjectRef, ScopedThreadRef } from "@t3tools/contracts";

import { selectProjectByRef, selectThreadExistsByRef, useStore } from "~/store";

export async function waitForOrchestrationThreadInStore(
  threadRef: ScopedThreadRef,
  options?: { readonly timeoutMs?: number; readonly intervalMs?: number },
): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? 5_000;
  const intervalMs = options?.intervalMs ?? 50;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (selectThreadExistsByRef(useStore.getState(), threadRef)) {
      return true;
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }

  return false;
}

export async function waitForProjectCwdInStore(
  projectRef: ScopedProjectRef,
  options?: { readonly timeoutMs?: number; readonly intervalMs?: number },
): Promise<boolean> {
  const timeoutMs = options?.timeoutMs ?? 5_000;
  const intervalMs = options?.intervalMs ?? 50;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const project = selectProjectByRef(useStore.getState(), projectRef);
    if (project?.cwd !== undefined && project.cwd.length > 0) {
      return true;
    }
    await new Promise<void>((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }

  return false;
}

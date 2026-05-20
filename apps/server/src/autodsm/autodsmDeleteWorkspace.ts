// @effect-diagnostics nodeBuiltinImport:off
import * as fsPromises from "node:fs/promises";
import * as path from "node:path";

import {
  AutoDsmRpcError,
  type AutoDsmDeleteWorkspaceInput,
  type AutoDsmDeleteWorkspaceResult,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";

import { resolveAutodsmUserRoot } from "./autodsmWorkspaceHistory.ts";

function resolveWorkspaceDir(workspaceId: string): string {
  const trimmed = workspaceId.trim();
  const autodsmRoot = path.resolve(resolveAutodsmUserRoot());
  const workspaceDir = path.resolve(autodsmRoot, "systems", trimmed);
  const systemsRoot = path.resolve(autodsmRoot, "systems");
  if (workspaceDir !== systemsRoot && !workspaceDir.startsWith(`${systemsRoot}${path.sep}`)) {
    throw new Error("Workspace path escapes AutoDSM systems root.");
  }
  return workspaceDir;
}

export const autodsmDeleteWorkspaceFromDisk = (
  input: AutoDsmDeleteWorkspaceInput,
): Effect.Effect<AutoDsmDeleteWorkspaceResult, AutoDsmRpcError> =>
  Effect.gen(function* () {
    const workspaceId = input.workspaceId.trim();
    if (workspaceId.length === 0) {
      return yield* new AutoDsmRpcError({ message: "workspaceId is required." });
    }

    const workspaceDir = yield* Effect.try({
      try: () => resolveWorkspaceDir(workspaceId),
      catch: (cause) =>
        new AutoDsmRpcError({
          message: "Invalid workspace id.",
          cause,
        }),
    });

    yield* Effect.tryPromise({
      try: async () => {
        await fsPromises.rm(workspaceDir, { recursive: true, force: true });
      },
      catch: (cause) =>
        new AutoDsmRpcError({
          message: `Failed to delete design system workspace "${workspaceId}".`,
          cause,
        }),
    });

    return { workspaceId };
  });

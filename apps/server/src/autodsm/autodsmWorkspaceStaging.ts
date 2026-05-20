// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import * as path from "node:path";

import { AutoDsmRpcError } from "@t3tools/contracts";
import * as Effect from "effect/Effect";

import { resolveAutodsmUserRoot } from "./autodsmWorkspaceHistory.ts";

export const AUTODSM_STAGING_DIR_NAME = ".staging";

export function resolveAutodsmSystemsRoot(): string {
  return path.join(resolveAutodsmUserRoot(), "systems");
}

export function resolveStagingWorkspaceParent(workspaceId: string): string {
  return path.join(resolveAutodsmSystemsRoot(), AUTODSM_STAGING_DIR_NAME, workspaceId);
}

export function resolveFinalWorkspaceParent(workspaceId: string): string {
  return path.join(resolveAutodsmSystemsRoot(), workspaceId);
}

export function isAutodsmStagingDirectoryName(dirName: string): boolean {
  return dirName === AUTODSM_STAGING_DIR_NAME;
}

interface RawWorkspaceMeta {
  readonly status?: string;
}

export function isReadyAutodsmWorkspaceDir(workspaceRoot: string): boolean {
  const metaPath = path.join(workspaceRoot, "meta.json");
  const componentAgentsPath = path.join(workspaceRoot, "component-agents.json");
  if (!fs.existsSync(metaPath) || !fs.existsSync(componentAgentsPath)) {
    return false;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(metaPath, "utf8")) as RawWorkspaceMeta;
    if (raw.status !== undefined && raw.status !== "ready") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function sweepAutodsmStagingDirectories(): Effect.Effect<void, AutoDsmRpcError> {
  return Effect.gen(function* () {
    const stagingRoot = path.join(resolveAutodsmSystemsRoot(), AUTODSM_STAGING_DIR_NAME);
    if (!fs.existsSync(stagingRoot)) {
      return;
    }

    const entries = yield* Effect.tryPromise({
      try: () => fsPromises.readdir(stagingRoot, { withFileTypes: true }),
      catch: (cause) =>
        new AutoDsmRpcError({
          message: "Failed to list AutoDSM staging workspaces",
          cause,
        }),
    });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      const stagingDir = path.join(stagingRoot, entry.name);
      yield* removeAutodsmDirectory(stagingDir, "autodsm.staging.sweep");
    }
  });
}

export function sweepBrokenAutodsmWorkspaces(): Effect.Effect<void, AutoDsmRpcError> {
  return Effect.gen(function* () {
    const systemsRoot = resolveAutodsmSystemsRoot();
    if (!fs.existsSync(systemsRoot)) {
      return;
    }

    const entries = yield* Effect.tryPromise({
      try: () => fsPromises.readdir(systemsRoot, { withFileTypes: true }),
      catch: (cause) =>
        new AutoDsmRpcError({
          message: "Failed to list AutoDSM workspaces for broken-workspace sweep",
          cause,
        }),
    });

    for (const entry of entries) {
      if (!entry.isDirectory() || isAutodsmStagingDirectoryName(entry.name)) {
        continue;
      }
      const workspaceRoot = path.join(systemsRoot, entry.name);
      if (isReadyAutodsmWorkspaceDir(workspaceRoot)) {
        continue;
      }
      yield* removeAutodsmDirectory(workspaceRoot, "autodsm.broken-workspace.sweep");
    }
  });
}

function removeAutodsmDirectory(
  targetDir: string,
  logEvent: string,
): Effect.Effect<void, AutoDsmRpcError> {
  return Effect.gen(function* () {
    const exit = yield* Effect.exit(
      Effect.tryPromise({
        try: () => fsPromises.rm(targetDir, { recursive: true, force: true }),
        catch: (cause) =>
          new AutoDsmRpcError({
            message: `Failed to remove AutoDSM directory at ${targetDir}`,
            cause,
          }),
      }),
    );

    if (exit._tag === "Success") {
      yield* Effect.logInfo(logEvent, {
        removed: targetDir,
      });
      return;
    }

    yield* Effect.logWarning(`${logEvent} failed`, {
      targetDir,
      message: "Failed to remove AutoDSM directory",
    });
  });
}

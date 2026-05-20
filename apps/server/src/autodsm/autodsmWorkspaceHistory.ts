// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import {
  AutoDsmRpcError,
  type AutoDsmListWorkspaceHistoryInput,
  type AutoDsmListWorkspaceHistoryResult,
  type AutoDsmWorkspaceHistoryEntry,
  type AutoDsmWorkspaceStarterId,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";

import {
  isAutodsmStagingDirectoryName,
  isReadyAutodsmWorkspaceDir,
} from "./autodsmWorkspaceStaging.ts";

export function resolveAutodsmUserRoot(): string {
  const override = process.env.AUTODSM_HOME?.trim();
  if (override && override.length > 0) {
    return path.resolve(override);
  }
  return path.join(os.homedir(), ".autodsm");
}

interface RawWorkspaceMeta {
  readonly workspaceId?: string;
  readonly starterId?: string;
  readonly createdAt?: string;
  readonly systemPath?: string;
  readonly displayName?: string;
  readonly ownerSubject?: string | null;
  readonly authProvider?: string | null;
}

const WORKSPACE_STARTER_IDS = new Set<AutoDsmWorkspaceStarterId>([
  "modern-starter",
  "shadcn-ui",
  "mui",
  "chakra-ui",
  "tailwind-css",
]);

function isWorkspaceStarterId(value: string): value is AutoDsmWorkspaceStarterId {
  return WORKSPACE_STARTER_IDS.has(value as AutoDsmWorkspaceStarterId);
}

function fallbackDisplayName(starterId: AutoDsmWorkspaceStarterId): string {
  switch (starterId) {
    case "modern-starter":
      return "AutoDSM workspace";
    case "shadcn-ui":
      return "Shadcn UI workspace";
    case "mui":
      return "Material UI workspace";
    case "chakra-ui":
      return "Chakra UI workspace";
    case "tailwind-css":
      return "Tailwind workspace";
    default:
      return "AutoDSM workspace";
  }
}

function parseWorkspaceMeta(
  workspaceIdFromDir: string,
  raw: RawWorkspaceMeta,
): AutoDsmWorkspaceHistoryEntry | null {
  const workspaceId = (raw.workspaceId ?? workspaceIdFromDir).trim();
  const starterId = raw.starterId;
  const createdAt = raw.createdAt?.trim();
  const systemPath = raw.systemPath?.trim();
  if (!workspaceId || !starterId || !createdAt || !systemPath) {
    return null;
  }
  if (!isWorkspaceStarterId(starterId)) {
    return null;
  }
  const displayName =
    raw.displayName?.trim() && raw.displayName.trim().length > 0
      ? raw.displayName.trim().slice(0, 120)
      : fallbackDisplayName(starterId);

  const ownerSubject =
    typeof raw.ownerSubject === "string" && raw.ownerSubject.trim().length > 0
      ? raw.ownerSubject.trim()
      : undefined;
  const authProvider =
    typeof raw.authProvider === "string" && raw.authProvider.trim().length > 0
      ? raw.authProvider.trim()
      : undefined;

  return {
    workspaceId,
    displayName,
    starterId,
    createdAt,
    systemPath,
    ...(ownerSubject ? { ownerSubject } : {}),
    ...(authProvider ? { authProvider } : {}),
  };
}

export function listAutodsmWorkspaceHistoryFromDisk(
  input: AutoDsmListWorkspaceHistoryInput,
): Effect.Effect<AutoDsmListWorkspaceHistoryResult, AutoDsmRpcError> {
  return Effect.gen(function* () {
    const systemsRoot = path.join(resolveAutodsmUserRoot(), "systems");
    if (!fs.existsSync(systemsRoot)) {
      return { entries: [] };
    }

    const entries = yield* Effect.tryPromise({
      try: () => fsPromises.readdir(systemsRoot, { withFileTypes: true }),
      catch: (cause) =>
        new AutoDsmRpcError({ message: "Failed to list AutoDSM workspace history", cause }),
    });
    const dirNames = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

    const ownerFilter = input.ownerSubject?.trim();
    const parsed: AutoDsmWorkspaceHistoryEntry[] = [];

    for (const dirName of dirNames) {
      if (isAutodsmStagingDirectoryName(dirName)) {
        continue;
      }

      const workspaceRoot = path.join(systemsRoot, dirName);
      if (!isReadyAutodsmWorkspaceDir(workspaceRoot)) {
        continue;
      }

      const metaPath = path.join(workspaceRoot, "meta.json");
      if (!fs.existsSync(metaPath)) {
        continue;
      }
      const rawText = yield* Effect.tryPromise({
        try: () => fsPromises.readFile(metaPath, "utf8"),
        catch: (cause) =>
          new AutoDsmRpcError({
            message: `Failed to read workspace metadata at ${metaPath}`,
            cause,
          }),
      });
      const parseExit = yield* Effect.exit(
        Effect.try({
          try: () => JSON.parse(rawText) as RawWorkspaceMeta,
          catch: () => new AutoDsmRpcError({ message: "Invalid workspace meta.json" }),
        }),
      );
      if (parseExit._tag !== "Success") {
        continue;
      }
      const raw = parseExit.value;
      const entry = parseWorkspaceMeta(dirName, raw);
      if (!entry) {
        continue;
      }
      if (ownerFilter) {
        if (entry.ownerSubject !== ownerFilter) {
          continue;
        }
      }
      parsed.push(entry);
    }

    parsed.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { entries: parsed };
  });
}

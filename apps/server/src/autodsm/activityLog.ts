// @effect-diagnostics nodeBuiltinImport:off
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  AutoDsmActivityEntry,
  AutoDsmActivityEntryId,
  type AutoDsmActivityListResult,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";

import { resolveAutodsmWorkspaceLayout } from "./autodsmWorkspacePaths.ts";

const decodeActivityEntry = Schema.decodeUnknownSync(AutoDsmActivityEntry);

function appendJsonLine(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
}

export function appendWorkspaceActivity(input: {
  readonly cwd: string;
  readonly kind: string;
  readonly summary: string;
  readonly payload: Record<string, unknown>;
  readonly createdAt: string;
}): AutoDsmActivityEntry {
  const layout = resolveAutodsmWorkspaceLayout(input.cwd);
  const entry = AutoDsmActivityEntry.make({
    id: AutoDsmActivityEntryId.make(crypto.randomUUID()),
    workspaceId: layout.workspaceId,
    kind: input.kind,
    summary: input.summary,
    payloadJson: JSON.stringify(input.payload),
    createdAt: input.createdAt,
  });
  appendJsonLine(layout.activityLogPath, entry);
  return entry;
}

export function listWorkspaceActivity(input: {
  readonly cwd: string;
  readonly limit?: number;
}): AutoDsmActivityListResult {
  const layout = resolveAutodsmWorkspaceLayout(input.cwd);
  const limit = input.limit ?? 100;
  let raw = "";
  try {
    raw = fs.readFileSync(layout.activityLogPath, "utf8");
  } catch {
    return { entries: [] };
  }

  const lines = raw.split("\n").filter((line) => line.trim().length > 0);
  const entries: AutoDsmActivityEntry[] = [];
  for (let index = lines.length - 1; index >= 0 && entries.length < limit; index -= 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }
    try {
      entries.push(decodeActivityEntry(JSON.parse(line) as unknown));
    } catch {
      /* skip corrupt lines */
    }
  }
  return { entries };
}

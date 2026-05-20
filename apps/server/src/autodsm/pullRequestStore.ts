// @effect-diagnostics nodeBuiltinImport:off
// @effect-diagnostics globalDate:off
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  AutoDsmPullRequest,
  AutoDsmPullRequestId,
  type AutoDsmPullRequestCreateInput,
  type AutoDsmPullRequestListResult,
  AutoDsmChangeSetId,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";

import { resolveAutodsmWorkspaceLayout } from "./autodsmWorkspacePaths.ts";

const decodePullRequest = Schema.decodeUnknownSync(AutoDsmPullRequest);

function writeJsonAtomic(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, filePath);
}

function findAndLoadChangeSet(sessionsDir: string, changeSetId: AutoDsmChangeSetId): any {
  if (!fs.existsSync(sessionsDir)) {
    return null;
  }
  try {
    const sessions = fs.readdirSync(sessionsDir);
    for (const session of sessions) {
      const filePath = path.join(sessionsDir, session, "changesets", `${changeSetId}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8");
        return JSON.parse(raw);
      }
    }
  } catch {}
  return null;
}

export function createPullRequest(input: AutoDsmPullRequestCreateInput): AutoDsmPullRequest {
  const layout = resolveAutodsmWorkspaceLayout(input.cwd);

  // Extract files from changesets
  const fileSet = new Set<string>();
  for (const csId of input.changeSetIds) {
    const cs = findAndLoadChangeSet(layout.sessionsDir, csId);
    if (cs && Array.isArray(cs.ops)) {
      for (const op of cs.ops) {
        if (op && typeof op.path === "string") {
          fileSet.add(op.path);
        }
        if (op && typeof op.renameTo === "string") {
          fileSet.add(op.renameTo);
        }
      }
    }
  }

  const pullRequest: AutoDsmPullRequest = {
    id: AutoDsmPullRequestId.make(crypto.randomUUID()),
    workspaceId: layout.workspaceId,
    cwd: input.cwd,
    title: input.title,
    summary: input.summary ?? "",
    status: "open",
    changeSetIds: [...input.changeSetIds],
    files: Array.from(fileSet),
    createdAt: new Date().toISOString(),
  };

  writeJsonAtomic(path.join(layout.prsDir, `${pullRequest.id}.json`), pullRequest);
  return pullRequest;
}

export function listPullRequests(cwd: string): AutoDsmPullRequestListResult {
  const layout = resolveAutodsmWorkspaceLayout(cwd);
  let files: string[] = [];
  try {
    files = fs.readdirSync(layout.prsDir).filter((name) => name.endsWith(".json"));
  } catch {
    return { pullRequests: [] };
  }

  const pullRequests: AutoDsmPullRequest[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(layout.prsDir, file), "utf8");
      pullRequests.push(decodePullRequest(JSON.parse(raw) as unknown));
    } catch {
      /* skip corrupt files */
    }
  }
  return {
    pullRequests: pullRequests.toSorted((left, right) =>
      right.createdAt.localeCompare(left.createdAt),
    ),
  };
}

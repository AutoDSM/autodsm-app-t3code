// @effect-diagnostics nodeBuiltinImport:off
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  AutoDsmChangeSet,
  AutoDsmChangeSetId,
  AutoDsmSessionId,
  type ThreadId,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";

import { resolveAutodsmWorkspaceLayout, sessionChangeSetPath } from "./autodsmWorkspacePaths.ts";
import { loadSessionByThreadId } from "./sessionStore.ts";
import { findComponentAgentByThreadId } from "./componentAgentStore.ts";

const decodeChangeSet = Schema.decodeUnknownSync(AutoDsmChangeSet);

function writeJsonAtomic(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, filePath);
}

export function persistChangeSet(input: {
  readonly cwd: string;
  readonly sessionId: AutoDsmSessionId;
  readonly changeSet: AutoDsmChangeSet;
}): void {
  const layout = resolveAutodsmWorkspaceLayout(input.cwd);
  const filePath = sessionChangeSetPath(layout.sessionsDir, input.sessionId, input.changeSet.id);
  writeJsonAtomic(filePath, input.changeSet);
}

export function loadPersistedChangeSet(
  cwd: string,
  sessionId: AutoDsmSessionId,
  changeSetId: AutoDsmChangeSetId,
): AutoDsmChangeSet | null {
  const layout = resolveAutodsmWorkspaceLayout(cwd);
  const filePath = sessionChangeSetPath(layout.sessionsDir, sessionId, changeSetId);
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return decodeChangeSet(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function listPersistedChangeSetsForSession(
  cwd: string,
  sessionId: AutoDsmSessionId,
): AutoDsmChangeSet[] {
  const layout = resolveAutodsmWorkspaceLayout(cwd);
  const dir = path.join(layout.sessionsDir, sessionId, "changesets");
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((name) => name.endsWith(".json"));
  } catch {
    return [];
  }
  const changeSets: AutoDsmChangeSet[] = [];
  for (const file of files) {
    const id = AutoDsmChangeSetId.make(file.replace(/\.json$/, ""));
    const changeSet = loadPersistedChangeSet(cwd, sessionId, id);
    if (changeSet) {
      changeSets.push(changeSet);
    }
  }
  return changeSets.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function resolveSessionIdForChangeSet(
  cwd: string,
  threadId: ThreadId | undefined,
): AutoDsmSessionId | null {
  if (!threadId) {
    return null;
  }
  const agent = findComponentAgentByThreadId(cwd, threadId);
  if (agent) {
    return agent.sessionId;
  }
  const session = loadSessionByThreadId(cwd, threadId);
  return session?.sessionId ?? null;
}

export function hydrateChangeSetFromDisk(
  cwd: string,
  changeSetId: AutoDsmChangeSetId,
  threadId: ThreadId | undefined,
): AutoDsmChangeSet | null {
  const sessionId = resolveSessionIdForChangeSet(cwd, threadId);
  if (!sessionId) {
    return null;
  }
  return loadPersistedChangeSet(cwd, sessionId, changeSetId);
}

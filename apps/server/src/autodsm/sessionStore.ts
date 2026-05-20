// @effect-diagnostics nodeBuiltinImport:off
// @effect-diagnostics globalDate:off
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  AutoDsmSession,
  AutoDsmSessionId,
  type AutoDsmComponentId,
  type AutoDsmSessionCreateInput,
  type ThreadId,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";

import { resolveAutodsmWorkspaceLayout, sessionManifestPath } from "./autodsmWorkspacePaths.ts";

const decodeSession = Schema.decodeUnknownSync(AutoDsmSession);

function normalizeComponentPath(rawPath: string): string {
  const normalized = rawPath.replace(/\\/g, "/").trim();
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function writeJsonAtomic(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, filePath);
}

export function writeSession(cwd: string, session: AutoDsmSession): AutoDsmSession {
  const layout = resolveAutodsmWorkspaceLayout(cwd);
  writeJsonAtomic(sessionManifestPath(layout.sessionsDir, session.sessionId), session);
  return session;
}

export function loadSession(cwd: string, sessionId: AutoDsmSessionId): AutoDsmSession | null {
  const layout = resolveAutodsmWorkspaceLayout(cwd);
  try {
    const raw = fs.readFileSync(sessionManifestPath(layout.sessionsDir, sessionId), "utf8");
    return decodeSession(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function loadSessionByThreadId(cwd: string, threadId: ThreadId): AutoDsmSession | null {
  const layout = resolveAutodsmWorkspaceLayout(cwd);
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(layout.sessionsDir);
  } catch {
    return null;
  }
  for (const sessionId of entries) {
    const session = loadSession(cwd, AutoDsmSessionId.make(sessionId));
    if (session?.threadId === threadId) {
      return session;
    }
  }
  return null;
}

export function createSessionRecord(input: {
  readonly cwd: string;
  readonly threadId: ThreadId;
  readonly componentPath: string;
  readonly componentId?: AutoDsmComponentId;
  readonly branchName?: string;
}): AutoDsmSession {
  const existing = loadSessionByThreadId(input.cwd, input.threadId);
  if (existing) {
    return existing;
  }
  const session: AutoDsmSession = {
    sessionId: AutoDsmSessionId.make(crypto.randomUUID()),
    componentPath: normalizeComponentPath(input.componentPath),
    threadId: input.threadId,
    status: "active",
    changeSetIds: [],
    createdAt: new Date().toISOString(),
    ...(input.componentId !== undefined ? { componentId: input.componentId } : {}),
    ...(input.branchName !== undefined ? { branchName: input.branchName } : {}),
  };
  return writeSession(input.cwd, session);
}

export function createSession(input: AutoDsmSessionCreateInput): AutoDsmSession {
  return createSessionRecord({
    cwd: input.cwd,
    threadId: input.threadId,
    componentPath: input.componentPath,
    ...(input.componentId !== undefined ? { componentId: input.componentId } : {}),
    ...(input.branchName !== undefined ? { branchName: input.branchName } : {}),
  });
}

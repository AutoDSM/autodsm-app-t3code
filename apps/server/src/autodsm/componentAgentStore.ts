// @effect-diagnostics nodeBuiltinImport:off
// @effect-diagnostics globalDate:off
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  AutoDsmComponentAgentsManifest,
  AutoDsmComponentAgentRecord,
  AutoDsmSession,
  AutoDsmSessionId,
  AutoDsmChangeSetId,
  type AutoDsmComponentAgentRegisterInput,
  type AutoDsmComponentAgentUpdateInput,
  type AutoDsmComponentAgentSource,
  type AutoDsmComponentId,
  type ThreadId,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";

import { resolveAutodsmWorkspaceLayout } from "./autodsmWorkspacePaths.ts";
import { createSessionRecord, loadSessionByThreadId, writeSession } from "./sessionStore.ts";

const MANIFEST_SCHEMA_VERSION = 1;

const decodeManifest = Schema.decodeUnknownSync(AutoDsmComponentAgentsManifest);

function writeJsonAtomic(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, filePath);
}

function normalizeComponentPath(rawPath: string): string {
  const normalized = rawPath.replace(/\\/g, "/").trim();
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function loadComponentAgentsManifest(cwd: string): AutoDsmComponentAgentsManifest {
  const layout = resolveAutodsmWorkspaceLayout(cwd);
  try {
    const raw = fs.readFileSync(layout.componentAgentsPath, "utf8");
    return decodeManifest(JSON.parse(raw) as unknown);
  } catch {
    return {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      workspaceId: layout.workspaceId,
      agents: [],
    };
  }
}

export function writeComponentAgentsManifest(
  cwd: string,
  manifest: AutoDsmComponentAgentsManifest,
): AutoDsmComponentAgentsManifest {
  const layout = resolveAutodsmWorkspaceLayout(cwd);
  const next = {
    ...manifest,
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    workspaceId: layout.workspaceId,
  };
  writeJsonAtomic(layout.componentAgentsPath, next);
  return next;
}

export function seedComponentAgentsManifest(input: {
  readonly cwd: string;
  readonly agents: ReadonlyArray<{
    readonly threadId: ThreadId;
    readonly title: string;
    readonly componentPath: string;
    readonly group?: string;
    readonly source: AutoDsmComponentAgentSource;
    readonly createdAt: string;
  }>;
}): AutoDsmComponentAgentsManifest {
  const records: AutoDsmComponentAgentRecord[] = [];
  for (const agent of input.agents) {
    const session = createSessionRecord({
      cwd: input.cwd,
      threadId: agent.threadId,
      componentPath: agent.componentPath,
    });
    records.push({
      threadId: agent.threadId,
      sessionId: session.sessionId,
      title: agent.title,
      componentPath: normalizeComponentPath(agent.componentPath),
      ...(agent.group?.trim() ? { group: agent.group.trim() } : {}),
      status: "active",
      source: agent.source,
      createdAt: agent.createdAt,
    });
  }
  return writeComponentAgentsManifest(input.cwd, {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    workspaceId: resolveAutodsmWorkspaceLayout(input.cwd).workspaceId,
    agents: records,
  });
}

export function registerComponentAgent(input: AutoDsmComponentAgentRegisterInput): {
  readonly agent: AutoDsmComponentAgentRecord;
  readonly session: AutoDsmSession;
} {
  const manifest = loadComponentAgentsManifest(input.cwd);
  const componentPath = normalizeComponentPath(input.componentPath);
  const existing = manifest.agents.find((agent) => agent.threadId === input.threadId);
  if (existing) {
    const session =
      loadSessionByThreadId(input.cwd, input.threadId) ??
      createSessionRecord({
        cwd: input.cwd,
        threadId: input.threadId,
        componentPath,
      });
    return { agent: existing, session };
  }

  const session = createSessionRecord({
    cwd: input.cwd,
    threadId: input.threadId,
    componentPath,
  });
  const agent: AutoDsmComponentAgentRecord = {
    threadId: input.threadId,
    sessionId: session.sessionId,
    title: input.title,
    componentPath,
    ...(input.group?.trim() ? { group: input.group.trim() } : {}),
    status: input.status ?? "creating",
    source: input.source,
    createdAt: new Date().toISOString(),
  };
  writeComponentAgentsManifest(input.cwd, {
    ...manifest,
    agents: [...manifest.agents, agent],
  });
  return { agent, session };
}

export function updateComponentAgent(
  input: AutoDsmComponentAgentUpdateInput,
): AutoDsmComponentAgentRecord {
  const manifest = loadComponentAgentsManifest(input.cwd);
  const index = manifest.agents.findIndex((agent) => agent.threadId === input.threadId);
  if (index < 0) {
    throw new Error(`Unknown component agent for thread ${input.threadId}`);
  }
  const current = manifest.agents[index]!;
  const next: AutoDsmComponentAgentRecord = {
    ...current,
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.componentId !== undefined ? { componentId: input.componentId } : {}),
    ...(input.lastRenderedAt !== undefined ? { lastRenderedAt: input.lastRenderedAt } : {}),
  };
  const agents = [...manifest.agents];
  agents[index] = next;
  writeComponentAgentsManifest(input.cwd, { ...manifest, agents });
  return next;
}

export function findComponentAgentByThreadId(
  cwd: string,
  threadId: ThreadId,
): AutoDsmComponentAgentRecord | null {
  const manifest = loadComponentAgentsManifest(cwd);
  return manifest.agents.find((agent) => agent.threadId === threadId) ?? null;
}

export function findComponentAgentByComponentPath(
  cwd: string,
  componentPath: string,
): AutoDsmComponentAgentRecord | null {
  const normalized = normalizeComponentPath(componentPath);
  const manifest = loadComponentAgentsManifest(cwd);
  return manifest.agents.find((agent) => agent.componentPath === normalized) ?? null;
}

export function reconcileComponentIdsFromRegistry(
  cwd: string,
  entries: ReadonlyArray<{
    readonly componentId: AutoDsmComponentId;
    readonly relativePath: string;
  }>,
): void {
  const manifest = loadComponentAgentsManifest(cwd);
  let changed = false;
  const agents = manifest.agents.map((agent) => {
    const match = entries.find(
      (entry) => normalizeComponentPath(entry.relativePath) === agent.componentPath,
    );
    if (!match || agent.componentId === match.componentId) {
      return agent;
    }
    changed = true;
    return {
      ...agent,
      componentId: match.componentId,
      status: agent.status === "creating" ? "active" : agent.status,
    };
  });
  if (changed) {
    writeComponentAgentsManifest(cwd, { ...manifest, agents });
  }
}

export function appendChangeSetToSessionManifest(
  cwd: string,
  sessionId: AutoDsmSessionId,
  changeSetId: AutoDsmChangeSetId,
): void {
  const layout = resolveAutodsmWorkspaceLayout(cwd);
  const manifestPath = path.join(layout.sessionsDir, sessionId, "manifest.json");
  let raw: string;
  try {
    raw = fs.readFileSync(manifestPath, "utf8");
  } catch {
    return;
  }
  const session = JSON.parse(raw) as AutoDsmSession;
  if (session.changeSetIds.includes(changeSetId)) {
    return;
  }
  writeSession(cwd, {
    ...session,
    changeSetIds: [...session.changeSetIds, changeSetId],
  });
}

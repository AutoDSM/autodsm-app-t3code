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
  type AutoDsmComponentAgentResyncMode,
  type AutoDsmComponentAgentResyncResult,
  type AutoDsmComponentAgentUpdateInput,
  type AutoDsmComponentAgentRemoveInput,
  type AutoDsmComponentAgentSource,
  type AutoDsmComponentId,
  type AutoDsmWorkspaceStarterId,
  type ThreadId,
} from "@t3tools/contracts";
import * as Schema from "effect/Schema";

import { resolveBundledWorkspaceTemplatesDir } from "./autodsmCreateWorkspace.ts";
import { resolveAutodsmWorkspaceLayout } from "./autodsmWorkspacePaths.ts";
import { scanTemplateComponentAgents, type ScannerOverlay } from "./componentAgentScanner.ts";
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

function fileStemFromComponentPath(componentPath: string): string {
  const normalized = componentPath.replace(/\\/g, "/");
  const fileName = normalized.split("/").pop() ?? normalized;
  return fileName.replace(/\.(tsx|jsx)$/i, "");
}

function scoreAgentForDedupe(agent: AutoDsmComponentAgentRecord): number {
  const stem = fileStemFromComponentPath(agent.componentPath);
  if (agent.exportName === stem) {
    return 0;
  }
  if (!agent.exportName?.trim()) {
    return 1;
  }
  return 2 + agent.title.length;
}

export function dedupeComponentAgentsByPath(
  agents: readonly AutoDsmComponentAgentRecord[],
): AutoDsmComponentAgentRecord[] {
  const byPath = new Map<string, AutoDsmComponentAgentRecord>();
  for (const agent of agents) {
    const key = normalizeComponentPath(agent.componentPath);
    const existing = byPath.get(key);
    if (!existing || scoreAgentForDedupe(agent) < scoreAgentForDedupe(existing)) {
      byPath.set(key, agent);
    }
  }
  return [...byPath.values()];
}

export function loadComponentAgentsManifest(cwd: string): AutoDsmComponentAgentsManifest {
  const layout = resolveAutodsmWorkspaceLayout(cwd);
  try {
    const raw = fs.readFileSync(layout.componentAgentsPath, "utf8");
    const decoded = decodeManifest(JSON.parse(raw) as unknown);
    const dedupedAgents = dedupeComponentAgentsByPath(decoded.agents);
    if (dedupedAgents.length !== decoded.agents.length) {
      const next = {
        ...decoded,
        agents: dedupedAgents,
      };
      writeJsonAtomic(layout.componentAgentsPath, next);
      return next;
    }
    return decoded;
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
    /**
     * Named export this seed agent represents (when the wrapper file exposes
     * multiple variants). Omitted for single-export / default-export files.
     */
    readonly exportName?: string;
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
      ...(agent.exportName?.trim() ? { exportName: agent.exportName.trim() } : {}),
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
    ...(input.exportName?.trim() ? { exportName: input.exportName.trim() } : {}),
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

export function removeComponentAgent(input: AutoDsmComponentAgentRemoveInput): {
  removed: boolean;
} {
  const manifest = loadComponentAgentsManifest(input.cwd);
  const nextAgents = manifest.agents.filter((agent) => agent.threadId !== input.threadId);
  if (nextAgents.length === manifest.agents.length) {
    return { removed: false };
  }
  writeComponentAgentsManifest(input.cwd, { ...manifest, agents: nextAgents });
  return { removed: true };
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

/** Workspace meta.json carries the `starterId` that materialized this workspace. */
interface WorkspaceMetaLite {
  readonly starterId?: string;
}

function readWorkspaceStarterId(systemDir: string): AutoDsmWorkspaceStarterId | null {
  // meta.json lives at <workspaceRoot>/meta.json, one level above `system/`.
  const metaPath = path.join(path.dirname(systemDir), "meta.json");
  try {
    const raw = fs.readFileSync(metaPath, "utf8");
    const parsed = JSON.parse(raw) as WorkspaceMetaLite;
    const candidate = parsed.starterId;
    if (!candidate) return null;
    if (
      candidate === "modern-starter" ||
      candidate === "shadcn-ui" ||
      candidate === "mui" ||
      candidate === "chakra-ui" ||
      candidate === "tailwind-css"
    ) {
      return candidate;
    }
    return null;
  } catch {
    return null;
  }
}

function loadTemplateOverlay(templateDir: string): ScannerOverlay | null {
  const overlayPath = path.join(templateDir, "component-agents.json");
  try {
    const raw = fs.readFileSync(overlayPath, "utf8");
    return JSON.parse(raw) as ScannerOverlay;
  } catch {
    return null;
  }
}

/**
 * Recursively copy any wrapper files present in the TEMPLATE's
 * `src/components/` tree that aren't yet in the WORKSPACE's
 * `src/components/`. Additive only — never overwrites a file the user may
 * have customized. Returns the list of newly added relative paths.
 */
function copyMissingTemplateComponents(
  templateDir: string,
  workspaceSystemDir: string,
): readonly string[] {
  const templateComponentsRoot = path.join(templateDir, "src", "components");
  const workspaceComponentsRoot = path.join(workspaceSystemDir, "src", "components");
  if (!fs.existsSync(templateComponentsRoot)) {
    return [];
  }
  fs.mkdirSync(workspaceComponentsRoot, { recursive: true });
  const added: string[] = [];

  const visit = (relSegments: readonly string[]): void => {
    const absDir = path.join(templateComponentsRoot, ...relSegments);
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const childRel = [...relSegments, entry.name];
      const childTemplateAbs = path.join(templateComponentsRoot, ...childRel);
      const childWorkspaceAbs = path.join(workspaceComponentsRoot, ...childRel);
      if (entry.isDirectory()) {
        fs.mkdirSync(childWorkspaceAbs, { recursive: true });
        visit(childRel);
        continue;
      }
      if (!entry.isFile()) continue;
      if (fs.existsSync(childWorkspaceAbs)) continue; // preserve user mods
      fs.copyFileSync(childTemplateAbs, childWorkspaceAbs);
      added.push(`/src/components/${childRel.join("/")}`);
    }
  };
  visit([]);
  return added;
}

/**
 * Re-seed a workspace's `component-agents.json` from its (possibly
 * expanded) starter template. Copies any wrapper files the template has
 * that the workspace lacks, then rescans + rebuilds the manifest.
 *
 * - `mode === "preserve-user"` (default): all `source === "user"` agents
 *   survive; all `source === "starter"` agents are replaced with the
 *   current template set.
 * - `mode === "overwrite-all"`: full replacement; user agents are dropped.
 *
 * Does NOT touch the workspace's `package.json` — if a freshly-copied
 * wrapper imports a dep the workspace hasn't installed, the user sees the
 * import error in the preview iframe and can run their package manager.
 */
export function resyncComponentAgentsFromTemplate(input: {
  readonly cwd: string;
  readonly mode?: AutoDsmComponentAgentResyncMode;
  /**
   * Override for the bundled-templates location. Production omits this and
   * the function probes the real templates root via
   * {@link resolveBundledWorkspaceTemplatesDir}. Tests pass an explicit
   * fake-template directory.
   */
  readonly templatesDir?: string;
}): AutoDsmComponentAgentResyncResult {
  const mode = input.mode ?? "preserve-user";
  const starterId = readWorkspaceStarterId(input.cwd);
  if (!starterId) {
    throw new Error(
      "Could not determine starter id for this workspace — meta.json is missing or malformed.",
    );
  }
  const templatesRoot = input.templatesDir ?? resolveBundledWorkspaceTemplatesDir();
  const templateDir = path.join(templatesRoot, starterId);
  if (!fs.existsSync(templateDir)) {
    throw new Error(
      `Template directory not found for starter "${starterId}" under ${templatesRoot}.`,
    );
  }

  // 1. Bring missing wrapper files over from the template (additive).
  copyMissingTemplateComponents(templateDir, input.cwd);

  // 2. Rescan the workspace's now-updated components tree with the
  //    template's overlay so per-export agents (variant named exports)
  //    surface correctly.
  const overlay = loadTemplateOverlay(templateDir);
  const scanned = scanTemplateComponentAgents({
    systemDir: input.cwd,
    starterId,
    overlay,
  });

  // 3. Merge with the existing manifest per the requested mode.
  const existing = loadComponentAgentsManifest(input.cwd);
  const previousStarterCount = existing.agents.filter((a) => a.source === "starter").length;
  const preservedUserAgents =
    mode === "preserve-user" ? existing.agents.filter((a) => a.source === "user") : [];

  // Build the seed input shape; createdAt stamps "now" for newly-seeded
  // starter agents. The store's seed function will allocate fresh
  // threadId/sessionId records for each.
  const createdAt = new Date().toISOString();
  const layout = resolveAutodsmWorkspaceLayout(input.cwd);

  const starterRecords: AutoDsmComponentAgentRecord[] = [];
  for (const agent of scanned) {
    const threadId = `t-${crypto.randomUUID()}` as ThreadId;
    const session = createSessionRecord({
      cwd: input.cwd,
      threadId,
      componentPath: agent.componentPath,
    });
    starterRecords.push({
      threadId,
      sessionId: session.sessionId,
      title: agent.title,
      componentPath: normalizeComponentPath(agent.componentPath),
      ...(agent.exportName?.trim() ? { exportName: agent.exportName.trim() } : {}),
      ...(agent.group?.trim() ? { group: agent.group.trim() } : {}),
      status: "active",
      source: "starter",
      createdAt,
    });
  }

  const next: AutoDsmComponentAgentsManifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    workspaceId: layout.workspaceId,
    agents: [...starterRecords, ...preservedUserAgents],
  };
  writeComponentAgentsManifest(input.cwd, next);

  return {
    manifest: next,
    starterAgentsAdded: starterRecords.length,
    starterAgentsRemoved: previousStarterCount,
    userAgentsPreserved: preservedUserAgents.length,
  };
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

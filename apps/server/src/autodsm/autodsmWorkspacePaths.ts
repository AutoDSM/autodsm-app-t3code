// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as path from "node:path";

import {
  componentAgentsPath as persistenceComponentAgentsPath,
  workspaceMetaPath as persistenceWorkspaceMetaPath,
} from "./autodsmPersistencePaths.ts";

export interface AutodsmWorkspaceLayout {
  readonly systemDir: string;
  readonly workspaceRoot: string;
  readonly workspaceId: string;
  readonly componentAgentsPath: string;
  readonly conversationsDir: string;
  readonly sessionsDir: string;
  readonly prsDir: string;
  readonly activityLogPath: string;
  readonly metaPath: string;
}

function readWorkspaceIdFromMeta(metaPath: string, fallback: string): string {
  try {
    const raw = fs.readFileSync(metaPath, "utf8");
    const parsed = JSON.parse(raw) as { workspaceId?: string };
    const id = parsed.workspaceId?.trim();
    return id && id.length > 0 ? id : fallback;
  } catch {
    return fallback;
  }
}

/** Resolve workspace-owned paths from RPC `cwd` (`…/systems/<id>/system`). */
export function resolveAutodsmWorkspaceLayout(cwd: string): AutodsmWorkspaceLayout {
  const systemDir = path.resolve(cwd);
  const workspaceRoot = path.dirname(systemDir);
  const workspaceId = path.basename(workspaceRoot);
  const metaPath = persistenceWorkspaceMetaPath(workspaceRoot);
  return {
    systemDir,
    workspaceRoot,
    workspaceId: readWorkspaceIdFromMeta(metaPath, workspaceId),
    componentAgentsPath: persistenceComponentAgentsPath(workspaceRoot),
    conversationsDir: path.join(workspaceRoot, "conversations"),
    sessionsDir: path.join(workspaceRoot, "sessions"),
    prsDir: path.join(workspaceRoot, "prs"),
    activityLogPath: path.join(workspaceRoot, "activity-log.jsonl"),
    metaPath,
  };
}

export function conversationFilePath(conversationsDir: string, componentPath: string): string {
  const normalized = componentPath.replace(/\\/g, "/");
  const base = path.basename(normalized).replace(/\.tsx$/i, "");
  const slug = base
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const safeSlug = slug.length > 0 ? slug : "component";
  return path.join(conversationsDir, `${safeSlug}.json`);
}

export function sessionManifestPath(sessionsDir: string, sessionId: string): string {
  return path.join(sessionsDir, sessionId, "manifest.json");
}

export function sessionChangeSetPath(
  sessionsDir: string,
  sessionId: string,
  changeSetId: string,
): string {
  return path.join(sessionsDir, sessionId, "changesets", `${changeSetId}.json`);
}

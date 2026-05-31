// @effect-diagnostics nodeBuiltinImport:off
// @effect-diagnostics globalDate:off
/**
 * Durable workspace design-brief store.
 *
 * Persists the user-uploaded `design.md` markdown and a sidecar JSON tracking
 * when the brief was last uploaded / applied. The markdown is the source of
 * truth and is re-openable / re-editable; the sidecar exists for fast
 * metadata reads and for the "lastAppliedAt" timestamp surfaced in the UI.
 *
 * Files:
 *   - `<cwd>/.autodsm/design-brief.md`   — raw markdown the user uploaded.
 *   - `<cwd>/.autodsm/design-brief.json` — `AutoDsmDesignBriefDoc` metadata.
 *
 * @module designBriefStore
 */
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import { type AutoDsmDesignBriefDoc } from "@t3tools/contracts";

import { fingerprintWorkspaceRoot, sha256Hex } from "./autoDsmHelpers.ts";

const DESIGN_BRIEF_SCHEMA_VERSION = 1;
const STORE_DIR = ".autodsm";
const BRIEF_FILE = "design-brief.md";
const SIDECAR_FILE = "design-brief.json";

function briefPath(cwd: string): string {
  return path.join(cwd, STORE_DIR, BRIEF_FILE);
}

function sidecarPath(cwd: string): string {
  return path.join(cwd, STORE_DIR, SIDECAR_FILE);
}

function buildDocMeta(cwd: string, contentSha256: string): AutoDsmDesignBriefDoc["meta"] {
  const fingerprint = fingerprintWorkspaceRoot(cwd);
  return {
    kind: "design-brief-doc",
    schemaVersion: DESIGN_BRIEF_SCHEMA_VERSION,
    owner: "design-brief-store",
    invalidationKey: sha256Hex(`${fingerprint}:${contentSha256}`),
    consumers: ["design-brief-proposer"],
  };
}

/** Atomic temp-file + rename write. */
function writeFileAtomic(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmp, contents, "utf8");
  fs.renameSync(tmp, filePath);
}

export interface LoadedDesignBrief {
  readonly doc: AutoDsmDesignBriefDoc;
  readonly markdown: string;
}

/**
 * Load the persisted brief and its sidecar metadata, or `null` when no brief
 * exists yet. If the markdown is present but the sidecar is missing/corrupt,
 * the sidecar is rebuilt from the markdown contents.
 */
export function loadDesignBrief(cwd: string): LoadedDesignBrief | null {
  let markdown: string;
  try {
    markdown = fs.readFileSync(briefPath(cwd), "utf8");
  } catch {
    return null;
  }
  const contentSha256 = sha256Hex(markdown);
  const byteLength = Buffer.byteLength(markdown, "utf8");

  let sidecar: Partial<AutoDsmDesignBriefDoc> | null = null;
  try {
    const raw = fs.readFileSync(sidecarPath(cwd), "utf8");
    sidecar = JSON.parse(raw) as Partial<AutoDsmDesignBriefDoc>;
  } catch {
    sidecar = null;
  }

  const doc: AutoDsmDesignBriefDoc = {
    meta: buildDocMeta(cwd, contentSha256),
    contentSha256,
    byteLength,
    uploadedAt: sidecar?.uploadedAt ?? new Date().toISOString(),
    ...(sidecar?.lastAppliedAt ? { lastAppliedAt: sidecar.lastAppliedAt } : {}),
    ...(sidecar?.lastProposalId ? { lastProposalId: sidecar.lastProposalId } : {}),
  };

  return { doc, markdown };
}

/**
 * Persist a fresh brief upload. Replaces any existing brief and resets the
 * sidecar's `lastAppliedAt` / `lastProposalId` (a new brief means past
 * apply-state no longer applies).
 */
export function writeDesignBrief(cwd: string, markdown: string): AutoDsmDesignBriefDoc {
  const contentSha256 = sha256Hex(markdown);
  const byteLength = Buffer.byteLength(markdown, "utf8");
  const uploadedAt = new Date().toISOString();

  const doc: AutoDsmDesignBriefDoc = {
    meta: buildDocMeta(cwd, contentSha256),
    contentSha256,
    byteLength,
    uploadedAt,
  };

  writeFileAtomic(briefPath(cwd), markdown);
  writeFileAtomic(sidecarPath(cwd), `${JSON.stringify(doc, null, 2)}\n`);
  return doc;
}

/**
 * Patch the sidecar to record that a proposal derived from the current brief
 * was just applied. Idempotent — no-op when no brief exists on disk.
 */
export function recordProposalApplied(cwd: string, proposalId: string): void {
  const existing = loadDesignBrief(cwd);
  if (!existing) {
    return;
  }
  const next: AutoDsmDesignBriefDoc = {
    ...existing.doc,
    lastAppliedAt: new Date().toISOString(),
    lastProposalId: proposalId,
  };
  writeFileAtomic(sidecarPath(cwd), `${JSON.stringify(next, null, 2)}\n`);
}

/** Remove the persisted brief and sidecar. Idempotent. */
export function clearDesignBrief(cwd: string): void {
  for (const file of [briefPath(cwd), sidecarPath(cwd)]) {
    try {
      fs.unlinkSync(file);
    } catch {
      // ignore: file may not exist
    }
  }
}

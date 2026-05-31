// @effect-diagnostics nodeBuiltinImport:off
import * as crypto from "node:crypto";

import { parsePatchFiles } from "@pierre/diffs";
import type { ChangeContent, ContextContent, FileDiffMetadata, Hunk } from "@pierre/diffs";
import {
  AutoDsmWorkspaceRelativePath,
  type AutoDsmChangeHunk,
  type AutoDsmChangeHunkDecision,
  type AutoDsmChangeOp,
} from "@t3tools/contracts";

/**
 * Derive AutoDSM ChangeSet `ops` + per-hunk `AutoDsmChangeHunk[]` from a unified
 * diff string (as produced by `CheckpointDiffQuery.getTurnDiff`). Reuses
 * `@pierre/diffs` `parsePatchFiles` — the same parser the checkpoint diff
 * summaries and the web `DiffPanel` rely on — so hunk geometry stays consistent
 * across the app.
 *
 * The agent has already written the files to the workspace worktree; these hunks
 * are a *review record*, not an apply instruction. `reconstructFileWithDecisions`
 * (below) turns per-hunk decisions back into file content at apply time.
 */
export interface DerivedChangeSet {
  readonly ops: AutoDsmChangeOp[];
  readonly hunks: AutoDsmChangeHunk[];
}

/** `@pierre/diffs` keeps each line's trailing EOL embedded in the line string. */
function stripEol(line: string | undefined): string {
  return (line ?? "").replace(/\r?\n$/, "");
}

function stripDiffPathPrefix(name: string): string {
  // `@pierre/diffs` keeps the `a/` `b/` prefixes git uses in headers.
  const stripped = name.replace(/^[ab]\//, "").replace(/\\/g, "/");
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

function changeTypeToOpKind(type: FileDiffMetadata["type"]): AutoDsmChangeOp["kind"] {
  switch (type) {
    case "new":
      return "create";
    case "deleted":
      return "delete";
    case "rename-pure":
    case "rename-changed":
      return "rename";
    case "change":
    default:
      return "update";
  }
}

/**
 * Re-emit a single hunk as a standalone, self-contained unified-diff patch
 * (`--- / +++ / @@ ... @@` + body) so it can be rendered independently by the
 * web hunk-review UI (which calls `parsePatchFiles` on the stored string) and
 * re-parsed at apply time. Built from the parsed structure — not raw string
 * slicing — so it is deterministic and stays aligned with the geometry fields.
 */
export function buildHunkPatch(filePath: string, file: FileDiffMetadata, hunk: Hunk): string {
  const lines: string[] = [];
  const headerPath = filePath.replace(/^\//, "");
  lines.push(`--- a/${headerPath}`);
  lines.push(`+++ b/${headerPath}`);
  const context = hunk.hunkContext ? ` ${hunk.hunkContext}` : "";
  lines.push(
    `@@ -${hunk.deletionStart},${hunk.deletionCount} +${hunk.additionStart},${hunk.additionCount} @@${context}`,
  );
  for (const segment of hunk.hunkContent) {
    if (segment.type === "context") {
      const ctx = segment as ContextContent;
      for (let i = 0; i < ctx.lines; i += 1) {
        lines.push(` ${stripEol(file.additionLines[ctx.additionLineIndex + i])}`);
      }
      continue;
    }
    const change = segment as ChangeContent;
    for (let i = 0; i < change.deletions; i += 1) {
      lines.push(`-${stripEol(file.deletionLines[change.deletionLineIndex + i])}`);
    }
    for (let i = 0; i < change.additions; i += 1) {
      lines.push(`+${stripEol(file.additionLines[change.additionLineIndex + i])}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function hunkId(filePath: string, hunk: Hunk, ordinal: number): string {
  const seed = hunk.hunkSpecs ?? `${hunk.deletionStart},${hunk.deletionCount}:${ordinal}`;
  return crypto.createHash("sha256").update(`${filePath}|${seed}`).digest("hex").slice(0, 16);
}

export function deriveChangeSetOpsAndHunks(diff: string): DerivedChangeSet {
  const normalized = diff.replace(/\r\n/g, "\n").trim();
  const ops: AutoDsmChangeOp[] = [];
  const hunks: AutoDsmChangeHunk[] = [];
  if (normalized.length === 0) {
    return { ops, hunks };
  }

  const patches = parsePatchFiles(normalized);
  for (const patch of patches) {
    for (const file of patch.files) {
      const filePath = stripDiffPathPrefix(file.name);
      const relPath = AutoDsmWorkspaceRelativePath.make(filePath);
      const op: AutoDsmChangeOp = {
        kind: changeTypeToOpKind(file.type),
        path: relPath,
        ...(file.prevName
          ? {
              renameTo: relPath,
              path: AutoDsmWorkspaceRelativePath.make(stripDiffPathPrefix(file.prevName)),
            }
          : {}),
      };
      ops.push(op);

      file.hunks.forEach((hunk, ordinal) => {
        hunks.push({
          id: hunkId(filePath, hunk, ordinal),
          filePath: relPath,
          oldStart: hunk.deletionStart,
          oldLines: hunk.deletionCount,
          newStart: hunk.additionStart,
          newLines: hunk.additionCount,
          patch: buildHunkPatch(filePath, file, hunk),
          decision: "pending",
        });
      });
    }
  }
  return { ops, hunks };
}

/**
 * Decision-respecting apply, deterministic and base-file-free.
 *
 * The worktree file on disk already contains *every* hunk applied (the agent
 * wrote it). To honour decisions we keep `approved`/`pending` hunks as written
 * and *revert* `rejected`/`discarded` hunks back to their pre-turn (deletion)
 * content, walking the AFTER file by each hunk's new-file coordinates
 * (`newStart`/`newLines`). No separate base checkpoint read is required.
 *
 * Each stored hunk's `patch` is a standalone unified diff, so we re-parse it to
 * recover the old-side lines and exact geometry.
 */
export function reconstructFileWithDecisions(
  afterContent: string,
  fileHunks: ReadonlyArray<Pick<AutoDsmChangeHunk, "patch" | "decision">>,
): string {
  const reverts = fileHunks
    .filter((h) => h.decision === "rejected" || h.decision === "discarded")
    .map((h) => {
      const parsed = parsePatchFiles(h.patch.replace(/\r\n/g, "\n"))[0]?.files[0];
      const hunk = parsed?.hunks[0];
      if (!parsed || !hunk) {
        return null;
      }
      const oldRegion = parsed.deletionLines
        .slice(hunk.deletionLineIndex, hunk.deletionLineIndex + hunk.deletionCount)
        .map(stripEol);
      return { newStart0: hunk.additionStart - 1, newCount: hunk.additionCount, oldRegion };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => a.newStart0 - b.newStart0);

  if (reverts.length === 0) {
    return afterContent;
  }

  const hadTrailingNewline = afterContent.endsWith("\n");
  const afterLines = afterContent.split("\n");
  if (hadTrailingNewline) {
    afterLines.pop();
  }

  const out: string[] = [];
  let cursor = 0;
  for (const revert of reverts) {
    if (revert.newStart0 > cursor) {
      out.push(...afterLines.slice(cursor, revert.newStart0));
    }
    out.push(...revert.oldRegion);
    cursor = revert.newStart0 + revert.newCount;
  }
  out.push(...afterLines.slice(cursor));

  return hadTrailingNewline ? `${out.join("\n")}\n` : out.join("\n");
}

export function summarizeDecisions(
  hunks: ReadonlyArray<Pick<AutoDsmChangeHunk, "decision">>,
): AutoDsmChangeHunkDecision | "mixed" {
  const reverted = hunks.filter((h) => h.decision === "rejected" || h.decision === "discarded");
  if (reverted.length === 0) {
    return "approved";
  }
  if (reverted.length === hunks.length) {
    return "rejected";
  }
  return "mixed";
}

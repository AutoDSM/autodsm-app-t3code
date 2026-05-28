import type { AutoDsmChangeHunk, AutoDsmChangeHunkDecision } from "@t3tools/contracts";

/** A file's hunks, preserving first-seen file order and per-file hunk order. */
export interface HunkFileGroup {
  readonly filePath: string;
  readonly hunks: readonly AutoDsmChangeHunk[];
}

export function groupHunksByFile(hunks: readonly AutoDsmChangeHunk[]): readonly HunkFileGroup[] {
  const order: string[] = [];
  const byPath = new Map<string, AutoDsmChangeHunk[]>();
  for (const hunk of hunks) {
    const existing = byPath.get(hunk.filePath);
    if (existing) {
      existing.push(hunk);
    } else {
      order.push(hunk.filePath);
      byPath.set(hunk.filePath, [hunk]);
    }
  }
  return order.map((filePath) => ({ filePath, hunks: byPath.get(filePath)! }));
}

export interface HunkDecisionSummary {
  readonly approved: number;
  readonly rejected: number;
  readonly discarded: number;
  readonly pending: number;
  readonly total: number;
}

export function summarizeHunkDecisions(
  hunks: readonly { readonly decision: AutoDsmChangeHunkDecision }[],
): HunkDecisionSummary {
  const summary = { approved: 0, rejected: 0, discarded: 0, pending: 0, total: hunks.length };
  for (const hunk of hunks) {
    summary[hunk.decision] += 1;
  }
  return summary;
}

/** True when no hunk is still `pending` — i.e. the reviewer has decided everything. */
export function allHunksDecided(
  hunks: readonly { readonly decision: AutoDsmChangeHunkDecision }[],
): boolean {
  return hunks.length > 0 && hunks.every((h) => h.decision !== "pending");
}

/**
 * What applying these decisions would record. `rejected`/`discarded` revert,
 * `approved`/`pending` are kept (the file is already written on disk).
 * - `empty`   — no hunks
 * - `accepted` — nothing reverted
 * - `reverted` — everything reverted
 * - `partial`  — some reverted
 */
export function previewDisposition(
  hunks: readonly { readonly decision: AutoDsmChangeHunkDecision }[],
): "empty" | "accepted" | "reverted" | "partial" {
  if (hunks.length === 0) {
    return "empty";
  }
  const reverted = hunks.filter(
    (h) => h.decision === "rejected" || h.decision === "discarded",
  ).length;
  if (reverted === 0) {
    return "accepted";
  }
  if (reverted === hunks.length) {
    return "reverted";
  }
  return "partial";
}

/** Apply a single hunk decision to a list, returning a new list (immutable). */
export function applyHunkDecision(
  hunks: readonly AutoDsmChangeHunk[],
  hunkId: string,
  decision: AutoDsmChangeHunkDecision,
): AutoDsmChangeHunk[] {
  return hunks.map((h) => (h.id === hunkId ? { ...h, decision } : h));
}

/** Set every hunk to one decision (e.g. "Approve all" / "Reject all"). */
export function setAllHunkDecisions(
  hunks: readonly AutoDsmChangeHunk[],
  decision: AutoDsmChangeHunkDecision,
): AutoDsmChangeHunk[] {
  return hunks.map((h) => ({ ...h, decision }));
}

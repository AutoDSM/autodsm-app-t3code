import type { AutoDsmChangeHunk, AutoDsmChangeHunkDecision } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  allHunksDecided,
  applyHunkDecision,
  groupHunksByFile,
  previewDisposition,
  setAllHunkDecisions,
  summarizeHunkDecisions,
} from "./pullRequestHunkReview.logic";

function hunk(
  id: string,
  filePath: string,
  decision: AutoDsmChangeHunkDecision,
): AutoDsmChangeHunk {
  return {
    id,
    filePath,
    oldStart: 1,
    oldLines: 1,
    newStart: 1,
    newLines: 1,
    patch: `--- a/x\n+++ b/x\n@@ -1,1 +1,1 @@\n-a\n+b\n`,
    decision,
  };
}

describe("pullRequestHunkReview.logic", () => {
  it("groups hunks by file preserving order", () => {
    const groups = groupHunksByFile([
      hunk("1", "/src/a.tsx", "pending"),
      hunk("2", "/src/b.tsx", "pending"),
      hunk("3", "/src/a.tsx", "pending"),
    ]);
    expect(groups.map((g) => g.filePath)).toEqual(["/src/a.tsx", "/src/b.tsx"]);
    expect(groups[0]?.hunks.map((h) => h.id)).toEqual(["1", "3"]);
  });

  it("summarizes decisions", () => {
    const summary = summarizeHunkDecisions([
      hunk("1", "/x", "approved"),
      hunk("2", "/x", "rejected"),
      hunk("3", "/x", "discarded"),
      hunk("4", "/x", "pending"),
    ]);
    expect(summary).toEqual({ approved: 1, rejected: 1, discarded: 1, pending: 1, total: 4 });
  });

  it("reports allHunksDecided only when no pending remain", () => {
    expect(allHunksDecided([hunk("1", "/x", "approved")])).toBe(true);
    expect(allHunksDecided([hunk("1", "/x", "pending")])).toBe(false);
    expect(allHunksDecided([])).toBe(false);
  });

  it("previews the apply disposition", () => {
    expect(previewDisposition([])).toBe("empty");
    expect(previewDisposition([hunk("1", "/x", "approved"), hunk("2", "/x", "pending")])).toBe(
      "accepted",
    );
    expect(previewDisposition([hunk("1", "/x", "rejected"), hunk("2", "/x", "discarded")])).toBe(
      "reverted",
    );
    expect(previewDisposition([hunk("1", "/x", "approved"), hunk("2", "/x", "rejected")])).toBe(
      "partial",
    );
  });

  it("applies a single decision immutably", () => {
    const before = [hunk("1", "/x", "pending"), hunk("2", "/x", "pending")];
    const after = applyHunkDecision(before, "2", "rejected");
    expect(after[1]?.decision).toBe("rejected");
    expect(after[0]?.decision).toBe("pending");
    expect(before[1]?.decision).toBe("pending"); // original untouched
  });

  it("sets all decisions at once", () => {
    const after = setAllHunkDecisions(
      [hunk("1", "/x", "pending"), hunk("2", "/y", "rejected")],
      "approved",
    );
    expect(after.every((h) => h.decision === "approved")).toBe(true);
  });
});

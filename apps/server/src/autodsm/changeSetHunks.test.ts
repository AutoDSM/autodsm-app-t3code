import { describe, expect, it } from "vitest";

import {
  deriveChangeSetOpsAndHunks,
  reconstructFileWithDecisions,
  summarizeDecisions,
} from "./changeSetHunks.ts";

const BUTTON = "src/components/Button.tsx";

/** A single-hunk git diff: line2 changed, NEW4 appended. */
const SINGLE_HUNK_DIFF = [
  `diff --git a/${BUTTON} b/${BUTTON}`,
  `--- a/${BUTTON}`,
  `+++ b/${BUTTON}`,
  `@@ -1,3 +1,4 @@`,
  ` line1`,
  `-line2`,
  `+CHANGED2`,
  ` line3`,
  `+NEW4`,
  ``,
].join("\n");

const BEFORE = "line1\nline2\nline3\n";
const AFTER = "line1\nCHANGED2\nline3\nNEW4\n";

describe("deriveChangeSetOpsAndHunks", () => {
  it("derives one op + one pending hunk with correct geometry", () => {
    const { ops, hunks } = deriveChangeSetOpsAndHunks(SINGLE_HUNK_DIFF);
    expect(ops).toHaveLength(1);
    expect(ops[0]?.kind).toBe("update");
    expect(ops[0]?.path).toBe(`/${BUTTON}`);

    expect(hunks).toHaveLength(1);
    const hunk = hunks[0]!;
    expect(hunk.decision).toBe("pending");
    expect(hunk.filePath).toBe(`/${BUTTON}`);
    expect(hunk.oldStart).toBe(1);
    expect(hunk.oldLines).toBe(3);
    expect(hunk.newStart).toBe(1);
    expect(hunk.newLines).toBe(4);
    expect(hunk.id).toMatch(/^[0-9a-f]{16}$/);
    // The stored patch is self-contained and re-parseable.
    expect(hunk.patch).toContain("@@ -1,3 +1,4 @@");
    expect(hunk.patch).toContain("+CHANGED2");
  });

  it("classifies new and deleted files", () => {
    const newFileDiff = [
      `diff --git a/${BUTTON} b/${BUTTON}`,
      `new file mode 100644`,
      `--- /dev/null`,
      `+++ b/${BUTTON}`,
      `@@ -0,0 +1,1 @@`,
      `+export const Button = () => null;`,
      ``,
    ].join("\n");
    const { ops } = deriveChangeSetOpsAndHunks(newFileDiff);
    expect(ops[0]?.kind).toBe("create");
  });

  it("returns empty for an empty diff", () => {
    expect(deriveChangeSetOpsAndHunks("")).toEqual({ ops: [], hunks: [] });
    expect(deriveChangeSetOpsAndHunks("   \n  ")).toEqual({ ops: [], hunks: [] });
  });
});

describe("reconstructFileWithDecisions", () => {
  it("all approved → on-disk content is unchanged", () => {
    const { hunks } = deriveChangeSetOpsAndHunks(SINGLE_HUNK_DIFF);
    const approved = hunks.map((h) => ({ ...h, decision: "approved" as const }));
    expect(reconstructFileWithDecisions(AFTER, approved)).toBe(AFTER);
  });

  it("all rejected → reverts to the pre-turn content (round-trip)", () => {
    const { hunks } = deriveChangeSetOpsAndHunks(SINGLE_HUNK_DIFF);
    const rejected = hunks.map((h) => ({ ...h, decision: "rejected" as const }));
    expect(reconstructFileWithDecisions(AFTER, rejected)).toBe(BEFORE);
  });

  it("pending hunks are kept (treated as written)", () => {
    const { hunks } = deriveChangeSetOpsAndHunks(SINGLE_HUNK_DIFF);
    expect(reconstructFileWithDecisions(AFTER, hunks)).toBe(AFTER);
  });

  it("mixed decisions across two hunks revert only the rejected one", () => {
    const after = "a\nB2\nc\nd\nE2\nf\n";
    const hunk1 = {
      patch: ["--- a/f.txt", "+++ b/f.txt", "@@ -2,1 +2,1 @@", "-b", "+B2", ""].join("\n"),
      decision: "rejected" as const,
    };
    const hunk2 = {
      patch: ["--- a/f.txt", "+++ b/f.txt", "@@ -5,1 +5,1 @@", "-e", "+E2", ""].join("\n"),
      decision: "approved" as const,
    };
    expect(reconstructFileWithDecisions(after, [hunk1, hunk2])).toBe("a\nb\nc\nd\nE2\nf\n");
    expect(
      reconstructFileWithDecisions(after, [
        { ...hunk1, decision: "rejected" as const },
        { ...hunk2, decision: "rejected" as const },
      ]),
    ).toBe("a\nb\nc\nd\ne\nf\n");
  });

  it("preserves a file with no trailing newline", () => {
    const after = "x\nYY";
    const hunk = {
      patch: ["--- a/f.txt", "+++ b/f.txt", "@@ -2,1 +2,1 @@", "-y", "+YY", ""].join("\n"),
      decision: "rejected" as const,
    };
    expect(reconstructFileWithDecisions(after, [hunk])).toBe("x\ny");
  });
});

describe("summarizeDecisions", () => {
  it("classifies accepted / rejected / mixed", () => {
    expect(summarizeDecisions([{ decision: "approved" }, { decision: "pending" }])).toBe(
      "approved",
    );
    expect(summarizeDecisions([{ decision: "rejected" }, { decision: "discarded" }])).toBe(
      "rejected",
    );
    expect(summarizeDecisions([{ decision: "approved" }, { decision: "rejected" }])).toBe("mixed");
  });
});

// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearDesignBrief,
  loadDesignBrief,
  recordProposalApplied,
  writeDesignBrief,
} from "./designBriefStore.ts";

describe("designBriefStore", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "designBriefStore-"));
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  it("returns null when no brief exists", () => {
    expect(loadDesignBrief(cwd)).toBeNull();
  });

  it("writes and reads back a brief with stable metadata", () => {
    const markdown = "# Brand brief\n\nWarm earthy palette.\n";
    const doc = writeDesignBrief(cwd, markdown);

    expect(doc.byteLength).toBe(Buffer.byteLength(markdown, "utf8"));
    expect(doc.contentSha256).toHaveLength(64);
    expect(doc.meta.owner).toBe("design-brief-store");
    expect(doc.lastAppliedAt).toBeUndefined();
    expect(doc.lastProposalId).toBeUndefined();

    const loaded = loadDesignBrief(cwd);
    expect(loaded).not.toBeNull();
    expect(loaded!.markdown).toBe(markdown);
    expect(loaded!.doc.contentSha256).toBe(doc.contentSha256);
    expect(loaded!.doc.uploadedAt).toBe(doc.uploadedAt);
  });

  it("records lastAppliedAt and lastProposalId in the sidecar", () => {
    writeDesignBrief(cwd, "brief one\n");
    const proposalId = "proposal-42";
    recordProposalApplied(cwd, proposalId);

    const loaded = loadDesignBrief(cwd)!;
    expect(loaded.doc.lastProposalId).toBe(proposalId);
    expect(loaded.doc.lastAppliedAt).toBeTruthy();
  });

  it("recordProposalApplied is a no-op when no brief exists", () => {
    expect(() => recordProposalApplied(cwd, "noop")).not.toThrow();
  });

  it("rewriting a brief resets lastAppliedAt/lastProposalId", () => {
    writeDesignBrief(cwd, "first\n");
    recordProposalApplied(cwd, "first-proposal");

    writeDesignBrief(cwd, "second — totally different\n");
    const loaded = loadDesignBrief(cwd)!;

    expect(loaded.markdown).toBe("second — totally different\n");
    expect(loaded.doc.lastAppliedAt).toBeUndefined();
    expect(loaded.doc.lastProposalId).toBeUndefined();
  });

  it("clearDesignBrief removes both files and is idempotent", () => {
    writeDesignBrief(cwd, "throwaway\n");
    expect(loadDesignBrief(cwd)).not.toBeNull();

    clearDesignBrief(cwd);
    expect(loadDesignBrief(cwd)).toBeNull();
    // Second call is fine.
    expect(() => clearDesignBrief(cwd)).not.toThrow();
  });

  it("rebuilds the sidecar from markdown when only the sidecar is missing", () => {
    const markdown = "rebuild me\n";
    writeDesignBrief(cwd, markdown);
    fs.unlinkSync(path.join(cwd, ".autodsm", "design-brief.json"));

    const loaded = loadDesignBrief(cwd)!;
    expect(loaded.markdown).toBe(markdown);
    expect(loaded.doc.contentSha256).toHaveLength(64);
  });
});

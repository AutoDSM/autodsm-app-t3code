// @effect-diagnostics nodeBuiltinImport:off
// @effect-diagnostics globalDate:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import type { AutoDsmDesignBriefProposal } from "@t3tools/contracts";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { addBrandToken, loadBrandProfile } from "./autoDsmTokenStore.ts";
import { applyProposal } from "./designBriefApplier.ts";
import { writeDesignBrief } from "./designBriefStore.ts";

function seedWorkspace(cwd: string): void {
  // Provide a minimal index.css so the token store can identify a source path.
  fs.mkdirSync(path.join(cwd, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, "src", "index.css"),
    ":root {\n  --primary: #3b82f6;\n  --accent: #6366f1;\n}\n.dark {\n  --primary: #2563eb;\n}\n",
    "utf8",
  );
}

function buildProposal(
  invalidationKey: string,
  operations: AutoDsmDesignBriefProposal["operations"],
): AutoDsmDesignBriefProposal {
  return {
    proposalId: "proposal-1",
    createdAt: new Date().toISOString(),
    briefDigest: "x".repeat(64),
    basedOnInvalidationKey: invalidationKey,
    summary: "test proposal",
    operations,
  };
}

describe("applyProposal", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "designBriefApplier-"));
    seedWorkspace(cwd);
    // Force the token store to seed from CSS before we read invalidationKey.
    loadBrandProfile(cwd);
    // Drop a brief so `recordProposalApplied` has something to patch.
    writeDesignBrief(cwd, "test brief\n");
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  it("short-circuits with stale-base when invalidationKey drifted", () => {
    const result = applyProposal({
      cwd,
      proposal: buildProposal("totally-different-key", [
        {
          opId: "op-1",
          kind: "update",
          category: "color",
          tokenName: "primary",
          patch: { value: "#000000" },
        },
      ]),
      acceptedOpIds: new Set(["op-1"]),
    });

    expect(result.appliedCount).toBe(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.skipped[0]!.reason).toBe("stale-base");
  });

  it("applies only accepted ops; ignores unselected ones", () => {
    const profile = loadBrandProfile(cwd);
    const result = applyProposal({
      cwd,
      proposal: buildProposal(profile.meta.invalidationKey, [
        {
          opId: "yes",
          kind: "update",
          category: "color",
          tokenName: "primary",
          patch: { value: "#ff0000" },
        },
        {
          opId: "no",
          kind: "update",
          category: "color",
          tokenName: "accent",
          patch: { value: "#00ff00" },
        },
      ]),
      acceptedOpIds: new Set(["yes"]),
    });

    expect(result.appliedCount).toBe(1);
    expect(result.skipped).toHaveLength(0);
    const updated = result.profile.tokens.find((t) => (t.name ?? t.id) === "primary");
    const untouched = result.profile.tokens.find((t) => (t.name ?? t.id) === "accent");
    expect(updated?.value).toBe("#ff0000");
    expect(untouched?.value).toBe("#6366f1");
  });

  it("skips update/remove ops referencing missing tokens with name-not-found", () => {
    const profile = loadBrandProfile(cwd);
    const result = applyProposal({
      cwd,
      proposal: buildProposal(profile.meta.invalidationKey, [
        {
          opId: "miss-update",
          kind: "update",
          category: "color",
          tokenName: "doesNotExist",
          patch: { value: "#abcdef" },
        },
        {
          opId: "miss-remove",
          kind: "remove",
          category: "color",
          tokenName: "alsoMissing",
        },
      ]),
      acceptedOpIds: new Set(["miss-update", "miss-remove"]),
    });

    expect(result.appliedCount).toBe(0);
    expect(result.skipped.map((s) => s.reason).sort()).toEqual([
      "name-not-found",
      "name-not-found",
    ]);
  });

  it("adds a brand-new token via add op", () => {
    const profile = loadBrandProfile(cwd);
    const result = applyProposal({
      cwd,
      proposal: buildProposal(profile.meta.invalidationKey, [
        {
          opId: "add-warning",
          kind: "add",
          category: "color",
          tokenName: "warning",
          draft: {
            category: "color",
            name: "warning",
            value: "#facc15",
          },
        },
      ]),
      acceptedOpIds: new Set(["add-warning"]),
    });

    expect(result.appliedCount).toBe(1);
    const added = result.profile.tokens.find((t) => (t.name ?? t.id) === "warning");
    expect(added?.value).toBe("#facc15");
    expect(added?.origin).toBe("user");
  });

  it("records lastAppliedAt on the brief sidecar after a successful apply", () => {
    const profile = loadBrandProfile(cwd);
    applyProposal({
      cwd,
      proposal: buildProposal(profile.meta.invalidationKey, [
        {
          opId: "op-1",
          kind: "update",
          category: "color",
          tokenName: "primary",
          patch: { value: "#000000" },
        },
      ]),
      acceptedOpIds: new Set(["op-1"]),
    });
    const sidecar = JSON.parse(
      fs.readFileSync(path.join(cwd, ".autodsm", "design-brief.json"), "utf8"),
    ) as { lastAppliedAt?: string; lastProposalId?: string };
    expect(sidecar.lastAppliedAt).toBeTruthy();
    expect(sidecar.lastProposalId).toBe("proposal-1");
  });

  it("no-op when acceptedOpIds is empty — leaves the profile untouched", () => {
    const before = loadBrandProfile(cwd);
    const result = applyProposal({
      cwd,
      proposal: buildProposal(before.meta.invalidationKey, [
        {
          opId: "op-1",
          kind: "update",
          category: "color",
          tokenName: "primary",
          patch: { value: "#000000" },
        },
      ]),
      acceptedOpIds: new Set(),
    });

    expect(result.appliedCount).toBe(0);
    expect(result.profile.meta.invalidationKey).toBe(before.meta.invalidationKey);
  });

  it("integrates with the token store — addBrandToken before apply, both visible after", () => {
    addBrandToken(cwd, { category: "color", name: "manual", value: "#123456" });
    const profile = loadBrandProfile(cwd);
    const result = applyProposal({
      cwd,
      proposal: buildProposal(profile.meta.invalidationKey, [
        {
          opId: "op-1",
          kind: "add",
          category: "color",
          tokenName: "fromBrief",
          draft: { category: "color", name: "fromBrief", value: "#abcdef" },
        },
      ]),
      acceptedOpIds: new Set(["op-1"]),
    });
    const names = result.profile.tokens.map((t) => t.name ?? t.id);
    expect(names).toContain("manual");
    expect(names).toContain("fromBrief");
  });
});

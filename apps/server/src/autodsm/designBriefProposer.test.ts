// @effect-diagnostics nodeBuiltinImport:off
import type { AutoDsmBrandProfile } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";

import { proposeFromBrief, type DesignBriefGenerateFn } from "./designBriefProposer.ts";

function makeProfile(
  tokens: ReadonlyArray<{
    id: string;
    category: string;
    name: string;
    value: string;
  }> = [],
): AutoDsmBrandProfile {
  return {
    meta: {
      kind: "brand-profile",
      schemaVersion: 2,
      owner: "brand-profile-indexer",
      invalidationKey: "fixture-key",
      consumers: ["render-runtime"],
    },
    tokens: tokens.map((t) => ({
      id: t.id,
      category: t.category,
      name: t.name,
      value: t.value,
      origin: "user",
      sources: ["/src/index.css"],
    })),
    cssVariablePaths: ["/src/index.css"],
    status: "ready",
  };
}

function makeGenerate(result: {
  summary: string;
  operations: ReadonlyArray<{
    kind: "add" | "update" | "remove";
    category: string;
    tokenName: string;
    value?: string;
    rationale?: string;
  }>;
}): DesignBriefGenerateFn {
  // The proposer always calls this once — return the canned response.
  return async () => result as never;
}

describe("proposeFromBrief", () => {
  it("stamps proposalId / briefDigest / basedOnInvalidationKey", async () => {
    const profile = makeProfile();
    const proposal = await Effect.runPromise(
      proposeFromBrief({
        cwd: "/tmp/fake",
        markdown: "warm and earthy",
        profile,
        generate: makeGenerate({ summary: "fresh start", operations: [] }),
      }),
    );

    expect(proposal.basedOnInvalidationKey).toBe("fixture-key");
    expect(proposal.briefDigest).toHaveLength(64);
    expect(proposal.proposalId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(proposal.summary).toBe("fresh start");
    expect(proposal.operations).toHaveLength(0);
  });

  it("coerces add ops for existing tokens into update ops (avoids duplicate-name guard)", async () => {
    const profile = makeProfile([
      { id: "css-var:primary", category: "color", name: "primary", value: "#3b82f6" },
    ]);
    const proposal = await Effect.runPromise(
      proposeFromBrief({
        cwd: "/tmp/fake",
        markdown: "primary should be terracotta",
        profile,
        generate: makeGenerate({
          summary: "warm primary",
          operations: [
            {
              kind: "add",
              category: "color",
              tokenName: "primary",
              value: "#e2725b",
              rationale: "terracotta",
            },
          ],
        }),
      }),
    );

    expect(proposal.operations).toHaveLength(1);
    const op = proposal.operations[0]!;
    expect(op.kind).toBe("update");
    expect(op.tokenName).toBe("primary");
    expect(op.patch?.value).toBe("#e2725b");
    expect(op.currentValue).toBe("#3b82f6");
    expect(op.proposedValue).toBe("#e2725b");
  });

  it("upgrades update ops for missing tokens to add ops", async () => {
    const profile = makeProfile();
    const proposal = await Effect.runPromise(
      proposeFromBrief({
        cwd: "/tmp/fake",
        markdown: "introduce accent",
        profile,
        generate: makeGenerate({
          summary: "new accent",
          operations: [
            { kind: "update", category: "color", tokenName: "accent", value: "#a855f7" },
          ],
        }),
      }),
    );

    expect(proposal.operations).toHaveLength(1);
    expect(proposal.operations[0]!.kind).toBe("add");
    expect(proposal.operations[0]!.draft?.value).toBe("#a855f7");
  });

  it("drops remove ops for tokens that don't exist", async () => {
    const profile = makeProfile([{ id: "u:1", category: "color", name: "primary", value: "#000" }]);
    const proposal = await Effect.runPromise(
      proposeFromBrief({
        cwd: "/tmp/fake",
        markdown: "kill nonexistent token",
        profile,
        generate: makeGenerate({
          summary: "cleanup",
          operations: [{ kind: "remove", category: "color", tokenName: "ghost" }],
        }),
      }),
    );

    expect(proposal.operations).toHaveLength(0);
  });

  it("caps operations at 120 to fit a complete editorial-brief system", async () => {
    const profile = makeProfile();
    const operations = Array.from({ length: 200 }, (_, i) => ({
      kind: "add" as const,
      category: "color",
      tokenName: `token-${i}`,
      value: "#fff",
    }));
    const proposal = await Effect.runPromise(
      proposeFromBrief({
        cwd: "/tmp/fake",
        markdown: "lots of additions",
        profile,
        generate: makeGenerate({ summary: "many", operations }),
      }),
    );

    expect(proposal.operations).toHaveLength(120);
  });

  it("assigns unique opIds across operations", async () => {
    const profile = makeProfile();
    const proposal = await Effect.runPromise(
      proposeFromBrief({
        cwd: "/tmp/fake",
        markdown: "two adds",
        profile,
        generate: makeGenerate({
          summary: "two",
          operations: [
            { kind: "add", category: "color", tokenName: "a", value: "#fff" },
            { kind: "add", category: "color", tokenName: "b", value: "#000" },
          ],
        }),
      }),
    );

    const ids = proposal.operations.map((op) => op.opId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

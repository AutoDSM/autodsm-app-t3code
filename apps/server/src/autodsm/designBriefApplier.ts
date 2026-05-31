// @effect-diagnostics nodeBuiltinImport:off
/**
 * Design-brief applier — turns a user-approved subset of
 * {@link AutoDsmDesignBriefProposal} operations into a single batched
 * mutation against the brand-token store.
 *
 * Key behaviours:
 * - Resolves `(category, tokenName)` → `tokenId` for `update`/`remove` ops at
 *   apply time. The proposer addresses tokens by human-facing name; ids are
 *   only known here.
 * - Stale-base guard: if the brand profile's `invalidationKey` has changed
 *   since the proposal was generated, every op is skipped with reason
 *   `stale-base` and the UI prompts the user to re-propose.
 * - Single batched persist: builds the next token list in memory and writes
 *   once via {@link persistTokens}. The per-op helpers each re-sync theme
 *   files and churn the profile's invalidation key, so naively applying N
 *   ops via `addBrandToken` / `updateBrandToken` would do N theme syncs.
 *
 * @module designBriefApplier
 */
import * as crypto from "node:crypto";

import {
  type AutoDsmBrandProfile,
  type AutoDsmBrandToken,
  type AutoDsmBrandTokenCategory,
  type AutoDsmDesignBriefApplySkipped,
  type AutoDsmDesignBriefOperation,
  type AutoDsmDesignBriefProposal,
} from "@t3tools/contracts";

import { loadBrandProfile, loadBrandTokens, persistTokens } from "./autoDsmTokenStore.ts";
import { recordProposalApplied } from "./designBriefStore.ts";

function tokenNameKey(name: string): string {
  return name.trim().toLowerCase();
}

function findTokenIndex(
  tokens: readonly AutoDsmBrandToken[],
  category: AutoDsmBrandTokenCategory,
  tokenName: string,
): number {
  const key = tokenNameKey(tokenName);
  return tokens.findIndex((t) => t.category === category && tokenNameKey(t.name ?? t.id) === key);
}

function findSourceForCategory(tokens: readonly AutoDsmBrandToken[]): string {
  return tokens.find((t) => t.sources.length > 0)?.sources[0] ?? "/src/index.css";
}

export interface ApplyProposalInput {
  readonly cwd: string;
  readonly proposal: AutoDsmDesignBriefProposal;
  readonly acceptedOpIds: ReadonlySet<string>;
}

export interface ApplyProposalResult {
  readonly profile: AutoDsmBrandProfile;
  readonly appliedCount: number;
  readonly skipped: ReadonlyArray<AutoDsmDesignBriefApplySkipped>;
}

/**
 * Apply the subset of `proposal.operations` whose `opId` appears in
 * `acceptedOpIds`. Operations referencing a missing token (for `update` /
 * `remove`) are skipped with `name-not-found`. Stale proposals (profile
 * invalidation key drifted) skip everything with `stale-base`.
 */
export function applyProposal(input: ApplyProposalInput): ApplyProposalResult {
  const currentProfile = loadBrandProfile(input.cwd);

  if (currentProfile.meta.invalidationKey !== input.proposal.basedOnInvalidationKey) {
    return {
      profile: currentProfile,
      appliedCount: 0,
      skipped: input.proposal.operations
        .filter((op) => input.acceptedOpIds.has(op.opId))
        .map((op) => ({ opId: op.opId, reason: "stale-base" as const })),
    };
  }

  const tokens = [...loadBrandTokens(input.cwd)];
  const skipped: AutoDsmDesignBriefApplySkipped[] = [];
  let appliedCount = 0;
  let mutated = false;

  for (const op of input.proposal.operations) {
    if (!input.acceptedOpIds.has(op.opId)) {
      continue;
    }
    const applied = applyOneOp(tokens, op);
    if (applied.kind === "ok") {
      appliedCount += 1;
      mutated = true;
    } else {
      skipped.push({ opId: op.opId, reason: applied.reason });
    }
  }

  if (!mutated) {
    return { profile: currentProfile, appliedCount: 0, skipped };
  }

  const profile = persistTokens(input.cwd, tokens);
  recordProposalApplied(input.cwd, input.proposal.proposalId);
  return { profile, appliedCount, skipped };
}

type SingleOpResult =
  | { readonly kind: "ok" }
  | { readonly kind: "skip"; readonly reason: AutoDsmDesignBriefApplySkipped["reason"] };

function applyOneOp(tokens: AutoDsmBrandToken[], op: AutoDsmDesignBriefOperation): SingleOpResult {
  switch (op.kind) {
    case "remove": {
      const index = findTokenIndex(tokens, op.category, op.tokenName);
      if (index < 0) {
        return { kind: "skip", reason: "name-not-found" };
      }
      tokens.splice(index, 1);
      return { kind: "ok" };
    }
    case "update": {
      const index = findTokenIndex(tokens, op.category, op.tokenName);
      if (index < 0) {
        return { kind: "skip", reason: "name-not-found" };
      }
      const patch = op.patch;
      if (!patch) {
        return { kind: "skip", reason: "schema-invalid" };
      }
      const current = tokens[index]!;
      tokens[index] = {
        ...current,
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.value !== undefined ? { value: patch.value } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
        ...(patch.typography !== undefined ? { typography: patch.typography } : {}),
      };
      return { kind: "ok" };
    }
    case "add": {
      const draft = op.draft;
      if (!draft) {
        return { kind: "skip", reason: "schema-invalid" };
      }
      const existing = findTokenIndex(tokens, op.category, op.tokenName);
      if (existing >= 0) {
        // Race / planner overlap — treat as update so the apply doesn't blow up.
        const current = tokens[existing]!;
        tokens[existing] = {
          ...current,
          value: draft.value,
          ...(draft.color !== undefined ? { color: draft.color } : {}),
          ...(draft.typography !== undefined ? { typography: draft.typography } : {}),
        };
        return { kind: "ok" };
      }
      const newToken: AutoDsmBrandToken = {
        id: `user:${crypto.randomUUID()}`,
        category: draft.category,
        name: draft.name,
        value: draft.value,
        origin: "user",
        sources: [findSourceForCategory(tokens)],
        ...(draft.color !== undefined ? { color: draft.color } : {}),
        ...(draft.typography !== undefined ? { typography: draft.typography } : {}),
      };
      tokens.push(newToken);
      return { kind: "ok" };
    }
  }
}

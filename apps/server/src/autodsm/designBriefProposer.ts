// @effect-diagnostics globalDate:off
// @effect-diagnostics globalDateInEffect:off
/**
 * Design-brief proposer — takes the persisted `design.md` plus the current
 * brand profile and asks the user's active text-generation provider to
 * propose a structured diff of token operations (add / update / remove).
 * The result is held in the workspace service's in-memory proposal cache
 * until the user approves a subset via `designBriefApplier`.
 *
 * Generation routes through {@link TextGenerationShape.generateDesignBriefProposal},
 * which honours the user's currently selected provider/model. The
 * {@link DesignBriefGenerateFn} indirection remains as a DI seam so tests
 * can inject a stub without touching any provider binary.
 *
 * @module designBriefProposer
 */
import * as crypto from "node:crypto";

import {
  AutoDsmBrandTokenDraft,
  AutoDsmBrandTokenPatch,
  AutoDsmRpcError,
  type AutoDsmBrandProfile,
  type AutoDsmBrandToken,
  type AutoDsmBrandTokenCategory,
  type AutoDsmDesignBriefOperation,
  type AutoDsmDesignBriefProposal,
  type ModelSelection,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type {
  DesignBriefProposalDraft,
  DesignBriefProposalOperationDraft,
  DesignBriefProposalPromptToken,
} from "../textGeneration/TextGenerationPrompts.ts";
import type { TextGenerationShape } from "../textGeneration/TextGeneration.ts";
import { sha256Hex } from "./autoDsmHelpers.ts";

const decodeBrandTokenDraft = Schema.decodeUnknownSync(AutoDsmBrandTokenDraft);
const decodeBrandTokenPatch = Schema.decodeUnknownSync(AutoDsmBrandTokenPatch);

// ---------------------------------------------------------------------------
// Generate function — DI seam
// ---------------------------------------------------------------------------

export interface DesignBriefGenerateInput {
  readonly cwd: string;
  readonly briefMarkdown: string;
  readonly currentTokens: ReadonlyArray<DesignBriefProposalPromptToken>;
}

export type DesignBriefGenerateFn = (
  input: DesignBriefGenerateInput,
) => Promise<DesignBriefProposalDraft>;

/**
 * Build a {@link DesignBriefGenerateFn} that delegates to the supplied
 * `TextGenerationShape.generateDesignBriefProposal`, pinned to a specific
 * `modelSelection`. This is how the workspace service injects "the user's
 * currently active provider/model" into the otherwise pure proposer.
 */
export const makeDesignBriefGenerateFromTextGeneration =
  (textGen: TextGenerationShape, modelSelection: ModelSelection): DesignBriefGenerateFn =>
  (input) =>
    Effect.runPromise(
      textGen.generateDesignBriefProposal({
        cwd: input.cwd,
        briefMarkdown: input.briefMarkdown,
        currentTokens: input.currentTokens,
        modelSelection,
      }),
    );

// ---------------------------------------------------------------------------
// Proposer — pure orchestration around the generate function
// ---------------------------------------------------------------------------

export interface ProposeFromBriefInput {
  readonly cwd: string;
  readonly markdown: string;
  readonly profile: AutoDsmBrandProfile;
  readonly generate: DesignBriefGenerateFn;
}

/**
 * Turn an LLM draft operation into a canonical `AutoDsmDesignBriefOperation`,
 * validating its `draft` / `patch` payload against the canonical schemas.
 * Returns `null` when the op is malformed and should be dropped.
 */
function buildOperation(
  draft: DesignBriefProposalOperationDraft,
  currentTokens: ReadonlyArray<AutoDsmBrandToken>,
): AutoDsmDesignBriefOperation | null {
  const tokenName = draft.tokenName.trim();
  if (tokenName.length === 0) {
    return null;
  }
  const category = draft.category as AutoDsmBrandTokenCategory;
  const existing = currentTokens.find(
    (t) =>
      t.category === category && (t.name ?? t.id).toLowerCase().trim() === tokenName.toLowerCase(),
  );

  const opId = crypto.randomUUID();
  const proposedValueStr =
    draft.value?.trim() ||
    draft.color?.light?.trim() ||
    draft.color?.dark?.trim() ||
    [
      draft.typography?.fontFamily,
      draft.typography?.fontSize,
      draft.typography?.fontWeight,
      draft.typography?.lineHeight,
      draft.typography?.letterSpacing,
    ]
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .join(" · ");

  const baseFields = {
    opId,
    category,
    tokenName,
    ...(draft.rationale && draft.rationale.trim().length > 0
      ? { rationale: draft.rationale.trim() }
      : {}),
    ...(existing?.value ? { currentValue: existing.value } : {}),
    ...(proposedValueStr.length > 0 ? { proposedValue: proposedValueStr } : {}),
  };

  if (draft.kind === "remove") {
    if (!existing) {
      // The LLM proposed removing a token that doesn't exist — drop the op.
      return null;
    }
    return { ...baseFields, kind: "remove" };
  }

  if (draft.kind === "add") {
    if (existing) {
      // Already exists — coerce into an update so we don't trip the
      // duplicate-name guard in `addBrandToken`.
      try {
        const patch = decodeBrandTokenPatch({
          ...(draft.value ? { value: draft.value } : {}),
          ...(draft.color ? { color: draft.color } : {}),
          ...(draft.typography ? { typography: draft.typography } : {}),
        });
        return { ...baseFields, kind: "update", patch };
      } catch {
        return null;
      }
    }
    try {
      const tokenDraft = decodeBrandTokenDraft({
        category,
        name: tokenName,
        value: draft.value && draft.value.trim().length > 0 ? draft.value : proposedValueStr,
        ...(draft.color ? { color: draft.color } : {}),
        ...(draft.typography ? { typography: draft.typography } : {}),
      });
      return { ...baseFields, kind: "add", draft: tokenDraft };
    } catch {
      return null;
    }
  }

  // kind === "update"
  if (!existing) {
    // No existing token to update — fall through to an `add` if we have a value.
    try {
      const tokenDraft = decodeBrandTokenDraft({
        category,
        name: tokenName,
        value: draft.value && draft.value.trim().length > 0 ? draft.value : proposedValueStr,
        ...(draft.color ? { color: draft.color } : {}),
        ...(draft.typography ? { typography: draft.typography } : {}),
      });
      return { ...baseFields, kind: "add", draft: tokenDraft };
    } catch {
      return null;
    }
  }
  try {
    const patch = decodeBrandTokenPatch({
      ...(draft.value ? { value: draft.value } : {}),
      ...(draft.color ? { color: draft.color } : {}),
      ...(draft.typography ? { typography: draft.typography } : {}),
    });
    // Drop patches that wouldn't change anything.
    if (Object.keys(patch).length === 0) {
      return null;
    }
    return { ...baseFields, kind: "update", patch };
  } catch {
    return null;
  }
}

/**
 * Build a proposal from a persisted brief + current brand profile by calling
 * the injected `generate` function and validating each returned operation.
 */
export const proposeFromBrief = (
  input: ProposeFromBriefInput,
): Effect.Effect<AutoDsmDesignBriefProposal, AutoDsmRpcError> =>
  Effect.gen(function* () {
    const tokens = input.profile.tokens;

    const draft = yield* Effect.tryPromise({
      try: () =>
        input.generate({
          cwd: input.cwd,
          briefMarkdown: input.markdown,
          currentTokens: tokens.map((t) => ({
            category: t.category,
            name: t.name ?? t.id,
            value: t.value,
          })),
        }),
      catch: (cause) =>
        new AutoDsmRpcError({
          message:
            cause instanceof Error
              ? `Design-brief proposer failed: ${cause.message}`
              : "Design-brief proposer failed.",
          cause,
        }),
    });

    const operations: AutoDsmDesignBriefOperation[] = [];
    for (const opDraft of draft.operations.slice(0, 120)) {
      const op = buildOperation(opDraft, tokens);
      if (op) {
        operations.push(op);
      }
    }

    return {
      proposalId: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      briefDigest: sha256Hex(input.markdown),
      basedOnInvalidationKey: input.profile.meta.invalidationKey,
      summary: draft.summary.trim(),
      operations,
    } satisfies AutoDsmDesignBriefProposal;
  });

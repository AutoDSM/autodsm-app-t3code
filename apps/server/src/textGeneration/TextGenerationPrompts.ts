/**
 * Shared prompt builders for text generation providers.
 *
 * Extracts the prompt construction logic that is identical across
 * Codex, Claude, and any future CLI-based text generation backends.
 *
 * @module textGenerationPrompts
 */
import * as Schema from "effect/Schema";
import type { ChatAttachment } from "@t3tools/contracts";

import { limitSection } from "./TextGenerationUtils.ts";
import type { TextGenerationPolicy } from "./TextGenerationPolicy.ts";

function policyInstruction(instruction: string | undefined): ReadonlyArray<string> {
  const trimmed = instruction?.trim();
  return trimmed ? ["", "Additional instructions:", limitSection(trimmed, 4_000)] : [];
}

// ---------------------------------------------------------------------------
// Commit message
// ---------------------------------------------------------------------------

export interface CommitMessagePromptInput {
  branch: string | null;
  stagedSummary: string;
  stagedPatch: string;
  includeBranch: boolean;
  policy?: TextGenerationPolicy | undefined;
}

export function buildCommitMessagePrompt(input: CommitMessagePromptInput) {
  const wantsBranch = input.includeBranch;

  const prompt = [
    "You write concise git commit messages.",
    wantsBranch
      ? "Return a JSON object with keys: subject, body, branch."
      : "Return a JSON object with keys: subject, body.",
    "Rules:",
    "- subject must be imperative, <= 72 chars, and no trailing period",
    "- body can be empty string or short bullet points",
    ...(wantsBranch
      ? ["- branch must be a short semantic git branch fragment for this change"]
      : []),
    "- capture the primary user-visible or developer-visible change",
    ...policyInstruction(input.policy?.commitInstructions),
    "",
    `Branch: ${input.branch ?? "(detached)"}`,
    "",
    "Staged files:",
    limitSection(input.stagedSummary, 6_000),
    "",
    "Staged patch:",
    limitSection(input.stagedPatch, 40_000),
  ].join("\n");

  if (wantsBranch) {
    return {
      prompt,
      outputSchema: Schema.Struct({
        subject: Schema.String,
        body: Schema.String,
        branch: Schema.String,
      }),
    };
  }

  return {
    prompt,
    outputSchema: Schema.Struct({
      subject: Schema.String,
      body: Schema.String,
    }),
  };
}

// ---------------------------------------------------------------------------
// PR content
// ---------------------------------------------------------------------------

export interface PrContentPromptInput {
  baseBranch: string;
  headBranch: string;
  commitSummary: string;
  diffSummary: string;
  diffPatch: string;
  policy?: TextGenerationPolicy | undefined;
}

export function buildPrContentPrompt(input: PrContentPromptInput) {
  const prompt = [
    "You write GitHub pull request content.",
    "Return a JSON object with keys: title, body.",
    "Rules:",
    "- title should be concise and specific",
    "- body must be markdown and include headings '## Summary' and '## Testing'",
    "- under Summary, provide short bullet points",
    "- under Testing, include bullet points with concrete checks or 'Not run' where appropriate",
    ...policyInstruction(input.policy?.changeRequestInstructions),
    "",
    `Base branch: ${input.baseBranch}`,
    `Head branch: ${input.headBranch}`,
    "",
    "Commits:",
    limitSection(input.commitSummary, 12_000),
    "",
    "Diff stat:",
    limitSection(input.diffSummary, 12_000),
    "",
    "Diff patch:",
    limitSection(input.diffPatch, 40_000),
  ].join("\n");

  const outputSchema = Schema.Struct({
    title: Schema.String,
    body: Schema.String,
  });

  return { prompt, outputSchema };
}

// ---------------------------------------------------------------------------
// Branch name
// ---------------------------------------------------------------------------

export interface BranchNamePromptInput {
  message: string;
  attachments?: ReadonlyArray<ChatAttachment> | undefined;
  policy?: TextGenerationPolicy | undefined;
}

interface PromptFromMessageInput {
  instruction: string;
  responseShape: string;
  rules: ReadonlyArray<string>;
  message: string;
  attachments?: ReadonlyArray<ChatAttachment> | undefined;
  additionalInstructions?: string | undefined;
}

function buildPromptFromMessage(input: PromptFromMessageInput): string {
  const attachmentLines = (input.attachments ?? []).map(
    (attachment) => `- ${attachment.name} (${attachment.mimeType}, ${attachment.sizeBytes} bytes)`,
  );

  const promptSections = [
    input.instruction,
    input.responseShape,
    "Rules:",
    ...input.rules.map((rule) => `- ${rule}`),
    "",
    "User message:",
    limitSection(input.message, 8_000),
    ...policyInstruction(input.additionalInstructions),
  ];
  if (attachmentLines.length > 0) {
    promptSections.push(
      "",
      "Attachment metadata:",
      limitSection(attachmentLines.join("\n"), 4_000),
    );
  }

  return promptSections.join("\n");
}

export function buildBranchNamePrompt(input: BranchNamePromptInput) {
  const prompt = buildPromptFromMessage({
    instruction: "You generate concise git branch names.",
    responseShape: "Return a JSON object with key: branch.",
    rules: [
      "Branch should describe the requested work from the user message.",
      "Keep it short and specific (2-6 words).",
      "Use plain words only, no issue prefixes and no punctuation-heavy text.",
      "If images are attached, use them as primary context for visual/UI issues.",
    ],
    message: input.message,
    attachments: input.attachments,
    additionalInstructions: input.policy?.branchInstructions,
  });
  const outputSchema = Schema.Struct({
    branch: Schema.String,
  });

  return { prompt, outputSchema };
}

// ---------------------------------------------------------------------------
// Thread title
// ---------------------------------------------------------------------------

export interface ThreadTitlePromptInput {
  message: string;
  attachments?: ReadonlyArray<ChatAttachment> | undefined;
  policy?: TextGenerationPolicy | undefined;
}

export function buildThreadTitlePrompt(input: ThreadTitlePromptInput) {
  const prompt = buildPromptFromMessage({
    instruction: "You write concise thread titles for coding conversations.",
    responseShape: "Return a JSON object with key: title.",
    rules: [
      "Title should summarize the user's request, not restate it verbatim.",
      "Keep it short and specific (3-8 words).",
      "Avoid quotes, filler, prefixes, and trailing punctuation.",
      "If images are attached, use them as primary context for visual/UI issues.",
    ],
    message: input.message,
    attachments: input.attachments,
    additionalInstructions: input.policy?.threadTitleInstructions,
  });
  const outputSchema = Schema.Struct({
    title: Schema.String,
  });

  return { prompt, outputSchema };
}

// ---------------------------------------------------------------------------
// Design brief proposal (AutoDSM — `design.md` → token operations)
// ---------------------------------------------------------------------------

export interface DesignBriefProposalPromptToken {
  readonly category: string;
  readonly name: string;
  readonly value: string;
}

export interface DesignBriefProposalPromptInput {
  readonly briefMarkdown: string;
  readonly currentTokens: ReadonlyArray<DesignBriefProposalPromptToken>;
}

/**
 * Output schema for `proposeDesignBriefOperations`. Loose by design — the
 * design-brief proposer re-validates each operation against the canonical
 * `AutoDsmBrandTokenDraft` / `AutoDsmBrandTokenPatch` schemas downstream, and
 * drops any that fail. Keeping this permissive avoids the LLM tripping over
 * Effect Schema's `TrimmedNonEmptyString` requirements at the CLI boundary.
 */
const DesignBriefProposalOperationSchema = Schema.Struct({
  kind: Schema.Literals(["add", "update", "remove"]),
  category: Schema.Literals([
    "color",
    "typography",
    "spacing",
    "radius",
    "shadow",
    "motion",
    "icon",
  ]),
  tokenName: Schema.String,
  rationale: Schema.optional(Schema.String),
  value: Schema.optional(Schema.String),
  color: Schema.optional(
    Schema.Struct({
      light: Schema.optional(Schema.String),
      dark: Schema.optional(Schema.String),
    }),
  ),
  typography: Schema.optional(
    Schema.Struct({
      fontFamily: Schema.optional(Schema.String),
      fontSize: Schema.optional(Schema.String),
      lineHeight: Schema.optional(Schema.String),
      fontWeight: Schema.optional(Schema.String),
      letterSpacing: Schema.optional(Schema.String),
    }),
  ),
});
export type DesignBriefProposalOperationDraft = typeof DesignBriefProposalOperationSchema.Type;

export const DesignBriefProposalSchema = Schema.Struct({
  summary: Schema.String,
  operations: Schema.Array(DesignBriefProposalOperationSchema),
});
export type DesignBriefProposalDraft = typeof DesignBriefProposalSchema.Type;

export function buildDesignBriefProposalPrompt(input: DesignBriefProposalPromptInput): {
  prompt: string;
  outputSchema: typeof DesignBriefProposalSchema;
} {
  const tokenRows =
    input.currentTokens.length === 0
      ? "(no tokens defined yet — this is a fresh design system)"
      : input.currentTokens.map((t) => `${t.category} | ${t.name} | ${t.value}`).join("\n");

  const prompt = [
    "You are a meticulous design-token extractor for AutoDSM.",
    "Read the entire brand brief carefully BEFORE emitting any operation. The brief",
    "may be an editorial-length document (multi-section, with named scales and",
    "hierarchy tables). Your goal is to produce a complete, faithful set of",
    "atomic design tokens that reflects the brief's full system.",
    "",
    "Input: a freeform brand brief (markdown) plus the current design-token table.",
    "Output a JSON object with keys: summary, operations.",
    "",
    "Rules:",
    "- summary: 2–3 sentences. Describe the overall aesthetic direction (palette mood,",
    "  typographic voice, surface rhythm). If the brief defines named components",
    "  (e.g. `button-primary`, `feature-card`, `callout-card-coral`), note in the",
    "  summary that component-level descriptors were read and skipped — the token",
    "  store is atomic-only.",
    "- operations[]: { kind: 'add'|'update'|'remove', category, tokenName, rationale?, value?, color?, typography? }",
    "- Prefer `update` over `add` when a token already exists with the same (category, tokenName, case-insensitive).",
    "- NEVER change a token's category — if a token needs to move categories, emit a `remove` + `add`.",
    "- Only propose `remove` when the brief explicitly contradicts an existing token.",
    "- For `add` and `update`: provide `value` (CSS-valid string) for any category, plus",
    "  `color.{light,dark}` for color tokens with theme variants, and",
    "  `typography.{fontFamily,fontSize,lineHeight,fontWeight,letterSpacing}` for typography tokens.",
    "- Color values must be valid CSS color expressions (hex, rgb, rgba, hsl, oklch, etc.).",
    "- Use category literals: color, typography, spacing, radius, shadow, motion, icon.",
    "- Preserve naming exactly as the brief writes it (kebab-case names like `primary-active`,",
    "  `surface-card`, `on-dark-soft`, `display-xl`, `title-md`, `caption-uppercase`).",
    "- Cap output at 120 operations. The cap is intentionally generous so a complete",
    "  system fits — do NOT trim the list to be conservative.",
    "- If the brief is empty or contains no aesthetic guidance, return an empty operations",
    "  array with a short summary noting that.",
    "",
    "Per-category extraction guidance:",
    "- COLOR: extract every named color in the brief, including sub-groups (Brand & Accent,",
    "  Surface, Text, Semantic). Do not collapse near-duplicates — `surface-card`,",
    "  `surface-cream-strong`, `surface-soft` are distinct tokens even if visually close.",
    "  When the brief gives only one hex, set `value` to that hex. When the brief implies",
    "  a light/dark pair, use `color.light` / `color.dark`.",
    "- TYPOGRAPHY: produce one token per row of any Hierarchy table or named scale",
    "  (`display-xl`, `display-lg`, `display-md`, `display-sm`, `title-lg`, `title-md`,",
    "  `title-sm`, `body-md`, `body-sm`, `caption`, `caption-uppercase`, `code`, `button`,",
    "  `nav-link`, etc.). Populate `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`,",
    "  and `letterSpacing` whenever the brief states them. Include `px` units on sizes.",
    "- SPACING: extract every named scale step the brief lists (xxs / xs / sm / md / lg /",
    "  xl / xxl / section / etc.). Use the `px` value the brief states.",
    "- RADIUS: extract every named scale step (xs / sm / md / lg / xl / pill / full).",
    "- SHADOW / MOTION / ICON: only emit ops when the brief explicitly defines them.",
    "",
    "What NOT to extract:",
    "- Named components like `button-primary`, `feature-card`, `cta-band-coral`,",
    "  `callout-card-coral`, `top-nav`, `footer`, etc. These are out of scope for the",
    "  atomic token store. Acknowledge them in `summary` instead of emitting ops.",
    "- Do's / Don'ts narrative, Responsive Behavior tables, Iteration Guide — read for",
    "  context but do not emit token ops from them.",
    "",
    "Brand brief:",
    limitSection(input.briefMarkdown, 96_000),
    "",
    "Current tokens (category | name | value):",
    limitSection(tokenRows, 12_000),
  ].join("\n");

  return { prompt, outputSchema: DesignBriefProposalSchema };
}

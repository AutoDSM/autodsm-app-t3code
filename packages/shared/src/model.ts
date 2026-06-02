import {
  AUTO_INSTANCE_ID,
  AUTO_MODEL_SLUG,
  DEFAULT_MODEL,
  DEFAULT_MODEL_BY_PROVIDER,
  MODEL_SLUG_ALIASES_BY_PROVIDER,
  type ModelCapabilities,
  type ModelSelection,
  ProviderDriverKind,
  ProviderInstanceId,
  type ProviderOptionDescriptor,
  type ProviderOptionSelection,
} from "@t3tools/contracts";

const DEFAULT_PROVIDER_DRIVER_KIND = ProviderDriverKind.make("codex");

export interface SelectableModelOption {
  slug: string;
  name: string;
}

export function createModelCapabilities(input: {
  optionDescriptors: ReadonlyArray<ProviderOptionDescriptor>;
}): ModelCapabilities {
  return {
    optionDescriptors: input.optionDescriptors.map(cloneDescriptor),
  };
}

function getRawSelectionValueById(
  selections: ReadonlyArray<ProviderOptionSelection> | null | undefined,
  id: string,
): string | boolean | undefined {
  const selection = selections?.find((candidate) => candidate.id === id);
  return selection?.value;
}

export function getProviderOptionSelectionValue(
  selections: ReadonlyArray<ProviderOptionSelection> | null | undefined,
  id: string,
): string | boolean | undefined {
  return getRawSelectionValueById(selections, id);
}

export function getProviderOptionStringSelectionValue(
  selections: ReadonlyArray<ProviderOptionSelection> | null | undefined,
  id: string,
): string | undefined {
  const value = getProviderOptionSelectionValue(selections, id);
  return typeof value === "string" ? value : undefined;
}

export function getProviderOptionBooleanSelectionValue(
  selections: ReadonlyArray<ProviderOptionSelection> | null | undefined,
  id: string,
): boolean | undefined {
  const value = getProviderOptionSelectionValue(selections, id);
  return typeof value === "boolean" ? value : undefined;
}

export function getModelSelectionOptionValue(
  modelSelection: ModelSelection | null | undefined,
  id: string,
): string | boolean | undefined {
  return getProviderOptionSelectionValue(modelSelection?.options, id);
}

export function getModelSelectionStringOptionValue(
  modelSelection: ModelSelection | null | undefined,
  id: string,
): string | undefined {
  return getProviderOptionStringSelectionValue(modelSelection?.options, id);
}

export function getModelSelectionBooleanOptionValue(
  modelSelection: ModelSelection | null | undefined,
  id: string,
): boolean | undefined {
  return getProviderOptionBooleanSelectionValue(modelSelection?.options, id);
}

function resolveDescriptorChoiceValue(
  descriptor: Extract<ProviderOptionDescriptor, { type: "select" }>,
  raw: string | null | undefined,
): string | undefined {
  const trimmed = trimOrNull(raw);
  if (!trimmed) {
    return descriptor.currentValue ?? descriptor.options.find((option) => option.isDefault)?.id;
  }
  if (descriptor.options.length === 0) {
    return trimmed;
  }
  if (
    descriptor.promptInjectedValues?.includes(trimmed) &&
    descriptor.options.some((option) => option.id === trimmed)
  ) {
    return descriptor.options.find((option) => option.isDefault)?.id;
  }
  if (descriptor.options.some((option) => option.id === trimmed)) {
    return trimmed;
  }
  return descriptor.currentValue ?? descriptor.options.find((option) => option.isDefault)?.id;
}

function cloneDescriptor(descriptor: ProviderOptionDescriptor): ProviderOptionDescriptor {
  return descriptor.type === "select"
    ? {
        ...descriptor,
        options: [...descriptor.options],
        ...(descriptor.promptInjectedValues
          ? { promptInjectedValues: [...descriptor.promptInjectedValues] }
          : {}),
      }
    : { ...descriptor };
}

function cloneSelection(selection: ProviderOptionSelection): ProviderOptionSelection {
  return { ...selection };
}

function withDescriptorCurrentValue(
  descriptor: ProviderOptionDescriptor,
  rawCurrentValue: string | boolean | undefined,
): ProviderOptionDescriptor {
  if (descriptor.type === "boolean") {
    if (typeof rawCurrentValue === "boolean") {
      return {
        ...descriptor,
        currentValue: rawCurrentValue,
      };
    }
    return descriptor;
  }
  const currentValue =
    typeof rawCurrentValue === "string"
      ? resolveDescriptorChoiceValue(descriptor, rawCurrentValue)
      : resolveDescriptorChoiceValue(descriptor, descriptor.currentValue);
  if (!currentValue) {
    const { currentValue: _unusedCurrentValue, ...rest } = descriptor;
    return rest;
  }
  return {
    ...descriptor,
    currentValue,
  };
}

export function getProviderOptionDescriptors(input: {
  caps: ModelCapabilities;
  selections?: ReadonlyArray<ProviderOptionSelection> | null | undefined;
}): ReadonlyArray<ProviderOptionDescriptor> {
  const { caps, selections } = input;
  const baseDescriptors = (caps.optionDescriptors ?? []).map(cloneDescriptor);

  return baseDescriptors.map((descriptor) =>
    withDescriptorCurrentValue(
      descriptor,
      getRawSelectionValueById(selections, descriptor.id) ?? descriptor.currentValue,
    ),
  );
}

export function getProviderOptionCurrentValue(
  descriptor: ProviderOptionDescriptor | null | undefined,
): string | boolean | undefined {
  if (!descriptor) {
    return undefined;
  }
  if (descriptor.type === "boolean") {
    return descriptor.currentValue;
  }
  if (descriptor.currentValue) {
    return descriptor.currentValue;
  }
  return descriptor.options.find((option) => option.isDefault)?.id;
}

export function getProviderOptionCurrentLabel(
  descriptor: ProviderOptionDescriptor | null | undefined,
): string | undefined {
  if (!descriptor) {
    return undefined;
  }
  if (descriptor.type === "boolean") {
    return typeof descriptor.currentValue === "boolean"
      ? descriptor.currentValue
        ? "On"
        : "Off"
      : undefined;
  }
  const currentValue = getProviderOptionCurrentValue(descriptor);
  if (typeof currentValue !== "string") {
    return undefined;
  }
  return descriptor.options.find((option) => option.id === currentValue)?.label;
}

export function buildProviderOptionSelectionsFromDescriptors(
  descriptors: ReadonlyArray<ProviderOptionDescriptor> | null | undefined,
): Array<ProviderOptionSelection> | undefined {
  if (!descriptors || descriptors.length === 0) {
    return undefined;
  }

  const nextSelections: Array<ProviderOptionSelection> = [];

  for (const descriptor of descriptors) {
    const value = getProviderOptionCurrentValue(descriptor);
    if (typeof value === "string" || typeof value === "boolean") {
      nextSelections.push({ id: descriptor.id, value });
    }
  }

  return nextSelections.length > 0 ? nextSelections : undefined;
}

export function getModelSelectionOptionDescriptors(
  modelSelection: ModelSelection | null | undefined,
  caps?: ModelCapabilities | null | undefined,
): ReadonlyArray<ProviderOptionDescriptor> {
  if (!modelSelection) {
    return [];
  }
  if (!caps) {
    return [];
  }
  return getProviderOptionDescriptors({
    caps,
    selections: modelSelection.options,
  });
}

export function isClaudeUltrathinkPrompt(text: string | null | undefined): boolean {
  return typeof text === "string" && /\bultrathink\b/i.test(text);
}

export function normalizeModelSlug(
  model: string | null | undefined,
  provider: ProviderDriverKind = DEFAULT_PROVIDER_DRIVER_KIND,
): string | null {
  if (typeof model !== "string") {
    return null;
  }

  const trimmed = model.trim();
  if (!trimmed) {
    return null;
  }

  const aliases = MODEL_SLUG_ALIASES_BY_PROVIDER[provider] ?? {};
  const aliased = Object.prototype.hasOwnProperty.call(aliases, trimmed)
    ? aliases[trimmed]
    : undefined;
  return typeof aliased === "string" ? aliased : trimmed;
}

export function resolveSelectableModel(
  provider: ProviderDriverKind,
  value: string | null | undefined,
  options: ReadonlyArray<SelectableModelOption>,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const direct = options.find((option) => option.slug === trimmed);
  if (direct) {
    return direct.slug;
  }

  const byName = options.find((option) => option.name.toLowerCase() === trimmed.toLowerCase());
  if (byName) {
    return byName.slug;
  }

  const normalized = normalizeModelSlug(trimmed, provider);
  if (!normalized) {
    return null;
  }

  const resolved = options.find((option) => option.slug === normalized);
  return resolved ? resolved.slug : null;
}

function resolveModelSlug(model: string | null | undefined, provider: ProviderDriverKind): string {
  const normalized = normalizeModelSlug(model, provider);
  if (!normalized) {
    return DEFAULT_MODEL_BY_PROVIDER[provider] ?? DEFAULT_MODEL;
  }
  return normalized;
}

export function resolveModelSlugForProvider(
  provider: ProviderDriverKind,
  model: string | null | undefined,
): string {
  return resolveModelSlug(model, provider);
}

/** Trim a string, returning null for empty/missing values. */
export function trimOrNull<T extends string>(value: T | null | undefined): T | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim() as T;
  return trimmed || null;
}

function cloneSelections(
  selections: ReadonlyArray<ProviderOptionSelection>,
): Array<ProviderOptionSelection> {
  return selections.map(cloneSelection);
}

export function createModelSelection(
  instanceId: ProviderInstanceId,
  model: string,
  options?: ReadonlyArray<ProviderOptionSelection> | null,
): ModelSelection {
  const selections = options ? cloneSelections(options) : [];
  const base: ModelSelection = {
    instanceId,
    model,
  };
  return selections.length > 0 ? { ...base, options: selections } : base;
}

/**
 * Returns the effort value if it is a prompt-injected value according to
 * any select descriptor in the given capabilities, or null otherwise.
 *
 * Unlike a single `find`, this checks every descriptor so that the
 * correct descriptor's `promptInjectedValues` list is consulted even when
 * multiple select descriptors exist.
 */
export function resolvePromptInjectedEffort(
  caps: ModelCapabilities,
  rawEffort: string | null | undefined,
): string | null {
  const trimmed = trimOrNull(rawEffort);
  if (!trimmed) return null;
  const descriptors = getProviderOptionDescriptors({ caps });
  for (const descriptor of descriptors) {
    if (descriptor.type === "select" && descriptor.promptInjectedValues?.includes(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

export function applyClaudePromptEffortPrefix(
  text: string,
  effort: string | null | undefined,
): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (effort !== "ultrathink") {
    return trimmed;
  }
  if (trimmed.startsWith("Ultrathink:")) {
    return trimmed;
  }
  return `Ultrathink:\n${trimmed}`;
}

// ── Auto model mode ───────────────────────────────────────────────────
//
// "Auto" is a cross-provider, deterministic router: given the models the
// user actually has (from READY provider instances) plus cheap signals about
// the turn, it picks the best-fit model without an extra LLM round-trip. The
// logic here is pure so it is fully unit-testable.

/** Quality/cost tiers, ordered fast < balanced < frontier. */
export type AutoModelTier = "fast" | "balanced" | "frontier";

const TIER_ORDER: Record<AutoModelTier, number> = { fast: 0, balanced: 1, frontier: 2 };

export interface ModelQualityRank {
  readonly tier: AutoModelTier;
  /** Higher = more capable. Used to pick the best model within a tier budget. */
  readonly score: number;
}

/**
 * Curated ranking for known model slugs. Unknown/custom slugs fall back to the
 * substring heuristic in {@link rankForModelSlug}. Keep scores comparable
 * across providers so cross-provider selection is meaningful.
 */
export const MODEL_QUALITY_RANK: Readonly<Record<string, ModelQualityRank>> = {
  "claude-opus-4-7": { tier: "frontier", score: 100 },
  "claude-opus-4-6": { tier: "frontier", score: 96 },
  "claude-opus-4-5": { tier: "frontier", score: 92 },
  "gpt-5.4": { tier: "frontier", score: 95 },
  "gpt-5.3-codex": { tier: "frontier", score: 90 },
  "gpt-5.3-codex-spark": { tier: "balanced", score: 64 },
  "openai/gpt-5": { tier: "frontier", score: 88 },
  "claude-sonnet-4-6": { tier: "balanced", score: 72 },
  "composer-2": { tier: "balanced", score: 60 },
  "composer-1.5": { tier: "balanced", score: 54 },
  "claude-haiku-4-5": { tier: "fast", score: 42 },
  "gpt-5.4-mini": { tier: "fast", score: 40 },
};

/** Rank a model slug, using the curated table first then a slug heuristic. */
export function rankForModelSlug(slug: string): ModelQualityRank {
  const direct = MODEL_QUALITY_RANK[slug];
  if (direct) return direct;
  const lower = slug.toLowerCase();
  if (/(mini|haiku|flash|fast|spark|lite|nano|small|mini-)/.test(lower)) {
    return { tier: "fast", score: 35 };
  }
  if (/(opus|gpt-5|grok-4|max|ultra|\bo1\b|\bo3\b|pro)/.test(lower)) {
    return { tier: "frontier", score: 80 };
  }
  if (/(sonnet|composer|gpt-4|medium|deepseek|qwen)/.test(lower)) {
    return { tier: "balanced", score: 60 };
  }
  // Unknown shape — treat as mid-capability so it can serve as a reasonable
  // fallback without being preferred over a known frontier model.
  return { tier: "balanced", score: 50 };
}

/** A model the user has available, as a candidate for Auto selection. */
export interface AutoModelCandidate {
  readonly instanceId: ProviderInstanceId;
  readonly driverKind: ProviderDriverKind;
  readonly model: string;
  readonly capabilities?: ModelCapabilities | null;
}

export interface AutoSelectionSignals {
  /** "plan" turns lean toward the strongest model. */
  readonly interactionMode?: "default" | "plan";
  /** Character length of the user's prompt. */
  readonly promptLength: number;
  /** Image attachments push toward a stronger multimodal model. */
  readonly hasImageAttachments?: boolean;
  /** "textgen" = commit/title/branch summarization; always fast. */
  readonly purpose: "turn" | "textgen";
}

/** The Auto sentinel selection the UI/store persists when the user picks Auto. */
export const AUTO_MODEL_SELECTION: ModelSelection = createModelSelection(
  AUTO_INSTANCE_ID,
  AUTO_MODEL_SLUG,
);

/** True when a selection is the cross-provider Auto sentinel. */
export function isAutoModelSelection(selection: ModelSelection | null | undefined): boolean {
  return selection?.instanceId === AUTO_INSTANCE_ID;
}

/** Map turn signals to a target capability tier. */
export function targetTierForSignals(signals: AutoSelectionSignals): AutoModelTier {
  if (signals.purpose === "textgen") return "fast";
  if (
    signals.interactionMode === "plan" ||
    signals.hasImageAttachments === true ||
    signals.promptLength >= 1500
  ) {
    return "frontier";
  }
  if (signals.promptLength <= 160) return "fast";
  return "balanced";
}

// Provider tie-break order when two candidates score equally.
const AUTO_PROVIDER_PRIORITY: ReadonlyArray<string> = [
  "claudeAgent",
  "codex",
  "opencode",
  "cursor",
];

function providerPriorityIndex(driver: ProviderDriverKind): number {
  const index = AUTO_PROVIDER_PRIORITY.indexOf(driver as unknown as string);
  return index === -1 ? AUTO_PROVIDER_PRIORITY.length : index;
}

// Effort-like select descriptors whose value we nudge by tier.
const EFFORT_DESCRIPTOR_IDS: ReadonlySet<string> = new Set([
  "effort",
  "reasoning",
  "reasoningEffort",
  "variant",
]);
const FRONTIER_EFFORT_PREFERENCE: ReadonlyArray<string> = ["max", "xhigh", "high", "medium"];
const FAST_EFFORT_PREFERENCE: ReadonlyArray<string> = ["minimal", "low", "medium"];

function chooseEffortOptionId(
  descriptor: ProviderOptionDescriptor,
  tier: AutoModelTier,
): string | undefined {
  if (descriptor.type !== "select") return undefined;
  if (tier === "balanced") return undefined; // keep provider defaults
  const injected = new Set(descriptor.promptInjectedValues ?? []);
  const available = new Set(
    descriptor.options.map((option) => option.id).filter((id) => !injected.has(id)),
  );
  const preference = tier === "frontier" ? FRONTIER_EFFORT_PREFERENCE : FAST_EFFORT_PREFERENCE;
  for (const id of preference) {
    if (available.has(id)) return id;
  }
  return undefined;
}

/** Build option selections for the chosen model, nudging effort by tier. */
function buildAutoOptionsForModel(
  capabilities: ModelCapabilities | null | undefined,
  tier: AutoModelTier,
): Array<ProviderOptionSelection> | undefined {
  if (!capabilities) return undefined;
  const descriptors = getProviderOptionDescriptors({ caps: capabilities });
  const selections = buildProviderOptionSelectionsFromDescriptors(descriptors) ?? [];
  const byId = new Map(selections.map((selection) => [selection.id, selection]));
  for (const descriptor of descriptors) {
    if (!EFFORT_DESCRIPTOR_IDS.has(descriptor.id)) continue;
    const override = chooseEffortOptionId(descriptor, tier);
    if (override !== undefined) {
      byId.set(descriptor.id, { id: descriptor.id, value: override });
    }
  }
  const next = [...byId.values()];
  return next.length > 0 ? next : undefined;
}

/**
 * Resolve the Auto sentinel to a concrete {@link ModelSelection}.
 *
 * - Picks the best-scoring model whose tier fits within the target derived
 *   from `signals`; if every candidate is stronger than the target, picks the
 *   cheapest (lowest score) to honor cost optimization.
 * - `lockedInstanceId` constrains candidates to a single instance — used when
 *   a provider session is already bound to the thread and cannot switch
 *   providers mid-session, so cross-provider routing only happens at session
 *   start.
 * - Returns `null` when there are no candidates; callers fall back to their
 *   existing concrete defaults.
 */
export function resolveAutoModelSelection(input: {
  readonly candidates: ReadonlyArray<AutoModelCandidate>;
  readonly signals: AutoSelectionSignals;
  readonly lockedInstanceId?: ProviderInstanceId | null;
}): ModelSelection | null {
  const pool = input.lockedInstanceId
    ? input.candidates.filter((candidate) => candidate.instanceId === input.lockedInstanceId)
    : input.candidates;
  if (pool.length === 0) return null;

  const target = targetTierForSignals(input.signals);
  const targetRank = TIER_ORDER[target];
  const ranked = pool.map((candidate) => ({
    candidate,
    rank: rankForModelSlug(candidate.model),
  }));

  const atOrBelow = ranked.filter(({ rank }) => TIER_ORDER[rank.tier] <= targetRank);
  // Within budget → strongest available; otherwise everything is above the
  // target, so take the cheapest (closest down to the target).
  const preferStrongest = atOrBelow.length > 0;
  const considered = preferStrongest ? atOrBelow : ranked;

  const sorted = considered.toSorted((a, b) => {
    const scoreDelta = preferStrongest
      ? b.rank.score - a.rank.score
      : a.rank.score - b.rank.score;
    if (scoreDelta !== 0) return scoreDelta;
    return (
      providerPriorityIndex(a.candidate.driverKind) -
      providerPriorityIndex(b.candidate.driverKind)
    );
  });

  const chosen = sorted[0]?.candidate;
  if (!chosen) return null;
  const options = buildAutoOptionsForModel(chosen.capabilities, target);
  return createModelSelection(chosen.instanceId, chosen.model, options);
}

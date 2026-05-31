import type { AutoDsmBrandToken } from "@t3tools/contracts";

const VAR_REFERENCE = /^\s*var\(\s*--([a-zA-Z0-9_-]+)\s*(?:,[^)]*)?\)\s*$/;

/** Returns the bare variable name from `var(--name)`-style values, or null. */
export function parseVarReference(value: string): string | null {
  const match = VAR_REFERENCE.exec(value);
  return match ? (match[1] ?? null) : null;
}

/** `--color-brand-500` and `color-brand-500` should both map to the same token. */
function normaliseLookupKey(raw: string): string {
  return raw.trim().replace(/^--/, "").toLowerCase();
}

export function buildColorTokenScope(
  tokens: ReadonlyArray<AutoDsmBrandToken>,
): ReadonlyMap<string, AutoDsmBrandToken> {
  const map = new Map<string, AutoDsmBrandToken>();
  for (const token of tokens) {
    const candidates = new Set<string>();
    if (token.name && token.name.trim().length > 0) candidates.add(token.name);
    candidates.add(token.id);
    for (const candidate of candidates) {
      const key = normaliseLookupKey(candidate);
      if (key.length === 0) continue;
      if (!map.has(key)) map.set(key, token);
    }
  }
  return map;
}

const MAX_RESOLUTION_HOPS = 8;

export interface ResolvedColorValue {
  readonly value: string | null;
  readonly referenceName: string | null;
}

/**
 * Follow `var(--…)` references until a literal value is reached.
 *
 * - `value` is the resolved literal (e.g., `oklch(…)`, `#hex`) or null when
 *   the chain breaks (unknown reference or exceeds {@link MAX_RESOLUTION_HOPS}).
 * - `referenceName` is the **first hop** name (the immediate parent in the
 *   chain) so the UI can render a chip pointing at the direct dependency.
 *   It's null when the input value isn't a reference.
 */
export function resolveColorTokenValue(
  token: AutoDsmBrandToken,
  scope: ReadonlyMap<string, AutoDsmBrandToken>,
  channel: "light" | "dark" = "light",
): ResolvedColorValue {
  const startValue =
    channel === "dark" ? (token.color?.dark ?? null) : (token.color?.light ?? token.value);
  if (startValue === null || startValue === undefined) {
    return { value: null, referenceName: null };
  }

  const firstHop = parseVarReference(startValue);
  if (firstHop === null) {
    return { value: startValue, referenceName: null };
  }

  const seen = new Set<string>([token.id]);
  let currentName: string | null = firstHop;
  let currentValue: string | null = null;

  for (let hop = 0; hop < MAX_RESOLUTION_HOPS && currentName !== null; hop += 1) {
    const next = scope.get(normaliseLookupKey(currentName));
    if (!next) {
      // Unknown reference — surface what we know so the UI can show a broken-link state.
      return { value: null, referenceName: firstHop };
    }
    if (seen.has(next.id)) {
      // Cycle detected.
      return { value: null, referenceName: firstHop };
    }
    seen.add(next.id);

    const nextValue =
      channel === "dark"
        ? (next.color?.dark ?? next.color?.light ?? next.value)
        : (next.color?.light ?? next.value);

    const nextRef = parseVarReference(nextValue);
    if (nextRef === null) {
      currentValue = nextValue;
      currentName = null;
    } else {
      currentName = nextRef;
    }
  }

  return { value: currentValue, referenceName: firstHop };
}

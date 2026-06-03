// Detect design-token references inside component source.
//
// AutoDSM design tokens are CSS custom properties — a token's id is
// `css-var:<name>` (see `autoDsmHelpers` token extraction) and components
// reference them as `var(--<name>)` in className / style strings, e.g.
// `bg-[var(--primary)]` or `text-[var(--foreground)]`. Matching `var(--name)`
// against the source is therefore a deterministic, 1:1 signal for "which tokens
// does this component use" — no transformation or alias resolution required.

const CSS_VAR_REFERENCE = /var\(\s*--([a-zA-Z0-9_-]+)/g;

/**
 * Return the distinct CSS custom-property token names referenced via `var(--x)`
 * in the given source text. Names exclude the leading `--`; the result is sorted
 * for deterministic output.
 */
export function extractCssVarTokenNames(source: string): readonly string[] {
  const names = new Set<string>();
  CSS_VAR_REFERENCE.lastIndex = 0;
  let match: RegExpExecArray | null = CSS_VAR_REFERENCE.exec(source);
  while (match !== null) {
    const name = match[1];
    if (name) {
      names.add(name);
    }
    match = CSS_VAR_REFERENCE.exec(source);
  }
  return [...names].toSorted();
}

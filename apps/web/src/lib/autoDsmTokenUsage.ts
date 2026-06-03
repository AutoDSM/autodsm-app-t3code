import type { AutoDsmComponentRegistryEntry } from "@t3tools/contracts";

// Design Tokens "usage" tracking: how many components reference each token.
// The server records `tokenReferences` (CSS custom-property names) per component
// registry entry; a token's id is `css-var:<name>` (see AutoDsmBrandToken). These
// helpers turn the registry into a token-id → component-count map for the UI.

/** Token id form for a CSS custom-property token. */
export function cssVarTokenId(name: string): string {
  return `css-var:${name}`;
}

/**
 * Count, per token id (`css-var:<name>`), how many components reference that
 * token at least once. A component referencing the same token twice counts once.
 */
export function buildTokenUsageCountById(
  entries: readonly AutoDsmComponentRegistryEntry[],
): Map<string, number> {
  const countById = new Map<string, number>();
  for (const entry of entries) {
    const distinct = new Set(entry.tokenReferences ?? []);
    for (const name of distinct) {
      const id = cssVarTokenId(name);
      countById.set(id, (countById.get(id) ?? 0) + 1);
    }
  }
  return countById;
}

/**
 * Resolve the component-usage count for a token, matching by id first and
 * falling back to its name (for tokens whose id isn't the css-var form but whose
 * name maps to a CSS variable).
 */
export function tokenUsageCount(
  token: { readonly id: string; readonly name?: string | undefined },
  countById: ReadonlyMap<string, number>,
): number {
  const direct = countById.get(token.id);
  if (direct !== undefined) {
    return direct;
  }
  if (token.name) {
    return countById.get(cssVarTokenId(token.name)) ?? 0;
  }
  return 0;
}

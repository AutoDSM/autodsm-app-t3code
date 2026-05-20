import type { AutoDsmBrandToken, AutoDsmBrandTokenCategory } from "@t3tools/contracts";

import type { ComposerCommandItem } from "~/components/chat/ComposerCommandMenu";
import {
  DESIGN_TOKEN_CATEGORY_LABEL,
  groupTokensByCategory,
  tokenDisplayName,
} from "~/lib/designTokenGroups";

function formatBrandTokenMenuDescription(token: AutoDsmBrandToken): string {
  if (token.category === "color" && token.color) {
    const parts = [
      token.color.light !== undefined ? `light ${token.color.light}` : null,
      token.color.dark !== undefined ? `dark ${token.color.dark}` : null,
    ].filter((part): part is string => part !== null);
    return parts.join(" · ") || token.value;
  }
  if (token.category === "typography" && token.typography) {
    return Object.entries(token.typography)
      .filter(([, value]) => value !== undefined && String(value).trim().length > 0)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" · ");
  }
  return token.value;
}

export function buildBrandTokenComposerMenuItems(
  tokens: readonly AutoDsmBrandToken[],
  query: string,
): ComposerCommandItem[] {
  if (tokens.length === 0) {
    return [];
  }
  const needle = query.trim().toLowerCase();
  const items: ComposerCommandItem[] = [];
  for (const group of groupTokensByCategory(tokens)) {
    for (const token of group.tokens) {
      const name = tokenDisplayName(token);
      if (needle.length > 0 && !name.toLowerCase().startsWith(needle)) {
        continue;
      }
      items.push({
        id: `brand-token:${token.id}`,
        type: "brand-token",
        token,
        tokenName: name,
        category: group.category,
        label: `@${name}`,
        description: formatBrandTokenMenuDescription(token),
      });
    }
  }
  return items;
}

export function groupBrandTokenComposerMenuItems(
  items: readonly ComposerCommandItem[],
): ReadonlyArray<{
  readonly id: AutoDsmBrandTokenCategory;
  readonly label: string;
  readonly items: ComposerCommandItem[];
}> {
  const buckets = new Map<AutoDsmBrandTokenCategory, ComposerCommandItem[]>();
  for (const item of items) {
    if (item.type !== "brand-token") {
      continue;
    }
    const current = buckets.get(item.category) ?? [];
    current.push(item);
    buckets.set(item.category, current);
  }
  return [...buckets.entries()].map(([category, categoryItems]) => ({
    id: category,
    label: DESIGN_TOKEN_CATEGORY_LABEL[category],
    items: categoryItems,
  }));
}

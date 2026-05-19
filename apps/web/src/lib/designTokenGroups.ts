/**
 * Pure helpers for the Design Tokens workspace: category grouping, display
 * naming, and add-token draft construction. Kept free of React so it can be
 * unit-tested directly.
 *
 * @module designTokenGroups
 */
import type {
  AutoDsmBrandToken,
  AutoDsmBrandTokenCategory,
  AutoDsmBrandTokenDraft,
} from "@t3tools/contracts";

/** Canonical categories rendered as collapsible sections, in display order. */
export const DESIGN_TOKEN_CATEGORIES = [
  "color",
  "typography",
  "spacing",
  "motion",
] as const satisfies readonly AutoDsmBrandTokenCategory[];

export const DESIGN_TOKEN_CATEGORY_LABEL: Record<AutoDsmBrandTokenCategory, string> = {
  color: "Colors",
  typography: "Typography",
  spacing: "Spacing",
  motion: "Motion",
};

/** Map a stored (possibly legacy/free-form) category onto a canonical one. */
export function normalizeTokenCategory(raw: string): AutoDsmBrandTokenCategory {
  switch (raw.trim().toLowerCase()) {
    case "color":
    case "colors":
    case "colour":
      return "color";
    case "typography":
    case "type":
    case "text":
    case "font":
      return "typography";
    case "motion":
    case "animation":
    case "transition":
      return "motion";
    default:
      return "spacing";
  }
}

export interface DesignTokenGroup {
  readonly category: AutoDsmBrandTokenCategory;
  readonly tokens: readonly AutoDsmBrandToken[];
}

/** Group tokens into the four canonical categories — always returns all four. */
export function groupTokensByCategory(
  tokens: readonly AutoDsmBrandToken[],
): readonly DesignTokenGroup[] {
  const buckets = new Map<AutoDsmBrandTokenCategory, AutoDsmBrandToken[]>(
    DESIGN_TOKEN_CATEGORIES.map((category) => [category, []]),
  );
  for (const token of tokens) {
    buckets.get(normalizeTokenCategory(token.category))?.push(token);
  }
  return DESIGN_TOKEN_CATEGORIES.map((category) => ({
    category,
    tokens: buckets.get(category) ?? [],
  }));
}

/** Human-facing label for a token; falls back to its id. */
export function tokenDisplayName(token: AutoDsmBrandToken): string {
  return token.name ?? token.id;
}

/** Mutable form state backing the inline add-token row. */
export interface TokenDraftFields {
  readonly name: string;
  readonly value: string;
  readonly light: string;
  readonly dark: string;
  readonly fontFamily: string;
  readonly fontSize: string;
  readonly letterSpacing: string;
}

export const EMPTY_TOKEN_DRAFT_FIELDS: TokenDraftFields = {
  name: "",
  value: "",
  light: "",
  dark: "",
  fontFamily: "",
  fontSize: "",
  letterSpacing: "",
};

export type BuildTokenDraftResult =
  | { readonly ok: true; readonly draft: AutoDsmBrandTokenDraft }
  | { readonly ok: false; readonly error: string };

/** Validate add-row form fields and assemble a typed {@link AutoDsmBrandTokenDraft}. */
export function buildTokenDraft(
  category: AutoDsmBrandTokenCategory,
  fields: TokenDraftFields,
): BuildTokenDraftResult {
  const name = fields.name.trim();
  if (name.length === 0) {
    return { ok: false, error: "Token name is required." };
  }

  if (category === "color") {
    const light = fields.light.trim();
    const dark = fields.dark.trim();
    if (light.length === 0 && dark.length === 0) {
      return { ok: false, error: "A light or dark color value is required." };
    }
    return {
      ok: true,
      draft: {
        category,
        name,
        value: light.length > 0 ? light : dark,
        color: { ...(light.length > 0 ? { light } : {}), ...(dark.length > 0 ? { dark } : {}) },
      },
    };
  }

  if (category === "typography") {
    const fontFamily = fields.fontFamily.trim();
    const fontSize = fields.fontSize.trim();
    const letterSpacing = fields.letterSpacing.trim();
    if (fontFamily.length === 0 && fontSize.length === 0) {
      return { ok: false, error: "A font family or size is required." };
    }
    const value = [fontFamily, fontSize].filter((part) => part.length > 0).join(" ");
    return {
      ok: true,
      draft: {
        category,
        name,
        value,
        typography: {
          ...(fontFamily.length > 0 ? { fontFamily } : {}),
          ...(fontSize.length > 0 ? { fontSize } : {}),
          ...(letterSpacing.length > 0 ? { letterSpacing } : {}),
        },
      },
    };
  }

  const value = fields.value.trim();
  if (value.length === 0) {
    return { ok: false, error: "A token value is required." };
  }
  return { ok: true, draft: { category, name, value } };
}

/** Populate edit-row fields from an existing token. */
export function tokenFieldsFromToken(token: AutoDsmBrandToken): TokenDraftFields {
  return {
    name: tokenDisplayName(token),
    value: token.value,
    light: token.color?.light ?? token.value,
    dark: token.color?.dark ?? "",
    fontFamily: token.typography?.fontFamily ?? "",
    fontSize: token.typography?.fontSize ?? token.value,
    letterSpacing: token.typography?.letterSpacing ?? "",
  };
}

/** Mention handle shown in composer and the tokens table. */
export function tokenMentionHandle(token: AutoDsmBrandToken): string {
  return `@${tokenDisplayName(token)}`;
}

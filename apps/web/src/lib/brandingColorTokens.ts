import type { AutoDsmBrandToken } from "@t3tools/contracts";

import { tokenDisplayName } from "~/lib/designTokenGroups";

/** Canonical shadcn semantic color variables shown at launch. */
export const BRANDING_COLOR_TOKEN_NAMES = new Set([
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring",
]);

/** Tailwind @theme palette scales such as `color-brand-500`. */
const TAILWIND_PALETTE_COLOR_NAME = /^color-[a-z0-9-]+-\d+$/;

function normalizedTokenName(token: AutoDsmBrandToken): string {
  return tokenDisplayName(token).toLowerCase();
}

/** Whether a color token is a launch-visible branding/semantic color (not a palette primitive). */
export function isBrandingColorToken(token: AutoDsmBrandToken): boolean {
  if (token.category !== "color") {
    return false;
  }
  if (token.origin === "user") {
    return true;
  }

  const name = normalizedTokenName(token);
  if (TAILWIND_PALETTE_COLOR_NAME.test(name)) {
    return false;
  }
  if (BRANDING_COLOR_TOKEN_NAMES.has(name)) {
    return true;
  }
  if (name.endsWith("-foreground")) {
    const base = name.slice(0, -"-foreground".length);
    if (BRANDING_COLOR_TOKEN_NAMES.has(base) || BRANDING_COLOR_TOKEN_NAMES.has(name)) {
      return true;
    }
  }
  if (!name.startsWith("color-") && !name.includes("-")) {
    return true;
  }
  if (!name.startsWith("color-") && name.endsWith("-foreground")) {
    return true;
  }
  return false;
}

export function filterBrandingColorTokens(
  tokens: readonly AutoDsmBrandToken[],
): readonly AutoDsmBrandToken[] {
  return tokens.filter(isBrandingColorToken);
}

/** Branding colors plus non-color tokens for composer @mention surfaces. */
export function filterComposerBrandTokens(
  tokens: readonly AutoDsmBrandToken[],
): readonly AutoDsmBrandToken[] {
  return tokens.filter((token) => token.category !== "color" || isBrandingColorToken(token));
}

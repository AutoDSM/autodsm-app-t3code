"use client";

import type { AutoDsmBrandToken } from "@t3tools/contracts";
import type { JSX } from "react";

import { tokenUsageCount } from "~/lib/autoDsmTokenUsage";

/**
 * Shows how many workspace components reference a token (via `var(--name)`).
 * Renders nothing when usage data is unavailable or the token is unused, so it
 * can be dropped into any token row without adding noise.
 */
export function TokenUsageHint({
  token,
  usageCountByTokenId,
}: {
  readonly token: AutoDsmBrandToken;
  readonly usageCountByTokenId?: ReadonlyMap<string, number> | undefined;
}): JSX.Element | null {
  if (!usageCountByTokenId) {
    return null;
  }
  const count = tokenUsageCount(token, usageCountByTokenId);
  if (count <= 0) {
    return null;
  }
  return (
    <p
      className="text-xs text-muted-foreground/70"
      data-testid={`design-token-usage:${token.id}`}
    >
      Used in {count} {count === 1 ? "component" : "components"}
    </p>
  );
}

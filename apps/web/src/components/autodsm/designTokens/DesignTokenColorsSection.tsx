"use client";

import type { AutoDsmBrandToken } from "@t3tools/contracts";
import { useMemo, type JSX } from "react";

import { buildColorTokenScope, resolveColorTokenValue } from "~/lib/colorTokenTiers";
import { formatOklchValueAsRgb } from "~/lib/colorFormat";
import { DESIGN_TOKEN_COLOR_ROLE_LABEL, groupColorTokensByRole } from "~/lib/designTokenColorRoles";
import { tokenDisplayName } from "~/lib/designTokenGroups";

import { DesignTokenSubSection } from "./DesignTokenSubSection";
import { TokenUsageHint } from "./TokenUsageHint";

export interface DesignTokenColorsSectionProps {
  readonly tokens: readonly AutoDsmBrandToken[];
  readonly colorResolutionScope: readonly AutoDsmBrandToken[];
  readonly onEditToken: (token: AutoDsmBrandToken) => void;
  /** token id → number of components referencing it (optional). */
  readonly usageCountByTokenId?: ReadonlyMap<string, number> | undefined;
}

function ColorSwatchCard({
  token,
  scope,
  usageCountByTokenId,
  onEdit,
}: {
  readonly token: AutoDsmBrandToken;
  readonly scope: ReadonlyMap<string, AutoDsmBrandToken>;
  readonly usageCountByTokenId?: ReadonlyMap<string, number> | undefined;
  readonly onEdit: () => void;
}): JSX.Element {
  const resolved = resolveColorTokenValue(token, scope, "light");
  const swatchValue = resolved.value ?? token.color?.light ?? token.value;
  const displayValue = swatchValue ? formatOklchValueAsRgb(swatchValue) : "—";
  const name = tokenDisplayName(token);

  return (
    <button
      type="button"
      className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card text-left transition-colors hover:border-border hover:bg-card/80"
      onClick={onEdit}
    >
      <div
        className="h-24 w-full border-b border-border/40"
        style={swatchValue ? { backgroundColor: swatchValue } : undefined}
        aria-hidden
      />
      <div className="space-y-0.5 px-3 py-2.5">
        <p className="font-mono text-sm text-foreground">{name}</p>
        <p className="font-mono text-xs text-muted-foreground">{displayValue}</p>
        <TokenUsageHint token={token} usageCountByTokenId={usageCountByTokenId} />
      </div>
    </button>
  );
}

export function DesignTokenColorsSection({
  tokens,
  colorResolutionScope,
  onEditToken,
  usageCountByTokenId,
}: DesignTokenColorsSectionProps): JSX.Element {
  const scope = useMemo(() => buildColorTokenScope(colorResolutionScope), [colorResolutionScope]);
  const roleGroups = useMemo(() => groupColorTokensByRole(tokens), [tokens]);

  if (tokens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No branding colors yet — resync from your design system or add a token.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {roleGroups.map((group, index) => (
        <DesignTokenSubSection key={group.role} label={DESIGN_TOKEN_COLOR_ROLE_LABEL[group.role]}>
          <div
            className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${index === 0 ? "[&>div]:border-t-0 [&>div]:pt-0" : ""}`}
          >
            {group.tokens.map((token) => (
              <ColorSwatchCard
                key={token.id}
                token={token}
                scope={scope}
                usageCountByTokenId={usageCountByTokenId}
                onEdit={() => {
                  onEditToken(token);
                }}
              />
            ))}
          </div>
        </DesignTokenSubSection>
      ))}
    </div>
  );
}

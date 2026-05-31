"use client";

import type { AutoDsmBrandToken } from "@t3tools/contracts";
import { useMemo, type JSX } from "react";

import { tokenDisplayName } from "~/lib/designTokenGroups";
import { maxDesignTokenLengthPx, parseDesignTokenLength } from "~/lib/designTokenLengthParser";

export interface DesignTokenSpacingSectionProps {
  readonly tokens: readonly AutoDsmBrandToken[];
  readonly onEditToken: (token: AutoDsmBrandToken) => void;
}

export function DesignTokenSpacingSection({
  tokens,
  onEditToken,
}: DesignTokenSpacingSectionProps): JSX.Element {
  const maxPx = useMemo(() => maxDesignTokenLengthPx(tokens.map((t) => t.value)), [tokens]);

  if (tokens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No spacing tokens yet — resync from your design system or add a token.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
      {tokens.map((token) => {
        const parsed = parseDesignTokenLength(token.value);
        const barWidth = parsed && maxPx > 0 ? `${Math.max(4, (parsed.px / maxPx) * 100)}%` : "4px";
        const unitLabel = parsed
          ? `${parsed.raw}${parsed.unit && !parsed.raw.includes(parsed.unit) ? parsed.unit : ""}`
          : token.value;

        return (
          <li key={token.id}>
            <button
              type="button"
              className="grid w-full grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/30"
              onClick={() => {
                onEditToken(token);
              }}
            >
              <span className="font-mono text-sm text-foreground">{tokenDisplayName(token)}</span>
              <div className="h-2 rounded-full bg-muted/50">
                <div
                  className="h-full rounded-full bg-primary/80"
                  style={{ width: barWidth }}
                  aria-hidden
                />
              </div>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {unitLabel}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

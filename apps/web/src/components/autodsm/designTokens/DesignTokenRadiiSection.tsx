"use client";

import type { AutoDsmBrandToken } from "@t3tools/contracts";
import type { JSX } from "react";

import { tokenDisplayName } from "~/lib/designTokenGroups";
import { parseDesignTokenLength } from "~/lib/designTokenLengthParser";

export interface DesignTokenRadiiSectionProps {
  readonly tokens: readonly AutoDsmBrandToken[];
  readonly onEditToken: (token: AutoDsmBrandToken) => void;
}

export function DesignTokenRadiiSection({
  tokens,
  onEditToken,
}: DesignTokenRadiiSectionProps): JSX.Element {
  if (tokens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No radius tokens yet — resync from your design system or add a token.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tokens.map((token) => {
        const parsed = parseDesignTokenLength(token.value);
        const unitSuffix = parsed?.unit && !token.value.includes(parsed.unit) ? parsed.unit : "";

        return (
          <button
            key={token.id}
            type="button"
            className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 text-left transition-colors hover:border-border hover:bg-card/80"
            onClick={() => {
              onEditToken(token);
            }}
          >
            <div
              className="mx-auto size-16 border-2 border-primary/50 bg-muted/30"
              style={{ borderRadius: token.value }}
              aria-hidden
            />
            <div className="space-y-0.5 text-center">
              <p className="font-mono text-sm text-foreground">{tokenDisplayName(token)}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {token.value}
                {unitSuffix}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

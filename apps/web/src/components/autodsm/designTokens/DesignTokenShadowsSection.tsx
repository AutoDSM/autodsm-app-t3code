"use client";

import type { AutoDsmBrandToken } from "@t3tools/contracts";
import type { JSX } from "react";

import { tokenDisplayName } from "~/lib/designTokenGroups";

export interface DesignTokenShadowsSectionProps {
  readonly tokens: readonly AutoDsmBrandToken[];
  readonly onEditToken: (token: AutoDsmBrandToken) => void;
}

export function DesignTokenShadowsSection({
  tokens,
  onEditToken,
}: DesignTokenShadowsSectionProps): JSX.Element {
  if (tokens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No shadow tokens yet — resync from your design system or add a token.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tokens.map((token) => (
        <button
          key={token.id}
          type="button"
          className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 text-left transition-colors hover:border-border hover:bg-card/80"
          onClick={() => {
            onEditToken(token);
          }}
        >
          <div className="flex items-center justify-center py-4">
            <div
              className="size-20 rounded-xl bg-card border border-border/40"
              style={{ boxShadow: token.value }}
              aria-hidden
            />
          </div>
          <div className="space-y-1">
            <p className="font-mono text-sm text-foreground">{tokenDisplayName(token)}</p>
            <p className="line-clamp-2 font-mono text-xs text-muted-foreground break-all">
              {token.value}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

"use client";

import type { AutoDsmBrandToken } from "@t3tools/contracts";
import type { CSSProperties, JSX } from "react";

import { tokenDisplayName } from "~/lib/designTokenGroups";

export interface DesignTokenTypographySectionProps {
  readonly tokens: readonly AutoDsmBrandToken[];
  readonly onEditToken: (token: AutoDsmBrandToken) => void;
}

function typographyStyle(token: AutoDsmBrandToken): CSSProperties {
  const typo = token.typography;
  return {
    fontFamily: typo?.fontFamily,
    fontSize: typo?.fontSize ?? token.value,
    fontWeight: typo?.fontWeight as CSSProperties["fontWeight"] | undefined,
    lineHeight: typo?.lineHeight,
    letterSpacing: typo?.letterSpacing,
  };
}

function metadataPills(token: AutoDsmBrandToken): readonly string[] {
  const typo = token.typography;
  const pills: string[] = [];
  if (typo?.fontFamily) {
    pills.push(typo.fontFamily);
  }
  if (typo?.fontWeight) {
    pills.push(`w ${typo.fontWeight}`);
  }
  if (typo?.fontSize ?? token.value) {
    pills.push(typo?.fontSize ?? token.value);
  }
  if (typo?.lineHeight) {
    pills.push(`lh ${typo.lineHeight}`);
  }
  if (typo?.letterSpacing) {
    pills.push(`ls ${typo.letterSpacing}`);
  }
  return pills;
}

export function DesignTokenTypographySection({
  tokens,
  onEditToken,
}: DesignTokenTypographySectionProps): JSX.Element {
  if (tokens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No typography tokens yet — resync from your design system or add a token.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
      {tokens.map((token) => {
        const pills = metadataPills(token);
        return (
          <li key={token.id}>
            <button
              type="button"
              className="flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/30"
              onClick={() => {
                onEditToken(token);
              }}
            >
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {tokenDisplayName(token)}
              </p>
              <p className="text-2xl text-foreground" style={typographyStyle(token)}>
                The quick brown fox jumps over the lazy dog
              </p>
              {pills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {pills.map((pill) => (
                    <span
                      key={pill}
                      className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-0.5 font-mono text-xs text-muted-foreground"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import type { AutoDsmWorkspaceHistoryEntry } from "@t3tools/contracts";
import type { JSX } from "react";

import { getStarterCatalogEntry } from "~/lib/autoDsmStarterCatalog";
import { cn } from "~/lib/utils";

export function AutoDsmDesignSystemHistoryList(props: {
  readonly entries: readonly AutoDsmWorkspaceHistoryEntry[];
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly disabled?: boolean;
  readonly onSelect: (entry: AutoDsmWorkspaceHistoryEntry) => void;
  readonly className?: string;
}): JSX.Element | null {
  const { entries, isLoading, isError, disabled = false, onSelect, className } = props;

  if (!isLoading && !isError && entries.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Your design systems
      </p>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading workspaces…</p> : null}
      {isError ? (
        <p className="text-sm text-destructive">Could not load your design systems.</p>
      ) : null}
      {!isLoading && !isError && entries.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/35 p-2">
          {entries.map((entry) => {
            const starterLabel = getStarterCatalogEntry(entry.starterId).label;
            return (
              <button
                className={cn(
                  "flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left outline-none transition-colors",
                  "hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  disabled && "cursor-not-allowed opacity-50",
                )}
                disabled={disabled}
                key={entry.workspaceId}
                onClick={() => {
                  onSelect(entry);
                }}
                type="button"
              >
                <span className="font-semibold text-foreground">{entry.displayName}</span>
                <span className="text-xs text-muted-foreground">{starterLabel}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import type { JSX } from "react";

import { cn } from "~/lib/utils";

export type AutoDsmComponentPageToolbarTab = "demo" | "variants" | "code" | "documentation";

export interface AutoDsmComponentPageToolbarProps {
  readonly activeTab?: AutoDsmComponentPageToolbarTab;
  readonly onTabChange?: (tab: AutoDsmComponentPageToolbarTab) => void;
  readonly variantsEnabled?: boolean;
  readonly className?: string;
}

const TOOLBAR_TABS: ReadonlyArray<{
  readonly id: AutoDsmComponentPageToolbarTab;
  readonly label: string;
  readonly alwaysEnabled: boolean;
}> = [
  { id: "demo", label: "Demo", alwaysEnabled: true },
  { id: "variants", label: "Variants", alwaysEnabled: false },
  { id: "code", label: "Code", alwaysEnabled: true },
  { id: "documentation", label: "Documentation", alwaysEnabled: false },
];

export function AutoDsmComponentPageToolbar(props: AutoDsmComponentPageToolbarProps): JSX.Element {
  const { activeTab = "demo", onTabChange, variantsEnabled = false, className } = props;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-1 border-b border-border/60 px-3 py-2 sm:px-4",
        className,
      )}
      data-testid="autodsm-component-page-toolbar"
      role="tablist"
      aria-label="Component preview modes"
    >
      {TOOLBAR_TABS.map((tab) => {
        const selected = tab.id === activeTab;
        const enabled = tab.alwaysEnabled || (tab.id === "variants" ? variantsEnabled : false);
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={!enabled}
            onClick={() => {
              if (enabled) {
                onTabChange?.(tab.id);
              }
            }}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "bg-muted text-foreground active:bg-muted/70"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground active:bg-muted/70",
              !enabled &&
                "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground active:bg-transparent",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

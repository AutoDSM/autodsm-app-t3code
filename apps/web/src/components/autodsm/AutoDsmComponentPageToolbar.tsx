"use client";

import { cn } from "~/lib/utils";

export type AutoDsmComponentPageToolbarTab = "demo" | "variants" | "code" | "documentation";

export interface AutoDsmComponentPageToolbarProps {
  readonly activeTab?: AutoDsmComponentPageToolbarTab;
  readonly className?: string;
}

const TOOLBAR_TABS: ReadonlyArray<{
  readonly id: AutoDsmComponentPageToolbarTab;
  readonly label: string;
  readonly enabled: boolean;
}> = [
  { id: "demo", label: "Demo", enabled: true },
  { id: "variants", label: "Variants", enabled: false },
  { id: "code", label: "Code", enabled: false },
  { id: "documentation", label: "Documentation", enabled: false },
];

export function AutoDsmComponentPageToolbar(props: AutoDsmComponentPageToolbarProps) {
  const { activeTab = "demo", className } = props;

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
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={!tab.enabled}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              selected
                ? "bg-neutral-800 text-foreground"
                : "text-muted-foreground hover:text-foreground",
              !tab.enabled && "cursor-not-allowed opacity-40 hover:text-muted-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

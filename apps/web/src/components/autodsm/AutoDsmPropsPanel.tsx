"use client";

import type { ComponentPreviewPropSpec } from "@t3tools/contracts";
import type { JSX } from "react";

import { ComponentPreviewPropControl, sortPropSpecsForPanel } from "~/lib/componentPreviewProps";
import { cn } from "~/lib/utils";

export interface AutoDsmPropsPanelProps {
  readonly propSpecs: readonly ComponentPreviewPropSpec[];
  readonly propsRecord: Record<string, unknown>;
  readonly onPropsChange: (next: Record<string, unknown>) => void;
  readonly className?: string;
}

export function AutoDsmPropsPanel(props: AutoDsmPropsPanelProps): JSX.Element | null {
  const { propSpecs, propsRecord, onPropsChange, className } = props;

  if (propSpecs.length === 0) {
    return (
      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-t border-border/60 bg-background/95 p-3 sm:w-56 sm:border-t-0 sm:border-l",
          className,
        )}
        data-testid="autodsm-props-panel"
      >
        <p className="text-muted-foreground text-xs">No configurable props for this component.</p>
      </aside>
    );
  }

  const sorted = sortPropSpecsForPanel(propSpecs);

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col gap-3 overflow-y-auto border-t border-border/60 bg-background/95 p-3 sm:w-56 sm:border-t-0 sm:border-l",
        className,
      )}
      data-testid="autodsm-props-panel"
      aria-label="Component props"
    >
      <div className="text-xs font-medium text-foreground">Props</div>
      <div className="flex flex-col gap-3">
        {sorted.map((spec) => (
          <ComponentPreviewPropControl
            key={spec.name}
            spec={spec}
            value={propsRecord[spec.name]}
            compact
            onChange={(next) => {
              onPropsChange({ ...propsRecord, [spec.name]: next });
            }}
          />
        ))}
      </div>
    </aside>
  );
}

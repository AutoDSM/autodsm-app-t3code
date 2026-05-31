import type { JSX } from "react";

export interface ShadcnTooltipProps {
  readonly label?: string;
  readonly content?: string;
}

export function ShadcnTooltip(props: ShadcnTooltipProps): JSX.Element {
  const { label = "Hover me", content = "Tooltip preview" } = props;
  return (
    <div className="relative inline-block group">
      <button
        type="button"
        className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--foreground)]"
      >
        {label}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--foreground)] px-2 py-1 text-xs text-[var(--background)] opacity-100 group-hover:opacity-100"
      >
        {content}
      </span>
    </div>
  );
}

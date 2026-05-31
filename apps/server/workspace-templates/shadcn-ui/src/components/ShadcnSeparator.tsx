import type { JSX } from "react";

export interface ShadcnSeparatorProps {
  readonly orientation?: "horizontal" | "vertical";
}

export function ShadcnSeparator(props: ShadcnSeparatorProps): JSX.Element {
  const { orientation = "horizontal" } = props;
  const horizontal = orientation === "horizontal";
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={`bg-[var(--border)] ${horizontal ? "h-px w-full" : "h-full w-px"}`}
    />
  );
}

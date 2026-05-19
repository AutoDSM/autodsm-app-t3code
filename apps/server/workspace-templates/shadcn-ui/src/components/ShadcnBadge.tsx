import type { JSX } from "react";

export type ShadcnBadgeVariant = "default" | "outline" | "secondary";

export interface ShadcnBadgeProps {
  readonly label?: string;
  readonly variant?: ShadcnBadgeVariant;
}

function badgeClassName(variant: ShadcnBadgeVariant): string {
  if (variant === "outline") {
    return "preview-badge preview-badge-outline";
  }
  if (variant === "secondary") {
    return "preview-badge preview-badge-secondary";
  }
  return "preview-badge";
}

/** Shadcn-style status badge / label chip. */
export function ShadcnBadge(props: ShadcnBadgeProps): JSX.Element {
  const { label = "Beta", variant = "default" } = props;
  return <span className={badgeClassName(variant)}>{label}</span>;
}

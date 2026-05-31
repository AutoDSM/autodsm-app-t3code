import type { JSX } from "react";

export type ShadcnBadgeVariant = "default" | "outline" | "secondary" | "destructive";

export interface ShadcnBadgeProps {
  readonly label?: string;
  readonly variant?: ShadcnBadgeVariant;
}

function badgeClassName(variant: ShadcnBadgeVariant): string {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors";
  if (variant === "outline") {
    return `${base} border border-[var(--border)] text-[var(--foreground)]`;
  }
  if (variant === "secondary") {
    return `${base} bg-[var(--secondary,#f1f5f9)] text-[var(--secondary-foreground,#0f172a)]`;
  }
  if (variant === "destructive") {
    return `${base} bg-[var(--destructive,#ef4444)] text-white`;
  }
  return `${base} bg-[var(--primary)] text-[var(--primary-foreground)]`;
}

/** Shadcn-style status badge / label chip. */
export function ShadcnBadge(props: ShadcnBadgeProps): JSX.Element {
  const { label = "Beta", variant = "default" } = props;
  return <span className={badgeClassName(variant)}>{label}</span>;
}

export const ShadcnBadgeSecondary = (props: Omit<ShadcnBadgeProps, "variant">): JSX.Element => (
  <ShadcnBadge {...props} variant="secondary" label={props.label ?? "Secondary"} />
);

export const ShadcnBadgeDestructive = (props: Omit<ShadcnBadgeProps, "variant">): JSX.Element => (
  <ShadcnBadge {...props} variant="destructive" label={props.label ?? "Error"} />
);

export const ShadcnBadgeOutline = (props: Omit<ShadcnBadgeProps, "variant">): JSX.Element => (
  <ShadcnBadge {...props} variant="outline" label={props.label ?? "Outline"} />
);

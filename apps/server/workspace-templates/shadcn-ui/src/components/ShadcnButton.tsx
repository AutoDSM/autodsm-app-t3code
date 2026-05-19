import type { JSX } from "react";

export type ShadcnButtonVariant = "default" | "outline" | "ghost";

export interface ShadcnButtonProps {
  readonly label?: string;
  readonly disabled?: boolean;
  readonly variant?: ShadcnButtonVariant;
}

function buttonClassName(variant: ShadcnButtonVariant): string {
  const base =
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  if (variant === "outline") {
    return `${base} border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]`;
  }
  if (variant === "ghost") {
    return `${base} bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]`;
  }
  return `${base} bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90`;
}

/** Shadcn-style primary button (minimal inline tokens for template preview). */
export function ShadcnButton(props: ShadcnButtonProps): JSX.Element {
  const { label = "Continue", disabled = false, variant = "default" } = props;
  return (
    <button type="button" className={buttonClassName(variant)} disabled={disabled}>
      {label}
    </button>
  );
}

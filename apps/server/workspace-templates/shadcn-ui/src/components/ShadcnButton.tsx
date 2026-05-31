import type { JSX } from "react";

export type ShadcnButtonVariant =
  | "default"
  | "outline"
  | "ghost"
  | "secondary"
  | "destructive"
  | "link";

export interface ShadcnButtonProps {
  readonly label?: string;
  readonly disabled?: boolean;
  readonly variant?: ShadcnButtonVariant;
}

function buttonClassName(variant: ShadcnButtonVariant): string {
  const base =
    "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  if (variant === "outline") {
    return `${base} border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]`;
  }
  if (variant === "ghost") {
    return `${base} bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]`;
  }
  if (variant === "secondary") {
    return `${base} bg-[var(--secondary,#f1f5f9)] text-[var(--secondary-foreground,#0f172a)] hover:opacity-90`;
  }
  if (variant === "destructive") {
    return `${base} bg-[var(--destructive,#ef4444)] text-white hover:opacity-90`;
  }
  if (variant === "link") {
    return `${base} bg-transparent text-[var(--primary)] underline-offset-4 hover:underline px-1 py-0`;
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

export const ShadcnButtonOutline = (props: Omit<ShadcnButtonProps, "variant">): JSX.Element => (
  <ShadcnButton {...props} variant="outline" label={props.label ?? "Outline"} />
);

export const ShadcnButtonGhost = (props: Omit<ShadcnButtonProps, "variant">): JSX.Element => (
  <ShadcnButton {...props} variant="ghost" label={props.label ?? "Ghost"} />
);

export const ShadcnButtonSecondary = (props: Omit<ShadcnButtonProps, "variant">): JSX.Element => (
  <ShadcnButton {...props} variant="secondary" label={props.label ?? "Secondary"} />
);

export const ShadcnButtonDestructive = (props: Omit<ShadcnButtonProps, "variant">): JSX.Element => (
  <ShadcnButton {...props} variant="destructive" label={props.label ?? "Delete"} />
);

export const ShadcnButtonLink = (props: Omit<ShadcnButtonProps, "variant">): JSX.Element => (
  <ShadcnButton {...props} variant="link" label={props.label ?? "Learn more"} />
);

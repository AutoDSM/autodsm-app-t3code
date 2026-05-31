import { useState } from "react";
import type { JSX } from "react";

export type ShadcnToggleVariant = "default" | "outline";

export interface ShadcnToggleProps {
  readonly label?: string;
  readonly variant?: ShadcnToggleVariant;
  readonly defaultPressed?: boolean;
}

export function ShadcnToggle(props: ShadcnToggleProps): JSX.Element {
  const { label = "B", variant = "default", defaultPressed = false } = props;
  const [pressed, setPressed] = useState(defaultPressed);
  const base =
    "inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-md px-3 text-sm font-medium transition-colors";
  const variantClass =
    variant === "outline"
      ? "border border-[var(--border)] bg-transparent hover:bg-[var(--muted)]"
      : "bg-transparent hover:bg-[var(--muted)]";
  const pressedClass = pressed
    ? "bg-[var(--muted)] text-[var(--foreground)]"
    : "text-[var(--foreground)]";
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => setPressed((p) => !p)}
      className={`${base} ${variantClass} ${pressedClass}`}
    >
      {label}
    </button>
  );
}

export const ShadcnToggleOutline = (props: Omit<ShadcnToggleProps, "variant">): JSX.Element => (
  <ShadcnToggle {...props} variant="outline" />
);

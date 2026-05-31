import type { JSX } from "react";
import * as Toggle from "@radix-ui/react-toggle";

export interface TwToggleProps {
  readonly label?: string;
}

const baseClass =
  "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] data-[state=on]:bg-[var(--muted)] data-[state=on]:text-[var(--foreground)]";

export function TwToggle(props: TwToggleProps = {}): JSX.Element {
  const { label = "B" } = props;
  return (
    <Toggle.Root aria-label="Toggle bold" className={baseClass}>
      {label}
    </Toggle.Root>
  );
}

export function TwToggleOutline(props: TwToggleProps = {}): JSX.Element {
  const { label = "I" } = props;
  return (
    <Toggle.Root
      aria-label="Toggle italic"
      className={baseClass + " border border-[var(--border)]"}
    >
      {label}
    </Toggle.Root>
  );
}

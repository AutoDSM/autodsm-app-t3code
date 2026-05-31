import type { JSX } from "react";
import * as Checkbox from "@radix-ui/react-checkbox";

export interface TwCheckboxProps {
  readonly label?: string;
}

const indicatorClass =
  "flex h-4 w-4 items-center justify-center rounded border border-[var(--border)] bg-[var(--background)] data-[state=checked]:border-[var(--primary,#4f46e5)] data-[state=checked]:bg-[var(--primary,#4f46e5)] data-[disabled]:opacity-50";

export function TwCheckbox(props: TwCheckboxProps = {}): JSX.Element {
  const { label = "Accept terms" } = props;
  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
      <Checkbox.Root className={indicatorClass}>
        <Checkbox.Indicator className="text-white">
          <svg
            viewBox="0 0 14 14"
            width="10"
            height="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 7l3 3 5-6" />
          </svg>
        </Checkbox.Indicator>
      </Checkbox.Root>
      {label}
    </label>
  );
}

export function TwCheckboxChecked(props: TwCheckboxProps = {}): JSX.Element {
  const { label = "Enabled" } = props;
  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
      <Checkbox.Root defaultChecked className={indicatorClass}>
        <Checkbox.Indicator className="text-white">
          <svg
            viewBox="0 0 14 14"
            width="10"
            height="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 7l3 3 5-6" />
          </svg>
        </Checkbox.Indicator>
      </Checkbox.Root>
      {label}
    </label>
  );
}

export function TwCheckboxDisabled(props: TwCheckboxProps = {}): JSX.Element {
  const { label = "Disabled" } = props;
  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)] opacity-60">
      <Checkbox.Root disabled className={indicatorClass}>
        <Checkbox.Indicator className="text-white">
          <svg
            viewBox="0 0 14 14"
            width="10"
            height="10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 7l3 3 5-6" />
          </svg>
        </Checkbox.Indicator>
      </Checkbox.Root>
      {label}
    </label>
  );
}

import { useState } from "react";
import type { JSX } from "react";

export interface ShadcnCheckboxProps {
  readonly label?: string;
  readonly defaultChecked?: boolean;
  readonly disabled?: boolean;
  readonly id?: string;
}

export function ShadcnCheckbox(props: ShadcnCheckboxProps): JSX.Element {
  const {
    label = "Accept terms and conditions",
    defaultChecked = false,
    disabled = false,
    id = "shadcn-checkbox",
  } = props;
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-2 text-sm text-[var(--foreground)] ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <button
        id={id}
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => setChecked((v) => !v)}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-[var(--border)] transition-colors ${
          checked
            ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
            : "bg-[var(--background)]"
        }`}
      >
        {checked ? (
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" aria-hidden="true">
            <path
              d="M3 8l3 3 7-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </button>
      {label}
    </label>
  );
}

export const ShadcnCheckboxChecked = (
  props: Omit<ShadcnCheckboxProps, "defaultChecked">,
): JSX.Element => <ShadcnCheckbox {...props} defaultChecked />;

export const ShadcnCheckboxDisabled = (
  props: Omit<ShadcnCheckboxProps, "disabled">,
): JSX.Element => <ShadcnCheckbox {...props} disabled />;

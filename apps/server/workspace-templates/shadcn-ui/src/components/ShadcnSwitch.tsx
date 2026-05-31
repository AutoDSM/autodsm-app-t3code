import { useState } from "react";
import type { JSX } from "react";

export interface ShadcnSwitchProps {
  readonly defaultChecked?: boolean;
  readonly disabled?: boolean;
}

export function ShadcnSwitch(props: ShadcnSwitchProps): JSX.Element {
  const { defaultChecked = false, disabled = false } = props;
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => setChecked((v) => !v)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-[var(--primary)]" : "bg-[var(--muted)]"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

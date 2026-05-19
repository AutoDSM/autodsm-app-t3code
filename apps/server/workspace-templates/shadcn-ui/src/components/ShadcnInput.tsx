import type { JSX } from "react";

export interface ShadcnInputProps {
  readonly placeholder?: string;
  readonly disabled?: boolean;
}

/** Shadcn-style text input control. */
export function ShadcnInput(props: ShadcnInputProps): JSX.Element {
  const { placeholder = "Enter value…", disabled = false } = props;
  return (
    <input
      type="text"
      className="preview-input"
      placeholder={placeholder}
      disabled={disabled}
      aria-label={placeholder}
    />
  );
}

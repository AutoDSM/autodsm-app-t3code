import type { JSX } from "react";

export interface ShadcnInputProps {
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly label?: string;
  readonly id?: string;
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

export const ShadcnInputDisabled = (props: Omit<ShadcnInputProps, "disabled">): JSX.Element => (
  <ShadcnInput {...props} disabled placeholder={props.placeholder ?? "Disabled"} />
);

export const ShadcnInputWithLabel = (props: ShadcnInputProps): JSX.Element => {
  const {
    label = "Email",
    placeholder = "you@example.com",
    id = "shadcn-input-with-label",
  } = props;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium leading-none text-[var(--foreground)]">
        {label}
      </label>
      <input
        id={id}
        type="text"
        className="preview-input"
        placeholder={placeholder}
        disabled={props.disabled}
      />
    </div>
  );
};

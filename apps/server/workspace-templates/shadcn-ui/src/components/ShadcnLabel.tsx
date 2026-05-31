import type { JSX } from "react";

export interface ShadcnLabelProps {
  readonly text?: string;
  readonly required?: boolean;
}

export function ShadcnLabel(props: ShadcnLabelProps): JSX.Element {
  const { text = "Email", required = false } = props;
  return (
    <label className="text-sm font-medium text-[var(--foreground)]">
      {text}
      {required ? <span className="ml-1 text-[var(--destructive,#ef4444)]">*</span> : null}
    </label>
  );
}

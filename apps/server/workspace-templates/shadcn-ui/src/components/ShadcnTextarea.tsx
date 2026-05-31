import type { JSX } from "react";

export interface ShadcnTextareaProps {
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly label?: string;
  readonly id?: string;
  readonly rows?: number;
}

export function ShadcnTextarea(props: ShadcnTextareaProps): JSX.Element {
  const { placeholder = "Type your message here.", disabled = false, rows = 4 } = props;
  return (
    <textarea
      className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring,var(--primary))] disabled:opacity-50"
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      aria-label={placeholder}
    />
  );
}

export const ShadcnTextareaDisabled = (
  props: Omit<ShadcnTextareaProps, "disabled">,
): JSX.Element => <ShadcnTextarea {...props} disabled />;

export const ShadcnTextareaWithLabel = (props: ShadcnTextareaProps): JSX.Element => {
  const { label = "Your message", id = "shadcn-textarea-with-label" } = props;
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium leading-none text-[var(--foreground)]">
        {label}
      </label>
      <textarea
        id={id}
        className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring,var(--primary))]"
        placeholder={props.placeholder ?? "Type your message here."}
        rows={props.rows ?? 4}
      />
      <p className="text-xs text-[var(--foreground)] opacity-60">
        Your message will be copied to the support team.
      </p>
    </div>
  );
};

import type { JSX } from "react";

export interface TwTextareaProps {
  readonly placeholder?: string;
  readonly label?: string;
}

const fieldClass =
  "block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]";

export function TwTextarea(props: TwTextareaProps = {}): JSX.Element {
  const { placeholder = "Type your message here." } = props;
  return <textarea rows={4} placeholder={placeholder} className={fieldClass} />;
}

export function TwTextareaDisabled(_props: TwTextareaProps = {}): JSX.Element {
  return (
    <textarea
      rows={4}
      disabled
      defaultValue="This field is disabled."
      className={fieldClass + " cursor-not-allowed opacity-60"}
    />
  );
}

export function TwTextareaWithLabel(props: TwTextareaProps = {}): JSX.Element {
  const { label = "Your message", placeholder = "Type your message here." } = props;
  return (
    <label className="block w-full max-w-sm space-y-1 text-sm">
      <span className="font-medium text-[var(--foreground)]">{label}</span>
      <textarea rows={4} placeholder={placeholder} className={fieldClass} />
    </label>
  );
}

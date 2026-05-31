import type { JSX } from "react";

export interface TwInputProps {
  readonly label?: string;
  readonly placeholder?: string;
}

export function TwInput(props: TwInputProps = {}): JSX.Element {
  const { label = "Email", placeholder = "you@example.com" } = props;
  return (
    <label className="block text-sm font-medium text-slate-900">
      {label}
      <input
        type="email"
        placeholder={placeholder}
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
      />
    </label>
  );
}

export function TwInputDisabled(props: TwInputProps = {}): JSX.Element {
  const { placeholder = "Disabled" } = props;
  return (
    <input
      type="text"
      disabled
      placeholder={placeholder}
      className="block w-full max-w-sm cursor-not-allowed rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] opacity-60"
    />
  );
}

export function TwInputWithLabel(props: TwInputProps = {}): JSX.Element {
  const { label = "Username", placeholder = "@autodsm" } = props;
  return (
    <label className="block w-full max-w-sm space-y-1 text-sm">
      <span className="font-medium text-[var(--foreground)]">{label}</span>
      <input
        type="text"
        placeholder={placeholder}
        className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
      />
    </label>
  );
}

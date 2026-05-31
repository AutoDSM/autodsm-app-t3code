import type { JSX } from "react";

export interface TwFormProps {
  readonly title?: string;
}

export function TwForm(props: TwFormProps = {}): JSX.Element {
  const { title = "Sign in" } = props;
  return (
    <form className="w-80 space-y-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-6">
      <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
      <label className="block text-sm">
        <span className="text-[var(--foreground)]">Email</span>
        <input
          type="email"
          placeholder="you@autodsm.dev"
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
        />
      </label>
      <label className="block text-sm">
        <span className="text-[var(--foreground)]">Password</span>
        <input
          type="password"
          placeholder="••••••••"
          className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]"
        />
      </label>
      <button
        type="submit"
        className="w-full rounded-md bg-[var(--primary,#4f46e5)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
      >
        Sign in
      </button>
    </form>
  );
}

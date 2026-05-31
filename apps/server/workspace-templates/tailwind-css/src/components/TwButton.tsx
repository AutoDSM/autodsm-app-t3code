import type { JSX } from "react";

export interface TwButtonProps {
  readonly label?: string;
}

export function TwButton(props: TwButtonProps = {}): JSX.Element {
  const { label = "Get started" } = props;
  return (
    <button
      type="button"
      className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      {label}
    </button>
  );
}

export function TwButtonOutline(props: TwButtonProps = {}): JSX.Element {
  const { label = "Outline" } = props;
  return (
    <button
      type="button"
      className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
    >
      {label}
    </button>
  );
}

export function TwButtonGhost(props: TwButtonProps = {}): JSX.Element {
  const { label = "Ghost" } = props;
  return (
    <button
      type="button"
      className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]"
    >
      {label}
    </button>
  );
}

export function TwButtonSecondary(props: TwButtonProps = {}): JSX.Element {
  const { label = "Secondary" } = props;
  return (
    <button
      type="button"
      className="inline-flex items-center rounded-lg bg-[var(--muted)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:opacity-90"
    >
      {label}
    </button>
  );
}

export function TwButtonDestructive(props: TwButtonProps = {}): JSX.Element {
  const { label = "Delete" } = props;
  return (
    <button
      type="button"
      className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
    >
      {label}
    </button>
  );
}

export function TwButtonLink(props: TwButtonProps = {}): JSX.Element {
  const { label = "Learn more" } = props;
  return (
    <button
      type="button"
      className="inline-flex items-center px-1 text-sm font-semibold text-[var(--primary,#4f46e5)] underline-offset-4 hover:underline"
    >
      {label}
    </button>
  );
}

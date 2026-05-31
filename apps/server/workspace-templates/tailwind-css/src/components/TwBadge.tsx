import type { JSX } from "react";

export interface TwBadgeProps {
  readonly label?: string;
  readonly tone?: "indigo" | "green" | "red" | "amber" | "slate";
}

const TONES: Record<NonNullable<TwBadgeProps["tone"]>, string> = {
  indigo: "bg-indigo-100 text-indigo-800",
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  amber: "bg-amber-100 text-amber-800",
  slate: "bg-slate-100 text-slate-800",
};

export function TwBadge(props: TwBadgeProps = {}): JSX.Element {
  const { label = "Beta", tone = "indigo" } = props;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {label}
    </span>
  );
}

export function TwBadgeSecondary(props: TwBadgeProps = {}): JSX.Element {
  const { label = "Secondary" } = props;
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--foreground)]">
      {label}
    </span>
  );
}

export function TwBadgeDestructive(props: TwBadgeProps = {}): JSX.Element {
  const { label = "Destructive" } = props;
  return (
    <span className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-medium text-white">
      {label}
    </span>
  );
}

export function TwBadgeOutline(props: TwBadgeProps = {}): JSX.Element {
  const { label = "Outline" } = props;
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs font-medium text-[var(--foreground)]">
      {label}
    </span>
  );
}

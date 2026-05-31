import type { JSX } from "react";

export interface TwCardProps {
  readonly title?: string;
  readonly body?: string;
}

export function TwCard(props: TwCardProps = {}): JSX.Element {
  const { title = "Tailwind card", body = "Plain Tailwind utility classes." } = props;
  return (
    <div className="max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}

export function TwCardOutline(props: TwCardProps = {}): JSX.Element {
  const { title = "Outline card", body = "Bordered container with no shadow." } = props;
  return (
    <div className="max-w-sm rounded-xl border-2 border-[var(--border)] bg-[var(--background)] p-6">
      <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--foreground)] opacity-70">{body}</p>
    </div>
  );
}

export function TwCardElevated(props: TwCardProps = {}): JSX.Element {
  const { title = "Elevated card", body = "Lifted surface with a soft shadow." } = props;
  return (
    <div className="max-w-sm rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-lg">
      <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--foreground)] opacity-70">{body}</p>
    </div>
  );
}

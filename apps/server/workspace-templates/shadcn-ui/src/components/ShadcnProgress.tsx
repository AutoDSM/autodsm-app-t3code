import type { JSX } from "react";

export interface ShadcnProgressProps {
  readonly value?: number;
  readonly indeterminate?: boolean;
}

export function ShadcnProgress(props: ShadcnProgressProps): JSX.Element {
  const { indeterminate = false } = props;
  const value = Math.max(0, Math.min(100, props.value ?? 60));
  if (indeterminate) {
    return (
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]"
      >
        <div
          className="h-full w-1/3 animate-pulse rounded-full bg-[var(--primary)]"
          style={{ animation: "shadcnProgressSlide 1.2s ease-in-out infinite" }}
        />
        <style>{`@keyframes shadcnProgressSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
      </div>
    );
  }
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]"
    >
      <div
        className="h-full rounded-full bg-[var(--primary)] transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export const ShadcnProgressIndeterminate = (
  props: Omit<ShadcnProgressProps, "indeterminate">,
): JSX.Element => <ShadcnProgress {...props} indeterminate />;

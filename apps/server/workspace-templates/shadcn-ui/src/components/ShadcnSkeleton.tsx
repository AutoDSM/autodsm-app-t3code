import type { JSX } from "react";

export interface ShadcnSkeletonProps {
  readonly width?: string;
  readonly height?: string;
  readonly rounded?: boolean;
}

export function ShadcnSkeleton(props: ShadcnSkeletonProps): JSX.Element {
  const { width = "12rem", height = "1rem", rounded = true } = props;
  return (
    <div
      className={`animate-pulse bg-[var(--muted)] ${rounded ? "rounded-md" : ""}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export const ShadcnSkeletonAvatar = (): JSX.Element => (
  <div
    className="animate-pulse rounded-full bg-[var(--muted)]"
    style={{ width: "2.5rem", height: "2.5rem" }}
    aria-hidden="true"
  />
);

export const ShadcnSkeletonText = (): JSX.Element => (
  <div className="flex flex-col gap-2" aria-hidden="true">
    <div
      className="animate-pulse rounded-md bg-[var(--muted)]"
      style={{ width: "16rem", height: "0.75rem" }}
    />
    <div
      className="animate-pulse rounded-md bg-[var(--muted)]"
      style={{ width: "12rem", height: "0.75rem" }}
    />
    <div
      className="animate-pulse rounded-md bg-[var(--muted)]"
      style={{ width: "8rem", height: "0.75rem" }}
    />
  </div>
);

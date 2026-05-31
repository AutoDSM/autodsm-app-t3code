import type { JSX } from "react";

export interface TwSkeletonProps {
  readonly width?: string;
  readonly height?: string;
}

export function TwSkeleton(props: TwSkeletonProps = {}): JSX.Element {
  const { width = "16rem", height = "1.25rem" } = props;
  return <div className="animate-pulse rounded-md bg-[var(--muted)]" style={{ width, height }} />;
}

export function TwSkeletonAvatar(_props: TwSkeletonProps = {}): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--muted)]" />
      <div className="space-y-2">
        <div className="h-3 w-32 animate-pulse rounded bg-[var(--muted)]" />
        <div className="h-3 w-20 animate-pulse rounded bg-[var(--muted)]" />
      </div>
    </div>
  );
}

export function TwSkeletonText(_props: TwSkeletonProps = {}): JSX.Element {
  return (
    <div className="w-64 space-y-2">
      <div className="h-3 w-full animate-pulse rounded bg-[var(--muted)]" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--muted)]" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--muted)]" />
    </div>
  );
}

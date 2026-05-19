import type { JSX } from "react";

import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

export interface ComponentPreviewLoadingSkeletonProps {
  readonly className?: string;
  readonly overlay?: boolean;
}

/** Centered component-card skeleton for the preview viewport while analyze/bundle/prime runs. */
export function ComponentPreviewLoadingSkeleton(
  props: ComponentPreviewLoadingSkeletonProps,
): JSX.Element {
  const { className, overlay = false } = props;

  return (
    <div
      role="status"
      aria-busy="true"
      data-testid="component-preview-loading-skeleton"
      className={cn(
        "flex min-h-[240px] w-full items-center justify-center bg-background p-6",
        overlay && "absolute inset-0 z-10",
        className,
      )}
    >
      <span className="sr-only">Loading component preview</span>
      <div className="flex w-full max-w-xs flex-col gap-3 rounded-xl border border-border/40 bg-muted/15 p-5">
        <Skeleton className="h-4 w-2/5 rounded-md" />
        <Skeleton className="h-3 w-full rounded-md" />
        <Skeleton className="h-3 w-4/5 rounded-md" />
        <Skeleton className="mt-1 h-9 w-28 rounded-md" />
      </div>
    </div>
  );
}

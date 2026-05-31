import type { JSX } from "react";

import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

export type ComponentPreviewLoadingStage = "analyze" | "registry" | "bundle" | "native-attach";

export interface ComponentPreviewLoadingSkeletonProps {
  readonly className?: string | undefined;
  readonly overlay?: boolean | undefined;
  /** Milliseconds the current load has been in flight. Drives the timeout UX. */
  readonly elapsedMs?: number | undefined;
  /** What pipeline phase the loader is waiting on, used for the diagnostic line. */
  readonly stage?: ComponentPreviewLoadingStage | undefined;
  /** Multi-line diagnostic dump shown after 15s. Plain text — already redacted upstream. */
  readonly diagnosticText?: string | undefined;
  /** Called by the "Retry" button after the loader gives up at 60s. */
  readonly onRetry?: (() => void) | undefined;
}

const SLOW_THRESHOLD_MS = 15_000;
const TIMEOUT_MS = 60_000;

function describeStage(stage: ComponentPreviewLoadingStage | undefined): string {
  switch (stage) {
    case "analyze":
      return "Analyzing component source…";
    case "registry":
      return "Indexing design-system workspace…";
    case "bundle":
      return "Bundling preview…";
    case "native-attach":
      return "Mounting preview surface…";
    default:
      return "Loading component preview…";
  }
}

function formatElapsed(elapsedMs: number): string {
  const seconds = elapsedMs / 1000;
  if (seconds < 10) return `${seconds.toFixed(1)}s`;
  return `${Math.round(seconds)}s`;
}

/** Centered component-card skeleton for the preview viewport while analyze/bundle/prime runs. */
export function ComponentPreviewLoadingSkeleton(
  props: ComponentPreviewLoadingSkeletonProps,
): JSX.Element {
  const { className, overlay = false, elapsedMs = 0, stage, diagnosticText, onRetry } = props;

  const isSlow = elapsedMs >= SLOW_THRESHOLD_MS;
  const isTimedOut = elapsedMs >= TIMEOUT_MS;

  // Once past the timeout we switch from "loading" to "error" so the user sees
  // a clear failure state with retry, not an indefinite spinner.
  if (isTimedOut) {
    return (
      <div
        role="alert"
        data-testid="component-preview-loading-timeout"
        className={cn(
          "flex min-h-[240px] w-full items-center justify-center bg-background p-6",
          overlay && "absolute inset-0 z-10",
          className,
        )}
      >
        <div className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="space-y-1">
            <p className="font-semibold text-destructive text-sm">
              Preview took too long ({formatElapsed(elapsedMs)})
            </p>
            <p className="text-muted-foreground text-xs">
              {describeStage(stage)} never finished. The workspace build or preview sidecar may have
              failed silently.
            </p>
          </div>
          {diagnosticText ? (
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-background/60 p-2 font-mono text-[10px] text-muted-foreground">
              {diagnosticText}
            </pre>
          ) : null}
          {onRetry ? (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={onRetry}>
                Retry preview
              </Button>
              <span className="text-[10px] text-muted-foreground">
                Reloads analyze + bundle pipelines for this component.
              </span>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      data-testid="component-preview-loading-skeleton"
      data-stage={stage ?? "unknown"}
      data-elapsed-ms={elapsedMs}
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
        {isSlow ? (
          <div
            data-testid="component-preview-loading-slow"
            className="mt-1 space-y-2 border-t border-border/40 pt-3 text-[10px] text-muted-foreground"
          >
            <p>
              {describeStage(stage)} ({formatElapsed(elapsedMs)})
            </p>
            {diagnosticText ? (
              <details className="cursor-pointer">
                <summary className="select-none">Show diagnostics</summary>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-background/60 p-2 font-mono text-[10px] text-muted-foreground">
                  {diagnosticText}
                </pre>
              </details>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

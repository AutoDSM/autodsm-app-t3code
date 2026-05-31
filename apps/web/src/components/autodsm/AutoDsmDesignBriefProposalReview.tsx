"use client";

import type { JSX } from "react";
import { useMemo, useState } from "react";

import type {
  AutoDsmDesignBriefApplyResult,
  AutoDsmDesignBriefOperation,
  AutoDsmDesignBriefProposal,
  EnvironmentId,
} from "@t3tools/contracts";

import { autodsmApplyDesignBriefProposal } from "~/lib/autodsmWorkspaceReactQuery";
import { cn } from "~/lib/utils";

export interface AutoDsmDesignBriefProposalReviewProps {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly proposal: AutoDsmDesignBriefProposal;
  /** Called after the server returns a successful (or partially skipped) apply. */
  readonly onApplied: (result: AutoDsmDesignBriefApplyResult) => void;
  /** Re-run propose when the proposal goes stale (invalidation key drift). */
  readonly onRequestReanalyze?: () => void;
  /** Cancel — close the review without applying. */
  readonly onCancel: () => void;
}

const KIND_LABELS: Record<AutoDsmDesignBriefOperation["kind"], string> = {
  add: "Add",
  update: "Update",
  remove: "Remove",
};

const KIND_BADGE: Record<AutoDsmDesignBriefOperation["kind"], string> = {
  add: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  update: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  remove: "bg-destructive/15 text-destructive",
};

const CATEGORY_ORDER: ReadonlyArray<AutoDsmDesignBriefOperation["category"]> = [
  "color",
  "typography",
  "spacing",
  "radius",
  "shadow",
  "motion",
  "icon",
];

/**
 * Diff viewer + approval surface for a single design-brief proposal. Renders
 * the proposed operations grouped by category with a checkbox per row and
 * bulk "select all / by category" controls.
 *
 * On Apply: posts only the checked `opId`s to the server (single batched
 * write). The result includes a `skipped[]` array — surfaced inline as a
 * toast-style banner. The special `stale-base` reason offers a one-click
 * "re-analyze" if the parent provided `onRequestReanalyze`.
 */
export function AutoDsmDesignBriefProposalReview(
  props: AutoDsmDesignBriefProposalReviewProps,
): JSX.Element {
  const { environmentId, cwd, proposal, onApplied, onRequestReanalyze, onCancel } = props;
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(proposal.operations.map((op) => op.opId)),
  );
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AutoDsmDesignBriefApplyResult | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, AutoDsmDesignBriefOperation[]>();
    for (const op of proposal.operations) {
      const list = map.get(op.category) ?? [];
      list.push(op);
      map.set(op.category, list);
    }
    return CATEGORY_ORDER.flatMap((category) => {
      const ops = map.get(category);
      return ops ? [{ category, ops }] : [];
    });
  }, [proposal.operations]);

  const allOpIds = useMemo(() => proposal.operations.map((op) => op.opId), [proposal.operations]);
  const allSelected = selected.size === allOpIds.length && allOpIds.length > 0;
  const noneSelected = selected.size === 0;

  const toggle = (opId: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(opId)) next.delete(opId);
      else next.add(opId);
      return next;
    });
  };

  const toggleAll = (): void => {
    setSelected(allSelected ? new Set() : new Set(allOpIds));
  };

  const toggleCategory = (category: string): void => {
    const opsInCategory = proposal.operations.filter((op) => op.category === category);
    const allInCategorySelected = opsInCategory.every((op) => selected.has(op.opId));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const op of opsInCategory) {
        if (allInCategorySelected) next.delete(op.opId);
        else next.add(op.opId);
      }
      return next;
    });
  };

  const onApply = async (): Promise<void> => {
    setApplyError(null);
    setIsApplying(true);
    try {
      const result = await autodsmApplyDesignBriefProposal({
        environmentId,
        cwd,
        proposalId: proposal.proposalId,
        acceptedOpIds: Array.from(selected),
      });
      setLastResult(result);
      onApplied(result);
    } catch (cause) {
      setApplyError(cause instanceof Error ? cause.message : "Failed to apply proposal.");
    } finally {
      setIsApplying(false);
    }
  };

  const staleBase = lastResult?.skipped.some((s) => s.reason === "stale-base") ?? false;

  return (
    <div className="flex flex-col gap-4">
      {proposal.summary.trim().length > 0 ? (
        <p className="text-sm text-muted-foreground">{proposal.summary}</p>
      ) : null}

      {proposal.operations.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card/35 px-4 py-6 text-center text-sm text-muted-foreground">
          The brief didn&apos;t suggest any token changes. Try editing the brief and re-uploading.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs">
            <button
              className="font-medium text-primary hover:underline"
              onClick={toggleAll}
              type="button"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
            <span className="text-muted-foreground">
              {selected.size} of {proposal.operations.length} selected
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {grouped.map(({ category, ops }) => {
              const allInCategorySelected = ops.every((op) => selected.has(op.opId));
              return (
                <div
                  className="overflow-hidden rounded-xl border border-border/60 bg-card/35"
                  key={category}
                >
                  <div className="flex items-center justify-between border-b border-border/60 bg-card/55 px-3 py-2">
                    <h3 className="text-sm font-semibold capitalize text-foreground">
                      {category}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({ops.length})
                      </span>
                    </h3>
                    <button
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => toggleCategory(category)}
                      type="button"
                    >
                      {allInCategorySelected ? "Deselect group" : "Select group"}
                    </button>
                  </div>
                  <ul className="divide-y divide-border/40">
                    {ops.map((op) => (
                      <li className="flex items-start gap-3 px-3 py-2.5 text-sm" key={op.opId}>
                        <input
                          checked={selected.has(op.opId)}
                          className="mt-1 size-4 rounded border-border accent-primary"
                          onChange={() => toggle(op.opId)}
                          type="checkbox"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-xs font-semibold",
                                KIND_BADGE[op.kind],
                              )}
                            >
                              {KIND_LABELS[op.kind]}
                            </span>
                            <span className="truncate font-medium text-foreground">
                              {op.tokenName}
                            </span>
                          </div>
                          {op.kind !== "remove" && (op.currentValue || op.proposedValue) ? (
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                              {op.currentValue ? (
                                <code className="rounded bg-muted px-1 py-0.5 text-muted-foreground line-through">
                                  {op.currentValue}
                                </code>
                              ) : (
                                <span className="text-muted-foreground">new</span>
                              )}
                              <span aria-hidden className="text-muted-foreground">
                                →
                              </span>
                              {op.proposedValue ? (
                                <code className="rounded bg-primary/10 px-1 py-0.5 text-foreground">
                                  {op.proposedValue}
                                </code>
                              ) : null}
                            </div>
                          ) : null}
                          {op.kind === "remove" && op.currentValue ? (
                            <div className="mt-1 text-xs">
                              <code className="rounded bg-muted px-1 py-0.5 text-muted-foreground line-through">
                                {op.currentValue}
                              </code>
                            </div>
                          ) : null}
                          {op.rationale ? (
                            <p className="mt-1 text-xs text-muted-foreground">{op.rationale}</p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </>
      )}

      {applyError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {applyError}
        </div>
      ) : null}

      {lastResult ? (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            staleBase
              ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
          )}
        >
          {staleBase ? (
            <div className="flex flex-col gap-2">
              <span>
                The token store has changed since this proposal was generated. Re-analyze the brief
                to refresh proposed values.
              </span>
              {onRequestReanalyze ? (
                <button
                  className="self-start text-xs font-semibold underline"
                  onClick={onRequestReanalyze}
                  type="button"
                >
                  Re-analyze brief
                </button>
              ) : null}
            </div>
          ) : (
            <span>
              Applied {lastResult.appliedCount} token{lastResult.appliedCount === 1 ? "" : "s"}
              {lastResult.skipped.length > 0
                ? ` · skipped ${lastResult.skipped.length} (${lastResult.skipped
                    .map((s) => s.reason)
                    .join(", ")})`
                : ""}
              .
            </span>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          className={cn(
            "h-10 rounded-xl border border-border/60 bg-card/45 px-4 text-sm font-medium",
            "outline-none transition-colors hover:bg-card/65",
            "focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className={cn(
            "h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm",
            "outline-none transition-colors hover:bg-primary/90",
            "focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:cursor-not-allowed disabled:opacity-40",
          )}
          disabled={noneSelected || isApplying}
          onClick={() => {
            void onApply();
          }}
          type="button"
        >
          {isApplying
            ? "Applying…"
            : selected.size === allOpIds.length
              ? "Apply all"
              : `Apply ${selected.size} selected`}
        </button>
      </div>
    </div>
  );
}

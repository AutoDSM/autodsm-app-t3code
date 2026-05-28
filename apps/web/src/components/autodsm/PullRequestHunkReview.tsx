"use client";

import { parsePatchFiles } from "@pierre/diffs";
import { FileDiff, type FileDiffMetadata } from "@pierre/diffs/react";
import type { AutoDsmChangeHunk, AutoDsmChangeHunkDecision } from "@t3tools/contracts";
import { CheckIcon, Trash2Icon, XIcon } from "lucide-react";
import { type JSX, useMemo } from "react";

import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { Toggle, ToggleGroup } from "~/components/ui/toggle-group";
import { useTheme } from "~/hooks/useTheme";
import { resolveDiffThemeName } from "~/lib/diffRendering";
import {
  allHunksDecided,
  groupHunksByFile,
  previewDisposition,
  summarizeHunkDecisions,
} from "~/lib/pullRequestHunkReview.logic";
import { cn } from "~/lib/utils";

const DECISIONS: ReadonlyArray<{
  readonly value: AutoDsmChangeHunkDecision;
  readonly label: string;
  readonly icon: typeof CheckIcon;
}> = [
  { value: "approved", label: "Approve", icon: CheckIcon },
  { value: "rejected", label: "Reject", icon: XIcon },
  { value: "discarded", label: "Discard", icon: Trash2Icon },
];

const DISPOSITION_COPY: Record<
  ReturnType<typeof previewDisposition>,
  { readonly label: string; readonly hint: string }
> = {
  empty: { label: "No changes", hint: "This changeset has no reviewable hunks." },
  accepted: { label: "Keep all", hint: "Every hunk stays as written." },
  reverted: { label: "Revert all", hint: "Every hunk reverts to its pre-edit content." },
  partial: { label: "Partial", hint: "Rejected/discarded hunks revert; the rest stay." },
};

export interface PullRequestHunkReviewProps {
  readonly hunks: readonly AutoDsmChangeHunk[];
  readonly onDecide: (hunkId: string, decision: AutoDsmChangeHunkDecision) => void;
  readonly onSetAll: (decision: AutoDsmChangeHunkDecision) => void;
  readonly onApply: () => void;
  readonly isApplying?: boolean;
  readonly applyError?: string | null;
}

function parseHunkFileDiff(patch: string): FileDiffMetadata | null {
  try {
    return parsePatchFiles(patch.replace(/\r\n/g, "\n"))[0]?.files[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Hunk-level review surface: renders each hunk of a ChangeSet via the same
 * `@pierre/diffs` `FileDiff` renderer the chat `DiffPanel` uses, with a
 * per-hunk Approve / Reject / Discard control and an Apply action. Presentational
 * only — decision state and persistence live in the container.
 */
export function PullRequestHunkReview(props: PullRequestHunkReviewProps): JSX.Element {
  const { hunks, onDecide, onSetAll, onApply, isApplying, applyError } = props;
  const { resolvedTheme } = useTheme();
  const groups = useMemo(() => groupHunksByFile(hunks), [hunks]);
  const summary = useMemo(() => summarizeHunkDecisions(hunks), [hunks]);
  const disposition = previewDisposition(hunks);
  const decided = allHunksDecided(hunks);

  if (hunks.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
        No reviewable hunks. Capture the latest edits to populate this changeset.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{summary.total}</span> hunk
          {summary.total === 1 ? "" : "s"} · {summary.approved} approved · {summary.rejected}{" "}
          rejected · {summary.discarded} discarded · {summary.pending} pending
        </div>
        <div className="flex items-center gap-1.5">
          <Button type="button" variant="outline" size="xs" onClick={() => onSetAll("approved")}>
            Approve all
          </Button>
          <Button type="button" variant="outline" size="xs" onClick={() => onSetAll("rejected")}>
            Reject all
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.filePath} className="space-y-2">
            <p className="font-mono text-[11px] text-muted-foreground/90">{group.filePath}</p>
            {group.hunks.map((hunk) => {
              const fileDiff = parseHunkFileDiff(hunk.patch);
              return (
                <div
                  key={hunk.id}
                  className={cn(
                    "rounded-lg border bg-card/40",
                    hunk.decision === "approved" && "border-success/40",
                    (hunk.decision === "rejected" || hunk.decision === "discarded") &&
                      "border-destructive/40",
                    hunk.decision === "pending" && "border-border",
                  )}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 px-2 py-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
                    </span>
                    <ToggleGroup
                      className="shrink-0"
                      variant="outline"
                      size="xs"
                      value={[hunk.decision]}
                      onValueChange={(value) => {
                        const next = value[0];
                        if (next === "approved" || next === "rejected" || next === "discarded") {
                          onDecide(hunk.id, next);
                        }
                      }}
                    >
                      {DECISIONS.map(({ value, label, icon: Icon }) => (
                        <Toggle key={value} aria-label={label} value={value} title={label}>
                          <Icon className="size-3" />
                        </Toggle>
                      ))}
                    </ToggleGroup>
                  </div>
                  <div className="overflow-x-auto p-1">
                    {fileDiff ? (
                      <FileDiff
                        fileDiff={fileDiff}
                        options={{
                          diffStyle: "unified",
                          lineDiffType: "none",
                          theme: resolveDiffThemeName(resolvedTheme),
                          themeType: resolvedTheme,
                        }}
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap p-2 font-mono text-[10px] text-muted-foreground">
                        {hunk.patch}
                      </pre>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {applyError ? <p className="text-xs text-destructive">{applyError}</p> : null}

      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <span
          className="text-[11px] text-muted-foreground"
          title={DISPOSITION_COPY[disposition].hint}
        >
          On apply:{" "}
          <span className="font-medium text-foreground">{DISPOSITION_COPY[disposition].label}</span>
        </span>
        <Button type="button" size="sm" onClick={onApply} disabled={isApplying || !decided}>
          {isApplying ? (
            <span className="flex items-center gap-1.5">
              <Spinner className="size-3.5" />
              Applying…
            </span>
          ) : (
            "Apply decisions"
          )}
        </Button>
      </div>
    </div>
  );
}

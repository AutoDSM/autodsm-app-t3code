"use client";

import type { AutoDsmChangeHunk, AutoDsmChangeSet, EnvironmentId } from "@t3tools/contracts";
import { useMutation } from "@tanstack/react-query";
import { type JSX, useEffect, useState } from "react";

import { PullRequestHunkReview } from "~/components/autodsm/PullRequestHunkReview";
import {
  autodsmApplyChangeSetDecisions,
  autodsmSetHunkDecisions,
} from "~/lib/autodsmWorkspaceReactQuery";
import { applyHunkDecision, setAllHunkDecisions } from "~/lib/pullRequestHunkReview.logic";

export interface AutoDsmHunkReviewPanelProps {
  readonly environmentId: EnvironmentId;
  readonly cwd: string;
  readonly changeSet: AutoDsmChangeSet;
  /** Fired after decisions are persisted and applied (e.g. to refetch lists). */
  readonly onApplied?: (disposition: string) => void;
}

/**
 * Container for {@link PullRequestHunkReview}: holds local per-hunk decision
 * state, persists it via `autodsm.changeSetSetHunkDecisions`, then applies via
 * `autodsm.changeSetApplyDecisions` (reverting rejected/discarded hunks on disk).
 */
export function AutoDsmHunkReviewPanel(props: AutoDsmHunkReviewPanelProps): JSX.Element {
  const { environmentId, cwd, changeSet, onApplied } = props;
  const [hunks, setHunks] = useState<readonly AutoDsmChangeHunk[]>(changeSet.hunks ?? []);

  // Reset local decisions when a different changeset is shown.
  useEffect(() => {
    setHunks(changeSet.hunks ?? []);
  }, [changeSet.id, changeSet.hunks]);

  const applyMutation = useMutation({
    mutationFn: async () => {
      await autodsmSetHunkDecisions({
        environmentId,
        cwd,
        changeSetId: changeSet.id,
        decisions: hunks.map((h) => ({ hunkId: h.id, decision: h.decision })),
      });
      return autodsmApplyChangeSetDecisions({
        environmentId,
        cwd,
        changeSetId: changeSet.id,
      });
    },
    onSuccess: (result) => {
      onApplied?.(result.outcome?.disposition ?? "accepted");
    },
  });

  return (
    <PullRequestHunkReview
      hunks={hunks}
      onDecide={(hunkId, decision) => setHunks((prev) => applyHunkDecision(prev, hunkId, decision))}
      onSetAll={(decision) => setHunks((prev) => setAllHunkDecisions(prev, decision))}
      onApply={() => applyMutation.mutate()}
      isApplying={applyMutation.isPending}
      applyError={
        applyMutation.isError
          ? applyMutation.error instanceof Error
            ? applyMutation.error.message
            : "Failed to apply hunk decisions."
          : null
      }
    />
  );
}

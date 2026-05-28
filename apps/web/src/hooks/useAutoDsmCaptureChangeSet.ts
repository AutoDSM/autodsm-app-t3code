"use client";

import type { AutoDsmChangeSet, EnvironmentId, ThreadId } from "@t3tools/contracts";
import { useCallback, useMemo } from "react";

import { ensureEnvironmentApi } from "~/environmentApi";
import { autodsmCreateChangeSetFromTurnDiff } from "~/lib/autodsmWorkspaceReactQuery";
import { inferCheckpointTurnCountByTurnId } from "~/session-logic";
import { createThreadSelectorAcrossEnvironments } from "~/storeSelectors";
import { useStore } from "~/store";

export interface UseAutoDsmCaptureChangeSetInput {
  readonly environmentId: EnvironmentId | null;
  readonly cwd: string | null;
  readonly threadId: ThreadId | null;
}

export interface UseAutoDsmCaptureChangeSetResult {
  /** True when the thread has at least one completed turn to diff. */
  readonly canCapture: boolean;
  /**
   * Fetch the component thread's cumulative diff and persist it as a reviewable
   * ChangeSet (ops + pending hunks). Returns the new ChangeSet, or null when
   * there is nothing to capture.
   */
  readonly capture: () => Promise<AutoDsmChangeSet | null>;
}

/**
 * On-demand capture of a component thread's edits as a hunk-reviewable
 * ChangeSet. Reuses the same checkpoint-turn-count inference the chat
 * `DiffPanel` uses, fetches the full-thread diff with `ignoreWhitespace: false`
 * (so it round-trips for decision-respecting apply), and hands it to
 * `autodsm.changeSetCreateFromTurnDiff`.
 */
export function useAutoDsmCaptureChangeSet(
  input: UseAutoDsmCaptureChangeSetInput,
): UseAutoDsmCaptureChangeSetResult {
  const selector = useMemo(
    () => createThreadSelectorAcrossEnvironments(input.threadId),
    [input.threadId],
  );
  const thread = useStore(selector);

  const toTurnCount = useMemo(() => {
    if (!thread) {
      return 0;
    }
    const inferred = inferCheckpointTurnCountByTurnId(thread.turnDiffSummaries);
    const counts = thread.turnDiffSummaries
      .map((summary) => summary.checkpointTurnCount ?? inferred[summary.turnId])
      .filter((value): value is number => typeof value === "number");
    return counts.length > 0 ? Math.max(...counts) : 0;
  }, [thread]);

  const { environmentId, cwd, threadId } = input;
  const capture = useCallback(async () => {
    if (!environmentId || !cwd || !threadId || toTurnCount <= 0) {
      return null;
    }
    const api = ensureEnvironmentApi(environmentId);
    const result = await api.orchestration.getFullThreadDiff({
      threadId,
      toTurnCount,
      ignoreWhitespace: false,
    });
    if (!result.diff.trim()) {
      return null;
    }
    return autodsmCreateChangeSetFromTurnDiff({ environmentId, cwd, threadId, diff: result.diff });
  }, [environmentId, cwd, threadId, toTurnCount]);

  return { canCapture: toTurnCount > 0, capture };
}

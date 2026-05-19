"use client";

import type { EnvironmentId } from "@t3tools/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { invalidateComponentPreviewQueries } from "~/lib/invalidateComponentPreviewQueries";

const ACTIVE_TURN_POLL_MS = 1500;

export interface UseAutoDsmComponentPreviewRefreshInput {
  readonly componentPath: string | null;
  readonly environmentId: EnvironmentId | null;
  readonly projectCwd: string | null;
  readonly latestTurnSettled: boolean;
  readonly latestTurnCompletedAt: string | null | undefined;
  readonly isAgentTurnActive: boolean;
}

export function useAutoDsmComponentPreviewRefresh(
  input: UseAutoDsmComponentPreviewRefreshInput,
): void {
  const queryClient = useQueryClient();
  const lastRefreshedAtRef = useRef(0);

  useEffect(() => {
    if (!input.componentPath?.trim()) {
      return;
    }
    if (!input.latestTurnSettled || !input.latestTurnCompletedAt) {
      return;
    }

    const completedAt = Date.parse(input.latestTurnCompletedAt);
    if (Number.isNaN(completedAt) || completedAt <= lastRefreshedAtRef.current) {
      return;
    }

    lastRefreshedAtRef.current = completedAt;
    invalidateComponentPreviewQueries(queryClient, {
      environmentId: input.environmentId,
      projectCwd: input.projectCwd,
    });
  }, [
    input.componentPath,
    input.environmentId,
    input.latestTurnCompletedAt,
    input.latestTurnSettled,
    input.projectCwd,
    queryClient,
  ]);

  useEffect(() => {
    if (!input.componentPath?.trim() || !input.isAgentTurnActive) {
      return;
    }

    const intervalId = window.setInterval(() => {
      invalidateComponentPreviewQueries(queryClient, {
        environmentId: input.environmentId,
        projectCwd: input.projectCwd,
      });
    }, ACTIVE_TURN_POLL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    input.componentPath,
    input.environmentId,
    input.isAgentTurnActive,
    input.projectCwd,
    queryClient,
  ]);
}

/** @deprecated Use {@link useAutoDsmComponentPreviewRefresh} */
export function useAutoDsmComponentPreviewRefreshOnTurnComplete(
  input: Omit<UseAutoDsmComponentPreviewRefreshInput, "isAgentTurnActive"> & {
    readonly isAgentTurnActive?: boolean;
  },
): void {
  useAutoDsmComponentPreviewRefresh({
    ...input,
    isAgentTurnActive: input.isAgentTurnActive ?? false,
  });
}

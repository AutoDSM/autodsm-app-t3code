"use client";

import type { EnvironmentId, OrchestrationLatestTurn, ThreadId, TurnId } from "@t3tools/contracts";
import { useEffect, useRef } from "react";

import { ensureEnvironmentApi } from "~/environmentApi";
import {
  extractTurnConversationMessages,
  turnConversationSyncKey,
} from "~/lib/autoDsmComponentConversationSync";
import type { ChatMessage } from "~/types";

export interface UseAutoDsmComponentConversationSyncInput {
  readonly componentPath: string | null;
  readonly environmentId: EnvironmentId | null;
  readonly projectCwd: string | null;
  readonly threadId: ThreadId | null;
  readonly latestTurn: Pick<OrchestrationLatestTurn, "turnId" | "assistantMessageId"> | null;
  readonly latestTurnSettled: boolean;
  readonly latestTurnCompletedAt: string | null | undefined;
  readonly messages: readonly Pick<
    ChatMessage,
    "id" | "role" | "text" | "turnId" | "createdAt" | "completedAt" | "streaming"
  >[];
}

export function useAutoDsmComponentConversationSync(
  input: UseAutoDsmComponentConversationSyncInput,
): void {
  const lastSyncedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !input.componentPath?.trim() ||
      !input.projectCwd ||
      !input.environmentId ||
      !input.threadId
    ) {
      return;
    }
    if (!input.latestTurnSettled || !input.latestTurnCompletedAt || !input.latestTurn) {
      return;
    }

    const syncKey = turnConversationSyncKey(input.latestTurn.turnId, input.latestTurnCompletedAt);
    if (!syncKey || syncKey === lastSyncedKeyRef.current) {
      return;
    }

    const turnMessages = extractTurnConversationMessages(input.messages, input.latestTurn);
    if (turnMessages.length === 0) {
      return;
    }

    lastSyncedKeyRef.current = syncKey;
    const api = ensureEnvironmentApi(input.environmentId);
    if (!api) {
      return;
    }

    void (async () => {
      for (const message of turnMessages) {
        await api.autodsm.appendComponentConversation({
          cwd: input.projectCwd!,
          componentPath: input.componentPath!,
          threadId: input.threadId!,
          message: {
            role: message.role,
            text: message.text,
            threadId: input.threadId!,
            turnId: input.latestTurn!.turnId as TurnId,
            createdAt: message.createdAt,
          },
        });
      }
    })().catch(() => {
      lastSyncedKeyRef.current = null;
    });
  }, [
    input.componentPath,
    input.environmentId,
    input.latestTurn,
    input.latestTurnCompletedAt,
    input.latestTurnSettled,
    input.messages,
    input.projectCwd,
    input.threadId,
  ]);
}

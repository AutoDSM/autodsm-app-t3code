import type { MessageId, OrchestrationLatestTurn, TurnId } from "@t3tools/contracts";

import type { ChatMessage } from "~/types";

export interface TurnConversationMessage {
  readonly role: "user" | "assistant";
  readonly text: string;
  readonly createdAt: string;
}

export function extractTurnConversationMessages(
  messages: readonly Pick<
    ChatMessage,
    "id" | "role" | "text" | "turnId" | "createdAt" | "completedAt" | "streaming"
  >[],
  latestTurn: Pick<OrchestrationLatestTurn, "turnId" | "assistantMessageId">,
): TurnConversationMessage[] {
  const assistant =
    (latestTurn.assistantMessageId
      ? messages.find((message) => message.id === latestTurn.assistantMessageId)
      : null) ??
    [...messages]
      .toReversed()
      .find((message) => message.role === "assistant" && message.turnId === latestTurn.turnId);

  if (!assistant) {
    return [];
  }

  const assistantIndex = messages.findIndex((message) => message.id === assistant.id);
  const user =
    messages
      .slice(0, assistantIndex >= 0 ? assistantIndex : messages.length)
      .toReversed()
      .find((message) => message.role === "user" && message.text.trim().length > 0) ??
    messages.find(
      (message) =>
        message.role === "user" &&
        message.turnId === latestTurn.turnId &&
        message.text.trim().length > 0,
    );

  const result: TurnConversationMessage[] = [];
  if (user) {
    result.push({
      role: "user",
      text: user.text.trim(),
      createdAt: user.createdAt,
    });
  }

  const assistantText = assistant.text.trim();
  if (assistantText.length > 0 || !assistant.streaming) {
    result.push({
      role: "assistant",
      text: assistantText.length > 0 ? assistantText : "(completed without text)",
      createdAt: assistant.completedAt ?? assistant.createdAt,
    });
  }

  return result;
}

export function turnConversationSyncKey(
  turnId: TurnId | null | undefined,
  completedAt: string | null | undefined,
): string | null {
  if (!turnId || !completedAt) {
    return null;
  }
  return `${turnId}:${completedAt}`;
}

export function isAssistantMessageForTurn(
  messageId: MessageId,
  latestTurn: Pick<OrchestrationLatestTurn, "turnId" | "assistantMessageId"> | null,
): boolean {
  if (!latestTurn) {
    return false;
  }
  return latestTurn.assistantMessageId === messageId;
}

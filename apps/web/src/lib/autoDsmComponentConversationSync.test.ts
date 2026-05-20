import type { MessageId, OrchestrationLatestTurn, TurnId } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import {
  extractTurnConversationMessages,
  turnConversationSyncKey,
} from "./autoDsmComponentConversationSync";

describe("autoDsmComponentConversationSync", () => {
  it("extracts user and assistant messages for a completed turn", () => {
    const turnId = "turn-1" as TurnId;
    const latestTurn: Pick<OrchestrationLatestTurn, "turnId" | "assistantMessageId"> = {
      turnId,
      assistantMessageId: "assistant-1" as MessageId,
    };
    const messages = extractTurnConversationMessages(
      [
        {
          id: "user-1" as MessageId,
          role: "user",
          text: " Increase spacing ",
          turnId,
          createdAt: "2026-01-01T00:00:00.000Z",
          completedAt: undefined,
          streaming: false,
        },
        {
          id: "assistant-1" as MessageId,
          role: "assistant",
          text: "Done.",
          turnId,
          createdAt: "2026-01-01T00:01:00.000Z",
          completedAt: "2026-01-01T00:01:30.000Z",
          streaming: false,
        },
      ],
      latestTurn,
    );

    expect(messages).toEqual([
      {
        role: "user",
        text: "Increase spacing",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        role: "assistant",
        text: "Done.",
        createdAt: "2026-01-01T00:01:30.000Z",
      },
    ]);
  });

  it("builds a stable sync key from turn id and completion time", () => {
    expect(turnConversationSyncKey("turn-1" as TurnId, "2026-01-01T00:00:00.000Z")).toBe(
      "turn-1:2026-01-01T00:00:00.000Z",
    );
    expect(turnConversationSyncKey(null, "2026-01-01T00:00:00.000Z")).toBeNull();
  });
});

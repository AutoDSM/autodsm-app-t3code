// @effect-diagnostics nodeBuiltinImport:off
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { ThreadId, TurnId } from "@t3tools/contracts";
import { describe, expect, it } from "vitest";

import { appendComponentConversation, loadComponentConversation } from "./conversationStore.ts";

function makeSystemCwd(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "autodsm-conversation-"));
  const systemDir = path.join(root, "system");
  fs.mkdirSync(systemDir, { recursive: true });
  return systemDir;
}

describe("conversationStore", () => {
  it("creates and appends per-component conversation history", () => {
    const cwd = makeSystemCwd();
    const threadId = "11111111-1111-4111-8111-111111111111" as ThreadId;
    const turnId = "turn-1" as TurnId;

    appendComponentConversation({
      cwd,
      componentPath: "/src/components/Button.tsx",
      threadId,
      message: {
        role: "user",
        text: "Make the button larger",
        threadId,
        turnId,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    });
    appendComponentConversation({
      cwd,
      componentPath: "/src/components/Button.tsx",
      threadId,
      message: {
        role: "assistant",
        text: "Updated padding and font size.",
        threadId,
        turnId,
        createdAt: "2026-01-01T00:01:00.000Z",
      },
    });

    const conversation = loadComponentConversation(cwd, "/src/components/Button.tsx");
    expect(conversation?.messages).toHaveLength(2);
    expect(conversation?.threadIds).toEqual([threadId]);
  });
});

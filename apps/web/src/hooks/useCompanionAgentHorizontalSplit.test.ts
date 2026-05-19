import { describe, expect, it } from "vitest";

import {
  CHAT_COMPANION_AGENT_SPLIT_STORAGE_KEY,
  CHAT_LEFT_SIDEBAR_REFERENCE_WIDTH_REM,
  CHAT_PREVIEW_AGENT_DEFAULT_RIGHT_WIDTH_REM,
  CHAT_PREVIEW_AGENT_SPLIT_STORAGE_KEY,
} from "./useCompanionAgentHorizontalSplit";

describe("useCompanionAgentHorizontalSplit preview-agent settings", () => {
  it("persists preview-agent split separately from legacy companion split", () => {
    expect(CHAT_PREVIEW_AGENT_SPLIT_STORAGE_KEY).not.toBe(CHAT_COMPANION_AGENT_SPLIT_STORAGE_KEY);
    expect(CHAT_PREVIEW_AGENT_SPLIT_STORAGE_KEY).toBe("chat.preview-agent.split-right-width-px-v2");
  });

  it("defaults coding agent width slightly wider than the left sidebar reference", () => {
    expect(CHAT_PREVIEW_AGENT_DEFAULT_RIGHT_WIDTH_REM).toBeGreaterThan(
      CHAT_LEFT_SIDEBAR_REFERENCE_WIDTH_REM,
    );
    expect(CHAT_PREVIEW_AGENT_DEFAULT_RIGHT_WIDTH_REM - CHAT_LEFT_SIDEBAR_REFERENCE_WIDTH_REM).toBe(
      2,
    );
  });
});

import { describe, expect, it } from "vitest";

import {
  buildPreviewAgentGridTemplateColumns,
  CHAT_COMPANION_AGENT_SPLIT_STORAGE_KEY,
  CHAT_LEFT_SIDEBAR_REFERENCE_WIDTH_REM,
  CHAT_PREVIEW_AGENT_DEFAULT_RIGHT_WIDTH_REM,
  CHAT_PREVIEW_AGENT_SPLIT_STORAGE_KEY,
  clampRightWidthForPane,
  PREVIEW_AGENT_MIN_PREVIEW_WIDTH_REM,
  PREVIEW_AGENT_MIN_RIGHT_WIDTH_REM,
  previewAgentRemToPx,
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
      4,
    );
  });
});

describe("clampRightWidthForPane", () => {
  const defaultPx = previewAgentRemToPx(CHAT_PREVIEW_AGENT_DEFAULT_RIGHT_WIDTH_REM);
  const minAgentPx = previewAgentRemToPx(PREVIEW_AGENT_MIN_RIGHT_WIDTH_REM);
  const minPreviewPx = previewAgentRemToPx(PREVIEW_AGENT_MIN_PREVIEW_WIDTH_REM);

  it("keeps stored width when pane is wide enough", () => {
    const paneWidth = minPreviewPx + 9 + defaultPx + 200;
    expect(clampRightWidthForPane(defaultPx, paneWidth, defaultPx)).toBe(defaultPx);
  });

  it("reclamps agent column when pane shrinks below stored width", () => {
    const paneWidth = 300;
    const stored = defaultPx;
    const next = clampRightWidthForPane(stored, paneWidth, defaultPx);
    expect(next).toBeLessThan(stored);
    expect(next).toBeGreaterThanOrEqual(minAgentPx);
    expect(paneWidth - 9 - next).toBeGreaterThanOrEqual(minPreviewPx);
  });

  it("never returns below minimum agent width", () => {
    const tinyPane = 9 + minAgentPx;
    expect(clampRightWidthForPane(defaultPx, tinyPane, defaultPx)).toBe(minAgentPx);
  });
});

describe("buildPreviewAgentGridTemplateColumns", () => {
  it("uses a flexing preview column and fixed agent column", () => {
    const rightWidthPx = previewAgentRemToPx(CHAT_PREVIEW_AGENT_DEFAULT_RIGHT_WIDTH_REM);
    const template = buildPreviewAgentGridTemplateColumns(rightWidthPx);
    expect(template).toContain("minmax(0px, 1fr)");
    expect(PREVIEW_AGENT_MIN_PREVIEW_WIDTH_REM).toBe(0);
    expect(template).toContain(
      `minmax(${previewAgentRemToPx(PREVIEW_AGENT_MIN_RIGHT_WIDTH_REM)}px, ${rightWidthPx}px)`,
    );
    expect(template).toContain("9px");
  });
});

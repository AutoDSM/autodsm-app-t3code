import { describe, expect, it } from "vitest";

import { parseDiffRouteSearch, stripComponentPreviewSearchParams } from "./diffRouteSearch";

describe("parseDiffRouteSearch", () => {
  it("parses valid diff search values", () => {
    const parsed = parseDiffRouteSearch({
      diff: "1",
      diffTurnId: "turn-1",
      diffFilePath: "src/app.ts",
    });

    expect(parsed).toEqual({
      diff: "1",
      diffTurnId: "turn-1",
      diffFilePath: "src/app.ts",
    });
  });

  it("treats numeric and boolean diff toggles as open", () => {
    expect(
      parseDiffRouteSearch({
        diff: 1,
        diffTurnId: "turn-1",
      }),
    ).toEqual({
      diff: "1",
      diffTurnId: "turn-1",
    });

    expect(
      parseDiffRouteSearch({
        diff: true,
        diffTurnId: "turn-1",
      }),
    ).toEqual({
      diff: "1",
      diffTurnId: "turn-1",
    });
  });

  it("drops turn and file values when diff is closed", () => {
    const parsed = parseDiffRouteSearch({
      diff: "0",
      diffTurnId: "turn-1",
      diffFilePath: "src/app.ts",
    });

    expect(parsed).toEqual({});
  });

  it("drops file value when turn is not selected", () => {
    const parsed = parseDiffRouteSearch({
      diff: "1",
      diffFilePath: "src/app.ts",
    });

    expect(parsed).toEqual({
      diff: "1",
    });
  });

  it("normalizes whitespace-only values", () => {
    const parsed = parseDiffRouteSearch({
      diff: "1",
      diffTurnId: "  ",
      diffFilePath: "  ",
    });

    expect(parsed).toEqual({
      diff: "1",
    });
  });

  it("parses a trusted componentPreview path independently of diff toggle", () => {
    expect(
      parseDiffRouteSearch({
        componentPath: "src/components/Panel.tsx",
      }),
    ).toEqual({
      componentPath: "src/components/Panel.tsx",
    });

    expect(
      parseDiffRouteSearch({
        componentPath: "../../../etc/passwd",
      }),
    ).toEqual({});

    expect(
      parseDiffRouteSearch({
        componentPath: "apps/web/src/components/ChatPanel.tsx",
      }),
    ).toEqual({
      componentPath: "apps/web/src/components/ChatPanel.tsx",
    });
  });
});

describe("stripComponentPreviewSearchParams", () => {
  it("removes componentPath and preserves unrelated and diff-related search keys", () => {
    expect(
      stripComponentPreviewSearchParams({
        diff: "1",
        diffTurnId: "turn-1",
        diffFilePath: "src/app.ts",
        componentPath: "src/components/Panel.tsx",
        extra: true,
      }),
    ).toEqual({
      diff: "1",
      diffTurnId: "turn-1",
      diffFilePath: "src/app.ts",
      extra: true,
    });
  });
});

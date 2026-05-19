import { describe, expect, it } from "vitest";

import {
  isAutoDsmComponentAgentThread,
  resolveTurnStartTitleSeed,
  shouldAutoTitleThreadOnFirstMessage,
} from "./autoDsmComponentAgentThread";

describe("isAutoDsmComponentAgentThread", () => {
  it("returns true when the thread key has a mapped component path", () => {
    expect(
      isAutoDsmComponentAgentThread("env-1:thr-button", {
        "env-1:thr-button": "src/components/ShadcnButton.tsx",
      }),
    ).toBe(true);
  });

  it("returns false for unmapped threads", () => {
    expect(isAutoDsmComponentAgentThread("env-1:thr-other", {})).toBe(false);
    expect(
      isAutoDsmComponentAgentThread(null, { "env-1:thr-button": "src/components/x.tsx" }),
    ).toBe(false);
  });
});

describe("shouldAutoTitleThreadOnFirstMessage", () => {
  it("skips auto-title for component agent threads", () => {
    expect(
      shouldAutoTitleThreadOnFirstMessage({
        isFirstMessage: true,
        isServerThread: true,
        isComponentAgentThread: true,
      }),
    ).toBe(false);
  });

  it("keeps auto-title for normal server threads", () => {
    expect(
      shouldAutoTitleThreadOnFirstMessage({
        isFirstMessage: true,
        isServerThread: true,
        isComponentAgentThread: false,
      }),
    ).toBe(true);
  });
});

describe("resolveTurnStartTitleSeed", () => {
  it("omits titleSeed for component agent threads", () => {
    expect(
      resolveTurnStartTitleSeed({
        isComponentAgentThread: true,
        titleFromPrompt: "make it rounded",
      }),
    ).toBeUndefined();
  });

  it("passes prompt title for normal threads", () => {
    expect(
      resolveTurnStartTitleSeed({
        isComponentAgentThread: false,
        titleFromPrompt: "Fix login bug",
      }),
    ).toBe("Fix login bug");
  });
});

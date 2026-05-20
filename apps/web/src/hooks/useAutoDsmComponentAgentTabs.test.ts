import { describe, expect, it } from "vitest";

import { pickChangedThreadComponentPaths } from "./useAutoDsmComponentAgentTabs";

describe("pickChangedThreadComponentPaths", () => {
  it("returns empty object when all candidate paths already match stored values", () => {
    const stored = {
      "env:thread-1": "src/components/button.tsx",
      "env:thread-2": "src/components/card.tsx",
    };

    expect(
      pickChangedThreadComponentPaths(stored, {
        "env:thread-1": "src/components/button.tsx",
        "env:thread-2": "src/components/card.tsx",
      }),
    ).toEqual({});
  });

  it("returns only keys that are missing or changed", () => {
    const stored = {
      "env:thread-1": "src/components/button.tsx",
    };

    expect(
      pickChangedThreadComponentPaths(stored, {
        "env:thread-1": "src/components/button.tsx",
        "env:thread-2": "src/components/card.tsx",
        "env:thread-3": "src/components/input.tsx",
      }),
    ).toEqual({
      "env:thread-2": "src/components/card.tsx",
      "env:thread-3": "src/components/input.tsx",
    });
  });

  it("treats leading-slash variants as unchanged", () => {
    const stored = {
      "env:thread-1": "src/components/button.tsx",
    };

    expect(
      pickChangedThreadComponentPaths(stored, {
        "env:thread-1": "/src/components/button.tsx",
      }),
    ).toEqual({});
  });

  it("includes keys whose values changed", () => {
    const stored = {
      "env:thread-1": "src/components/button.tsx",
    };

    expect(
      pickChangedThreadComponentPaths(stored, {
        "env:thread-1": "src/components/button-v2.tsx",
      }),
    ).toEqual({
      "env:thread-1": "src/components/button-v2.tsx",
    });
  });
});

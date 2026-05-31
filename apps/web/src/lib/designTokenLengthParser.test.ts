import { describe, expect, it } from "vitest";

import { maxDesignTokenLengthPx, parseDesignTokenLength } from "./designTokenLengthParser";

describe("designTokenLengthParser", () => {
  it("parses px, rem, and raw numbers", () => {
    expect(parseDesignTokenLength("8px")?.px).toBe(8);
    expect(parseDesignTokenLength("1rem")?.px).toBe(16);
    expect(parseDesignTokenLength("4")?.px).toBe(4);
  });

  it("finds max px for bar scaling", () => {
    expect(maxDesignTokenLengthPx(["4px", "2rem", "12"])).toBe(32);
  });
});

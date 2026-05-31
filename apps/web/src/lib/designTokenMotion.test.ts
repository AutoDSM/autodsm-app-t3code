import { describe, expect, it } from "vitest";

import type { AutoDsmBrandToken } from "@t3tools/contracts";

import {
  classifyDesignTokenMotionKind,
  formatMotionDurationMs,
  groupMotionTokens,
  parseCubicBezier,
} from "./designTokenMotion";

function motionToken(name: string, value: string): AutoDsmBrandToken {
  return {
    id: `motion:${name}`,
    category: "motion",
    name,
    value,
    origin: "scanned",
    sources: [],
  };
}

describe("designTokenMotion", () => {
  it("splits durations and easings", () => {
    const groups = groupMotionTokens([
      motionToken("duration-fast", "150ms"),
      motionToken("ease-out", "cubic-bezier(0, 0, 0.2, 1)"),
    ]);
    expect(groups.durations).toHaveLength(1);
    expect(groups.easings).toHaveLength(1);
    expect(classifyDesignTokenMotionKind(groups.easings[0]!)).toBe("easing");
  });

  it("formats duration labels and parses bezier", () => {
    expect(formatMotionDurationMs("0.3s")).toBe("300ms");
    expect(parseCubicBezier("cubic-bezier(0.4, 0, 0.2, 1)")).toEqual([0.4, 0, 0.2, 1]);
  });
});

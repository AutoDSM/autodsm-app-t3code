import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { __testing__, estimateAutoDsmEta, recordAutoDsmInstallTiming } from "./autoDsmEtaEstimator";

const STARTER = "shadcn-ui" as const;

beforeEach(() => {
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }
});

afterEach(() => {
  if (typeof window !== "undefined") {
    window.localStorage.clear();
  }
});

describe("estimateAutoDsmEta", () => {
  it("hides the ETA before the 3s elapsed gate", () => {
    const result = estimateAutoDsmEta({ starterId: STARTER, elapsedMs: 1000 });
    expect(result.visible).toBe(false);
  });

  it("hides the ETA when projected remaining is under 8s", () => {
    // After 24s on a 25s baseline shadcn run we expect ~1s remaining.
    const result = estimateAutoDsmEta({
      starterId: STARTER,
      elapsedMs: 24_000,
      progressFraction: 0.95,
    });
    expect(result.visible).toBe(false);
  });

  it("shows ETA when elapsed > 3s AND projected remaining > 8s", () => {
    // 4s elapsed at 20% progress projects ~20s total → ~16s remaining.
    const result = estimateAutoDsmEta({
      starterId: STARTER,
      elapsedMs: 4000,
      progressFraction: 0.2,
    });
    expect(result.visible).toBe(true);
    expect(result.remainingSeconds).toBeGreaterThan(8);
  });

  it("uses baseline alone when no progressFraction is provided", () => {
    // baseline shadcn = 25s; after 4s, ~21s remaining.
    const result = estimateAutoDsmEta({ starterId: STARTER, elapsedMs: 4000 });
    expect(result.visible).toBe(true);
    expect(result.remainingSeconds).toBeGreaterThan(15);
  });

  it("never returns a negative remaining", () => {
    const result = estimateAutoDsmEta({
      starterId: STARTER,
      elapsedMs: 999_999,
      progressFraction: 0.99,
    });
    expect(result.remainingSeconds).toBeGreaterThanOrEqual(0);
  });

  it("clamps projected total at baseline minimum", () => {
    // Even with very fast progress, total should not undercut the baseline by much.
    const result = estimateAutoDsmEta({
      starterId: STARTER,
      elapsedMs: 200,
      progressFraction: 0.5,
    });
    expect(result.projectedTotalSeconds).toBeGreaterThanOrEqual(
      __testing__.BASELINE_SECONDS["shadcn-ui"],
    );
  });
});

describe("recordAutoDsmInstallTiming", () => {
  it("persists a moving average that influences subsequent baseline reads", () => {
    if (typeof window === "undefined") return;
    // Record a very slow install (60s) for shadcn (baseline 25s).
    recordAutoDsmInstallTiming(STARTER, 60_000);
    // Baseline blends 40% × 25 + 60% × 60 ≈ 46s.
    const result = estimateAutoDsmEta({ starterId: STARTER, elapsedMs: 4000 });
    expect(result.projectedTotalSeconds).toBeGreaterThan(35);
  });

  it("ignores non-positive durations", () => {
    if (typeof window === "undefined") return;
    recordAutoDsmInstallTiming(STARTER, 0);
    recordAutoDsmInstallTiming(STARTER, -1);
    // No persistence — baseline still applies.
    const result = estimateAutoDsmEta({ starterId: STARTER, elapsedMs: 4000 });
    expect(result.projectedTotalSeconds).toBeCloseTo(__testing__.BASELINE_SECONDS["shadcn-ui"], 0);
  });
});

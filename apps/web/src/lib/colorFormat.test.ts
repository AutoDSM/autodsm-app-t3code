import { describe, expect, it } from "vitest";

import { formatOklchValueAsRgb, oklchToRgb, parseOklch } from "./colorFormat";

const channelWithinOne = (actual: number, expected: number): boolean =>
  Math.abs(actual - expected) <= 1;

describe("parseOklch", () => {
  it("parses unitless numbers", () => {
    expect(parseOklch("oklch(0.65 0.18 270)")).toEqual({
      L: 0.65,
      C: 0.18,
      h: 270,
      alpha: 1,
    });
  });

  it("parses percentage lightness", () => {
    const parsed = parseOklch("oklch(95% 0.05 270deg)");
    expect(parsed?.L).toBeCloseTo(0.95, 5);
    expect(parsed?.C).toBeCloseTo(0.05, 5);
    expect(parsed?.h).toBe(270);
  });

  it("parses alpha as percentage and decimal", () => {
    expect(parseOklch("oklch(0.5 0.2 30 / 0.6)")?.alpha).toBeCloseTo(0.6, 5);
    expect(parseOklch("oklch(0.5 0.2 30 / 60%)")?.alpha).toBeCloseTo(0.6, 5);
  });

  it("normalises hue out of range", () => {
    expect(parseOklch("oklch(0.5 0.2 -90)")?.h).toBe(270);
    expect(parseOklch("oklch(0.5 0.2 450)")?.h).toBe(90);
  });

  it("returns null for malformed inputs", () => {
    expect(parseOklch("oklch(bad)")).toBeNull();
    expect(parseOklch("not-a-color")).toBeNull();
    expect(parseOklch("")).toBeNull();
    expect(parseOklch("rgb(1 2 3)")).toBeNull();
  });
});

describe("oklchToRgb", () => {
  it("converts pure black", () => {
    const rgb = oklchToRgb({ L: 0, C: 0, h: 0, alpha: 1 });
    expect(rgb.r).toBe(0);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(0);
  });

  it("converts pure white", () => {
    const rgb = oklchToRgb({ L: 1, C: 0, h: 0, alpha: 1 });
    expect(rgb.r).toBe(255);
    expect(rgb.g).toBe(255);
    expect(rgb.b).toBe(255);
  });

  it("converts a recognisable indigo", () => {
    // oklch(0.45 0.18 280) is roughly indigo-ish; verify each channel sits in a sane band.
    const rgb = oklchToRgb({ L: 0.45, C: 0.18, h: 280, alpha: 1 });
    expect(rgb.r).toBeGreaterThan(40);
    expect(rgb.r).toBeLessThan(130);
    expect(rgb.b).toBeGreaterThan(rgb.r);
    expect(rgb.b).toBeGreaterThan(rgb.g);
  });

  it("clamps out-of-gamut chroma", () => {
    const rgb = oklchToRgb({ L: 0.5, C: 1.0, h: 30, alpha: 1 });
    expect(rgb.r).toBeGreaterThanOrEqual(0);
    expect(rgb.r).toBeLessThanOrEqual(255);
    expect(rgb.g).toBeGreaterThanOrEqual(0);
    expect(rgb.g).toBeLessThanOrEqual(255);
    expect(rgb.b).toBeGreaterThanOrEqual(0);
    expect(rgb.b).toBeLessThanOrEqual(255);
  });

  it("round-trips an L=0.5 grey", () => {
    const rgb = oklchToRgb({ L: 0.5, C: 0, h: 0, alpha: 1 });
    expect(channelWithinOne(rgb.r, rgb.g)).toBe(true);
    expect(channelWithinOne(rgb.g, rgb.b)).toBe(true);
    // Mid-lightness grey lands in the mid-tone sRGB band (roughly 90–130).
    expect(rgb.r).toBeGreaterThan(80);
    expect(rgb.r).toBeLessThan(140);
  });
});

describe("formatOklchValueAsRgb", () => {
  it("formats oklch values as rgb(R G B)", () => {
    expect(formatOklchValueAsRgb("oklch(0 0 0)")).toBe("rgb(0 0 0)");
    expect(formatOklchValueAsRgb("oklch(1 0 0)")).toBe("rgb(255 255 255)");
  });

  it("includes alpha when < 1", () => {
    const out = formatOklchValueAsRgb("oklch(0.5 0.2 30 / 0.6)");
    expect(out).toMatch(/^rgb\(\d+ \d+ \d+ \/ 0\.6\)$/);
  });

  it("passes through non-oklch inputs unchanged", () => {
    expect(formatOklchValueAsRgb("#1a1a1a")).toBe("#1a1a1a");
    expect(formatOklchValueAsRgb("rgb(20, 30, 40)")).toBe("rgb(20, 30, 40)");
    expect(formatOklchValueAsRgb("red")).toBe("red");
    expect(formatOklchValueAsRgb("")).toBe("");
    expect(formatOklchValueAsRgb("oklch(bad")).toBe("oklch(bad");
  });

  it("is tolerant of surrounding whitespace", () => {
    expect(formatOklchValueAsRgb("  oklch(0 0 0)  ")).toBe("rgb(0 0 0)");
  });
});

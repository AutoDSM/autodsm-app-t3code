import type { AutoDsmBrandToken } from "@t3tools/contracts";

import { tokenDisplayName } from "~/lib/designTokenGroups";

export type DesignTokenMotionKind = "duration" | "easing";

const DURATION_HINT =
  /\b(?:duration|delay|timeout|transition-duration|animation-duration)\b|(?:^|-)\d+(?:ms|s)$|\d+(?:ms|s)\b/i;
const EASING_HINT =
  /\b(?:ease|easing|cubic-bezier|bezier|spring|linear|steps)\b|cubic-bezier\s*\(/i;

export function classifyDesignTokenMotionKind(token: AutoDsmBrandToken): DesignTokenMotionKind {
  const name = tokenDisplayName(token).toLowerCase();
  const value = token.value.trim().toLowerCase();
  if (EASING_HINT.test(name) || EASING_HINT.test(value)) {
    return "easing";
  }
  if (DURATION_HINT.test(name) || DURATION_HINT.test(value)) {
    return "duration";
  }
  if (/cubic-bezier|steps\(/.test(value)) {
    return "easing";
  }
  if (/^\d+(\.\d+)?(ms|s)$/.test(value) || /^\d+(\.\d+)?$/.test(value)) {
    return "duration";
  }
  return "duration";
}

export interface DesignTokenMotionGroups {
  readonly durations: readonly AutoDsmBrandToken[];
  readonly easings: readonly AutoDsmBrandToken[];
}

export function groupMotionTokens(tokens: readonly AutoDsmBrandToken[]): DesignTokenMotionGroups {
  const durations: AutoDsmBrandToken[] = [];
  const easings: AutoDsmBrandToken[] = [];
  for (const token of tokens) {
    if (classifyDesignTokenMotionKind(token) === "easing") {
      easings.push(token);
    } else {
      durations.push(token);
    }
  }
  return { durations, easings };
}

/** Normalize duration display to milliseconds. */
export function formatMotionDurationMs(value: string): string {
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?ms$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (/^\d+(\.\d+)?s$/i.test(trimmed)) {
    const seconds = Number.parseFloat(trimmed.slice(0, -1));
    if (Number.isFinite(seconds)) {
      return `${Math.round(seconds * 1000)}ms`;
    }
  }
  const numeric = Number.parseFloat(trimmed);
  if (Number.isFinite(numeric)) {
    return `${Math.round(numeric)}ms`;
  }
  return trimmed;
}

export function motionDurationMs(value: string): number {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.endsWith("ms")) {
    const ms = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(ms) ? ms : 0;
  }
  if (trimmed.endsWith("s")) {
    const seconds = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(seconds) ? seconds * 1000 : 0;
  }
  const numeric = Number.parseFloat(trimmed);
  return Number.isFinite(numeric) ? numeric : 0;
}

/** Parse `cubic-bezier(a, b, c, d)` into control points or null. */
export function parseCubicBezier(value: string): readonly [number, number, number, number] | null {
  const match = /cubic-bezier\s*\(\s*([^)]+)\s*\)/i.exec(value);
  if (!match) {
    return null;
  }
  const parts = (match[1] ?? "")
    .split(",")
    .map((part) => Number.parseFloat(part.trim()))
    .filter((n) => Number.isFinite(n));
  if (parts.length !== 4) {
    return null;
  }
  return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
}

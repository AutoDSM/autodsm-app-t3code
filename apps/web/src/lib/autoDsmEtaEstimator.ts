import type { AutoDsmWorkspaceStarterId } from "@t3tools/contracts";

/**
 * Baseline expected total install + indexing time per starter, in seconds.
 *
 * Sourced from docs/autodsm-target-state/features/loading.md:120-124. Adaptive
 * timings stored in localStorage refine these for repeat users.
 */
const BASELINE_SECONDS: Record<AutoDsmWorkspaceStarterId, number> = {
  "modern-starter": 8,
  "tailwind-css": 8,
  "shadcn-ui": 25,
  mui: 40,
  "chakra-ui": 40,
};

const LS_KEY_PREFIX = "autodsm:install-timings:";
const ETA_VISIBLE_AFTER_ELAPSED_MS = 3000;
const ETA_VISIBLE_WHEN_REMAINING_OVER_MS = 8000;

export interface EtaInput {
  readonly starterId: AutoDsmWorkspaceStarterId;
  readonly elapsedMs: number;
  /** 0..1 — derived from server progress events when available. */
  readonly progressFraction?: number;
}

export interface EtaResult {
  /** Estimated remaining seconds. Always >= 0. */
  readonly remainingSeconds: number;
  /** Whether the UI should render an ETA label given the visibility gate. */
  readonly visible: boolean;
  /** Estimated total seconds for this run. Useful for telemetry / debugging. */
  readonly projectedTotalSeconds: number;
}

function readAdaptiveBaseline(starterId: AutoDsmWorkspaceStarterId): number {
  const fallback = BASELINE_SECONDS[starterId];
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(`${LS_KEY_PREFIX}${starterId}`);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { lastSeconds?: number; emaSeconds?: number };
    const observed = parsed.emaSeconds ?? parsed.lastSeconds;
    if (typeof observed === "number" && Number.isFinite(observed) && observed > 0) {
      // Blend baseline (40%) + observed EMA (60%) so a single anomalously slow
      // run doesn't dominate forever.
      return Math.max(2, 0.4 * fallback + 0.6 * observed);
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function estimateAutoDsmEta(input: EtaInput): EtaResult {
  const baseline = readAdaptiveBaseline(input.starterId);
  const elapsedSeconds = Math.max(0, input.elapsedMs / 1000);
  let projectedTotalSeconds = baseline;
  if (input.progressFraction !== undefined && input.progressFraction > 0.05) {
    // If we have real progress, project total from current pace.
    const fraction = Math.min(0.99, input.progressFraction);
    const projectedFromPace = elapsedSeconds / fraction;
    // Take the max so we don't show an over-optimistic ETA after a fast first
    // phase; convergence still happens as fraction approaches 1.
    projectedTotalSeconds = Math.max(baseline, projectedFromPace);
  }
  const remainingSeconds = Math.max(0, projectedTotalSeconds - elapsedSeconds);
  const visible =
    input.elapsedMs > ETA_VISIBLE_AFTER_ELAPSED_MS &&
    remainingSeconds * 1000 > ETA_VISIBLE_WHEN_REMAINING_OVER_MS;
  return { remainingSeconds, visible, projectedTotalSeconds };
}

/** Record an observed install duration so the next run gets a refined baseline. */
export function recordAutoDsmInstallTiming(
  starterId: AutoDsmWorkspaceStarterId,
  durationMs: number,
): void {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(durationMs) || durationMs <= 0) return;
  const seconds = durationMs / 1000;
  try {
    const key = `${LS_KEY_PREFIX}${starterId}`;
    const raw = window.localStorage.getItem(key);
    const prev =
      raw === null ? null : (JSON.parse(raw) as { lastSeconds?: number; emaSeconds?: number });
    const prevEma =
      prev && typeof prev.emaSeconds === "number" && Number.isFinite(prev.emaSeconds)
        ? prev.emaSeconds
        : null;
    // Exponential moving average with alpha=0.4 — three recent runs dominate.
    const nextEma = prevEma === null ? seconds : 0.6 * prevEma + 0.4 * seconds;
    window.localStorage.setItem(key, JSON.stringify({ lastSeconds: seconds, emaSeconds: nextEma }));
  } catch {
    // Quota / private mode failures — ignore; baseline still works.
  }
}

export const __testing__ = {
  BASELINE_SECONDS,
  ETA_VISIBLE_AFTER_ELAPSED_MS,
  ETA_VISIBLE_WHEN_REMAINING_OVER_MS,
};

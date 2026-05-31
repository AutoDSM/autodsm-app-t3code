import type { AutoDsmActivityEntry } from "@t3tools/contracts";

export type RegistryStatus = "ready" | "indexing" | "partial" | "stale" | "failed" | "not_started";

export interface ComputeHealthInput {
  readonly registryStatus: RegistryStatus | null;
  readonly tokenCount: number | null;
  readonly sidecarReady: boolean | null;
  readonly componentCount: number | null;
}

const dateHeaderFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export function formatDateHeader(date: Date): string {
  return dateHeaderFormatter.format(date);
}

export function computeAdoption(
  componentCount: number | null,
  agentCount: number | null,
): number | null {
  if (componentCount === null || agentCount === null) return null;
  if (componentCount <= 0) return 0;
  return Math.min(100, Math.round((agentCount / componentCount) * 100));
}

export function computeHealth(input: ComputeHealthInput): number | null {
  const { registryStatus, tokenCount, sidecarReady, componentCount } = input;
  if (
    registryStatus === null &&
    tokenCount === null &&
    sidecarReady === null &&
    componentCount === null
  ) {
    return null;
  }
  let score = 0;
  // Registry indexing health (up to 40 points)
  if (registryStatus === "ready") score += 40;
  else if (registryStatus === "partial" || registryStatus === "stale") score += 25;
  else if (registryStatus === "indexing") score += 15;
  // Token coverage (up to 25)
  if (tokenCount !== null && tokenCount > 0) score += 25;
  // Sidecar readiness (up to 20)
  if (sidecarReady === true) score += 20;
  // Components present at all (up to 15)
  if (componentCount !== null && componentCount > 0) score += 15;
  return Math.min(100, score);
}

export function pickSystemStatusLabel(input: {
  readonly registryStatus: RegistryStatus | null;
  readonly sidecarReady: boolean | null;
}): "System healthy" | "System degraded" | "System initializing" {
  const { registryStatus, sidecarReady } = input;
  if (registryStatus === null && sidecarReady === null) return "System initializing";
  if (registryStatus === "ready" && sidecarReady === true) return "System healthy";
  if (registryStatus === "indexing" || registryStatus === "not_started") {
    return "System initializing";
  }
  return "System degraded";
}

const KIND_TO_FRIENDLY_LABEL: ReadonlyArray<readonly [pattern: RegExp, label: string]> = [
  [/^pullrequest\./, "PR"],
  [/^pull[-_]request/, "PR"],
  [/^pr\./, "PR"],
  [/^issue\./, "Issue"],
  [/^token\./, "Token"],
  [/^brand[-.]token/, "Token"],
  [/^release\./, "Release"],
  [/^publish\./, "Release"],
  [/^deprecat/, "Deprecate"],
  [/^changeset\.created/, "Change"],
  [/^changeset\.applied/, "Commit"],
  [/^component\.created/, "Commit"],
  [/^component\.rendered/, "Render"],
  [/^session\./, "Session"],
];

export function friendlyActivityKind(kind: string): string {
  for (const [pattern, label] of KIND_TO_FRIENDLY_LABEL) {
    if (pattern.test(kind)) return label;
  }
  // Fallback: take first dotted segment, Capitalise it.
  const head = kind.split(".")[0] ?? kind;
  if (head.length === 0) return "Activity";
  return head.charAt(0).toUpperCase() + head.slice(1);
}

const PUBLISH_KIND_PATTERNS: ReadonlyArray<RegExp> = [
  /^publish\./,
  /^release\./,
  /^pullrequest\.merged/,
];

/**
 * Whether an activity entry represents a publish/release/merge — the kinds
 * that should drive the "last published" indicator in the greeting strip.
 * Returns false for changesets, renders, sessions, and other day-to-day work.
 */
export function isPublishActivityKind(kind: string): boolean {
  return PUBLISH_KIND_PATTERNS.some((pattern) => pattern.test(kind));
}

/**
 * Best-effort extraction of a short identifier for the right-side tag column
 * of the Recent activity list — e.g. a component name, PR number, or token id.
 * Returns null when nothing useful is present in the payload.
 */
export function extractActivityTag(entry: AutoDsmActivityEntry): string | null {
  let payload: unknown;
  try {
    payload = JSON.parse(entry.payloadJson);
  } catch {
    return null;
  }
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;

  const pickString = (...keys: ReadonlyArray<string>): string | null => {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
      if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
      }
    }
    return null;
  };

  if (entry.kind.startsWith("pullrequest")) {
    const num = pickString("number", "prNumber", "id");
    return num !== null ? `#${num.replace(/^#/, "")}` : null;
  }
  if (entry.kind.startsWith("component")) {
    return pickString("componentName", "componentId", "name");
  }
  if (entry.kind.startsWith("token") || entry.kind.startsWith("brand")) {
    return pickString("tokenId", "id", "name");
  }
  if (entry.kind.startsWith("changeset")) {
    return pickString("changeSetId", "id");
  }
  return pickString("id", "name");
}

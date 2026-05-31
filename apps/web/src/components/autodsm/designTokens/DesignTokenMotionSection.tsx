"use client";

import type { AutoDsmBrandToken } from "@t3tools/contracts";
import { PlayIcon } from "lucide-react";
import { useMemo, useState, type JSX } from "react";

import { Button } from "~/components/ui/button";
import { tokenDisplayName } from "~/lib/designTokenGroups";
import {
  formatMotionDurationMs,
  groupMotionTokens,
  motionDurationMs,
  parseCubicBezier,
} from "~/lib/designTokenMotion";

import { DesignTokenSubSection } from "./DesignTokenSubSection";

export interface DesignTokenMotionSectionProps {
  readonly tokens: readonly AutoDsmBrandToken[];
  readonly onEditToken: (token: AutoDsmBrandToken) => void;
}

const MAX_DURATION_MS = 2000;

function BezierPreview({
  bezier,
  playing,
}: {
  readonly bezier: readonly [number, number, number, number];
  readonly playing: boolean;
}): JSX.Element {
  const [x1, y1, x2, y2] = bezier;
  const path = `M 4 44 C ${4 + x1 * 56} ${44 - y1 * 40}, ${4 + x2 * 56} ${44 - y2 * 40}, 60 4`;

  return (
    <svg viewBox="0 0 64 48" className="h-12 w-full text-primary" aria-hidden>
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className={playing ? "motion-bezier-play" : undefined}
      />
      <circle
        cx={playing ? 60 : 4}
        cy={playing ? 4 : 44}
        r="3"
        fill="currentColor"
        className={playing ? "motion-dot-play" : undefined}
      />
    </svg>
  );
}

function DurationRow({
  token,
  maxMs,
  onEdit,
}: {
  readonly token: AutoDsmBrandToken;
  readonly maxMs: number;
  readonly onEdit: () => void;
}): JSX.Element {
  const ms = motionDurationMs(token.value);
  const label = formatMotionDurationMs(token.value);
  const position = maxMs > 0 ? Math.min(100, (ms / maxMs) * 100) : 0;

  return (
    <button
      type="button"
      className="grid w-full grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-4 py-2 text-left transition-colors hover:bg-muted/30 rounded-lg px-2"
      onClick={onEdit}
    >
      <span className="font-mono text-sm text-foreground">{tokenDisplayName(token)}</span>
      <div className="relative h-2 rounded-full bg-muted/50">
        <span
          className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-primary shadow-sm"
          style={{ left: `calc(${position}% - 6px)` }}
          aria-hidden
        />
      </div>
      <span className="font-mono text-xs text-muted-foreground tabular-nums">{label}</span>
    </button>
  );
}

function EasingCard({
  token,
  onEdit,
}: {
  readonly token: AutoDsmBrandToken;
  readonly onEdit: () => void;
}): JSX.Element {
  const [playing, setPlaying] = useState(false);
  const bezier = parseCubicBezier(token.value) ?? [0.4, 0, 0.2, 1];

  const playSample = (): void => {
    setPlaying(true);
    window.setTimeout(() => {
      setPlaying(false);
    }, 800);
  };

  return (
    <div className="relative flex flex-col gap-2 rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:border-border hover:bg-card/80">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="absolute right-2 top-2"
        aria-label={`Play ${tokenDisplayName(token)} easing`}
        onClick={(event) => {
          event.stopPropagation();
          playSample();
        }}
      >
        <PlayIcon />
      </Button>
      <button type="button" className="flex flex-col gap-2 text-left" onClick={onEdit}>
        <BezierPreview bezier={bezier} playing={playing} />
        <p className="font-mono text-sm text-foreground">{tokenDisplayName(token)}</p>
        <p className="line-clamp-2 font-mono text-xs text-muted-foreground break-all">
          {token.value}
        </p>
      </button>
    </div>
  );
}

export function DesignTokenMotionSection({
  tokens,
  onEditToken,
}: DesignTokenMotionSectionProps): JSX.Element {
  const { durations, easings } = useMemo(() => groupMotionTokens(tokens), [tokens]);
  const maxMs = useMemo(() => {
    const values = durations.map((t) => motionDurationMs(t.value));
    return Math.max(MAX_DURATION_MS, ...values, 1);
  }, [durations]);

  if (tokens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No motion tokens yet — resync from your design system or add a token.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {durations.length > 0 ? (
        <DesignTokenSubSection label="Durations">
          <div className="space-y-1">
            {durations.map((token) => (
              <DurationRow
                key={token.id}
                token={token}
                maxMs={maxMs}
                onEdit={() => {
                  onEditToken(token);
                }}
              />
            ))}
          </div>
        </DesignTokenSubSection>
      ) : null}
      {easings.length > 0 ? (
        <DesignTokenSubSection label="Easings">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {easings.map((token) => (
              <EasingCard
                key={token.id}
                token={token}
                onEdit={() => {
                  onEditToken(token);
                }}
              />
            ))}
          </div>
        </DesignTokenSubSection>
      ) : null}
    </div>
  );
}

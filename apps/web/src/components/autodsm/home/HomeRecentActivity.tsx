"use client";

import type { AutoDsmActivityEntry } from "@t3tools/contracts";
import type { JSX } from "react";

import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { formatRelativeTime } from "~/timestampFormat";

import { extractActivityTag, friendlyActivityKind } from "./homeMetrics";

export interface HomeRecentActivityProps {
  readonly entries: ReadonlyArray<AutoDsmActivityEntry>;
  readonly loading?: boolean;
  readonly onViewAll?: () => void;
}

export function HomeRecentActivity({
  entries,
  loading,
  onViewAll,
}: HomeRecentActivityProps): JSX.Element {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-base font-medium text-foreground">Recent</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          View all
        </button>
      </div>
      <Card>
        {loading ? (
          <ul className="flex flex-col">
            {Array.from({ length: 6 }, (_, idx) => (
              <li
                key={idx}
                className="grid grid-cols-[6rem_1fr_auto_3rem] items-center gap-4 px-6 py-3 border-b border-border last:border-b-0"
              >
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-8" />
              </li>
            ))}
          </ul>
        ) : entries.length === 0 ? (
          <div className="px-6 py-10 text-center text-muted-foreground text-sm">
            No recent activity yet.
          </div>
        ) : (
          <ul className="flex flex-col">
            {entries.map((entry) => {
              const kindLabel = friendlyActivityKind(entry.kind);
              const tag = extractActivityTag(entry);
              const relative = formatRelativeTime(entry.createdAt);
              const timeLabel = relative.suffix === null ? "now" : relative.value;
              return (
                <li
                  key={entry.id}
                  className="grid grid-cols-[6rem_1fr_auto_3rem] items-center gap-4 px-6 py-3 border-b border-border last:border-b-0"
                >
                  <span className="text-muted-foreground text-sm">{kindLabel}</span>
                  <span className="text-foreground text-sm truncate" title={entry.summary}>
                    {entry.summary || "—"}
                  </span>
                  <span
                    className="text-muted-foreground text-sm font-mono truncate max-w-[14rem]"
                    title={tag ?? ""}
                  >
                    {tag ?? ""}
                  </span>
                  <span className="text-muted-foreground text-sm text-right tabular-nums">
                    {timeLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}

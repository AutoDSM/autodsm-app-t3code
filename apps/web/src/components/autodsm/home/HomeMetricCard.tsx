"use client";

import type { JSX, ReactNode } from "react";

import { Card, CardHeader, CardPanel } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

export interface HomeMetricDelta {
  readonly value: string;
  readonly positive: boolean;
}

export interface HomeMetricCardProps {
  readonly label: string;
  readonly value: ReactNode;
  readonly loading?: boolean;
  readonly unit?: string;
  readonly delta?: HomeMetricDelta;
  /**
   * Secondary descriptor rendered beneath the primary value, e.g.
   * "of 50 available" or "12 created · 8 scanned". Keeps the headline
   * number large while still giving the user the full context.
   */
  readonly caption?: ReactNode;
}

export function HomeMetricCard({
  label,
  value,
  loading,
  unit,
  delta,
  caption,
}: HomeMetricCardProps): JSX.Element {
  return (
    <Card>
      <CardHeader className="grid-rows-1 p-5 pb-0">
        <p className="text-muted-foreground text-sm">{label}</p>
      </CardHeader>
      <CardPanel className="p-5 pt-2">
        {loading ? (
          <Skeleton className="h-12 w-24 rounded-md" />
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-end gap-2">
              <span className="text-5xl font-medium tabular-nums leading-none text-foreground">
                {value}
              </span>
              {unit ? (
                <span className="text-muted-foreground text-base leading-none mb-1.5">{unit}</span>
              ) : null}
              {delta ? (
                <span
                  className={`text-sm leading-none mb-2 ${
                    delta.positive ? "text-success" : "text-destructive"
                  }`}
                >
                  {delta.value}
                </span>
              ) : null}
            </div>
            {caption ? <p className="text-muted-foreground text-xs">{caption}</p> : null}
          </div>
        )}
      </CardPanel>
    </Card>
  );
}

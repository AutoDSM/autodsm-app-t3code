"use client";

import type { JSX, ReactNode } from "react";

export interface DesignTokenSubSectionProps {
  readonly label: string;
  readonly children: ReactNode;
}

/** Muted subgroup label with divider (Surfaces, Durations, etc.). */
export function DesignTokenSubSection({
  label,
  children,
}: DesignTokenSubSectionProps): JSX.Element {
  return (
    <section className="space-y-3">
      <div className="border-t border-border/50 pt-4 first:border-t-0 first:pt-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      {children}
    </section>
  );
}

"use client";

import type { JSX, ReactNode } from "react";

import { Card, CardHeader, CardPanel } from "~/components/ui/card";
import { cn } from "~/lib/utils";

export interface DesignTokenSectionShellProps {
  readonly title: string;
  readonly description?: string;
  readonly headerAction?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

/** Card-framed section header used by each Design Tokens category tab. */
export function DesignTokenSectionShell({
  title,
  description,
  headerAction,
  children,
  className,
}: DesignTokenSectionShellProps): JSX.Element {
  return (
    <Card className={cn("rounded-2xl border-border/60 bg-card/40", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/50 p-5 pb-4">
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-medium text-foreground">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </CardHeader>
      <CardPanel className="space-y-6 p-5">{children}</CardPanel>
    </Card>
  );
}

"use client";

import { ChevronDownIcon } from "lucide-react";
import type { JSX, ReactNode } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";

interface DesignTokenSectionProps {
  readonly title: string;
  readonly count: number;
  readonly defaultOpen?: boolean;
  readonly children: ReactNode;
}

/** Collapsible Design Tokens section — title, token count, and a chevron toggle. */
export function DesignTokenSection({
  title,
  count,
  defaultOpen = true,
  children,
}: DesignTokenSectionProps): JSX.Element {
  return (
    <Collapsible defaultOpen={defaultOpen} className="border-b border-border/60">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 py-3 text-left">
        <span className="flex items-baseline gap-2">
          <span className="text-base font-semibold text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">{count}</span>
        </span>
        <ChevronDownIcon className="size-5 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pb-4">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

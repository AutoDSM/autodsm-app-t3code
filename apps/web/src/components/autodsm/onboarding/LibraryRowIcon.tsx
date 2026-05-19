"use client";

import type { JSX } from "react";

import type { AutoDsmStarterId } from "~/lib/autoDsmStarterCatalog";
import { cn } from "~/lib/utils";

const BOX =
  "flex size-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/35";

export function LibraryRowIcon(props: { readonly starterId: AutoDsmStarterId }): JSX.Element {
  switch (props.starterId) {
    case "shadcn-ui":
      return (
        <span className={cn(BOX, "text-xs font-bold tracking-tight text-foreground")} aria-hidden>
          SC
        </span>
      );
    case "mui":
      return (
        <span className={BOX} aria-hidden>
          <svg className="size-6 text-[#007FFF]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.09 5.1 7.63 12 4.18zM4 8.82l7 3.5v6.68l-7-3.5V8.82zm16 0v6.68l-7 3.5v-6.68l7-3.5z" />
          </svg>
        </span>
      );
    case "tailwind-css":
      return (
        <span className={BOX} aria-hidden>
          <svg className="size-6 text-[#38bdf8]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 6c-2 0-3.25 1-4 3-1-2-2.33-3-4.5-3C3 6 1.5 7.85 2.5 9.5 3.33 10.9 5 12 8 12c3 0 4.67-1.1 5.5-2.5C14.5 7.85 13 6 12 6zm8.5 4.5C9 12 9 19 4 19c-1.5 0-2.68-.4-3.5-1 2.1 2.6 5.3 4 9 4 8.5 0 12.5-6.5 10.5-11.5z" />
          </svg>
        </span>
      );
    case "chakra-ui":
      return (
        <span className={BOX} aria-hidden>
          <svg className="size-6 text-[#319795]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.5l5.5 3.44L12 11.38 6.5 7.94 12 4.5zM6 9.56l5 3.12v5.76l-5-3.12V9.56zm12 0v5.76l-5 3.12v-5.76l5-3.12z" />
          </svg>
        </span>
      );
    default:
      return (
        <span className={cn(BOX, "text-muted-foreground text-xs")} aria-hidden>
          —
        </span>
      );
  }
}

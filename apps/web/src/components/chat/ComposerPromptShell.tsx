"use client";

import type { JSX, ReactNode } from "react";

import { cn } from "~/lib/utils";

export interface ComposerPromptShellProps {
  readonly children: ReactNode;
  readonly footer: ReactNode;
  readonly className?: string;
  readonly frameClassName?: string;
  readonly surfaceClassName?: string;
}

export function ComposerPromptShell({
  children,
  footer,
  className,
  frameClassName,
  surfaceClassName,
}: ComposerPromptShellProps): JSX.Element {
  return (
    <div className={cn("mx-auto w-full min-w-0 max-w-208", className)}>
      <div
        className={cn(
          "group rounded-[22px] p-px transition-colors duration-200",
          frameClassName ?? "bg-border/40",
        )}
      >
        <div
          className={cn(
            "rounded-[20px] border border-border bg-card transition-colors duration-200 has-focus-visible:border-ring/45",
            surfaceClassName,
          )}
        >
          {children}
          <div
            className="flex min-w-0 flex-nowrap items-center justify-between gap-2 overflow-visible px-2.5 pb-2.5 sm:px-3 sm:pb-3"
            data-composer-prompt-footer="true"
          >
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}

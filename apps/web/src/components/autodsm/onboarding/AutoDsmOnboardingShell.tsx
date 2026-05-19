"use client";

import type { JSX } from "react";
import type { ReactNode } from "react";

import { isElectron } from "~/env";
import { cn } from "~/lib/utils";

export function AutoDsmOnboardingShell(props: {
  readonly children: ReactNode;
  readonly className?: string;
}): JSX.Element {
  const { children, className } = props;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col bg-[var(--app-chrome-background)] text-foreground",
        className,
      )}
    >
      {isElectron ? (
        <div
          aria-hidden
          className="drag-region flex h-[52px] shrink-0 items-center justify-center wco:h-[env(titlebar-area-height)]"
        />
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="flex w-full max-w-[480px] flex-col gap-6">{children}</div>
      </div>
    </div>
  );
}

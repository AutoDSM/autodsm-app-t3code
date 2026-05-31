import type { JSX } from "react";
import * as HoverCard from "@radix-ui/react-hover-card";

export interface TwHoverCardProps {
  readonly handle?: string;
}

export function TwHoverCard(props: TwHoverCardProps = {}): JSX.Element {
  const { handle = "@autodsm" } = props;
  return (
    <HoverCard.Root openDelay={150}>
      <HoverCard.Trigger asChild>
        <a
          href="#"
          className="text-sm font-medium text-[var(--primary,#4f46e5)] underline-offset-4 hover:underline"
        >
          {handle}
        </a>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content
          sideOffset={6}
          className="w-72 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 shadow-md"
        >
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--muted)]" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">AutoDSM</p>
              <p className="mt-1 text-xs text-[var(--foreground)] opacity-70">
                Continuously orchestrate brand tokens, themes, and components across every surface.
              </p>
              <p className="mt-2 text-xs opacity-50">Joined March 2026</p>
            </div>
          </div>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  );
}

import type { JSX } from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";

export interface ShadcnHoverCardProps {
  readonly triggerLabel?: string;
}

export function ShadcnHoverCard(props: ShadcnHoverCardProps): JSX.Element {
  const { triggerLabel = "@nextjs" } = props;
  return (
    <HoverCardPrimitive.Root>
      <HoverCardPrimitive.Trigger asChild>
        <button
          type="button"
          className="rounded-md text-sm font-medium text-[var(--primary)] underline-offset-4 hover:underline"
        >
          {triggerLabel}
        </button>
      </HoverCardPrimitive.Trigger>
      <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          sideOffset={4}
          className="w-72 rounded-md border border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--foreground)] shadow-md"
        >
          <div className="flex gap-3">
            <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--muted)]" />
            <div className="space-y-1">
              <p className="font-semibold">@nextjs</p>
              <p className="opacity-70">The React Framework — created and maintained by Vercel.</p>
              <p className="text-xs opacity-60">Joined December 2021</p>
            </div>
          </div>
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCardPrimitive.Root>
  );
}

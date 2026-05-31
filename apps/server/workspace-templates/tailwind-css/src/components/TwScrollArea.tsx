import type { JSX } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";

export interface TwScrollAreaProps {
  readonly title?: string;
}

const TAGS = Array.from({ length: 20 }, (_, i) => `v1.2.${i}-beta`);

export function TwScrollArea(props: TwScrollAreaProps = {}): JSX.Element {
  const { title = "Tags" } = props;
  return (
    <ScrollArea.Root className="h-48 w-56 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--background)]">
      <ScrollArea.Viewport className="h-full w-full p-3">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-60">{title}</p>
        <ul className="mt-2 space-y-1 text-sm text-[var(--foreground)]">
          {TAGS.map((tag) => (
            <li key={tag} className="rounded px-2 py-1 hover:bg-[var(--muted)]">
              {tag}
            </li>
          ))}
        </ul>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        orientation="vertical"
        className="flex w-2 touch-none select-none p-0.5"
      >
        <ScrollArea.Thumb className="flex-1 rounded bg-[var(--border)]" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}

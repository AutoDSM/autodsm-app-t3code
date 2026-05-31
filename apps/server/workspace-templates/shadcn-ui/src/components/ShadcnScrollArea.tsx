import type { JSX } from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

export interface ShadcnScrollAreaProps {
  readonly itemCount?: number;
}

export function ShadcnScrollArea(props: ShadcnScrollAreaProps): JSX.Element {
  const items = Array.from({ length: props.itemCount ?? 50 }, (_, i) => `v1.2.0-beta.${i + 1}`);
  return (
    <ScrollAreaPrimitive.Root className="h-72 w-64 overflow-hidden rounded-md border border-[var(--border)]">
      <ScrollAreaPrimitive.Viewport className="h-full w-full p-4">
        <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">Tags</p>
        <div className="space-y-2 text-sm text-[var(--foreground)]">
          {items.map((tag) => (
            <div key={tag} className="border-b border-[var(--border)] pb-1.5">
              {tag}
            </div>
          ))}
        </div>
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        orientation="vertical"
        className="flex w-2 touch-none select-none bg-[var(--muted)] p-0.5"
      >
        <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-[var(--border)]" />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  );
}

import type { JSX } from "react";
import * as Popover from "@radix-ui/react-popover";

export interface TwPopoverProps {
  readonly title?: string;
}

export function TwPopover(props: TwPopoverProps = {}): JSX.Element {
  const { title = "Dimensions" } = props;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium hover:bg-[var(--muted)]"
        >
          Open popover
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          className="w-72 rounded-md border border-[var(--border)] bg-[var(--background)] p-4 shadow-md"
        >
          <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
          <p className="mt-1 text-xs opacity-70">Set the dimensions for the layer.</p>
          <div className="mt-3 space-y-2 text-sm">
            <label className="flex items-center justify-between">
              <span>Width</span>
              <input
                defaultValue="100%"
                className="w-24 rounded border border-[var(--border)] px-2 py-1 text-xs"
              />
            </label>
            <label className="flex items-center justify-between">
              <span>Height</span>
              <input
                defaultValue="240px"
                className="w-24 rounded border border-[var(--border)] px-2 py-1 text-xs"
              />
            </label>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

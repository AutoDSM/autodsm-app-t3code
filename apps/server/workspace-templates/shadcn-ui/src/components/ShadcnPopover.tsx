import type { JSX } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

export interface ShadcnPopoverProps {
  readonly triggerLabel?: string;
  readonly title?: string;
  readonly description?: string;
}

export function ShadcnPopover(props: ShadcnPopoverProps): JSX.Element {
  const {
    triggerLabel = "Open popover",
    title = "Dimensions",
    description = "Set the dimensions for the layer.",
  } = props;
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)]">
        {triggerLabel}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={4}
          className="w-72 rounded-md border border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--foreground)] shadow-md"
        >
          <div className="space-y-3">
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-xs opacity-70">{description}</p>
            </div>
            <div className="grid grid-cols-3 items-center gap-2">
              <label htmlFor="width" className="text-xs">
                Width
              </label>
              <input
                id="width"
                defaultValue="100%"
                className="col-span-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs outline-none"
              />
              <label htmlFor="height" className="text-xs">
                Height
              </label>
              <input
                id="height"
                defaultValue="25px"
                className="col-span-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs outline-none"
              />
            </div>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

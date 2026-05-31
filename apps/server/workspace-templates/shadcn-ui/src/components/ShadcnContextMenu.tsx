import type { JSX } from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";

export interface ShadcnContextMenuProps {
  readonly label?: string;
}

export function ShadcnContextMenu(props: ShadcnContextMenuProps): JSX.Element {
  const { label = "Right click here" } = props;
  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger className="flex h-32 w-72 items-center justify-center rounded-md border border-dashed border-[var(--border)] text-sm text-[var(--foreground)] opacity-70">
        {label}
      </ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content className="min-w-[10rem] rounded-md border border-[var(--border)] bg-[var(--background)] p-1 text-sm text-[var(--foreground)] shadow-md">
          <ContextMenuPrimitive.Item className="cursor-pointer rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-[var(--muted)]">
            Back
          </ContextMenuPrimitive.Item>
          <ContextMenuPrimitive.Item className="cursor-pointer rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-[var(--muted)]">
            Forward
          </ContextMenuPrimitive.Item>
          <ContextMenuPrimitive.Item className="cursor-pointer rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-[var(--muted)]">
            Reload
          </ContextMenuPrimitive.Item>
          <ContextMenuPrimitive.Separator className="my-1 h-px bg-[var(--border)]" />
          <ContextMenuPrimitive.Item className="cursor-pointer rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-[var(--muted)]">
            Save as…
          </ContextMenuPrimitive.Item>
          <ContextMenuPrimitive.Item className="cursor-pointer rounded-sm px-2 py-1.5 text-[var(--destructive,#ef4444)] outline-none data-[highlighted]:bg-[var(--muted)]">
            Delete
          </ContextMenuPrimitive.Item>
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}

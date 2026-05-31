import type { JSX } from "react";
import * as MenubarPrimitive from "@radix-ui/react-menubar";

const itemClass =
  "cursor-pointer rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-[var(--muted)]";

export function ShadcnMenubar(): JSX.Element {
  return (
    <MenubarPrimitive.Root className="flex h-9 items-center gap-0.5 rounded-md border border-[var(--border)] bg-[var(--background)] p-1 text-sm text-[var(--foreground)] shadow-sm">
      <MenubarPrimitive.Menu>
        <MenubarPrimitive.Trigger className="cursor-pointer rounded-sm px-3 py-1 outline-none data-[state=open]:bg-[var(--muted)]">
          File
        </MenubarPrimitive.Trigger>
        <MenubarPrimitive.Portal>
          <MenubarPrimitive.Content
            align="start"
            sideOffset={4}
            className="min-w-[12rem] rounded-md border border-[var(--border)] bg-[var(--background)] p-1 text-[var(--foreground)] shadow-md"
          >
            <MenubarPrimitive.Item className={itemClass}>New Tab</MenubarPrimitive.Item>
            <MenubarPrimitive.Item className={itemClass}>New Window</MenubarPrimitive.Item>
            <MenubarPrimitive.Separator className="my-1 h-px bg-[var(--border)]" />
            <MenubarPrimitive.Item className={itemClass}>Print…</MenubarPrimitive.Item>
          </MenubarPrimitive.Content>
        </MenubarPrimitive.Portal>
      </MenubarPrimitive.Menu>
      <MenubarPrimitive.Menu>
        <MenubarPrimitive.Trigger className="cursor-pointer rounded-sm px-3 py-1 outline-none data-[state=open]:bg-[var(--muted)]">
          Edit
        </MenubarPrimitive.Trigger>
        <MenubarPrimitive.Portal>
          <MenubarPrimitive.Content
            align="start"
            sideOffset={4}
            className="min-w-[12rem] rounded-md border border-[var(--border)] bg-[var(--background)] p-1 text-[var(--foreground)] shadow-md"
          >
            <MenubarPrimitive.Item className={itemClass}>Undo</MenubarPrimitive.Item>
            <MenubarPrimitive.Item className={itemClass}>Redo</MenubarPrimitive.Item>
            <MenubarPrimitive.Separator className="my-1 h-px bg-[var(--border)]" />
            <MenubarPrimitive.Item className={itemClass}>Cut</MenubarPrimitive.Item>
            <MenubarPrimitive.Item className={itemClass}>Copy</MenubarPrimitive.Item>
            <MenubarPrimitive.Item className={itemClass}>Paste</MenubarPrimitive.Item>
          </MenubarPrimitive.Content>
        </MenubarPrimitive.Portal>
      </MenubarPrimitive.Menu>
      <MenubarPrimitive.Menu>
        <MenubarPrimitive.Trigger className="cursor-pointer rounded-sm px-3 py-1 outline-none data-[state=open]:bg-[var(--muted)]">
          View
        </MenubarPrimitive.Trigger>
        <MenubarPrimitive.Portal>
          <MenubarPrimitive.Content
            align="start"
            sideOffset={4}
            className="min-w-[12rem] rounded-md border border-[var(--border)] bg-[var(--background)] p-1 text-[var(--foreground)] shadow-md"
          >
            <MenubarPrimitive.Item className={itemClass}>Reload</MenubarPrimitive.Item>
            <MenubarPrimitive.Item className={itemClass}>Toggle Sidebar</MenubarPrimitive.Item>
          </MenubarPrimitive.Content>
        </MenubarPrimitive.Portal>
      </MenubarPrimitive.Menu>
    </MenubarPrimitive.Root>
  );
}

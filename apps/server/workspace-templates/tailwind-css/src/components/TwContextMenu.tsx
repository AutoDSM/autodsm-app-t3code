import type { JSX } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";

export interface TwContextMenuProps {
  readonly label?: string;
}

const itemClass =
  "cursor-pointer rounded px-2 py-1.5 text-sm text-[var(--foreground)] outline-none data-[highlighted]:bg-[var(--muted)]";

export function TwContextMenu(props: TwContextMenuProps = {}): JSX.Element {
  const { label = "Right-click here" } = props;
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger className="flex h-32 w-64 items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] opacity-80">
        {label}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[12rem] rounded-md border border-[var(--border)] bg-[var(--background)] p-1 shadow-md">
          <ContextMenu.Item className={itemClass}>Back</ContextMenu.Item>
          <ContextMenu.Item className={itemClass}>Forward</ContextMenu.Item>
          <ContextMenu.Item className={itemClass}>Reload</ContextMenu.Item>
          <ContextMenu.Separator className="my-1 h-px bg-[var(--border)]" />
          <ContextMenu.Item className={itemClass}>More tools</ContextMenu.Item>
          <ContextMenu.Item className={itemClass}>Inspect</ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

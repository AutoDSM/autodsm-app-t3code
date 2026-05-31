import type { JSX } from "react";
import * as Menubar from "@radix-ui/react-menubar";

export interface TwMenubarProps {
  readonly label?: string;
}

const triggerClass =
  "rounded px-3 py-1.5 text-sm font-medium text-[var(--foreground)] outline-none data-[state=open]:bg-[var(--muted)] data-[highlighted]:bg-[var(--muted)]";
const itemClass =
  "cursor-pointer rounded px-2 py-1.5 text-sm text-[var(--foreground)] outline-none data-[highlighted]:bg-[var(--muted)]";

export function TwMenubar(_props: TwMenubarProps = {}): JSX.Element {
  return (
    <Menubar.Root className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--background)] p-1">
      <Menubar.Menu>
        <Menubar.Trigger className={triggerClass}>File</Menubar.Trigger>
        <Menubar.Portal>
          <Menubar.Content className="min-w-[12rem] rounded-md border border-[var(--border)] bg-[var(--background)] p-1 shadow-md">
            <Menubar.Item className={itemClass}>New tab</Menubar.Item>
            <Menubar.Item className={itemClass}>New window</Menubar.Item>
            <Menubar.Separator className="my-1 h-px bg-[var(--border)]" />
            <Menubar.Item className={itemClass}>Print…</Menubar.Item>
          </Menubar.Content>
        </Menubar.Portal>
      </Menubar.Menu>
      <Menubar.Menu>
        <Menubar.Trigger className={triggerClass}>Edit</Menubar.Trigger>
        <Menubar.Portal>
          <Menubar.Content className="min-w-[12rem] rounded-md border border-[var(--border)] bg-[var(--background)] p-1 shadow-md">
            <Menubar.Item className={itemClass}>Undo</Menubar.Item>
            <Menubar.Item className={itemClass}>Redo</Menubar.Item>
          </Menubar.Content>
        </Menubar.Portal>
      </Menubar.Menu>
      <Menubar.Menu>
        <Menubar.Trigger className={triggerClass}>View</Menubar.Trigger>
        <Menubar.Portal>
          <Menubar.Content className="min-w-[12rem] rounded-md border border-[var(--border)] bg-[var(--background)] p-1 shadow-md">
            <Menubar.Item className={itemClass}>Toggle sidebar</Menubar.Item>
            <Menubar.Item className={itemClass}>Toggle preview</Menubar.Item>
          </Menubar.Content>
        </Menubar.Portal>
      </Menubar.Menu>
    </Menubar.Root>
  );
}

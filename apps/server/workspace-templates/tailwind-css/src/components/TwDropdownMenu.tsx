import type { JSX } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export interface TwDropdownMenuProps {
  readonly label?: string;
}

const itemClass =
  "cursor-pointer rounded px-2 py-1.5 text-sm text-[var(--foreground)] outline-none data-[highlighted]:bg-[var(--muted)]";

const triggerClass =
  "inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium hover:bg-[var(--muted)]";

export function TwDropdownMenu(props: TwDropdownMenuProps = {}): JSX.Element {
  const { label = "Options" } = props;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={triggerClass}>{label} ▾</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={4}
          className="min-w-[12rem] rounded-md border border-[var(--border)] bg-[var(--background)] p-1 shadow-md"
        >
          <DropdownMenu.Label className="px-2 py-1 text-xs uppercase tracking-wide opacity-60">
            My account
          </DropdownMenu.Label>
          <DropdownMenu.Item className={itemClass}>Profile</DropdownMenu.Item>
          <DropdownMenu.Item className={itemClass}>Billing</DropdownMenu.Item>
          <DropdownMenu.Item className={itemClass}>Team</DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
          <DropdownMenu.Item className={itemClass}>Log out</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function TwDropdownMenuRightAlign(props: TwDropdownMenuProps = {}): JSX.Element {
  const { label = "Right aligned" } = props;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className={triggerClass}>{label} ▾</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="min-w-[12rem] rounded-md border border-[var(--border)] bg-[var(--background)] p-1 shadow-md"
        >
          <DropdownMenu.Item className={itemClass}>Edit</DropdownMenu.Item>
          <DropdownMenu.Item className={itemClass}>Duplicate</DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-[var(--border)]" />
          <DropdownMenu.Item className={itemClass}>Archive</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

import type { JSX } from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";

export type ShadcnDropdownMenuAlign = "start" | "center" | "end";

export interface ShadcnDropdownMenuProps {
  readonly triggerLabel?: string;
  readonly align?: ShadcnDropdownMenuAlign;
}

export function ShadcnDropdownMenu(props: ShadcnDropdownMenuProps): JSX.Element {
  const { triggerLabel = "Open menu", align = "start" } = props;
  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)]">
        {triggerLabel}
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          sideOffset={4}
          className="min-w-[12rem] rounded-md border border-[var(--border)] bg-[var(--background)] p-1 text-sm text-[var(--foreground)] shadow-md"
        >
          <DropdownMenuPrimitive.Label className="px-2 py-1.5 text-xs opacity-60">
            My Account
          </DropdownMenuPrimitive.Label>
          <DropdownMenuPrimitive.Separator className="my-1 h-px bg-[var(--border)]" />
          <DropdownMenuPrimitive.Item className="cursor-pointer rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-[var(--muted)]">
            Profile
          </DropdownMenuPrimitive.Item>
          <DropdownMenuPrimitive.Item className="cursor-pointer rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-[var(--muted)]">
            Billing
          </DropdownMenuPrimitive.Item>
          <DropdownMenuPrimitive.Item className="cursor-pointer rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-[var(--muted)]">
            Settings
          </DropdownMenuPrimitive.Item>
          <DropdownMenuPrimitive.Separator className="my-1 h-px bg-[var(--border)]" />
          <DropdownMenuPrimitive.Item className="cursor-pointer rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-[var(--muted)]">
            Log out
          </DropdownMenuPrimitive.Item>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

export const ShadcnDropdownMenuRightAlign = (
  props: Omit<ShadcnDropdownMenuProps, "align">,
): JSX.Element => <ShadcnDropdownMenu {...props} align="end" />;

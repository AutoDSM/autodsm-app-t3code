import type { JSX } from "react";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";

export interface TwNavigationMenuProps {
  readonly label?: string;
}

const triggerClass =
  "rounded px-3 py-1.5 text-sm font-medium text-[var(--foreground)] outline-none hover:bg-[var(--muted)] data-[state=open]:bg-[var(--muted)]";

export function TwNavigationMenu(_props: TwNavigationMenuProps = {}): JSX.Element {
  return (
    <NavigationMenu.Root className="relative">
      <NavigationMenu.List className="flex list-none gap-1 rounded-md border border-[var(--border)] bg-[var(--background)] p-1">
        <NavigationMenu.Item>
          <NavigationMenu.Trigger className={triggerClass}>
            Getting started ▾
          </NavigationMenu.Trigger>
          <NavigationMenu.Content className="absolute left-0 top-full mt-2 w-72 rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-sm shadow-md">
            <p className="font-medium text-[var(--foreground)]">Introduction</p>
            <p className="mt-1 text-xs opacity-70">A quick orientation to AutoDSM workflows.</p>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Trigger className={triggerClass}>Components ▾</NavigationMenu.Trigger>
          <NavigationMenu.Content className="absolute left-0 top-full mt-2 w-72 rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-sm shadow-md">
            <p className="font-medium text-[var(--foreground)]">Browse components</p>
            <p className="mt-1 text-xs opacity-70">All design-system primitives in one library.</p>
          </NavigationMenu.Content>
        </NavigationMenu.Item>
        <NavigationMenu.Item>
          <NavigationMenu.Link
            href="#"
            className="rounded px-3 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
          >
            Documentation
          </NavigationMenu.Link>
        </NavigationMenu.Item>
      </NavigationMenu.List>
    </NavigationMenu.Root>
  );
}

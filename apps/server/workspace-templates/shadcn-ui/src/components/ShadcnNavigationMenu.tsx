import type { JSX } from "react";
import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu";

export function ShadcnNavigationMenu(): JSX.Element {
  return (
    <NavigationMenuPrimitive.Root className="relative z-10 flex w-max">
      <NavigationMenuPrimitive.List className="flex list-none items-center gap-1 rounded-md bg-[var(--background)] p-1">
        <NavigationMenuPrimitive.Item>
          <NavigationMenuPrimitive.Trigger className="rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] data-[state=open]:bg-[var(--muted)]">
            Getting started
          </NavigationMenuPrimitive.Trigger>
          <NavigationMenuPrimitive.Content className="absolute left-0 top-full mt-2 w-[400px] rounded-md border border-[var(--border)] bg-[var(--background)] p-4 text-[var(--foreground)] shadow-md">
            <ul className="grid grid-cols-2 gap-3">
              <li>
                <p className="text-sm font-semibold">Introduction</p>
                <p className="text-xs opacity-70">Re-usable components built with Radix UI.</p>
              </li>
              <li>
                <p className="text-sm font-semibold">Installation</p>
                <p className="text-xs opacity-70">How to install dependencies and structure.</p>
              </li>
              <li>
                <p className="text-sm font-semibold">Typography</p>
                <p className="text-xs opacity-70">Styles for headings, paragraphs and lists.</p>
              </li>
              <li>
                <p className="text-sm font-semibold">Theming</p>
                <p className="text-xs opacity-70">Customize tokens for dark and light modes.</p>
              </li>
            </ul>
          </NavigationMenuPrimitive.Content>
        </NavigationMenuPrimitive.Item>
        <NavigationMenuPrimitive.Item>
          <NavigationMenuPrimitive.Link
            href="#"
            className="block rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
          >
            Documentation
          </NavigationMenuPrimitive.Link>
        </NavigationMenuPrimitive.Item>
        <NavigationMenuPrimitive.Item>
          <NavigationMenuPrimitive.Link
            href="#"
            className="block rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
          >
            Pricing
          </NavigationMenuPrimitive.Link>
        </NavigationMenuPrimitive.Item>
      </NavigationMenuPrimitive.List>
      <NavigationMenuPrimitive.Viewport className="origin-top-center mt-2" />
    </NavigationMenuPrimitive.Root>
  );
}

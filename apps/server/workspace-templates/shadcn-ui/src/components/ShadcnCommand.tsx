import type { JSX } from "react";
import { Command } from "cmdk";

export interface ShadcnCommandProps {
  readonly placeholder?: string;
}

export function ShadcnCommand(props: ShadcnCommandProps): JSX.Element {
  const { placeholder = "Type a command or search…" } = props;
  return (
    <Command className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] shadow-md">
      <Command.Input
        placeholder={placeholder}
        className="w-full border-b border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none"
      />
      <Command.List className="max-h-64 overflow-y-auto p-1">
        <Command.Empty className="px-3 py-6 text-center text-sm opacity-60">
          No results found.
        </Command.Empty>
        <Command.Group heading="Suggestions" className="px-1 py-1.5 text-xs opacity-60">
          <Command.Item className="cursor-pointer rounded-md px-3 py-1.5 text-sm aria-selected:bg-[var(--muted)]">
            Calendar
          </Command.Item>
          <Command.Item className="cursor-pointer rounded-md px-3 py-1.5 text-sm aria-selected:bg-[var(--muted)]">
            Search emoji
          </Command.Item>
          <Command.Item className="cursor-pointer rounded-md px-3 py-1.5 text-sm aria-selected:bg-[var(--muted)]">
            Calculator
          </Command.Item>
        </Command.Group>
        <Command.Group heading="Settings" className="px-1 py-1.5 text-xs opacity-60">
          <Command.Item className="cursor-pointer rounded-md px-3 py-1.5 text-sm aria-selected:bg-[var(--muted)]">
            Profile
          </Command.Item>
          <Command.Item className="cursor-pointer rounded-md px-3 py-1.5 text-sm aria-selected:bg-[var(--muted)]">
            Billing
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command>
  );
}

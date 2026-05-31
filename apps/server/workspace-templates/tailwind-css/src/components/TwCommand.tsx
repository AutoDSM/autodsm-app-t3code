import type { JSX } from "react";
import { Command } from "cmdk";

export interface TwCommandProps {
  readonly placeholder?: string;
}

export function TwCommand(props: TwCommandProps = {}): JSX.Element {
  const { placeholder = "Type a command or search…" } = props;
  return (
    <Command className="w-80 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] shadow-sm">
      <Command.Input
        placeholder={placeholder}
        className="w-full border-b border-[var(--border)] bg-transparent px-3 py-2 text-sm placeholder:opacity-50 focus-visible:outline-none"
      />
      <Command.List className="max-h-72 overflow-auto p-2">
        <Command.Empty className="px-2 py-1.5 text-sm opacity-60">No results found.</Command.Empty>
        <Command.Group heading="Suggestions" className="text-xs uppercase tracking-wide opacity-60">
          <Command.Item className="cursor-pointer rounded px-2 py-1.5 text-sm aria-selected:bg-[var(--muted)]">
            Calendar
          </Command.Item>
          <Command.Item className="cursor-pointer rounded px-2 py-1.5 text-sm aria-selected:bg-[var(--muted)]">
            Search emoji
          </Command.Item>
          <Command.Item className="cursor-pointer rounded px-2 py-1.5 text-sm aria-selected:bg-[var(--muted)]">
            Launch component
          </Command.Item>
        </Command.Group>
        <Command.Group
          heading="Settings"
          className="mt-2 text-xs uppercase tracking-wide opacity-60"
        >
          <Command.Item className="cursor-pointer rounded px-2 py-1.5 text-sm aria-selected:bg-[var(--muted)]">
            Profile
          </Command.Item>
          <Command.Item className="cursor-pointer rounded px-2 py-1.5 text-sm aria-selected:bg-[var(--muted)]">
            Appearance
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command>
  );
}

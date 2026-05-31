import { useState } from "react";
import type { JSX } from "react";
import { Command } from "cmdk";

export interface ShadcnComboboxOption {
  readonly value: string;
  readonly label: string;
}

export interface ShadcnComboboxProps {
  readonly options?: readonly ShadcnComboboxOption[];
  readonly placeholder?: string;
}

const DEFAULT_OPTIONS: readonly ShadcnComboboxOption[] = [
  { value: "next.js", label: "Next.js" },
  { value: "sveltekit", label: "SvelteKit" },
  { value: "nuxt.js", label: "Nuxt.js" },
  { value: "remix", label: "Remix" },
  { value: "astro", label: "Astro" },
];

export function ShadcnCombobox(props: ShadcnComboboxProps): JSX.Element {
  const options = props.options ?? DEFAULT_OPTIONS;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative w-64">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
      >
        <span className={selected ? "" : "opacity-60"}>
          {selected ? selected.label : (props.placeholder ?? "Select framework…")}
        </span>
        <span className="opacity-60">▾</span>
      </button>
      {open ? (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-md border border-[var(--border)] bg-[var(--background)] shadow-md">
          <Command className="w-full text-[var(--foreground)]">
            <Command.Input
              placeholder="Search framework…"
              className="w-full border-b border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none"
            />
            <Command.List className="max-h-56 overflow-y-auto p-1">
              <Command.Empty className="px-3 py-2 text-sm opacity-60">
                No framework found.
              </Command.Empty>
              {options.map((option) => (
                <Command.Item
                  key={option.value}
                  value={option.value}
                  onSelect={(v) => {
                    setValue(v === value ? "" : v);
                    setOpen(false);
                  }}
                  className="cursor-pointer rounded-md px-3 py-1.5 text-sm aria-selected:bg-[var(--muted)]"
                >
                  {option.label}
                  {value === option.value ? <span className="ml-2 opacity-60">✓</span> : null}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </div>
      ) : null}
    </div>
  );
}

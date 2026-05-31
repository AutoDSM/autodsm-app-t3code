import { useState } from "react";
import type { JSX } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";

export interface ShadcnSelectOption {
  readonly value: string;
  readonly label: string;
}

export interface ShadcnSelectProps {
  readonly options?: readonly ShadcnSelectOption[];
  readonly placeholder?: string;
  readonly multi?: boolean;
}

const DEFAULT_OPTIONS: readonly ShadcnSelectOption[] = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
  { value: "blueberry", label: "Blueberry" },
  { value: "grapes", label: "Grapes" },
  { value: "pineapple", label: "Pineapple" },
];

function ShadcnSelectSingle(props: ShadcnSelectProps): JSX.Element {
  const options = props.options ?? DEFAULT_OPTIONS;
  return (
    <SelectPrimitive.Root>
      <SelectPrimitive.Trigger className="inline-flex h-9 w-56 items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none">
        <SelectPrimitive.Value placeholder={props.placeholder ?? "Select a fruit"} />
        <SelectPrimitive.Icon className="opacity-60">▾</SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] shadow-md">
          <SelectPrimitive.Viewport className="p-1">
            <SelectPrimitive.Group>
              <SelectPrimitive.Label className="px-2 py-1.5 text-xs opacity-60">
                Fruits
              </SelectPrimitive.Label>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="cursor-pointer rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-[var(--muted)]"
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Group>
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

function ShadcnSelectMultiImpl(props: ShadcnSelectProps): JSX.Element {
  const options = props.options ?? DEFAULT_OPTIONS;
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<string[]>([]);
  const toggle = (v: string) =>
    setValues((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  return (
    <div className="relative w-64">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
      >
        <span className={values.length ? "" : "opacity-60"}>
          {values.length ? `${values.length} selected` : (props.placeholder ?? "Select fruits")}
        </span>
        <span className="opacity-60">▾</span>
      </button>
      {open ? (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-md border border-[var(--border)] bg-[var(--background)] p-1 shadow-md">
          {options.map((option) => {
            const checked = values.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggle(option.value)}
                className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm text-[var(--foreground)] hover:bg-[var(--muted)]"
              >
                <span>{option.label}</span>
                {checked ? <span>✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function ShadcnSelect(props: ShadcnSelectProps): JSX.Element {
  if (props.multi) {
    return <ShadcnSelectMultiImpl {...props} />;
  }
  return <ShadcnSelectSingle {...props} />;
}

export const ShadcnSelectMulti = (props: Omit<ShadcnSelectProps, "multi">): JSX.Element => (
  <ShadcnSelect {...props} multi />
);

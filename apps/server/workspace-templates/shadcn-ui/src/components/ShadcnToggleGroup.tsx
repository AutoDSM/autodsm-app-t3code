import { useState } from "react";
import type { JSX } from "react";

export interface ShadcnToggleGroupOption {
  readonly value: string;
  readonly label: string;
}

export interface ShadcnToggleGroupProps {
  readonly options?: readonly ShadcnToggleGroupOption[];
  readonly multi?: boolean;
  readonly defaultValue?: string | readonly string[];
}

const DEFAULT_OPTIONS: readonly ShadcnToggleGroupOption[] = [
  { value: "bold", label: "B" },
  { value: "italic", label: "I" },
  { value: "underline", label: "U" },
];

export function ShadcnToggleGroup(props: ShadcnToggleGroupProps): JSX.Element {
  const options = props.options ?? DEFAULT_OPTIONS;
  const multi = props.multi ?? false;
  const [values, setValues] = useState<string[]>(() => {
    if (Array.isArray(props.defaultValue)) return [...(props.defaultValue as string[])];
    if (typeof props.defaultValue === "string") return [props.defaultValue];
    return [];
  });
  const toggle = (v: string) => {
    setValues((prev) => {
      const has = prev.includes(v);
      if (multi) return has ? prev.filter((x) => x !== v) : [...prev, v];
      return has ? [] : [v];
    });
  };
  return (
    <div
      role="group"
      className="inline-flex items-center gap-0 rounded-md border border-[var(--border)] p-0.5"
    >
      {options.map((option) => {
        const active = values.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(option.value)}
            className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-sm px-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-[var(--muted)] text-[var(--foreground)]"
                : "text-[var(--foreground)] opacity-80 hover:bg-[var(--muted)]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export const ShadcnToggleGroupMulti = (
  props: Omit<ShadcnToggleGroupProps, "multi">,
): JSX.Element => <ShadcnToggleGroup {...props} multi />;

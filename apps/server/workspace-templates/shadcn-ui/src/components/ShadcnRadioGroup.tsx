import { useState } from "react";
import type { JSX } from "react";

export interface ShadcnRadioOption {
  readonly value: string;
  readonly label: string;
}

export interface ShadcnRadioGroupProps {
  readonly options?: readonly ShadcnRadioOption[];
  readonly defaultValue?: string;
  readonly orientation?: "vertical" | "horizontal";
  readonly name?: string;
}

const DEFAULT_OPTIONS: readonly ShadcnRadioOption[] = [
  { value: "default", label: "Default" },
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
];

export function ShadcnRadioGroup(props: ShadcnRadioGroupProps): JSX.Element {
  const options = props.options ?? DEFAULT_OPTIONS;
  const orientation = props.orientation ?? "vertical";
  const name = props.name ?? "shadcn-radio";
  const [value, setValue] = useState(props.defaultValue ?? options[0]?.value ?? "");

  return (
    <div
      role="radiogroup"
      className={orientation === "horizontal" ? "flex flex-row gap-4" : "flex flex-col gap-2"}
    >
      {options.map((option) => {
        const selected = value === option.value;
        const id = `${name}-${option.value}`;
        return (
          <label
            key={option.value}
            htmlFor={id}
            className="flex items-center gap-2 text-sm text-[var(--foreground)]"
          >
            <button
              id={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setValue(option.value)}
              className={`flex h-4 w-4 items-center justify-center rounded-full border border-[var(--border)] ${
                selected ? "border-[var(--primary)]" : ""
              }`}
            >
              {selected ? <span className="h-2 w-2 rounded-full bg-[var(--primary)]" /> : null}
            </button>
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

export const ShadcnRadioGroupHorizontal = (
  props: Omit<ShadcnRadioGroupProps, "orientation">,
): JSX.Element => <ShadcnRadioGroup {...props} orientation="horizontal" />;

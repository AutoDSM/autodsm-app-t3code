import type { JSX } from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";

export interface TwRadioGroupProps {
  readonly label?: string;
}

const itemClass =
  "flex h-4 w-4 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)] data-[state=checked]:border-[var(--primary,#4f46e5)]";

export function TwRadioGroup(_props: TwRadioGroupProps = {}): JSX.Element {
  return (
    <RadioGroup.Root
      defaultValue="comfortable"
      className="space-y-2 text-sm text-[var(--foreground)]"
    >
      {(["default", "comfortable", "compact"] as const).map((value) => (
        <label key={value} className="flex items-center gap-2">
          <RadioGroup.Item value={value} className={itemClass}>
            <RadioGroup.Indicator className="h-2 w-2 rounded-full bg-[var(--primary,#4f46e5)]" />
          </RadioGroup.Item>
          <span className="capitalize">{value}</span>
        </label>
      ))}
    </RadioGroup.Root>
  );
}

export function TwRadioGroupHorizontal(_props: TwRadioGroupProps = {}): JSX.Element {
  return (
    <RadioGroup.Root
      defaultValue="md"
      className="inline-flex gap-4 text-sm text-[var(--foreground)]"
    >
      {(["sm", "md", "lg"] as const).map((value) => (
        <label key={value} className="inline-flex items-center gap-2">
          <RadioGroup.Item value={value} className={itemClass}>
            <RadioGroup.Indicator className="h-2 w-2 rounded-full bg-[var(--primary,#4f46e5)]" />
          </RadioGroup.Item>
          <span className="uppercase">{value}</span>
        </label>
      ))}
    </RadioGroup.Root>
  );
}

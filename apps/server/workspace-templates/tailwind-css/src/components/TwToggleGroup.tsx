import type { JSX } from "react";
import * as ToggleGroup from "@radix-ui/react-toggle-group";

export interface TwToggleGroupProps {
  readonly label?: string;
}

const itemClass =
  "inline-flex h-9 min-w-9 items-center justify-center px-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] data-[state=on]:bg-[var(--muted)]";

export function TwToggleGroup(_props: TwToggleGroupProps = {}): JSX.Element {
  return (
    <ToggleGroup.Root
      type="single"
      defaultValue="left"
      className="inline-flex rounded-md border border-[var(--border)] bg-[var(--background)] overflow-hidden"
    >
      <ToggleGroup.Item value="left" className={itemClass}>
        Left
      </ToggleGroup.Item>
      <ToggleGroup.Item value="center" className={itemClass + " border-x border-[var(--border)]"}>
        Center
      </ToggleGroup.Item>
      <ToggleGroup.Item value="right" className={itemClass}>
        Right
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  );
}

export function TwToggleGroupMulti(_props: TwToggleGroupProps = {}): JSX.Element {
  return (
    <ToggleGroup.Root
      type="multiple"
      defaultValue={["bold", "italic"]}
      className="inline-flex rounded-md border border-[var(--border)] bg-[var(--background)] overflow-hidden"
    >
      <ToggleGroup.Item value="bold" className={itemClass}>
        B
      </ToggleGroup.Item>
      <ToggleGroup.Item value="italic" className={itemClass + " border-x border-[var(--border)]"}>
        I
      </ToggleGroup.Item>
      <ToggleGroup.Item value="underline" className={itemClass}>
        U
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  );
}

import type { JSX } from "react";
import * as Select from "@radix-ui/react-select";

export interface TwSelectProps {
  readonly placeholder?: string;
}

const triggerClass =
  "inline-flex w-56 items-center justify-between rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ring)]";

const itemClass =
  "cursor-pointer rounded px-3 py-1.5 text-sm text-[var(--foreground)] outline-none data-[highlighted]:bg-[var(--muted)]";

export function TwSelect(props: TwSelectProps = {}): JSX.Element {
  const { placeholder = "Select a fruit" } = props;
  return (
    <Select.Root>
      <Select.Trigger className={triggerClass}>
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="opacity-60">▾</Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--background)] shadow-md">
          <Select.Viewport className="p-1">
            <Select.Group>
              <Select.Label className="px-3 py-1 text-xs uppercase tracking-wide opacity-60">
                Fruits
              </Select.Label>
              {["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"].map((fruit) => (
                <Select.Item key={fruit} value={fruit.toLowerCase()} className={itemClass}>
                  <Select.ItemText>{fruit}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Group>
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export function TwSelectMulti(_props: TwSelectProps = {}): JSX.Element {
  return (
    <div className="w-64">
      <div className="mb-1 flex flex-wrap gap-1">
        {["Design", "Engineering"].map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--foreground)]"
          >
            {tag}{" "}
            <span aria-hidden="true" className="opacity-50">
              ×
            </span>
          </span>
        ))}
      </div>
      <Select.Root>
        <Select.Trigger className={triggerClass + " w-full"}>
          <Select.Value placeholder="Add a department" />
          <Select.Icon className="opacity-60">▾</Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--background)] shadow-md">
            <Select.Viewport className="p-1">
              {["Design", "Engineering", "Product", "Marketing", "Operations"].map((dept) => (
                <Select.Item key={dept} value={dept.toLowerCase()} className={itemClass}>
                  <Select.ItemText>{dept}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

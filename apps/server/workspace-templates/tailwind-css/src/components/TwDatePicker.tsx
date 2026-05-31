import { useState, type JSX } from "react";
import * as Popover from "@radix-ui/react-popover";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/style.css";

export interface TwDatePickerProps {
  readonly placeholder?: string;
}

export function TwDatePicker(props: TwDatePickerProps = {}): JSX.Element {
  const { placeholder = "Pick a date" } = props;
  const [date, setDate] = useState<Date | undefined>(undefined);
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex w-56 items-center justify-between rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--muted)]"
        >
          <span>{date ? format(date, "PPP") : placeholder}</span>
          <span aria-hidden="true" className="opacity-60">
            📅
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 shadow-lg"
        >
          <DayPicker mode="single" selected={date} onSelect={setDate} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

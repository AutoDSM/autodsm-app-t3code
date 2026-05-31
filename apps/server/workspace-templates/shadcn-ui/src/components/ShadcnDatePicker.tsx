import { useState } from "react";
import type { JSX } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/style.css";

export interface ShadcnDatePickerProps {
  readonly defaultDate?: Date;
  readonly placeholder?: string;
}

export function ShadcnDatePicker(props: ShadcnDatePickerProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | undefined>(props.defaultDate);
  return (
    <div className="relative w-64">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
      >
        <span aria-hidden="true">📅</span>
        <span className={selected ? "" : "opacity-60"}>
          {selected ? format(selected, "PPP") : (props.placeholder ?? "Pick a date")}
        </span>
      </button>
      {open ? (
        <div className="absolute left-0 z-50 mt-1 rounded-md border border-[var(--border)] bg-[var(--background)] p-3 shadow-md">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(d) => {
              setSelected(d);
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

import { useState } from "react";
import type { JSX } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

export interface ShadcnCalendarProps {
  readonly defaultMonth?: Date;
  readonly selected?: Date;
}

export function ShadcnCalendar(props: ShadcnCalendarProps): JSX.Element {
  const [selected, setSelected] = useState<Date | undefined>(props.selected ?? new Date());
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-[var(--foreground)]">
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={setSelected}
        defaultMonth={props.defaultMonth ?? new Date()}
      />
    </div>
  );
}

import { useState, type JSX } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

export interface TwCalendarProps {
  readonly defaultDate?: Date;
}

export function TwCalendar(props: TwCalendarProps = {}): JSX.Element {
  const { defaultDate = new Date() } = props;
  const [selected, setSelected] = useState<Date | undefined>(defaultDate);
  return (
    <div className="inline-block rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 text-[var(--foreground)]">
      <DayPicker mode="single" selected={selected} onSelect={setSelected} showOutsideDays />
    </div>
  );
}

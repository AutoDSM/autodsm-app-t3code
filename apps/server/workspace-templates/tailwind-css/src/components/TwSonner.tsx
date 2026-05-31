import type { JSX } from "react";
import { Toaster, toast } from "sonner";

export interface TwSonnerProps {
  readonly label?: string;
}

export function TwSonner(props: TwSonnerProps = {}): JSX.Element {
  const { label = "Show toast" } = props;
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          toast("Event has been created", { description: "Sunday, December 03, 2026 at 9:00 AM" })
        }
        className="inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium hover:bg-[var(--muted)]"
      >
        {label}
      </button>
      <Toaster position="bottom-right" />
    </div>
  );
}

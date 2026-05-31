import type { JSX } from "react";
import { toast, Toaster } from "sonner";

export interface ShadcnSonnerProps {
  readonly buttonLabel?: string;
  readonly toastMessage?: string;
}

export function ShadcnSonner(props: ShadcnSonnerProps): JSX.Element {
  const { buttonLabel = "Show toast", toastMessage = "Event has been created" } = props;
  return (
    <div>
      <Toaster
        toastOptions={{
          style: {
            background: "var(--background)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
          },
        }}
      />
      <button
        type="button"
        onClick={() =>
          toast(toastMessage, {
            description: "Sunday, December 03, 2026 at 9:00 AM",
            action: {
              label: "Undo",
              onClick: () => undefined,
            },
          })
        }
        className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)]"
      >
        {buttonLabel}
      </button>
    </div>
  );
}

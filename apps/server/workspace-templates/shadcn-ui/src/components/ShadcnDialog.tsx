import { useState } from "react";
import type { JSX } from "react";

export interface ShadcnDialogProps {
  readonly title?: string;
  readonly description?: string;
}

export function ShadcnDialog(props: ShadcnDialogProps): JSX.Element {
  const { title = "Delete project?", description = "This action cannot be undone." } = props;
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)]"
      >
        Open dialog
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-[var(--background)] p-6 shadow-lg">
            <p className="text-base font-semibold text-[var(--foreground)]">{title}</p>
            <p className="mt-2 text-sm text-[var(--foreground)] opacity-70">{description}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md bg-[var(--destructive,#ef4444)] px-3 py-1.5 text-sm font-medium text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

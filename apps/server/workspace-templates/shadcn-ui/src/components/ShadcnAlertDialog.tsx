import { useState } from "react";
import type { JSX } from "react";

export type ShadcnAlertDialogVariant = "default" | "destructive";

export interface ShadcnAlertDialogProps {
  readonly title?: string;
  readonly description?: string;
  readonly cancelLabel?: string;
  readonly confirmLabel?: string;
  readonly variant?: ShadcnAlertDialogVariant;
}

export function ShadcnAlertDialog(props: ShadcnAlertDialogProps): JSX.Element {
  const {
    title = "Are you absolutely sure?",
    description = "This action cannot be undone. This will permanently delete your account and remove your data from our servers.",
    cancelLabel = "Cancel",
    confirmLabel = "Continue",
    variant = "default",
  } = props;
  const [open, setOpen] = useState(true);
  const confirmClass =
    variant === "destructive"
      ? "rounded-md bg-[var(--destructive,#ef4444)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
      : "rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90";
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)]"
      >
        Open alert dialog
      </button>
      {open ? (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        >
          <div className="w-full max-w-md rounded-lg bg-[var(--background)] p-6 shadow-lg">
            <p className="text-lg font-semibold text-[var(--foreground)]">{title}</p>
            <p className="mt-2 text-sm text-[var(--foreground)] opacity-70">{description}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)]"
              >
                {cancelLabel}
              </button>
              <button type="button" onClick={() => setOpen(false)} className={confirmClass}>
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const ShadcnAlertDialogDestructive = (
  props: Omit<ShadcnAlertDialogProps, "variant">,
): JSX.Element => (
  <ShadcnAlertDialog
    {...props}
    variant="destructive"
    confirmLabel={props.confirmLabel ?? "Delete account"}
  />
);

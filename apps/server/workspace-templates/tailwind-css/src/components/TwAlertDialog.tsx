import type { JSX } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";

export interface TwAlertDialogProps {
  readonly title?: string;
  readonly description?: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
}

export function TwAlertDialog(props: TwAlertDialogProps = {}): JSX.Element {
  const {
    title = "Are you absolutely sure?",
    description = "This action cannot be undone. This will permanently affect your data.",
    confirmLabel = "Continue",
    cancelLabel = "Cancel",
  } = props;
  return (
    <AlertDialog.Root defaultOpen>
      <AlertDialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
        >
          Open alert
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-6 shadow-lg">
          <AlertDialog.Title className="text-base font-semibold text-[var(--foreground)]">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-[var(--foreground)] opacity-75">
            {description}
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--muted)]"
              >
                {cancelLabel}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                className="rounded-md bg-[var(--primary,#4f46e5)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                {confirmLabel}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function TwAlertDialogDestructive(props: TwAlertDialogProps = {}): JSX.Element {
  const {
    title = "Delete this project?",
    description = "This permanently deletes the project and all of its data. This cannot be undone.",
    confirmLabel = "Delete",
    cancelLabel = "Cancel",
  } = props;
  return (
    <AlertDialog.Root defaultOpen>
      <AlertDialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
        >
          Delete
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-6 shadow-lg">
          <AlertDialog.Title className="text-base font-semibold text-red-600">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-[var(--foreground)] opacity-75">
            {description}
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                className="rounded-md border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--muted)]"
              >
                {cancelLabel}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                {confirmLabel}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

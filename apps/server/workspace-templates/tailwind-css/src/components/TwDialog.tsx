import type { JSX } from "react";
import * as Dialog from "@radix-ui/react-dialog";

export interface TwDialogProps {
  readonly title?: string;
  readonly description?: string;
}

export function TwDialog(props: TwDialogProps = {}): JSX.Element {
  const {
    title = "Edit profile",
    description = "Make changes to your profile here. Click save when you're done.",
  } = props;
  return (
    <Dialog.Root defaultOpen>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--muted)]"
        >
          Open dialog
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-6 shadow-lg">
          <Dialog.Title className="text-base font-semibold text-[var(--foreground)]">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-[var(--foreground)] opacity-70">
            {description}
          </Dialog.Description>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="text-[var(--foreground)]">Name</span>
              <input
                defaultValue="Pedro Duarte"
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-[var(--foreground)]">Username</span>
              <input
                defaultValue="@peduarte"
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--muted)]"
              >
                Cancel
              </button>
            </Dialog.Close>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md bg-[var(--primary,#4f46e5)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Save changes
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function TwDialogLg(props: TwDialogProps = {}): JSX.Element {
  const {
    title = "Project settings",
    description = "Configure your workspace, team access, and integrations.",
  } = props;
  return (
    <Dialog.Root defaultOpen>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--muted)]"
        >
          Open large dialog
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-8 shadow-lg">
          <Dialog.Title className="text-lg font-semibold text-[var(--foreground)]">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-[var(--foreground)] opacity-70">
            {description}
          </Dialog.Description>
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded border border-[var(--border)] p-4">
              <h4 className="font-medium text-[var(--foreground)]">Workspace</h4>
              <p className="mt-1 opacity-70">Manage workspace details, branding, and theme.</p>
            </div>
            <div className="rounded border border-[var(--border)] p-4">
              <h4 className="font-medium text-[var(--foreground)]">Team</h4>
              <p className="mt-1 opacity-70">Invite teammates and assign roles.</p>
            </div>
            <div className="rounded border border-[var(--border)] p-4">
              <h4 className="font-medium text-[var(--foreground)]">Integrations</h4>
              <p className="mt-1 opacity-70">Connect Figma, GitHub, and shipping pipelines.</p>
            </div>
            <div className="rounded border border-[var(--border)] p-4">
              <h4 className="font-medium text-[var(--foreground)]">Danger zone</h4>
              <p className="mt-1 opacity-70">Archive or delete this project.</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--muted)]"
              >
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

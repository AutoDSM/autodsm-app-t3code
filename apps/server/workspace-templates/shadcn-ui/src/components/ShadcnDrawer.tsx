import { useState } from "react";
import type { JSX } from "react";
import { Drawer } from "vaul";

export interface ShadcnDrawerProps {
  readonly title?: string;
  readonly description?: string;
}

export function ShadcnDrawer(props: ShadcnDrawerProps): JSX.Element {
  const { title = "Move Goal", description = "Set your daily activity goal." } = props;
  const [open, setOpen] = useState(false);
  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)]">
        Open drawer
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-[60vh] flex-col rounded-t-[10px] bg-[var(--background)] text-[var(--foreground)]">
          <div className="mx-auto mt-3 h-1.5 w-12 flex-shrink-0 rounded-full bg-[var(--muted)]" />
          <div className="mx-auto w-full max-w-md px-6 pb-8 pt-4">
            <Drawer.Title className="text-lg font-semibold">{title}</Drawer.Title>
            <Drawer.Description className="mt-1 text-sm opacity-70">
              {description}
            </Drawer.Description>
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                type="button"
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
              >
                −
              </button>
              <span className="text-3xl font-bold">350</span>
              <button
                type="button"
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 w-full rounded-md bg-[var(--primary)] py-2 text-sm font-medium text-[var(--primary-foreground)]"
            >
              Submit
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

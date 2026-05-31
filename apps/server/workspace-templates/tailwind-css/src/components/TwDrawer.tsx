import type { JSX } from "react";
import { Drawer } from "vaul";

export interface TwDrawerProps {
  readonly title?: string;
  readonly description?: string;
}

const triggerClass =
  "inline-flex items-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--muted)]";

export function TwDrawer(props: TwDrawerProps = {}): JSX.Element {
  const { title = "Drawer", description = "A bottom-anchored drawer powered by vaul." } = props;
  return (
    <Drawer.Root>
      <Drawer.Trigger className={triggerClass}>Open drawer</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mt-24 flex h-[60%] flex-col rounded-t-[10px] border border-[var(--border)] bg-[var(--background)] p-6">
          <div className="mx-auto mb-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-[var(--border)]" />
          <Drawer.Title className="text-base font-semibold text-[var(--foreground)]">
            {title}
          </Drawer.Title>
          <Drawer.Description className="mt-1 text-sm text-[var(--foreground)] opacity-70">
            {description}
          </Drawer.Description>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function DrawerSide({
  direction,
  label,
}: {
  direction: "left" | "right" | "top" | "bottom";
  label: string;
}): JSX.Element {
  return (
    <Drawer.Root direction={direction}>
      <Drawer.Trigger className={triggerClass}>{label}</Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Drawer.Content
          className={
            direction === "left"
              ? "fixed inset-y-0 left-0 z-50 flex w-80 flex-col border-r border-[var(--border)] bg-[var(--background)] p-6"
              : direction === "right"
                ? "fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l border-[var(--border)] bg-[var(--background)] p-6"
                : direction === "top"
                  ? "fixed inset-x-0 top-0 z-50 flex h-1/3 flex-col border-b border-[var(--border)] bg-[var(--background)] p-6"
                  : "fixed inset-x-0 bottom-0 z-50 flex h-1/3 flex-col border-t border-[var(--border)] bg-[var(--background)] p-6"
          }
        >
          <Drawer.Title className="text-base font-semibold text-[var(--foreground)]">
            {label}
          </Drawer.Title>
          <Drawer.Description className="mt-1 text-sm text-[var(--foreground)] opacity-70">
            Anchored to the {direction} edge.
          </Drawer.Description>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export function TwDrawerLeft(_props: TwDrawerProps = {}): JSX.Element {
  return <DrawerSide direction="left" label="Open from left" />;
}
export function TwDrawerRight(_props: TwDrawerProps = {}): JSX.Element {
  return <DrawerSide direction="right" label="Open from right" />;
}
export function TwDrawerTop(_props: TwDrawerProps = {}): JSX.Element {
  return <DrawerSide direction="top" label="Open from top" />;
}
export function TwDrawerBottom(_props: TwDrawerProps = {}): JSX.Element {
  return <DrawerSide direction="bottom" label="Open from bottom" />;
}

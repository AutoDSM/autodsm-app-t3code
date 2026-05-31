import type { JSX } from "react";
import * as Dialog from "@radix-ui/react-dialog";

export interface TwSheetProps {
  readonly title?: string;
  readonly description?: string;
}

const triggerClass =
  "inline-flex items-center rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-medium hover:bg-[var(--muted)]";

function SheetSide({
  side,
  title,
  description,
}: {
  side: "left" | "right" | "top" | "bottom";
  title: string;
  description: string;
}): JSX.Element {
  const positionClass =
    side === "left"
      ? "fixed inset-y-0 left-0 z-50 w-80 border-r"
      : side === "right"
        ? "fixed inset-y-0 right-0 z-50 w-80 border-l"
        : side === "top"
          ? "fixed inset-x-0 top-0 z-50 h-1/3 border-b"
          : "fixed inset-x-0 bottom-0 z-50 h-1/3 border-t";
  return (
    <Dialog.Root>
      <Dialog.Trigger className={triggerClass}>{`Open ${side}`}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          className={`${positionClass} border-[var(--border)] bg-[var(--background)] p-6 shadow-lg`}
        >
          <Dialog.Title className="text-base font-semibold text-[var(--foreground)]">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-[var(--foreground)] opacity-70">
            {description}
          </Dialog.Description>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function TwSheet(props: TwSheetProps = {}): JSX.Element {
  const { title = "Edit profile", description = "Make changes to your profile here." } = props;
  return <SheetSide side="right" title={title} description={description} />;
}

export function TwSheetLeft(_props: TwSheetProps = {}): JSX.Element {
  return (
    <SheetSide
      side="left"
      title="Navigation"
      description="Browse workspaces, projects, and settings."
    />
  );
}
export function TwSheetRight(_props: TwSheetProps = {}): JSX.Element {
  return (
    <SheetSide side="right" title="Inspector" description="Inspect and tweak the selected layer." />
  );
}
export function TwSheetTop(_props: TwSheetProps = {}): JSX.Element {
  return (
    <SheetSide
      side="top"
      title="Announcements"
      description="New release notes and product updates."
    />
  );
}
export function TwSheetBottom(_props: TwSheetProps = {}): JSX.Element {
  return (
    <SheetSide side="bottom" title="Console" description="Logs, errors, and runtime warnings." />
  );
}

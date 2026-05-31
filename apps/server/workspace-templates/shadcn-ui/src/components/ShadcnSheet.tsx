import { useState } from "react";
import type { JSX } from "react";

export type ShadcnSheetSide = "left" | "right" | "top" | "bottom";

export interface ShadcnSheetProps {
  readonly side?: ShadcnSheetSide;
  readonly title?: string;
  readonly description?: string;
}

function sheetClass(side: ShadcnSheetSide): string {
  const base =
    "fixed z-50 bg-[var(--background)] text-[var(--foreground)] shadow-lg p-6 transition";
  if (side === "left")
    return `${base} inset-y-0 left-0 h-full w-3/4 max-w-sm border-r border-[var(--border)]`;
  if (side === "right")
    return `${base} inset-y-0 right-0 h-full w-3/4 max-w-sm border-l border-[var(--border)]`;
  if (side === "top") return `${base} inset-x-0 top-0 w-full border-b border-[var(--border)]`;
  return `${base} inset-x-0 bottom-0 w-full border-t border-[var(--border)]`;
}

export function ShadcnSheet(props: ShadcnSheetProps): JSX.Element {
  const {
    side = "right",
    title = "Edit profile",
    description = "Make changes to your profile here. Click save when you’re done.",
  } = props;
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)]"
      >
        Open sheet ({side})
      </button>
      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className={sheetClass(side)} role="dialog" aria-modal="true">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">{title}</p>
                <p className="mt-1 text-sm opacity-70">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium" htmlFor="sheet-name">
                  Name
                </label>
                <input
                  id="sheet-name"
                  defaultValue="Pedro Duarte"
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium" htmlFor="sheet-username">
                  Username
                </label>
                <input
                  id="sheet-username"
                  defaultValue="@peduarte"
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)]"
              >
                Save changes
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export const ShadcnSheetLeft = (props: Omit<ShadcnSheetProps, "side">): JSX.Element => (
  <ShadcnSheet {...props} side="left" />
);
export const ShadcnSheetRight = (props: Omit<ShadcnSheetProps, "side">): JSX.Element => (
  <ShadcnSheet {...props} side="right" />
);
export const ShadcnSheetTop = (props: Omit<ShadcnSheetProps, "side">): JSX.Element => (
  <ShadcnSheet {...props} side="top" />
);
export const ShadcnSheetBottom = (props: Omit<ShadcnSheetProps, "side">): JSX.Element => (
  <ShadcnSheet {...props} side="bottom" />
);

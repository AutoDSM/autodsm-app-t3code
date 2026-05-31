import { useState } from "react";
import type { JSX, ReactNode } from "react";

export interface ShadcnCollapsibleProps {
  readonly title?: string;
  readonly children?: ReactNode;
  readonly defaultOpen?: boolean;
}

export function ShadcnCollapsible(props: ShadcnCollapsibleProps): JSX.Element {
  const { title = "@peduarte starred 3 repositories", children, defaultOpen = false } = props;
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="w-full max-w-md space-y-2">
      <div className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)]">
        <span>{title}</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-md p-1 text-[var(--foreground)] hover:bg-[var(--muted)]"
        >
          {open ? "▾" : "▸"}
        </button>
      </div>
      <div className="rounded-md border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)]">
        @radix-ui/primitives
      </div>
      {open ? (
        <div className="space-y-2">
          <div className="rounded-md border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)]">
            @radix-ui/colors
          </div>
          <div className="rounded-md border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)]">
            @stitches/react
          </div>
          {children}
        </div>
      ) : null}
    </div>
  );
}

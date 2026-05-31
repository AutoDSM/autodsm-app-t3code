import type { JSX } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";

export interface TwCollapsibleProps {
  readonly title?: string;
}

export function TwCollapsible(props: TwCollapsibleProps = {}): JSX.Element {
  const { title = "@autodsm/starred-repos" } = props;
  return (
    <Collapsible.Root
      defaultOpen
      className="w-72 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--foreground)]">{title}</span>
        <Collapsible.Trigger asChild>
          <button
            type="button"
            className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--muted)]"
          >
            Toggle
          </button>
        </Collapsible.Trigger>
      </div>
      <div className="mt-2 rounded border border-[var(--border)] px-2 py-1 text-sm text-[var(--foreground)]">
        @autodsm/primary
      </div>
      <Collapsible.Content className="mt-2 space-y-2">
        <div className="rounded border border-[var(--border)] px-2 py-1 text-sm text-[var(--foreground)]">
          @autodsm/tokens
        </div>
        <div className="rounded border border-[var(--border)] px-2 py-1 text-sm text-[var(--foreground)]">
          @autodsm/preview
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

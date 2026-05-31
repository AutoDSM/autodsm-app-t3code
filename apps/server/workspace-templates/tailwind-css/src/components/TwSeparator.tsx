import type { JSX } from "react";
import * as Separator from "@radix-ui/react-separator";

export interface TwSeparatorProps {
  readonly label?: string;
}

export function TwSeparator(_props: TwSeparatorProps = {}): JSX.Element {
  return (
    <div className="w-64 text-sm text-[var(--foreground)]">
      <h4 className="font-medium">Radix Primitives</h4>
      <p className="text-xs opacity-70">An open-source UI component library.</p>
      <Separator.Root className="my-3 h-px bg-[var(--border)]" />
      <div className="flex items-center gap-3 text-xs opacity-80">
        <span>Blog</span>
        <Separator.Root orientation="vertical" decorative className="h-4 w-px bg-[var(--border)]" />
        <span>Docs</span>
        <Separator.Root orientation="vertical" decorative className="h-4 w-px bg-[var(--border)]" />
        <span>Source</span>
      </div>
    </div>
  );
}

export function TwSeparatorVertical(_props: TwSeparatorProps = {}): JSX.Element {
  return (
    <div className="inline-flex h-12 items-center gap-3 text-sm text-[var(--foreground)]">
      <span>Left</span>
      <Separator.Root
        orientation="vertical"
        decorative
        className="h-full w-px bg-[var(--border)]"
      />
      <span>Right</span>
    </div>
  );
}

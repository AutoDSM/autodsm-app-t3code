import { XIcon } from "lucide-react";

import { Button } from "~/components/ui/button";

function basenameOfPosix(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? path : path.slice(idx + 1);
}

export interface ComponentPreviewTabBarProps {
  readonly relativePath: string;
  readonly onClose: () => void;
}

export function ComponentPreviewTabBar(props: ComponentPreviewTabBarProps) {
  const base = basenameOfPosix(props.relativePath);

  return (
    <div
      data-slot="component-preview-tab"
      data-testid="component-preview-tab-bar"
      className="flex shrink-0 items-center gap-2 border-b border-border bg-muted/25 px-3 py-1.5 sm:px-4"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
        <span className="truncate font-mono text-[11px] font-medium text-foreground">{base}</span>
        <span className="truncate font-mono text-[10px] text-muted-foreground/70">
          {props.relativePath}
        </span>
      </div>
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Close component preview"
        onClick={props.onClose}
      >
        <XIcon aria-hidden className="size-3.5" />
      </Button>
    </div>
  );
}

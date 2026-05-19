import { XIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

function basenameOfPosix(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? path : path.slice(idx + 1);
}

export interface ComponentPreviewTabBarProps {
  readonly paths: readonly string[];
  readonly activePath: string | null;
  readonly onSelectPath: (path: string) => void;
  readonly onCloseActive: () => void;
}

export function ComponentPreviewTabBar(props: ComponentPreviewTabBarProps) {
  const { paths, activePath, onSelectPath, onCloseActive } = props;
  const showClose = activePath !== null;

  return (
    <div
      data-slot="component-preview-tab-bar"
      data-testid="component-preview-tab-bar"
      className="flex shrink-0 items-stretch gap-2 border-b border-border bg-muted/25 px-2 py-1 sm:px-3"
    >
      <div
        role="tablist"
        aria-label="Component previews"
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto overscroll-x-contain pb-px"
      >
        {paths.map((path) => {
          const base = basenameOfPosix(path);
          const selected = activePath === path;
          return (
            <button
              key={path}
              type="button"
              role="tab"
              data-slot="component-preview-tab"
              data-testid={`component-preview-tab:${path}`}
              aria-selected={selected}
              className={cn(
                "flex min-w-[7rem] max-w-[14rem] shrink-0 flex-col gap-0.5 rounded-md border px-2 py-1 text-left leading-tight transition-colors",
                selected
                  ? "border-border bg-background shadow-sm"
                  : "border-transparent bg-transparent hover:bg-muted/40",
              )}
              onClick={() => {
                onSelectPath(path);
              }}
            >
              <span className="truncate font-mono text-[11px] font-medium text-foreground">
                {base}
              </span>
              <span className="truncate font-mono text-[10px] text-muted-foreground/70">
                {path}
              </span>
            </button>
          );
        })}
      </div>
      {showClose ? (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          className="shrink-0 self-center text-muted-foreground hover:text-foreground"
          aria-label="Close component preview"
          onClick={onCloseActive}
        >
          <XIcon aria-hidden className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

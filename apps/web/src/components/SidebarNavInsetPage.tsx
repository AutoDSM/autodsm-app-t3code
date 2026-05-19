import type { ReactNode } from "react";

import { APP_DISPLAY_NAME } from "~/branding";
import { isElectron } from "~/env";
import { cn } from "~/lib/utils";
import { SidebarInset, SidebarTrigger } from "./ui/sidebar";

export function SidebarNavInsetPage({
  navLabel,
  children,
  variant = "default",
  electronTitlebarDrag = false,
}: {
  navLabel: string;
  children: ReactNode;
  readonly variant?: "default" | "autoDsmLaunch";
  /** When set with `variant="autoDsmLaunch"` in Electron, the header becomes a draggable titlebar region. */
  readonly electronTitlebarDrag?: boolean;
}) {
  const isLaunch = variant === "autoDsmLaunch";
  const electronDragHeader = Boolean(isElectron && electronTitlebarDrag && isLaunch);

  return (
    <SidebarInset
      className={cn(
        "h-dvh min-h-0 overflow-hidden overscroll-y-none",
        isLaunch
          ? "bg-[var(--app-chrome-background)] text-foreground"
          : "bg-background text-foreground",
      )}
    >
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden",
          isLaunch ? "bg-[var(--app-chrome-background)]" : "bg-background",
        )}
      >
        <header
          className={cn(
            electronDragHeader
              ? "drag-region flex h-[52px] shrink-0 items-center border-b px-3 sm:px-5 wco:h-[env(titlebar-area-height)]"
              : "border-b px-3 py-2 sm:px-5 sm:py-3",
            isLaunch ? "border-border bg-[var(--app-chrome-background)]" : "border-border",
          )}
        >
          <div className="flex items-center gap-2">
            <SidebarTrigger
              className={cn(
                "size-7 shrink-0 md:hidden",
                isLaunch && "text-foreground hover:bg-muted hover:text-foreground",
                electronDragHeader && "[-webkit-app-region:no-drag]",
              )}
            />
            <span
              className={cn(
                "text-sm font-medium",
                isLaunch ? "text-muted-foreground" : "text-foreground md:text-muted-foreground/60",
              )}
            >
              {navLabel} · {APP_DISPLAY_NAME}
            </span>
          </div>
        </header>
        <main
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-auto",
            isLaunch ? "bg-[var(--app-chrome-background)] p-0" : "p-6 sm:p-8",
          )}
        >
          {children}
        </main>
      </div>
    </SidebarInset>
  );
}

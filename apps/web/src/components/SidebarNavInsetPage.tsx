import type { ReactNode } from "react";

import { APP_DISPLAY_NAME } from "~/branding";
import { SidebarInset, SidebarTrigger } from "./ui/sidebar";

export function SidebarNavInsetPage({
  navLabel,
  children,
}: {
  navLabel: string;
  children: ReactNode;
}) {
  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none bg-background text-foreground">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden bg-background">
        <header className="border-b border-border px-3 py-2 sm:px-5 sm:py-3">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="size-7 shrink-0 md:hidden" />
            <span className="text-sm font-medium text-foreground md:text-muted-foreground/60">
              {navLabel} · {APP_DISPLAY_NAME}
            </span>
          </div>
        </header>
        <main className="flex flex-1 flex-col overflow-auto p-6 sm:p-8">{children}</main>
      </div>
    </SidebarInset>
  );
}

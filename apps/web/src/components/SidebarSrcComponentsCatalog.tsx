import { ChevronRightIcon, FolderIcon, FolderOpenIcon } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { memo, useCallback, useMemo } from "react";

import { resolveThreadRowClassName } from "~/components/Sidebar.logic";
import type { SrcComponentsCatalogViewModel } from "~/lib/srcComponentsCatalog";
import { cn } from "~/lib/utils";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "~/components/ui/sidebar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";

export interface SrcComponentsSidebarCatalogBlockProps {
  readonly catalog: SrcComponentsCatalogViewModel;
  readonly folderExpanded: boolean;
  readonly onToggleFolderExpanded: () => void;
  readonly previewPathActive: string | undefined;
  readonly canPickThreads: boolean;
  readonly onPickComponentPath: (relativePath: string) => void;
}

export const SrcComponentsSidebarCatalogBlock = memo(function SrcComponentsSidebarCatalogBlock(
  props: SrcComponentsSidebarCatalogBlockProps,
) {
  const {
    catalog,
    folderExpanded,
    onToggleFolderExpanded,
    previewPathActive,
    canPickThreads,
    onPickComponentPath,
  } = props;

  /** Same `render=` pattern as `SidebarThreadRow` for file picks (menu-sub-button + div role). */
  const sharedComponentFileRowRender = useMemo(() => <div role="button" tabIndex={0} />, []);

  const handleFolderKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onToggleFolderExpanded();
    },
    [onToggleFolderExpanded],
  );

  const handleFolderClick = useCallback(
    (event: ReactMouseEvent) => {
      event.preventDefault();
      onToggleFolderExpanded();
    },
    [onToggleFolderExpanded],
  );

  return (
    <SidebarGroup
      data-testid="sidebar-src-components-section"
      data-sidebar="group"
      data-slot="sidebar-group"
      data-feature="components-thread-view"
      aria-label="Components catalog (thread-style)"
      className="border-border border-t bg-muted/[0.12] px-2 py-2 pt-3 dark:bg-muted/[0.08]"
    >
      <div className="mb-1 flex items-center justify-between px-2 pr-1.5 pl-2">
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          Components
        </span>
      </div>

      <SidebarMenu className="gap-0">
        <SidebarMenuItem className="rounded-md">
          {/*
            Mirrors project/thread layout: folder = SidebarMenuButton (peer/menu-button);
            picks = SidebarMenuSub like SidebarProjectThreadList.
          */}
          <div className="group/components-catalog-header relative">
            <SidebarMenuButton
              type="button"
              size="sm"
              data-testid="src-components-folder-row"
              data-autodsm="components-thread-view-folder"
              aria-expanded={folderExpanded}
              className={`group/components-folder gap-2 px-2 py-1.5 text-left hover:bg-accent group-hover/components-catalog-header:bg-accent group-hover/components-catalog-header:text-sidebar-accent-foreground ${previewPathActive ? "bg-accent/85 font-medium dark:bg-accent/55" : ""}`}
              onClick={handleFolderClick}
              onKeyDown={handleFolderKeyDown}
            >
              <ChevronRightIcon
                className={`-ml-0.5 size-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-150 group-hover/components-catalog-header:text-sidebar-accent-foreground ${
                  folderExpanded ? "rotate-90" : ""
                }`}
                aria-hidden
              />
              {folderExpanded ? (
                <FolderOpenIcon
                  className="size-3.5 shrink-0 text-muted-foreground/72 group-hover/components-catalog-header:text-sidebar-accent-foreground"
                  aria-hidden
                />
              ) : (
                <FolderIcon
                  className="size-3.5 shrink-0 text-muted-foreground/72 group-hover/components-catalog-header:text-sidebar-accent-foreground"
                  aria-hidden
                />
              )}
              <span
                className="min-w-0 flex-1 truncate font-mono text-xs text-foreground"
                title={catalog.folderLabel}
              >
                {catalog.folderLabel}
              </span>
            </SidebarMenuButton>
          </div>

          {folderExpanded ? (
            <SidebarMenuSub
              data-testid="src-components-submenu"
              data-autodsm="components-thread-view-file-list"
              className="mx-1 my-0 w-full translate-x-0 gap-0.5 overflow-hidden px-1.5 py-0"
            >
              {catalog.isPending ? (
                <SidebarMenuSubItem className="w-full">
                  <div className="flex h-auto w-full translate-x-0 items-start px-2 py-1.5 text-left text-[10px] leading-snug text-muted-foreground/70">
                    Loading workspace files…
                  </div>
                </SidebarMenuSubItem>
              ) : null}

              {catalog.isError && !catalog.isPending ? (
                <SidebarMenuSubItem className="w-full">
                  <div className="flex w-full translate-x-0 items-start px-2 py-1.5 text-left text-[10px] leading-snug text-muted-foreground/70">
                    Could not load workspace files.
                  </div>
                </SidebarMenuSubItem>
              ) : null}

              {!catalog.isPending && !catalog.isError && catalog.paths.length === 0 ? (
                <SidebarMenuSubItem className="w-full">
                  <SidebarMenuSubButton
                    render={<button type="button" />}
                    data-testid="src-components-catalog-empty"
                    disabled
                    size="sm"
                    className="h-auto translate-x-0 cursor-default justify-start whitespace-normal break-words px-2 py-1.5 text-left opacity-70 [overflow-wrap:anywhere]"
                  >
                    <span className="text-[10px] leading-snug text-muted-foreground/72">
                      No{" "}
                      <span className="break-words font-mono text-muted-foreground/78">
                        .tsx / .jsx
                      </span>{" "}
                      files indexed under paths containing{" "}
                      <span className="break-all font-mono text-muted-foreground/78">
                        /src/components/
                      </span>
                      .
                    </span>
                    {catalog.truncated ? (
                      <span className="block pt-1 text-left text-[9px] leading-snug text-muted-foreground/55">
                        Results may be incomplete (workspace search limit). Refine via Search if
                        needed.
                      </span>
                    ) : null}
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ) : null}

              {catalog.truncated &&
              !catalog.isPending &&
              !catalog.isError &&
              catalog.paths.length > 0 ? (
                <SidebarMenuSubItem className="w-full">
                  <div
                    className="flex w-full translate-x-0 items-start px-2 py-1 text-left text-[9px] leading-snug text-muted-foreground/55"
                    data-testid="src-components-catalog-truncation-hint"
                  >
                    Results may be incomplete (workspace search limit). Refine via Search if needed.
                  </div>
                </SidebarMenuSubItem>
              ) : null}

              {!catalog.isPending &&
                !catalog.isError &&
                catalog.paths.map((relativePath) => {
                  const base = relativePath.includes("/")
                    ? relativePath.slice(relativePath.lastIndexOf("/") + 1)
                    : relativePath;
                  const isActivePreview = previewPathActive === relativePath;

                  return (
                    <SidebarMenuSubItem key={relativePath} className="w-full">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <SidebarMenuSubButton
                              render={sharedComponentFileRowRender}
                              disabled={!canPickThreads}
                              isActive={isActivePreview}
                              size="sm"
                              className={cn(
                                resolveThreadRowClassName({
                                  isActive: isActivePreview,
                                  isSelected: false,
                                }),
                                "relative isolate h-auto min-h-7 gap-1.5 py-1.5",
                              )}
                              onClick={() => onPickComponentPath(relativePath)}
                            >
                              <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
                                <span className="truncate text-xs">{base}</span>
                                <span className="truncate font-mono text-[10px] text-muted-foreground/58">
                                  {relativePath}
                                </span>
                              </div>
                            </SidebarMenuSubButton>
                          }
                        />
                        <TooltipPopup side="right">
                          {!canPickThreads
                            ? "Open a thread in this project to preview components."
                            : relativePath}
                        </TooltipPopup>
                      </Tooltip>
                    </SidebarMenuSubItem>
                  );
                })}
            </SidebarMenuSub>
          ) : null}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
});

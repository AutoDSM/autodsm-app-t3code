import { ChevronRightIcon, FolderIcon, FolderOpenIcon } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { Fragment, memo, useCallback, useMemo, useState, type ReactNode } from "react";

import { resolveThreadRowClassName } from "~/components/Sidebar.logic";
import { Button } from "~/components/ui/button";
import type { SrcComponentsCatalogViewModel } from "~/lib/srcComponentsCatalog";
import { buildSrcComponentsTree, type SrcComponentsTreeNode } from "~/lib/srcComponentsTree";
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

const TREE_PAD_BASE_PX = 8;
const TREE_PAD_STEP_PX = 12;

export interface SrcComponentsSidebarCatalogBlockProps {
  readonly catalog: SrcComponentsCatalogViewModel;
  readonly folderExpanded: boolean;
  readonly onToggleFolderExpanded: () => void;
  readonly previewPathActive: string | undefined;
  readonly canPickThreads: boolean;
  readonly onPickComponentPath: (relativePath: string) => void;
  readonly onRetryWorkspaceBuild?: () => void;
  readonly workspaceBuildRetryPending?: boolean;
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
    onRetryWorkspaceBuild,
    workspaceBuildRetryPending,
  } = props;

  const [buildLogOpen, setBuildLogOpen] = useState(false);
  const [folderToggles, setFolderToggles] = useState<Record<string, boolean>>({});

  const treeRoots = useMemo(() => buildSrcComponentsTree(catalog.paths), [catalog.paths]);

  /** Same `render=` pattern as `SidebarThreadRow` for file picks (menu-sub-button + div role). */
  const sharedComponentFileRowRender = useMemo(() => <div role="button" tabIndex={0} />, []);
  const sharedFolderSubButtonRender = useMemo(() => <button type="button" />, []);

  const toggleFolderPath = useCallback((folderPath: string) => {
    setFolderToggles((previous) => {
      const isExpanded = previous[folderPath] !== false;
      return { ...previous, [folderPath]: !isExpanded };
    });
  }, []);

  const handleSubtreeFolderKeyDown = useCallback(
    (folderPath: string) => (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      toggleFolderPath(folderPath);
    },
    [toggleFolderPath],
  );

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

  const renderTreeNode = (node: SrcComponentsTreeNode, depth: number): ReactNode => {
    const padLeft = TREE_PAD_BASE_PX + depth * TREE_PAD_STEP_PX;

    if (node.kind === "file") {
      const { relativePath } = node;
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
                  style={{ paddingLeft: padLeft }}
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
                    <span className="truncate text-xs">{node.name}</span>
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
    }

    const dirExpanded = folderToggles[node.path] !== false;

    return (
      <Fragment key={node.path}>
        <SidebarMenuSubItem className="w-full">
          <SidebarMenuSubButton
            render={sharedFolderSubButtonRender}
            type="button"
            size="sm"
            aria-expanded={dirExpanded}
            data-testid={`src-components-tree-folder:${node.path}`}
            style={{ paddingLeft: padLeft }}
            className="h-auto min-h-7 translate-x-0 justify-start gap-2 py-1.5 text-left [&>svg:not([class*='size-'])]:size-3.5"
            onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              toggleFolderPath(node.path);
            }}
            onKeyDown={handleSubtreeFolderKeyDown(node.path)}
          >
            <ChevronRightIcon
              className={cn(
                "-ml-0.5 shrink-0 text-muted-foreground/70 transition-transform duration-150",
                dirExpanded && "rotate-90",
              )}
              aria-hidden
            />
            {dirExpanded ? (
              <FolderOpenIcon className="size-3.5 shrink-0 text-muted-foreground/72" aria-hidden />
            ) : (
              <FolderIcon className="size-3.5 shrink-0 text-muted-foreground/72" aria-hidden />
            )}
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground/90">
              {node.name}
            </span>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
        {dirExpanded ? node.children.map((child) => renderTreeNode(child, depth + 1)) : null}
      </Fragment>
    );
  };

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
                    Loading component registry…
                  </div>
                </SidebarMenuSubItem>
              ) : null}

              {catalog.isError && !catalog.isPending ? (
                <SidebarMenuSubItem className="w-full">
                  <div className="flex w-full translate-x-0 items-start px-2 py-1.5 text-left text-[10px] leading-snug text-muted-foreground/70">
                    Could not load the component registry.
                  </div>
                </SidebarMenuSubItem>
              ) : null}

              {catalog.gate && !catalog.isPending && !catalog.isError ? (
                <SidebarMenuSubItem className="w-full">
                  <div className="flex w-full translate-x-0 flex-col gap-2 px-2 py-1.5 text-left text-[10px] leading-snug">
                    <div className="font-semibold text-foreground">
                      {catalog.gate.code === "workspace_build_skipped"
                        ? "No build script"
                        : catalog.gate.code === "workspace_build_timed_out"
                          ? "Build timed out"
                          : catalog.gate.code === "workspace_build_runner_error"
                            ? "Could not run build"
                            : "Build failed"}
                    </div>
                    <p className="text-muted-foreground/85">{catalog.gate.summary}</p>
                    {catalog.gate.commandDisplay ? (
                      <p className="break-all font-mono text-[9px] text-muted-foreground/70">
                        {catalog.gate.commandDisplay}
                      </p>
                    ) : null}
                    {onRetryWorkspaceBuild ? (
                      <Button
                        type="button"
                        size="xs"
                        variant="secondary"
                        className="h-7 self-start px-2 text-[10px]"
                        disabled={workspaceBuildRetryPending === true}
                        onClick={() => {
                          setBuildLogOpen(false);
                          onRetryWorkspaceBuild();
                        }}
                      >
                        {workspaceBuildRetryPending ? "Retrying…" : "Retry build"}
                      </Button>
                    ) : null}
                    {catalog.gate.stdoutTail || catalog.gate.stderrTail ? (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className="self-start text-left text-[9px] font-medium text-muted-foreground underline-offset-2 hover:underline"
                          onClick={() => {
                            setBuildLogOpen((open) => !open);
                          }}
                        >
                          {buildLogOpen ? "Hide build log" : "View build log"}
                        </button>
                        {buildLogOpen ? (
                          <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded border border-border/60 bg-muted/20 p-2 font-mono text-[9px] text-muted-foreground">
                            {catalog.gate.stderrTail ? (
                              <>
                                <span className="font-semibold text-foreground/80">stderr</span>
                                {"\n"}
                                {catalog.gate.stderrTail}
                                {"\n\n"}
                              </>
                            ) : null}
                            {catalog.gate.stdoutTail ? (
                              <>
                                <span className="font-semibold text-foreground/80">stdout</span>
                                {"\n"}
                                {catalog.gate.stdoutTail}
                              </>
                            ) : null}
                          </pre>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </SidebarMenuSubItem>
              ) : null}

              {!catalog.isPending &&
              !catalog.isError &&
              !catalog.gate &&
              catalog.paths.length === 0 ? (
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

              {!catalog.isPending && !catalog.isError && !catalog.gate && catalog.paths.length > 0
                ? treeRoots.map((root) => {
                    const rootExpanded = folderToggles[root.rootPath] !== false;
                    const rootPadLeft = TREE_PAD_BASE_PX;

                    return (
                      <Fragment key={root.rootPath}>
                        <SidebarMenuSubItem className="w-full">
                          <SidebarMenuSubButton
                            render={sharedFolderSubButtonRender}
                            type="button"
                            size="sm"
                            aria-expanded={rootExpanded}
                            data-testid={`src-components-tree-root:${root.rootPath}`}
                            style={{ paddingLeft: rootPadLeft }}
                            className="h-auto min-h-7 translate-x-0 justify-start gap-2 py-1.5 text-left [&>svg:not([class*='size-'])]:size-3.5"
                            onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                              event.preventDefault();
                              toggleFolderPath(root.rootPath);
                            }}
                            onKeyDown={handleSubtreeFolderKeyDown(root.rootPath)}
                          >
                            <ChevronRightIcon
                              className={cn(
                                "-ml-0.5 shrink-0 text-muted-foreground/70 transition-transform duration-150",
                                rootExpanded && "rotate-90",
                              )}
                              aria-hidden
                            />
                            {rootExpanded ? (
                              <FolderOpenIcon
                                className="size-3.5 shrink-0 text-muted-foreground/72"
                                aria-hidden
                              />
                            ) : (
                              <FolderIcon
                                className="size-3.5 shrink-0 text-muted-foreground/72"
                                aria-hidden
                              />
                            )}
                            <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                              {root.rootLabel}
                            </span>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        {rootExpanded && catalog.truncated ? (
                          <SidebarMenuSubItem className="w-full">
                            <div
                              className="flex w-full translate-x-0 items-start px-2 py-1 text-left text-[9px] leading-snug text-muted-foreground/55"
                              data-testid="src-components-catalog-truncation-hint"
                              data-root-path={root.rootPath}
                            >
                              Results may be incomplete (workspace search limit). Refine via Search
                              if needed.
                            </div>
                          </SidebarMenuSubItem>
                        ) : null}
                        {rootExpanded ? root.nodes.map((child) => renderTreeNode(child, 1)) : null}
                      </Fragment>
                    );
                  })
                : null}
            </SidebarMenuSub>
          ) : null}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
});

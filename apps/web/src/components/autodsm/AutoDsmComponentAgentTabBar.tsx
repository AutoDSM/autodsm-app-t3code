"use client";

import type { ScopedThreadRef } from "@t3tools/contracts";
import { useCallback, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import { resolveThreadRowClassName } from "~/components/Sidebar.logic";
import { stackedThreadToast, toastManager } from "~/components/ui/toast";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { readEnvironmentApi } from "~/environmentApi";
import type { AutoDsmComponentAgentTab } from "~/lib/autoDsmComponentAgents";
import { resolveAutoDsmAgentTabForPath } from "~/lib/autoDsmComponentAgents";
import { cn, newCommandId } from "~/lib/utils";
import { readLocalApi } from "~/localApi";

export type AutoDsmComponentAgentTabBarLayout = "horizontal" | "sidebar" | "sidebar-embedded";

export interface AutoDsmComponentAgentTabBarProps {
  readonly tabs: readonly AutoDsmComponentAgentTab[];
  readonly activeThreadRef: ScopedThreadRef | null;
  readonly activeComponentPath?: string | null;
  readonly onSelectTab: (threadRef: ScopedThreadRef) => void;
  /** Horizontal strip above chat (default) or vertical sidebar list. */
  readonly layout?: AutoDsmComponentAgentTabBarLayout;
}

function isSameThreadRef(a: ScopedThreadRef, b: ScopedThreadRef): boolean {
  return a.environmentId === b.environmentId && a.threadId === b.threadId;
}

interface ComponentAgentTabRenameState {
  readonly renamingThreadKey: string | null;
  readonly renamingTitle: string;
  readonly beginRename: (tab: AutoDsmComponentAgentTab) => void;
  readonly cancelRename: () => void;
  readonly commitRename: (tab: AutoDsmComponentAgentTab) => Promise<void>;
  readonly setRenamingTitle: (title: string) => void;
  readonly renamingCommittedRef: React.RefObject<boolean>;
  readonly renamingInputRef: React.RefObject<HTMLInputElement | null>;
}

function useComponentAgentTabRename(): ComponentAgentTabRenameState {
  const [renamingThreadKey, setRenamingThreadKey] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState("");
  const renamingCommittedRef = useRef(false);
  const renamingInputRef = useRef<HTMLInputElement | null>(null);

  const cancelRename = useCallback(() => {
    setRenamingThreadKey(null);
    renamingInputRef.current = null;
  }, []);

  const beginRename = useCallback((tab: AutoDsmComponentAgentTab) => {
    setRenamingThreadKey(tab.threadKey);
    setRenamingTitle(tab.title);
    renamingCommittedRef.current = false;
  }, []);

  const commitRename = useCallback(
    async (tab: AutoDsmComponentAgentTab) => {
      const finishRename = () => {
        setRenamingThreadKey((current) => {
          if (current !== tab.threadKey) {
            return current;
          }
          renamingInputRef.current = null;
          return null;
        });
      };

      const trimmed = renamingTitle.trim();
      if (trimmed.length === 0) {
        toastManager.add({
          type: "warning",
          title: "Component name cannot be empty",
        });
        finishRename();
        return;
      }
      if (trimmed === tab.title) {
        finishRename();
        return;
      }

      const api = readEnvironmentApi(tab.threadRef.environmentId);
      if (!api) {
        finishRename();
        return;
      }

      try {
        await api.orchestration.dispatchCommand({
          type: "thread.meta.update",
          commandId: newCommandId(),
          threadId: tab.threadRef.threadId,
          title: trimmed,
        });
      } catch (error) {
        toastManager.add(
          stackedThreadToast({
            type: "error",
            title: "Failed to rename component",
            description: error instanceof Error ? error.message : "An error occurred.",
          }),
        );
      }
      finishRename();
    },
    [renamingTitle],
  );

  return {
    renamingThreadKey,
    renamingTitle,
    beginRename,
    cancelRename,
    commitRename,
    setRenamingTitle,
    renamingCommittedRef,
    renamingInputRef,
  };
}

function ComponentAgentTabButton(input: {
  readonly tab: AutoDsmComponentAgentTab;
  readonly selected: boolean;
  readonly onSelectTab: (threadRef: ScopedThreadRef) => void;
  readonly layout: AutoDsmComponentAgentTabBarLayout;
  readonly rename: ComponentAgentTabRenameState;
}) {
  const { tab, selected, onSelectTab, layout, rename } = input;
  const isRenaming = rename.renamingThreadKey === tab.threadKey;

  const handleContextMenu = useCallback(
    (event: ReactMouseEvent) => {
      event.preventDefault();
      void (async () => {
        const api = readLocalApi();
        if (!api) {
          return;
        }
        const clicked = await api.contextMenu.show([{ id: "rename", label: "Rename component" }], {
          x: event.clientX,
          y: event.clientY,
        });
        if (clicked === "rename") {
          rename.beginRename(tab);
        }
      })();
    },
    [rename, tab],
  );

  const handleRenameInputRef = useCallback(
    (element: HTMLInputElement | null) => {
      if (element && rename.renamingInputRef.current !== element) {
        rename.renamingInputRef.current = element;
        element.focus();
        element.select();
      }
    },
    [rename.renamingInputRef],
  );

  const handleRenameInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        rename.renamingCommittedRef.current = true;
        void rename.commitRename(tab);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        rename.renamingCommittedRef.current = true;
        rename.cancelRename();
      }
    },
    [rename, tab],
  );

  const handleRenameInputBlur = useCallback(() => {
    if (!rename.renamingCommittedRef.current) {
      void rename.commitRename(tab);
    }
  }, [rename, tab]);

  const titleContent = isRenaming ? (
    <input
      ref={handleRenameInputRef}
      className="min-w-0 flex-1 truncate bg-transparent px-0.5 text-inherit outline-none ring-1 ring-ring rounded"
      value={rename.renamingTitle}
      onChange={(event) => {
        rename.setRenamingTitle(event.target.value);
      }}
      onKeyDown={handleRenameInputKeyDown}
      onBlur={handleRenameInputBlur}
      onClick={(event) => {
        event.stopPropagation();
      }}
      data-testid={`autodsm-component-agent-rename:${tab.threadKey}`}
    />
  ) : (
    <span className="truncate">{tab.title}</span>
  );

  if (layout === "sidebar") {
    return (
      <SidebarMenuItem key={tab.threadKey} className="list-none">
        <SidebarMenuButton
          type="button"
          size="sm"
          role="tab"
          data-autodsm="component-agent-tab"
          data-slot="autodsm-component-agent-tab"
          data-testid={`autodsm-component-agent-tab:${tab.threadKey}`}
          aria-selected={selected}
          isActive={selected}
          className={cn(
            resolveThreadRowClassName({ isActive: selected, isSelected: false }),
            "gap-2 px-2 py-1.5 text-left text-sm",
          )}
          onClick={() => {
            if (!isRenaming) {
              onSelectTab(tab.threadRef);
            }
          }}
          onContextMenu={handleContextMenu}
        >
          {titleContent}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <button
      key={tab.threadKey}
      type="button"
      role="tab"
      data-autodsm="component-agent-tab"
      data-slot="autodsm-component-agent-tab"
      data-testid={`autodsm-component-agent-tab:${tab.threadKey}`}
      aria-selected={selected}
      className={cn(
        "flex min-w-[5rem] max-w-[12rem] shrink-0 items-center rounded-md border px-3 py-1.5 text-left text-xs font-medium leading-tight transition-colors",
        selected
          ? "border-border bg-background text-foreground shadow-sm"
          : "border-transparent bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
      onClick={() => {
        if (!isRenaming) {
          onSelectTab(tab.threadRef);
        }
      }}
      onContextMenu={handleContextMenu}
    >
      {titleContent}
    </button>
  );
}

export function AutoDsmComponentAgentTabBar(props: AutoDsmComponentAgentTabBarProps) {
  const { tabs, activeThreadRef, activeComponentPath, onSelectTab, layout = "horizontal" } = props;
  const rename = useComponentAgentTabRename();
  const activeTabByPath = resolveAutoDsmAgentTabForPath(activeComponentPath, tabs);

  const isTabSelected = (tab: AutoDsmComponentAgentTab): boolean => {
    if (activeTabByPath) {
      return activeTabByPath.threadKey === tab.threadKey;
    }
    return activeThreadRef !== null && isSameThreadRef(activeThreadRef, tab.threadRef);
  };

  if (tabs.length === 0) {
    return null;
  }

  if (layout === "sidebar-embedded") {
    return (
      <SidebarMenu
        role="tablist"
        aria-label="Component agents"
        className="gap-0"
        data-testid="autodsm-component-agent-tab-bar"
      >
        {tabs.map((tab) => {
          const selected = isTabSelected(tab);
          return (
            <ComponentAgentTabButton
              key={tab.threadKey}
              tab={tab}
              selected={selected}
              onSelectTab={onSelectTab}
              layout="sidebar"
              rename={rename}
            />
          );
        })}
      </SidebarMenu>
    );
  }

  if (layout === "sidebar") {
    return (
      <SidebarGroup
        data-slot="autodsm-component-agent-tab-bar"
        data-testid="autodsm-component-agent-sidebar"
        className="border-b border-border px-2 py-2.5"
      >
        <SidebarGroupLabel className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/75">
          Components
        </SidebarGroupLabel>
        <SidebarMenu
          role="tablist"
          aria-label="Component agents"
          className="gap-0"
          data-testid="autodsm-component-agent-tab-bar"
        >
          {tabs.map((tab) => {
            const selected = isTabSelected(tab);
            return (
              <ComponentAgentTabButton
                key={tab.threadKey}
                tab={tab}
                selected={selected}
                onSelectTab={onSelectTab}
                layout="sidebar"
                rename={rename}
              />
            );
          })}
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  return (
    <div
      data-slot="autodsm-component-agent-tab-bar"
      data-testid="autodsm-component-agent-tab-bar"
      className="flex shrink-0 items-stretch gap-2 border-b border-border bg-muted/25 px-2 py-1 sm:px-3"
    >
      <div
        role="tablist"
        aria-label="Component agents"
        className="flex min-w-0 flex-1 gap-1 overflow-x-auto overscroll-x-contain pb-px"
      >
        {tabs.map((tab) => {
          const selected = isTabSelected(tab);
          return (
            <ComponentAgentTabButton
              key={tab.threadKey}
              tab={tab}
              selected={selected}
              onSelectTab={onSelectTab}
              layout={layout}
              rename={rename}
            />
          );
        })}
      </div>
    </div>
  );
}

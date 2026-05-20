"use client";

import { ChevronRightIcon, FolderIcon, FolderOpenIcon } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { memo, useCallback, useMemo } from "react";

import { AutoDsmComponentAgentTabBar } from "~/components/autodsm/AutoDsmComponentAgentTabBar";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "~/components/ui/sidebar";
import type { AutoDsmComponentAgentGroup } from "~/lib/autoDsmComponentAgentGroups";
import { cn } from "~/lib/utils";
import { useUiStateStore } from "~/uiStateStore";

export interface AutoDsmComponentAgentSidebarTreeProps {
  readonly workspaceKey: string;
  readonly groups: readonly AutoDsmComponentAgentGroup[];
  readonly activeThreadRef: Parameters<typeof AutoDsmComponentAgentTabBar>[0]["activeThreadRef"];
  readonly activeComponentPath?: string | null;
  readonly onSelectTab: Parameters<typeof AutoDsmComponentAgentTabBar>[0]["onSelectTab"];
}

export const AutoDsmComponentAgentSidebarTree = memo(function AutoDsmComponentAgentSidebarTree(
  props: AutoDsmComponentAgentSidebarTreeProps,
) {
  const { workspaceKey, groups, activeThreadRef, activeComponentPath, onSelectTab } = props;
  const expandedByWorkspace = useUiStateStore(
    (state) => state.autoDsmComponentAgentGroupExpandedByWorkspaceKey,
  );
  const setGroupExpanded = useUiStateStore((state) => state.setAutoDsmComponentAgentGroupExpanded);

  const expandedForWorkspace = useMemo(
    () => expandedByWorkspace[workspaceKey] ?? {},
    [expandedByWorkspace, workspaceKey],
  );

  const isGroupExpanded = useCallback(
    (groupId: string) => expandedForWorkspace[groupId] !== false,
    [expandedForWorkspace],
  );

  const toggleGroup = useCallback(
    (groupId: string) => {
      setGroupExpanded(workspaceKey, groupId, !isGroupExpanded(groupId));
    },
    [isGroupExpanded, setGroupExpanded, workspaceKey],
  );

  const handleGroupKeyDown = useCallback(
    (groupId: string) => (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      toggleGroup(groupId);
    },
    [toggleGroup],
  );

  const handleGroupClick = useCallback(
    (groupId: string) => (event: ReactMouseEvent) => {
      event.preventDefault();
      toggleGroup(groupId);
    },
    [toggleGroup],
  );

  const groupBlocks = useMemo(
    () =>
      groups.map((group) => {
        const expanded = isGroupExpanded(group.groupId);
        return (
          <SidebarMenuItem key={group.groupId} className="list-none">
            <SidebarMenuButton
              type="button"
              size="sm"
              className="gap-2 px-2 py-1.5 text-left text-sm text-muted-foreground hover:text-foreground"
              onClick={handleGroupClick(group.groupId)}
              onKeyDown={handleGroupKeyDown(group.groupId)}
              data-testid={`autodsm-component-agent-group:${group.groupId}`}
            >
              <ChevronRightIcon
                className={cn("size-3.5 shrink-0 transition-transform", expanded && "rotate-90")}
              />
              {expanded ? (
                <FolderOpenIcon className="size-3.5 shrink-0 opacity-70" />
              ) : (
                <FolderIcon className="size-3.5 shrink-0 opacity-70" />
              )}
              <span className="truncate font-medium">{group.label}</span>
            </SidebarMenuButton>
            {expanded ? (
              <SidebarMenuSub className="mx-0 border-none px-0 py-0.5">
                <AutoDsmComponentAgentTabBar
                  layout="sidebar-embedded"
                  tabs={group.tabs}
                  activeThreadRef={activeThreadRef}
                  {...(activeComponentPath !== undefined ? { activeComponentPath } : {})}
                  onSelectTab={onSelectTab}
                />
              </SidebarMenuSub>
            ) : null}
          </SidebarMenuItem>
        );
      }),
    [
      activeComponentPath,
      activeThreadRef,
      groups,
      handleGroupClick,
      handleGroupKeyDown,
      isGroupExpanded,
      onSelectTab,
    ],
  );

  if (groups.length === 0) {
    return null;
  }

  return (
    <SidebarGroup
      data-testid="autodsm-component-agent-sidebar-tree"
      className="border-b border-border px-2 py-2.5"
    >
      <SidebarGroupLabel className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
        Components
      </SidebarGroupLabel>
      <SidebarMenu>{groupBlocks}</SidebarMenu>
    </SidebarGroup>
  );
});

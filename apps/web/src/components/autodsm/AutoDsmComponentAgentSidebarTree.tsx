"use client";

import { ChevronRightIcon, FolderIcon, FolderOpenIcon } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { memo, useCallback, useMemo } from "react";

import { AutoDsmComponentAgentTabBar } from "~/components/autodsm/AutoDsmComponentAgentTabBar";
import { Badge } from "~/components/ui/badge";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "~/components/ui/sidebar";
import type { AutoDsmComponentAgentGroup } from "~/lib/autoDsmComponentAgentGroups";
import type { GroupRenderHealth } from "~/lib/autoDsmComponentRenderHealth";
import { cn } from "~/lib/utils";
import { useUiStateStore } from "~/uiStateStore";

export interface AutoDsmComponentAgentSidebarTreeProps {
  readonly workspaceKey: string;
  readonly groups: readonly AutoDsmComponentAgentGroup[];
  readonly activeThreadRef: Parameters<typeof AutoDsmComponentAgentTabBar>[0]["activeThreadRef"];
  readonly activeComponentPath?: string | null;
  /** Per-group render-health, keyed by groupId. Absent groups render no badge. */
  readonly healthByGroupId?: ReadonlyMap<string, GroupRenderHealth>;
  readonly onSelectTab: Parameters<typeof AutoDsmComponentAgentTabBar>[0]["onSelectTab"];
  readonly onDeleteTab?: Parameters<typeof AutoDsmComponentAgentTabBar>[0]["onDeleteTab"];
}

function renderHealthBadgeTitle(health: GroupRenderHealth): string {
  const noun = health.affectedCount === 1 ? "component" : "components";
  const summary = `${health.affectedCount} ${noun} with preview issues`;
  return health.firstDiagnostic ? `${summary} — e.g. ${health.firstDiagnostic}` : summary;
}

export const AutoDsmComponentAgentSidebarTree = memo(function AutoDsmComponentAgentSidebarTree(
  props: AutoDsmComponentAgentSidebarTreeProps,
) {
  const {
    workspaceKey,
    groups,
    activeThreadRef,
    activeComponentPath,
    healthByGroupId,
    onSelectTab,
    onDeleteTab,
  } = props;
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
        const health = healthByGroupId?.get(group.groupId);
        const showHealthBadge = health !== undefined && health.status !== "ok";
        return (
          <SidebarMenuItem key={group.groupId} className="list-none">
            <SidebarMenuButton
              type="button"
              size="sm"
              className="w-full gap-2 px-2 py-1.5 text-left text-sm text-muted-foreground hover:text-foreground"
              onClick={handleGroupClick(group.groupId)}
              onKeyDown={handleGroupKeyDown(group.groupId)}
              data-testid={`autodsm-component-agent-group:${group.groupId}`}
            >
              {expanded ? (
                <FolderOpenIcon className="size-3.5 shrink-0 opacity-70" />
              ) : (
                <FolderIcon className="size-3.5 shrink-0 opacity-70" />
              )}
              <span className="min-w-0 flex-1 truncate font-medium">{group.label}</span>
              {showHealthBadge ? (
                <Badge
                  size="sm"
                  variant={health.status === "error" ? "error" : "warning"}
                  className="shrink-0 tabular-nums"
                  title={renderHealthBadgeTitle(health)}
                  data-testid={`autodsm-component-agent-group-health:${group.groupId}`}
                >
                  {health.affectedCount}
                </Badge>
              ) : null}
              <ChevronRightIcon
                aria-hidden
                className={cn(
                  "size-3.5 shrink-0 transition-transform",
                  expanded && "rotate-90",
                )}
              />
            </SidebarMenuButton>
            {expanded ? (
              <SidebarMenuSub className="mx-0 border-none px-0 py-0.5">
                <AutoDsmComponentAgentTabBar
                  layout="sidebar-embedded"
                  tabs={group.tabs}
                  activeThreadRef={activeThreadRef}
                  {...(activeComponentPath !== undefined ? { activeComponentPath } : {})}
                  onSelectTab={onSelectTab}
                  {...(onDeleteTab ? { onDeleteTab } : {})}
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
      healthByGroupId,
      isGroupExpanded,
      onDeleteTab,
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

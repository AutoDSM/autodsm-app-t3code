"use client";

import { scopedThreadKey } from "@t3tools/client-runtime";
import { useParams } from "@tanstack/react-router";
import { memo, useCallback } from "react";

import { AutoDsmComponentAgentTabBar } from "~/components/autodsm/AutoDsmComponentAgentTabBar";
import {
  SidebarGroup,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";
import { useAutoDsmComponentAgentTabs } from "~/hooks/useAutoDsmComponentAgentTabs";
import { useAutoDsmWorkspace } from "~/hooks/useAutoDsmWorkspace";
import { isAutodsmMaterializedSystemCwd } from "~/lib/autodsmMaterializedWorkspace";
import { resolveThreadRouteRef } from "~/threadRoutes";

export interface AutoDsmComponentAgentSidebarSectionProps {
  readonly onNavigateHome?: () => void;
}

export const AutoDsmComponentAgentSidebarSection = memo(
  function AutoDsmComponentAgentSidebarSection(props: AutoDsmComponentAgentSidebarSectionProps) {
    const { onNavigateHome } = props;
    const { environmentId, projectId, cwd } = useAutoDsmWorkspace();
    const { isMobile, setOpenMobile } = useSidebar();

    const routeThreadRef = useParams({
      strict: false,
      select: (params) => resolveThreadRouteRef(params),
    });
    const routeThreadKey = routeThreadRef ? scopedThreadKey(routeThreadRef) : null;

    const isMaterialized = cwd !== null && isAutodsmMaterializedSystemCwd(cwd);

    const { tabs, selectAgentTab } = useAutoDsmComponentAgentTabs({
      environmentId: isMaterialized ? environmentId : null,
      projectId: isMaterialized ? projectId : null,
      isMaterialized,
      activeThreadKey: routeThreadKey,
    });

    const closeMobileSidebar = useCallback(() => {
      if (isMobile) {
        setOpenMobile(false);
      }
    }, [isMobile, setOpenMobile]);

    const handleSelectTab = useCallback(
      (threadRef: Parameters<typeof selectAgentTab>[0]) => {
        closeMobileSidebar();
        selectAgentTab(threadRef);
      },
      [closeMobileSidebar, selectAgentTab],
    );

    if (!isMaterialized) {
      return null;
    }

    if (tabs.length === 0) {
      return (
        <SidebarGroup
          data-testid="autodsm-component-agent-sidebar-empty"
          className="border-b border-border px-2 py-2.5"
        >
          <p className="px-2 text-xs text-muted-foreground/70">No component agents yet.</p>
          {onNavigateHome ? (
            <SidebarMenuItem className="mt-2 list-none px-0">
              <SidebarMenuButton
                type="button"
                size="sm"
                className="text-left text-sm"
                onClick={onNavigateHome}
              >
                Go to Home
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : null}
        </SidebarGroup>
      );
    }

    return (
      <AutoDsmComponentAgentTabBar
        layout="sidebar"
        tabs={tabs}
        activeThreadRef={routeThreadRef}
        onSelectTab={handleSelectTab}
      />
    );
  },
);

"use client";

import { scopedThreadKey } from "@t3tools/client-runtime";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearch } from "@tanstack/react-router";
import { memo, useCallback, useMemo } from "react";

import { AutoDsmComponentAgentSidebarTree } from "~/components/autodsm/AutoDsmComponentAgentSidebarTree";
import {
  SidebarGroup,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";
import { useAutoDsmComponentAgentTabs } from "~/hooks/useAutoDsmComponentAgentTabs";
import { useAutoDsmMaterializedProductWorkspace } from "~/hooks/useAutoDsmMaterializedProductWorkspace";
import { useAutoDsmWorkspace } from "~/hooks/useAutoDsmWorkspace";
import {
  buildAutoDsmComponentAgentGroups,
  buildComponentAgentGroupLookup,
} from "~/lib/autoDsmComponentAgentGroups";
import {
  buildGroupRenderHealth,
  buildRenderHealthByPath,
} from "~/lib/autoDsmComponentRenderHealth";
import { getStarterComponentAgents } from "~/lib/autoDsmStarterComponentAgents";
import { isAutoDsmStarterId } from "~/lib/autoDsmStarterCatalog";
import {
  autodsmComponentAgentsQueryOptions,
  autodsmComponentRegistryQueryOptions,
} from "~/lib/autodsmWorkspaceReactQuery";
import { isAutodsmMaterializedSystemCwd } from "~/lib/autodsmMaterializedWorkspace";
import { resolveThreadRouteRef } from "~/threadRoutes";
import { parseDiffRouteSearch } from "~/diffRouteSearch";
import { useUiStateStore } from "~/uiStateStore";

export interface AutoDsmComponentAgentSidebarSectionProps {
  readonly onNavigateHome?: () => void;
}

export const AutoDsmComponentAgentSidebarSection = memo(
  function AutoDsmComponentAgentSidebarSection(props: AutoDsmComponentAgentSidebarSectionProps) {
    const { onNavigateHome } = props;
    const routeWorkspace = useAutoDsmWorkspace();
    const { isElectronProductMode, workspace: productWorkspace } =
      useAutoDsmMaterializedProductWorkspace();
    const starterId = useUiStateStore((state) => state.autodsmOnboarding.starterId);
    const { isMobile, setOpenMobile } = useSidebar();

    const workspace = useMemo(() => {
      if (isElectronProductMode && productWorkspace) {
        return {
          environmentId: productWorkspace.environmentId,
          projectId: productWorkspace.projectId,
          cwd: productWorkspace.cwd,
        };
      }
      return routeWorkspace;
    }, [isElectronProductMode, productWorkspace, routeWorkspace]);

    const { environmentId, projectId, cwd } = workspace;

    const routeThreadRef = useParams({
      strict: false,
      select: (params) => resolveThreadRouteRef(params),
    });
    const routeThreadKey = routeThreadRef ? scopedThreadKey(routeThreadRef) : null;
    const componentPreviewPath = useSearch({
      strict: false,
      select: (search) => parseDiffRouteSearch(search).componentPath ?? null,
    });

    const isMaterialized = cwd !== null && isAutodsmMaterializedSystemCwd(cwd);

    const { tabs, selectAgentTab, deleteAgentTab } = useAutoDsmComponentAgentTabs({
      environmentId: isMaterialized ? environmentId : null,
      projectId: isMaterialized ? projectId : null,
      cwd: isMaterialized ? cwd : null,
      isMaterialized,
      activeThreadKey: routeThreadKey,
    });

    const componentAgentsQuery = useQuery(
      autodsmComponentAgentsQueryOptions({
        environmentId,
        cwd,
        enabled: isMaterialized,
      }),
    );

    const groupLookup = useMemo(() => {
      const starterAgents =
        starterId && isAutoDsmStarterId(starterId) ? getStarterComponentAgents(starterId) : [];
      const serverAgents = componentAgentsQuery.data?.manifest.agents ?? [];
      return buildComponentAgentGroupLookup([
        ...starterAgents.map((agent) => ({
          componentPath: agent.componentPath,
          ...(agent.group ? { group: agent.group } : {}),
        })),
        ...serverAgents.map((agent) => ({
          componentPath: agent.componentPath,
          ...(agent.group ? { group: agent.group } : {}),
        })),
      ]);
    }, [componentAgentsQuery.data?.manifest.agents, starterId]);

    const groups = useMemo(
      () => buildAutoDsmComponentAgentGroups(tabs, groupLookup),
      [groupLookup, tabs],
    );

    const componentRegistryQuery = useQuery(
      autodsmComponentRegistryQueryOptions({
        environmentId,
        cwd,
        enabled: isMaterialized,
      }),
    );

    const healthByGroupId = useMemo(() => {
      const entries = componentRegistryQuery.data?.entries ?? [];
      if (entries.length === 0) {
        return undefined;
      }
      return buildGroupRenderHealth(groups, buildRenderHealthByPath(entries));
    }, [componentRegistryQuery.data?.entries, groups]);

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

    const handleDeleteTab = useCallback(
      (tab: Parameters<typeof deleteAgentTab>[0]) => {
        void deleteAgentTab(tab);
      },
      [deleteAgentTab],
    );

    if (!isMaterialized || !cwd) {
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
      <AutoDsmComponentAgentSidebarTree
        workspaceKey={cwd}
        groups={groups}
        activeThreadRef={routeThreadRef}
        activeComponentPath={componentPreviewPath}
        {...(healthByGroupId ? { healthByGroupId } : {})}
        onSelectTab={handleSelectTab}
        onDeleteTab={handleDeleteTab}
      />
    );
  },
);

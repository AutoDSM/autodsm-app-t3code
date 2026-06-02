"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { JSX } from "react";

import { HomeRecentActivity } from "~/components/autodsm/home/HomeRecentActivity";
import { useAutoDsmWorkspace } from "~/hooks/useAutoDsmWorkspace";
import { autodsmActivityQueryOptions } from "~/lib/autodsmWorkspaceReactQuery";
import { SidebarNavInsetPage } from "../components/SidebarNavInsetPage";

const ACTIVITY_PAGE_LIMIT = 200;

function ActivityRouteView(): JSX.Element {
  const { cwd, environmentId } = useAutoDsmWorkspace();
  const workspaceReady = Boolean(cwd && environmentId);

  const activityQuery = useQuery(
    autodsmActivityQueryOptions({
      environmentId,
      cwd,
      enabled: workspaceReady,
      limit: ACTIVITY_PAGE_LIMIT,
    }),
  );

  const entries = activityQuery.data?.entries ?? [];

  return (
    <SidebarNavInsetPage navLabel="Activity">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Activity</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Everything that has happened in this workspace — components created, sessions started,
            and pull requests opened.
          </p>
        </header>
        <HomeRecentActivity
          entries={entries}
          loading={activityQuery.isPending && workspaceReady}
        />
      </div>
    </SidebarNavInsetPage>
  );
}

export const Route = createFileRoute("/_chat/activity")({
  component: ActivityRouteView,
});

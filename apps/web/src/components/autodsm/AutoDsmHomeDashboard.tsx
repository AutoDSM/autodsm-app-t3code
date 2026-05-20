"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, type JSX } from "react";

import { useAutoDsmWorkspace } from "~/hooks/useAutoDsmWorkspace";
import {
  autodsmActivityQueryOptions,
  autodsmBrandProfileQueryOptions,
  autodsmComponentAgentsQueryOptions,
  autodsmComponentRegistryQueryOptions,
  autodsmProjectProfileQueryOptions,
  autodsmSidecarStatusQueryOptions,
} from "~/lib/autodsmWorkspaceReactQuery";

import { HomeGreeting } from "./home/HomeGreeting";
import { HomeMetricCard } from "./home/HomeMetricCard";
import { HomeRecentActivity } from "./home/HomeRecentActivity";
import { computeAdoption, computeHealth, type RegistryStatus } from "./home/homeMetrics";

const RECENT_ACTIVITY_LIMIT = 10;

export function AutoDsmHomeDashboard(): JSX.Element {
  const { cwd, environmentId, projectName } = useAutoDsmWorkspace();
  const workspaceReady = Boolean(cwd && environmentId);
  const now = useMemo(() => new Date(), []);

  const projectProfileQuery = useQuery(
    autodsmProjectProfileQueryOptions({ environmentId, cwd, enabled: workspaceReady }),
  );

  const brandProfileQuery = useQuery(
    autodsmBrandProfileQueryOptions({ environmentId, cwd, enabled: workspaceReady }),
  );

  const sidecarQuery = useQuery(
    autodsmSidecarStatusQueryOptions({ environmentId, cwd, enabled: workspaceReady }),
  );

  const registryQuery = useQuery(
    autodsmComponentRegistryQueryOptions({
      environmentId,
      cwd,
      enabled: workspaceReady && projectProfileQuery.isSuccess,
    }),
  );

  const componentAgentsQuery = useQuery(
    autodsmComponentAgentsQueryOptions({ environmentId, cwd, enabled: workspaceReady }),
  );

  const activityQuery = useQuery(
    autodsmActivityQueryOptions({
      environmentId,
      cwd,
      enabled: workspaceReady,
      limit: RECENT_ACTIVITY_LIMIT,
    }),
  );

  const componentCount = registryQuery.data?.entries.length ?? null;
  const tokenCount = brandProfileQuery.data?.tokens.length ?? null;
  const agentCount = componentAgentsQuery.data?.manifest.agents.length ?? null;
  const registryStatus: RegistryStatus | null =
    (projectProfileQuery.data?.status as RegistryStatus | undefined) ?? null;
  const sidecarReady = sidecarQuery.data ? sidecarQuery.data.running : null;

  const adoption = computeAdoption(componentCount, agentCount);
  const health = computeHealth({
    registryStatus,
    tokenCount,
    sidecarReady,
    componentCount,
  });

  const recentEntries = activityQuery.data?.entries ?? [];
  const lastPublishedAt = recentEntries[0]?.createdAt ?? null;

  return (
    <div className="flex min-h-full flex-col gap-8 px-6 py-8 sm:px-10 sm:py-12 max-w-screen-2xl mx-auto w-full">
      <HomeGreeting
        projectName={projectName}
        registryStatus={registryStatus}
        sidecarReady={sidecarReady}
        lastPublishedAt={lastPublishedAt}
        now={now}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HomeMetricCard
          label="Components"
          value={componentCount ?? "—"}
          loading={registryQuery.isPending && workspaceReady}
        />
        <HomeMetricCard
          label="Tokens"
          value={tokenCount ?? "—"}
          loading={brandProfileQuery.isPending && workspaceReady}
        />
        <HomeMetricCard
          label="Adoption"
          value={adoption !== null ? `${adoption}%` : "—"}
          loading={(registryQuery.isPending || componentAgentsQuery.isPending) && workspaceReady}
        />
        <HomeMetricCard
          label="Health"
          value={health ?? "—"}
          loading={(registryQuery.isPending || sidecarQuery.isPending) && workspaceReady}
          {...(health !== null ? { unit: "/100" } : {})}
        />
      </section>

      <HomeRecentActivity
        entries={recentEntries}
        loading={activityQuery.isPending && workspaceReady}
        onViewAll={() => {
          // TODO: route to a dedicated activity page when one exists.
        }}
      />
    </div>
  );
}

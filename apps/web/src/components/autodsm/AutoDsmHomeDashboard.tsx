"use client";

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
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
import {
  computeAdoption,
  computeHealth,
  isPublishActivityKind,
  type RegistryStatus,
} from "./home/homeMetrics";

const RECENT_ACTIVITY_LIMIT = 10;

export function AutoDsmHomeDashboard(): JSX.Element {
  const { cwd, environmentId, projectName } = useAutoDsmWorkspace();
  const workspaceReady = Boolean(cwd && environmentId);
  const now = useMemo(() => new Date(), []);
  const navigate = useNavigate();

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
  const agents = componentAgentsQuery.data?.manifest.agents ?? null;
  // "Active" excludes agents whose status is `creating` (initial bootstrap not
  // finished) or `archived` (component removed) — those should not count as a
  // working agent in the dashboard.
  const activeAgentCount = agents?.filter((agent) => agent.status === "active").length ?? null;
  const inactiveAgentCount =
    agents !== null && activeAgentCount !== null ? agents.length - activeAgentCount : null;
  // Adoption denominator is registry entries (the canonical component list);
  // numerator must intersect with the registry so stale agents pointing at
  // removed components do not silently push the ratio over 100%.
  const registryPaths = useMemo<ReadonlySet<string> | null>(
    () =>
      registryQuery.data
        ? new Set(registryQuery.data.entries.map((entry) => entry.relativePath))
        : null,
    [registryQuery.data],
  );
  const matchedActiveAgentCount =
    agents !== null && registryPaths !== null
      ? agents.filter(
          (agent) => agent.status === "active" && registryPaths.has(agent.componentPath),
        ).length
      : null;
  // Components "actually there": prefer the canonical registry count, but when
  // the registry hasn't indexed (empty), surface the distinct components the
  // user already has as agents so the counter reflects real work, not 0.
  const agentComponentCount =
    agents !== null ? new Set(agents.map((agent) => agent.componentPath)).size : null;
  const componentCountFromRegistry = componentCount !== null && componentCount > 0;
  const displayComponentCount = componentCountFromRegistry
    ? componentCount
    : (agentComponentCount ?? componentCount);
  // Tokens the user has explicitly created vs scanned from the workspace's
  // CSS/theme files. Both filters use the real `origin` value — we never
  // subtract to derive `scanned`, since `origin` is optional and any missing
  // value would silently inflate the scanned count.
  const userTokenCount =
    brandProfileQuery.data?.tokens.filter((token) => token.origin === "user").length ?? null;
  const scannedTokenCount =
    brandProfileQuery.data?.tokens.filter((token) => token.origin === "scanned").length ?? null;
  const registryStatus: RegistryStatus | null =
    (projectProfileQuery.data?.status as RegistryStatus | undefined) ?? null;
  const sidecarReady = sidecarQuery.data ? sidecarQuery.data.running : null;

  const adoption = computeAdoption(componentCount, matchedActiveAgentCount);
  const health = computeHealth({
    registryStatus,
    tokenCount,
    sidecarReady,
    componentCount,
  });

  const recentEntries = activityQuery.data?.entries ?? [];
  const lastPublishedAt =
    recentEntries.find((entry) => isPublishActivityKind(entry.kind))?.createdAt ?? null;

  // First-paint loading gate: render a neutral skeleton while the workspace
  // ref is resolving OR the initial project profile query is still pending.
  // This avoids the "System degraded / 0 components" flash that happens when
  // useAutoDsmWorkspace hasn't finished selecting a workspace yet.
  if (!workspaceReady || projectProfileQuery.isPending || projectProfileQuery.isError) {
    let subtitle: string;
    if (!workspaceReady) {
      subtitle = "Resolving workspace from disk history…";
    } else if (projectProfileQuery.isError) {
      const message =
        projectProfileQuery.error instanceof Error
          ? projectProfileQuery.error.message
          : "Unknown error";
      subtitle = `Couldn't load project profile: ${message}`;
    } else {
      subtitle = "Loading project profile";
    }
    return (
      <div className="flex min-h-full flex-col gap-8 px-6 py-8 sm:px-10 sm:py-12 max-w-screen-2xl mx-auto w-full">
        <header className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm">&nbsp;</p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground/40">
            Opening workspace…
          </h1>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
          <p className="text-muted-foreground/60 text-[10px] font-mono">
            cwd: {cwd ?? "(null)"} · env: {environmentId ?? "(null)"}
          </p>
        </header>
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <HomeMetricCard label="Components" value="—" loading={true} />
          <HomeMetricCard label="Tokens" value="—" loading={true} />
          <HomeMetricCard label="Adoption" value="—" loading={true} />
          <HomeMetricCard label="System ready" value="—" loading={true} />
        </section>
      </div>
    );
  }

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
          value={displayComponentCount ?? "—"}
          loading={registryQuery.isPending && workspaceReady}
          {...(displayComponentCount !== null && displayComponentCount > 0
            ? {
                caption: componentCountFromRegistry
                  ? activeAgentCount !== null && inactiveAgentCount !== null && inactiveAgentCount > 0
                    ? `${activeAgentCount} have an active agent (${inactiveAgentCount} archived/creating)`
                    : activeAgentCount !== null
                      ? `${activeAgentCount} have an active agent`
                      : `${displayComponentCount} components indexed`
                  : `${displayComponentCount} components`,
              }
            : displayComponentCount === 0
              ? { caption: "No components indexed yet" }
              : {})}
        />
        <HomeMetricCard
          label="Tokens"
          value={tokenCount ?? "—"}
          loading={brandProfileQuery.isPending && workspaceReady}
          {...(tokenCount !== null
            ? {
                caption:
                  tokenCount > 0
                    ? `${userTokenCount ?? 0} created · ${scannedTokenCount ?? 0} scanned`
                    : "No tokens defined yet",
              }
            : {})}
        />
        <HomeMetricCard
          label="Adoption"
          value={adoption !== null ? `${adoption}%` : "—"}
          loading={(registryQuery.isPending || componentAgentsQuery.isPending) && workspaceReady}
          {...(componentCount !== null && matchedActiveAgentCount !== null && componentCount > 0
            ? {
                caption: `${matchedActiveAgentCount} of ${componentCount} components have an active agent`,
              }
            : {})}
        />
        <HomeMetricCard
          label="System ready"
          value={health ?? "—"}
          loading={(registryQuery.isPending || sidecarQuery.isPending) && workspaceReady}
          {...(health !== null ? { unit: "/100" } : {})}
        />
      </section>

      <HomeRecentActivity
        entries={recentEntries}
        loading={activityQuery.isPending && workspaceReady}
        onViewAll={() => {
          void navigate({ to: "/activity" });
        }}
      />
    </div>
  );
}

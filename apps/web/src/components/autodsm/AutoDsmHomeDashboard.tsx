"use client";

import type { AutoDsmComponentRegistryEntry, AutoDsmProjectProfile } from "@t3tools/contracts";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, type JSX } from "react";
import { useShallow } from "zustand/react/shallow";

import { useAutoDsmWorkspace } from "~/hooks/useAutoDsmWorkspace";
import { getStarterCatalogEntry } from "~/lib/autoDsmStarterCatalog";
import { buildAutoDsmComponentAgentTabs } from "~/lib/autoDsmComponentAgents";
import {
  autodsmBrandProfileQueryOptions,
  autodsmComponentRegistryQueryOptions,
  autodsmProjectProfileQueryOptions,
  autodsmRenderEnvironmentProfileQueryOptions,
  autodsmSidecarStatusQueryOptions,
} from "~/lib/autodsmWorkspaceReactQuery";
import { selectSidebarThreadsForProjectRefs, useStore } from "~/store";
import { buildThreadRouteParams } from "~/threadRoutes";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { useUiStateStore } from "~/uiStateStore";

function normalizeTokenCategory(raw: string): string {
  const value = raw.trim().toLowerCase();
  return value.length > 0 ? value : "other";
}

function usageImportSpanCount(entry: AutoDsmComponentRegistryEntry): number {
  let total = 0;
  for (const spans of Object.values(entry.usageImports)) {
    total += spans.length;
  }
  return total;
}

function indexStatusBadgeVariant(
  status: AutoDsmProjectProfile["status"],
): "default" | "success" | "warning" | "error" | "info" | "outline" | "secondary" {
  switch (status) {
    case "ready":
      return "success";
    case "failed":
      return "error";
    case "partial":
    case "stale":
      return "warning";
    case "indexing":
      return "info";
    default:
      return "secondary";
  }
}

export function AutoDsmHomeDashboard(): JSX.Element {
  const { cwd, environmentId, projectName } = useAutoDsmWorkspace();
  const onboardingStarterId = useUiStateStore((s) => s.autodsmOnboarding.starterId);
  const onboardingCompleted = useUiStateStore((s) => s.autodsmOnboarding.completed);
  const autoDsmWorkspaceProjectRef = useUiStateStore((s) => s.autoDsmWorkspaceProjectRef);
  const autoDsmThreadComponentPathById = useUiStateStore((s) => s.autoDsmThreadComponentPathById);
  const projectThreads = useStore(
    useShallow((state) =>
      autoDsmWorkspaceProjectRef
        ? selectSidebarThreadsForProjectRefs(state, [autoDsmWorkspaceProjectRef])
        : [],
    ),
  );
  const componentAgentTabs = useMemo(() => {
    if (!autoDsmWorkspaceProjectRef) {
      return [];
    }
    return buildAutoDsmComponentAgentTabs({
      environmentId: autoDsmWorkspaceProjectRef.environmentId,
      projectId: autoDsmWorkspaceProjectRef.projectId,
      projectThreads,
      autoDsmThreadComponentPathById,
    });
  }, [autoDsmThreadComponentPathById, autoDsmWorkspaceProjectRef, projectThreads]);

  const workspaceReady = Boolean(cwd && environmentId);

  const projectProfileQuery = useQuery(
    autodsmProjectProfileQueryOptions({
      environmentId,
      cwd,
      enabled: workspaceReady,
    }),
  );

  const brandProfileQuery = useQuery(
    autodsmBrandProfileQueryOptions({
      environmentId,
      cwd,
      enabled: workspaceReady,
    }),
  );

  const sidecarQuery = useQuery(
    autodsmSidecarStatusQueryOptions({
      environmentId,
      cwd,
      enabled: workspaceReady,
    }),
  );

  const renderEnvQuery = useQuery(
    autodsmRenderEnvironmentProfileQueryOptions({
      environmentId,
      cwd,
      enabled: workspaceReady,
    }),
  );

  const registryQuery = useQuery(
    autodsmComponentRegistryQueryOptions({
      environmentId,
      cwd,
      enabled: workspaceReady && projectProfileQuery.isSuccess,
    }),
  );

  const tokenCategoryRows = useMemo(() => {
    const tokens = brandProfileQuery.data?.tokens ?? [];
    const buckets = new Map<string, number>();
    for (const token of tokens) {
      const key = normalizeTokenCategory(token.category);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return [...buckets.entries()].toSorted((left, right) => {
      const diff = right[1] - left[1];
      return diff !== 0 ? diff : left[0].localeCompare(right[0]);
    });
  }, [brandProfileQuery.data?.tokens]);

  const registryMetrics = useMemo(() => {
    const registry = registryQuery.data;
    if (!registry || registry.gate) {
      return null;
    }
    const entries = registry.entries;
    let totalExports = 0;
    let entriesWithDefaultExport = 0;
    let dependencyEdges = 0;
    let providerHintRefs = 0;
    let entriesWithUsageImports = 0;
    let totalUsageImportSpans = 0;
    for (const entry of entries) {
      const exportCount = entry.exports.length;
      totalExports += exportCount;
      if (entry.exports.some((ex) => ex.isDefault)) {
        entriesWithDefaultExport += 1;
      }
      dependencyEdges += entry.dependencyEdges.length;
      providerHintRefs += entry.providerHints.length;
      totalUsageImportSpans += usageImportSpanCount(entry);
      if (Object.keys(entry.usageImports).length > 0) {
        entriesWithUsageImports += 1;
      }
    }
    const topByUsage = [...entries]
      .map((entry) => ({
        relativePath: entry.relativePath,
        exportCount: entry.exports.length,
        usageRefs: usageImportSpanCount(entry),
      }))
      .toSorted((left, right) => {
        const diff = right.usageRefs - left.usageRefs;
        return diff !== 0 ? diff : right.exportCount - left.exportCount;
      })
      .slice(0, 8);

    return {
      entries: entries.length,
      totalExports,
      entriesWithDefaultExport,
      dependencyEdges,
      providerHintRefs,
      entriesWithUsageImports,
      totalUsageImportSpans,
      topByUsage,
    };
  }, [registryQuery.data]);

  if (!cwd || !environmentId) {
    const pickedStarter =
      onboardingCompleted && onboardingStarterId
        ? getStarterCatalogEntry(onboardingStarterId)
        : null;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workspace</CardTitle>
          <CardDescription>
            {pickedStarter ? (
              <>
                Your <span className="font-medium text-foreground">{pickedStarter.label}</span>{" "}
                workspace is ready to set up. Product onboarding finished — the local fork under{" "}
                <span className="font-mono text-xs">~/.autodsm/systems/</span> will wire this
                dashboard next.
              </>
            ) : (
              "Connect or select a project to load AutoDSM artifacts for this dashboard."
            )}
          </CardDescription>
        </CardHeader>
        <CardPanel className="text-sm text-muted-foreground">
          {pickedStarter ? (
            <p>
              Open a folder from the launch flow or settings when multi-workspace support lands; for
              now, add a project via the sidebar once your AutoDSM workspace exists on disk.
            </p>
          ) : (
            <p>
              Home metrics read live project, brand, registry, preview sidecar, and
              render-environment profiles for the active workspace cwd.
            </p>
          )}
        </CardPanel>
      </Card>
    );
  }

  const pending =
    projectProfileQuery.isPending ||
    brandProfileQuery.isPending ||
    sidecarQuery.isPending ||
    renderEnvQuery.isPending;
  const errored =
    projectProfileQuery.isError ||
    brandProfileQuery.isError ||
    sidecarQuery.isError ||
    renderEnvQuery.isError;
  const projectProfile = projectProfileQuery.data;
  const brandProfile = brandProfileQuery.data;
  const sidecar = sidecarQuery.data;
  const renderEnv = renderEnvQuery.data;
  const registry = registryQuery.data;
  const hasCoreData = projectProfile && brandProfile && sidecar && renderEnv;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Home</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Workspace overview from loaded AutoDSM artifacts—components, design tokens, registry
            shape, and preview runtime status.
          </p>
          <p className="mt-2 font-mono text-xs text-muted-foreground">{cwd}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button render={<Link to="/design-components" />} size="sm" variant="secondary">
            Components
          </Button>
          <Button render={<Link to="/design-tokens" />} size="sm" variant="secondary">
            Design tokens
          </Button>
        </div>
      </header>

      {pending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["skeleton-a", "skeleton-b", "skeleton-c", "skeleton-d"] as const).map((key) => (
            <Skeleton key={key} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : null}

      {errored ? (
        <Alert variant="error">
          <AlertTitle>Unable to load dashboard</AlertTitle>
          <AlertDescription>
            AutoDSM RPCs failed for this workspace. Reconnect and try again.
          </AlertDescription>
        </Alert>
      ) : null}

      {hasCoreData ? (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Project</CardTitle>
                <CardDescription>Package + detection profile</CardDescription>
              </CardHeader>
              <CardPanel className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={indexStatusBadgeVariant(projectProfile.status)}>
                    {projectProfile.status}
                  </Badge>
                </div>
                <Separator />
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Package manager</dt>
                    <dd className="font-medium capitalize text-foreground">
                      {projectProfile.packageManager}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Workspace fingerprint</dt>
                    <dd className="max-w-[55%] truncate font-mono text-[0.65rem] text-foreground">
                      {projectProfile.workspaceRootFingerprint}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Artifact revision</dt>
                    <dd className="max-w-[55%] truncate font-mono text-[0.65rem] text-foreground">
                      {projectProfile.meta.invalidationKey}
                    </dd>
                  </div>
                </dl>
              </CardPanel>
              <CardFooter className="flex flex-col items-stretch gap-2 border-t text-xs">
                <p className="font-medium text-foreground">Frameworks</p>
                <div className="flex flex-wrap gap-1">
                  {projectProfile.frameworks.length > 0 ? (
                    projectProfile.frameworks.map((framework) => (
                      <Badge key={framework} variant="outline" size="sm">
                        {framework}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">None recorded</span>
                  )}
                </div>
                <p className="font-medium text-foreground">Component roots</p>
                <ul className="max-h-24 space-y-1 overflow-y-auto font-mono text-[0.65rem] text-muted-foreground">
                  {projectProfile.componentRoots.length > 0 ? (
                    projectProfile.componentRoots.map((path) => <li key={path}>{path}</li>)
                  ) : (
                    <li>—</li>
                  )}
                </ul>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Design tokens</CardTitle>
                <CardDescription>Brand profile</CardDescription>
              </CardHeader>
              <CardPanel className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={indexStatusBadgeVariant(brandProfile.status)}>
                    {brandProfile.status}
                  </Badge>
                </div>
                <Separator />
                <dl className="grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
                    <dt className="text-muted-foreground">Tokens</dt>
                    <dd className="text-lg font-semibold tabular-nums text-foreground">
                      {brandProfile.tokens.length}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
                    <dt className="text-muted-foreground">Categories</dt>
                    <dd className="text-lg font-semibold tabular-nums text-foreground">
                      {tokenCategoryRows.length}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 sm:col-span-2">
                    <dt className="text-muted-foreground">CSS variable sources</dt>
                    <dd className="text-lg font-semibold tabular-nums text-foreground">
                      {brandProfile.cssVariablePaths.length}
                    </dd>
                  </div>
                </dl>
              </CardPanel>
              <CardFooter className="flex flex-col gap-2 border-t text-xs">
                <p className="font-medium text-foreground">Top categories by token count</p>
                {tokenCategoryRows.length > 0 ? (
                  <ul className="space-y-1 text-muted-foreground">
                    {tokenCategoryRows.slice(0, 5).map(([category, count]) => (
                      <li key={category} className="flex justify-between gap-2">
                        <span className="capitalize">{category}</span>
                        <span className="tabular-nums text-foreground">{count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-muted-foreground">No tokens in profile.</span>
                )}
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview runtime</CardTitle>
                <CardDescription>Sidecar + render environment</CardDescription>
              </CardHeader>
              <CardPanel className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Sidecar</span>
                  <Badge variant={sidecar.running ? "success" : "secondary"}>
                    {sidecar.running ? "Running" : "Stopped"}
                  </Badge>
                </div>
                <Separator />
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Port</dt>
                    <dd className="font-mono text-foreground">
                      {sidecar.port !== undefined ? String(sidecar.port) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Origin</dt>
                    <dd className="max-w-[60%] truncate font-mono text-[0.65rem] text-foreground">
                      {sidecar.origin ?? "—"}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="text-muted-foreground">Last error</dt>
                    <dd className="break-words font-mono text-[0.65rem] text-foreground">
                      {sidecar.lastError ?? "—"}
                    </dd>
                  </div>
                </dl>
              </CardPanel>
              <CardFooter className="flex flex-col gap-2 border-t text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Profile schema</span>
                  <Badge variant="outline" size="sm">
                    v{renderEnv.meta.schemaVersion}
                  </Badge>
                </div>
                <dl className="space-y-2">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Sidecar version (artifact)</dt>
                    <dd className="font-mono text-[0.65rem] text-foreground">
                      {renderEnv.sidecarVersion}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Detected packs</dt>
                    <dd className="tabular-nums text-foreground">
                      {renderEnv.detectedPacks.length}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Disabled packs</dt>
                    <dd className="tabular-nums text-foreground">
                      {renderEnv.disabledPackIds.length}
                    </dd>
                  </div>
                </dl>
              </CardFooter>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Component registry</CardTitle>
              <CardDescription>
                {projectName ? (
                  <span>
                    Active workspace{" "}
                    <span className="font-semibold text-foreground">{projectName}</span>
                  </span>
                ) : (
                  "Indexed components for this cwd"
                )}
              </CardDescription>
            </CardHeader>
            <CardPanel className="space-y-4">
              {componentAgentTabs.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Component agents</p>
                  <div className="flex flex-wrap gap-2">
                    {componentAgentTabs.map((tab) => (
                      <Button
                        key={tab.threadKey}
                        render={
                          <Link
                            to="/$environmentId/$threadId"
                            params={buildThreadRouteParams(tab.threadRef)}
                            search={{ componentPath: tab.componentPath }}
                          />
                        }
                        size="xs"
                        variant="secondary"
                      >
                        {tab.title}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
              {registryQuery.isPending ? (
                <p className="text-sm text-muted-foreground">Indexing components…</p>
              ) : null}
              {registryQuery.isError ? (
                <Alert variant="warning">
                  <AlertTitle>Registry unavailable</AlertTitle>
                  <AlertDescription>
                    Component indexing failed or is still warming up. Open the Components workspace
                    to retry.
                  </AlertDescription>
                </Alert>
              ) : null}
              {registry ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">Indexer status</span>
                    <Badge variant={indexStatusBadgeVariant(registry.status)}>
                      {registry.status}
                    </Badge>
                    {registry.gate ? <Badge variant="warning">Build gate</Badge> : null}
                  </div>

                  {registry.gate ? (
                    <Alert variant="warning">
                      <AlertTitle>Registry gated</AlertTitle>
                      <AlertDescription className="space-y-2">
                        <p>{registry.gate.summary}</p>
                        {registry.gate.commandDisplay ? (
                          <p className="break-all font-mono text-[0.65rem] text-muted-foreground">
                            {registry.gate.commandDisplay}
                          </p>
                        ) : null}
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  {registryMetrics ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs">
                          <p className="text-muted-foreground">Registry entries</p>
                          <p className="text-xl font-semibold tabular-nums text-foreground">
                            {registryMetrics.entries}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs">
                          <p className="text-muted-foreground">Total exports</p>
                          <p className="text-xl font-semibold tabular-nums text-foreground">
                            {registryMetrics.totalExports}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs">
                          <p className="text-muted-foreground">Default export coverage</p>
                          <p className="text-xl font-semibold tabular-nums text-foreground">
                            {registryMetrics.entriesWithDefaultExport} / {registryMetrics.entries}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs">
                          <p className="text-muted-foreground">Usage import spans</p>
                          <p className="text-xl font-semibold tabular-nums text-foreground">
                            {registryMetrics.totalUsageImportSpans}
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs">
                          <p className="text-muted-foreground">Dependency edges (sum)</p>
                          <p className="text-lg font-semibold tabular-nums text-foreground">
                            {registryMetrics.dependencyEdges}
                          </p>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs">
                          <p className="text-muted-foreground">Provider hints (sum)</p>
                          <p className="text-lg font-semibold tabular-nums text-foreground">
                            {registryMetrics.providerHintRefs}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2 text-xs">
                        <p className="text-muted-foreground">Entries with usage import metadata</p>
                        <p className="text-lg font-semibold tabular-nums text-foreground">
                          {registryMetrics.entriesWithUsageImports} / {registryMetrics.entries}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Component statistics are hidden while the registry is build-gated.
                    </p>
                  )}

                  {registryMetrics && registryMetrics.topByUsage.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        Components by usage-import span count
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Path</TableHead>
                            <TableHead className="text-right">Exports</TableHead>
                            <TableHead className="text-right">Usage spans</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {registryMetrics.topByUsage.map((row) => (
                            <TableRow key={row.relativePath}>
                              <TableCell className="max-w-[280px] truncate font-mono text-[0.65rem]">
                                {row.relativePath}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.exportCount}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {row.usageRefs}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : null}
                </>
              ) : null}
            </CardPanel>
            <CardFooter className="flex flex-wrap justify-between gap-2 border-t text-xs text-muted-foreground">
              <span className="font-mono text-[0.65rem]">
                Registry revision: {registry?.meta.invalidationKey ?? "—"}
              </span>
              <Button render={<Link to="/design-components" />} size="xs" variant="ghost">
                Open components workspace
              </Button>
            </CardFooter>
          </Card>
        </>
      ) : null}
    </div>
  );
}

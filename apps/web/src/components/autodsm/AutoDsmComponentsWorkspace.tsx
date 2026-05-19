"use client";

import type { AutoDsmComponentRegistryEntry, AutoDsmViewportSpec } from "@t3tools/contracts";
import { useMutation } from "@tanstack/react-query";
import { useState, type JSX } from "react";

import { WebContentsView } from "~/components/WebContentsView";
import { Button } from "~/components/ui/button";
import { ensureEnvironmentApi } from "~/environmentApi";
import { useAutoDsmWorkspace } from "~/hooks/useAutoDsmWorkspace";
import { useSrcComponentsCatalog } from "~/hooks/useSrcComponentsCatalog";
import { normalizeSidebarComponentCatalogPath } from "~/lib/srcComponentsWorkspacePaths";

const VIEWPORT_PRESETS: readonly AutoDsmViewportSpec[] = [
  { label: "desktop-hd", width: 1280, height: 720, devicePixelRatio: 1 },
  { label: "mobile", width: 390, height: 844, devicePixelRatio: 3 },
  { label: "tablet", width: 834, height: 1112, devicePixelRatio: 2 },
];

export function AutoDsmComponentsWorkspace(): JSX.Element {
  const { cwd, environmentId, projectName } = useAutoDsmWorkspace();
  const [selectedRelativePath, setSelectedRelativePath] = useState<string | null>(null);
  const [selectedExportName, setSelectedExportName] = useState<string>("default");
  const [buildLogOpen, setBuildLogOpen] = useState(false);
  const [viewport, setViewport] = useState<AutoDsmViewportSpec>(VIEWPORT_PRESETS[0]!);

  const workspaceCatalogEnabled = Boolean(cwd && environmentId);

  const {
    catalog,
    registry,
    registryPending,
    registryError,
    retryWorkspaceBuild,
    workspaceBuildRetryPending,
  } = useSrcComponentsCatalog({
    environmentId,
    cwd,
    enabled: workspaceCatalogEnabled,
  });

  const registryEntries = registry?.entries ?? [];

  const normalizedSelected =
    selectedRelativePath === null
      ? null
      : normalizeSidebarComponentCatalogPath(selectedRelativePath);

  const selectedRegistryEntry: AutoDsmComponentRegistryEntry | null =
    normalizedSelected === null
      ? null
      : (registryEntries.find(
          (entry) =>
            normalizeSidebarComponentCatalogPath(entry.relativePath) === normalizedSelected,
        ) ?? null);

  const renderPlanMutation = useMutation({
    mutationFn: async () => {
      if (!cwd || !environmentId || !selectedRegistryEntry) {
        throw new Error("Nothing selected.");
      }
      const api = ensureEnvironmentApi(environmentId);
      return api.autodsm.buildRenderPlan({
        cwd,
        componentId: selectedRegistryEntry.componentId,
        exportName: selectedExportName,
        propsJson: "{}",
        viewport,
        theme: "system",
      });
    },
  });

  const executePreviewMutation = useMutation({
    mutationFn: async () => {
      if (!cwd || !environmentId || !selectedRegistryEntry) {
        throw new Error("Nothing selected.");
      }
      const api = ensureEnvironmentApi(environmentId);
      return api.autodsm.executeRenderPlan({
        cwd,
        componentId: selectedRegistryEntry.componentId,
        exportName: selectedExportName,
        propsJson: "{}",
        viewport,
        theme: "system",
      });
    },
  });

  if (!cwd || !environmentId) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/5 px-6 py-10 text-sm text-muted-foreground">
        Add or select a project from Home—Components needs an active workspace cwd for registry and
        preview RPCs.
      </div>
    );
  }

  const gate = catalog.gate;

  return (
    <div className="flex min-h-[60vh] flex-col gap-6 lg:flex-row">
      <aside className="w-full shrink-0 lg:max-w-md">
        <div className="rounded-2xl border border-border/60 bg-card/20 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Registry
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {projectName ? (
              <>
                <span className="font-semibold text-foreground">{projectName}</span>
                <span className="block truncate font-mono text-xs">{cwd}</span>
              </>
            ) : (
              <span className="font-mono text-xs">{cwd}</span>
            )}
          </p>

          {registryPending ? (
            <p className="mt-4 text-xs text-muted-foreground">Loading registry…</p>
          ) : null}
          {registryError ? (
            <p className="mt-4 text-xs text-destructive">Failed to load registry.</p>
          ) : null}

          {gate && !registryPending && !registryError ? (
            <div className="mt-4 space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3 text-xs">
              <p className="font-semibold text-foreground">Workspace build gate</p>
              <p className="text-muted-foreground">{gate.summary}</p>
              {gate.commandDisplay ? (
                <p className="break-all font-mono text-[0.65rem] text-muted-foreground">
                  {gate.commandDisplay}
                </p>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={workspaceBuildRetryPending}
                onClick={() => {
                  setBuildLogOpen(false);
                  retryWorkspaceBuild();
                }}
              >
                {workspaceBuildRetryPending ? "Retrying…" : "Retry build"}
              </Button>
              {gate.stdoutTail || gate.stderrTail ? (
                <div className="space-y-1">
                  <button
                    type="button"
                    className="text-[0.65rem] font-medium text-muted-foreground underline-offset-2 hover:underline"
                    onClick={() => {
                      setBuildLogOpen((open) => !open);
                    }}
                  >
                    {buildLogOpen ? "Hide build log" : "View build log"}
                  </button>
                  {buildLogOpen ? (
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-border/50 bg-muted/20 p-2 font-mono text-[0.6rem] text-muted-foreground">
                      {gate.stderrTail ? (
                        <>
                          <span className="font-semibold text-foreground/80">stderr</span>
                          {"\n"}
                          {gate.stderrTail}
                          {"\n\n"}
                        </>
                      ) : null}
                      {gate.stdoutTail ? (
                        <>
                          <span className="font-semibold text-foreground/80">stdout</span>
                          {"\n"}
                          {gate.stdoutTail}
                        </>
                      ) : null}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {!gate && !registryError && registryEntries.length > 0 ? (
            <ul className="mt-4 max-h-[50vh] space-y-1 overflow-y-auto text-sm">
              {registryEntries.map((entry) => {
                const normalizedPath = normalizeSidebarComponentCatalogPath(entry.relativePath);
                return (
                  <li key={entry.id}>
                    <button
                      className={`w-full rounded-md px-2 py-1.5 text-left hover:bg-muted ${
                        normalizedSelected === normalizedPath
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground"
                      }`}
                      onClick={() => {
                        setSelectedRelativePath(normalizedPath);
                        const initialExport = entry.exports.find((ex) => ex.isDefault)?.name;
                        const fallbackExport = entry.exports[0]?.name ?? "default";
                        setSelectedExportName(initialExport ?? fallbackExport);
                      }}
                      type="button"
                    >
                      <span className="block truncate font-mono text-xs">{normalizedPath}</span>
                      <span className="text-[0.65rem] text-muted-foreground">
                        {entry.exports.length} exports
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {!gate && !registryError && registryEntries.length === 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold text-foreground">Path search fallback</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Registry empty—surfacing ranked matches under {catalog.folderLabel} until the
                indexer returns entries.
              </p>
              {catalog.isPending ? (
                <p className="mt-2 text-xs text-muted-foreground">Searching workspace…</p>
              ) : null}
              {catalog.isError ? (
                <p className="mt-2 text-xs text-destructive">Search failed.</p>
              ) : null}
              <ul className="mt-3 max-h-[40vh] space-y-1 overflow-y-auto">
                {catalog.paths.map((path) => (
                  <li key={path}>
                    <button
                      className={`w-full rounded-md px-2 py-1 text-left font-mono text-xs hover:bg-muted ${
                        normalizedSelected === path
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground"
                      }`}
                      onClick={() => {
                        setSelectedRelativePath(path);
                        setSelectedExportName("default");
                      }}
                      type="button"
                    >
                      {path}
                    </button>
                  </li>
                ))}
              </ul>
              {catalog.truncated ? (
                <p className="mt-2 text-[0.65rem] text-muted-foreground">
                  Results truncated server-side—narrow with focused packages later.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-3 rounded-2xl border border-border/40 bg-muted/5 px-4 py-3 text-[0.7rem] leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">Viewport presets</p>
          <div className="flex flex-wrap gap-2">
            {VIEWPORT_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                size="xs"
                variant={preset.label === viewport.label ? "default" : "outline"}
                className="h-7 text-[10px]"
                onClick={() => {
                  setViewport(preset);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <p className="text-[0.65rem]">
            Targets{" "}
            <span className="font-mono text-foreground">
              {viewport.width}x{viewport.height}
            </span>{" "}
            @ {(viewport.devicePixelRatio ?? 1).toFixed(2)}x DPR — forwarded through RenderPlan
            RPCs.
          </p>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[12rem] flex-1 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">RenderPlan export</p>
              <div className="flex flex-wrap gap-2">
                {(selectedRegistryEntry?.exports ?? []).map((ex) => (
                  <Button
                    key={ex.name}
                    onClick={() => {
                      setSelectedExportName(ex.name);
                    }}
                    size="sm"
                    variant={selectedExportName === ex.name ? "default" : "outline"}
                  >
                    {ex.name}
                  </Button>
                ))}
              </div>
              {!selectedRegistryEntry ? (
                <p className="text-[0.65rem] text-muted-foreground">
                  Select a registry entry to target a component id for RenderPlan JSON.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  !selectedRegistryEntry ||
                  renderPlanMutation.isPending ||
                  executePreviewMutation.isPending
                }
                onClick={() => {
                  void renderPlanMutation.mutateAsync().catch(() => undefined);
                }}
                size="sm"
                variant="secondary"
              >
                Build RenderPlan
              </Button>
              <Button
                disabled={
                  !selectedRegistryEntry ||
                  renderPlanMutation.isPending ||
                  executePreviewMutation.isPending
                }
                onClick={() => {
                  void executePreviewMutation.mutateAsync().catch(() => undefined);
                }}
                size="sm"
              >
                Execute RenderPlan
              </Button>
            </div>
          </div>
          {renderPlanMutation.data ? (
            <pre className="mt-4 max-h-48 overflow-auto rounded-md bg-muted/40 p-3 font-mono text-[0.65rem] text-foreground">
              {JSON.stringify(renderPlanMutation.data.plan, null, 2)}
            </pre>
          ) : null}
          {renderPlanMutation.isError ? (
            <p className="mt-2 text-xs text-destructive">
              {(renderPlanMutation.error as Error)?.message ?? "RenderPlan failed"}
            </p>
          ) : null}
          {executePreviewMutation.data ? (
            <pre className="mt-4 max-h-48 overflow-auto rounded-md border border-border/60 bg-muted/20 p-3 font-mono text-[0.65rem] text-foreground">
              {JSON.stringify(
                {
                  manifest: executePreviewMutation.data.manifest,
                  timingsMs: executePreviewMutation.data.manifest.timingsMs,
                  viewportResults: executePreviewMutation.data.manifest.viewportResults,
                },
                null,
                2,
              )}
            </pre>
          ) : null}
          {executePreviewMutation.isError ? (
            <p className="mt-2 text-xs text-destructive">
              {(executePreviewMutation.error as Error)?.message ?? "executeRenderPlan failed"}
            </p>
          ) : null}
        </div>

        <div className="min-h-[320px] flex-1 rounded-2xl border border-border/60 bg-card/10 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            WebContentsView preview
          </p>
          <p className="mt-1 text-[0.7rem] text-muted-foreground">
            Preview prefers AutoDSM <span className="font-mono">executeRenderPlan</span> when the
            registry resolves a component id; otherwise it falls back to the legacy bundle RPC.
          </p>
          <div className="mt-4 min-h-[240px]">
            {selectedRelativePath ? (
              <WebContentsView
                environmentId={environmentId}
                relativePath={selectedRelativePath}
                workspaceCwd={cwd}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Select a component path to preview.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";

import type { ComponentPreviewManifest, EnvironmentId } from "@t3tools/contracts";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type JSX } from "react";

import {
  AutoDsmComponentPageToolbar,
  type AutoDsmComponentPageToolbarTab,
} from "~/components/autodsm/AutoDsmComponentPageToolbar";
import { AutoDsmComponentVariantsGrid } from "~/components/autodsm/AutoDsmComponentVariantsGrid";
import { AutoDsmPropsPanel } from "~/components/autodsm/AutoDsmPropsPanel";
import { WebContentsView } from "~/components/WebContentsView";
import { ensureEnvironmentApi } from "~/environmentApi";
import { hasMultipleVariants, resolvePrimaryExport } from "~/lib/autoDsmComponentVariantFamily";
import { buildDefaultProps, propsForExport } from "~/lib/componentPreviewProps";
import { cn } from "~/lib/utils";

export interface AutoDsmComponentPreviewCanvasProps {
  readonly relativePath: string;
  readonly environmentId: EnvironmentId;
  readonly workspaceCwd: string | null;
  /**
   * Legacy agent export hint — ignored for Demo tab rendering; primary export
   * from analysis is always used so variant props are pickable in one place.
   */
  readonly exportName?: string;
  readonly registerPromptAppendix?: (getter: () => string | null) => void;
  readonly onInjectComposerText?: (text: string) => void;
  readonly className?: string;
}

export function AutoDsmComponentPreviewCanvas(
  props: AutoDsmComponentPreviewCanvasProps,
): JSX.Element {
  const {
    relativePath,
    environmentId,
    workspaceCwd,
    registerPromptAppendix,
    onInjectComposerText,
    className,
  } = props;

  const [activeTab, setActiveTab] = useState<AutoDsmComponentPageToolbarTab>("demo");
  const [controlledProps, setControlledProps] = useState<Record<string, unknown>>({});

  const analyzeEnabled = Boolean(relativePath?.trim() && workspaceCwd && environmentId);

  const manifestQuery = useQuery({
    queryKey: ["component-preview-analyze", environmentId, workspaceCwd, relativePath],
    enabled: analyzeEnabled,
    staleTime: 0,
    queryFn: async () => {
      const api = ensureEnvironmentApi(environmentId);
      const result = await api.projects.analyzeReactComponent({
        cwd: workspaceCwd!,
        relativePath,
      });
      return result.manifest;
    },
  });

  const manifest: ComponentPreviewManifest | undefined = manifestQuery.data;
  const primaryExportName = useMemo(
    () => (manifest ? resolvePrimaryExport(manifest, relativePath) : "default"),
    [manifest, relativePath],
  );

  const propSpecs = useMemo(
    () => (manifest ? propsForExport(manifest, primaryExportName) : []),
    [manifest, primaryExportName],
  );

  useEffect(() => {
    if (!manifest) {
      return;
    }
    setControlledProps(buildDefaultProps(propsForExport(manifest, primaryExportName)));
  }, [manifest, primaryExportName, relativePath]);

  useEffect(() => {
    if (!manifest || !hasMultipleVariants(manifest)) {
      setActiveTab("demo");
    }
  }, [manifest, relativePath]);

  const variantsEnabled = manifest ? hasMultipleVariants(manifest) : false;

  return (
    <div
      className={cn("flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden", className)}
      data-testid="autodsm-component-preview-canvas"
    >
      <AutoDsmComponentPageToolbar
        activeTab={activeTab}
        variantsEnabled={variantsEnabled}
        onTabChange={setActiveTab}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#1b1b1b] p-4 sm:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/40 bg-[#1b1b1b] shadow-lg">
          {activeTab === "demo" ? (
            <WebContentsView
              key={`${relativePath}::${primaryExportName}`}
              relativePath={relativePath}
              environmentId={environmentId}
              workspaceCwd={workspaceCwd}
              variant="product"
              initialExportName={primaryExportName}
              controlledProps={controlledProps}
              {...(registerPromptAppendix ? { registerPromptAppendix } : {})}
              {...(onInjectComposerText ? { onInjectComposerText } : {})}
            />
          ) : manifest && workspaceCwd ? (
            <AutoDsmComponentVariantsGrid
              relativePath={relativePath}
              environmentId={environmentId}
              workspaceCwd={workspaceCwd}
              manifest={manifest}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground text-xs">
              Loading variants…
            </div>
          )}
        </div>
        {activeTab === "demo" ? (
          <AutoDsmPropsPanel
            propSpecs={propSpecs}
            propsRecord={controlledProps}
            onPropsChange={setControlledProps}
            className="mt-3 rounded-2xl border border-border/40 sm:mt-0 sm:ml-3 sm:rounded-none sm:rounded-r-2xl sm:border-l sm:border-t-0"
          />
        ) : null}
      </div>
    </div>
  );
}

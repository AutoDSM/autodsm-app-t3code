"use client";

import type { ComponentPreviewManifest, EnvironmentId } from "@t3tools/contracts";
import { useQuery } from "@tanstack/react-query";
import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { COMPONENT_PREVIEW_RUNTIME_PATH } from "~/components/appSidebarLauncherChrome";
import { ComponentPreviewLoadingSkeleton } from "~/components/ComponentPreviewLoadingSkeleton";
import { ensureEnvironmentApi } from "~/environmentApi";
import { listVariantExportCells } from "~/lib/autoDsmComponentVariantFamily";
import {
  COMPONENT_PREVIEW_CHILD_READY,
  COMPONENT_PREVIEW_INIT,
  COMPONENT_PREVIEW_RENDERED,
  COMPONENT_PREVIEW_RUNTIME_ERROR,
} from "~/lib/componentPreviewMessages";
import { cn } from "~/lib/utils";

export interface AutoDsmComponentVariantsGridProps {
  readonly relativePath: string;
  readonly environmentId: EnvironmentId;
  readonly workspaceCwd: string;
  readonly manifest: ComponentPreviewManifest;
  readonly starterPrefixes?: readonly string[];
  readonly className?: string;
}

function previewRuntimeHref(): string {
  return new URL(COMPONENT_PREVIEW_RUNTIME_PATH, window.location.origin).href;
}

export function AutoDsmComponentVariantsGrid(
  props: AutoDsmComponentVariantsGridProps,
): JSX.Element {
  const {
    relativePath,
    environmentId,
    workspaceCwd,
    manifest,
    starterPrefixes = [],
    className,
  } = props;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const childReadyRef = useRef(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);

  const variantCells = listVariantExportCells(manifest, starterPrefixes);

  const showcaseQuery = useQuery({
    queryKey: [
      "component-variant-showcase",
      environmentId,
      workspaceCwd,
      relativePath,
      variantCells.map((cell) => cell.exportName).join(","),
    ],
    enabled: variantCells.length > 1,
    staleTime: 0,
    queryFn: async () => {
      const api = ensureEnvironmentApi(environmentId);
      return api.projects.buildComponentVariantShowcase({
        cwd: workspaceCwd,
        relativePath,
        exports: variantCells.map((cell) => ({
          exportName: cell.exportName,
          label: cell.label,
        })),
      });
    },
  });

  const workspacePreviewCssQuery = useQuery({
    queryKey: ["autodsm", "workspace-preview-css", environmentId, workspaceCwd, "variants"],
    staleTime: 30_000,
    queryFn: async () => {
      const api = ensureEnvironmentApi(environmentId);
      return api.autodsm.getWorkspacePreviewCss({ cwd: workspaceCwd });
    },
  });

  const previewJavascript =
    showcaseQuery.data?.ok && showcaseQuery.data.javascript
      ? showcaseQuery.data.javascript
      : undefined;
  const workspaceStyleCss = workspacePreviewCssQuery.data?.css ?? "";

  const pushPreviewToChild = useCallback(() => {
    const iframe = iframeRef.current;
    const js = previewJavascript;
    if (!iframe?.contentWindow || !js || js.length === 0) {
      return;
    }
    iframe.contentWindow.postMessage(
      {
        type: COMPONENT_PREVIEW_INIT,
        payload: {
          javascript: js,
          propsJson: "{}",
          ...(workspaceStyleCss.trim().length > 0 ? { workspaceStyleCss } : {}),
        },
      },
      window.location.origin,
    );
  }, [previewJavascript, workspaceStyleCss]);

  useEffect(() => {
    childReadyRef.current = false;
    setRendered(false);
    setRuntimeError(null);
  }, [relativePath, previewJavascript]);

  useEffect(() => {
    if (!previewJavascript || previewJavascript.length === 0) {
      return;
    }
    if (!childReadyRef.current) {
      return;
    }
    pushPreviewToChild();
  }, [previewJavascript, pushPreviewToChild]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { type?: string; payload?: { message?: string } };
      if (!data?.type) return;
      if (data.type === COMPONENT_PREVIEW_CHILD_READY) {
        childReadyRef.current = true;
        pushPreviewToChild();
      }
      if (data.type === COMPONENT_PREVIEW_RENDERED) {
        setRendered(true);
      }
      if (data.type === COMPONENT_PREVIEW_RUNTIME_ERROR) {
        setRuntimeError(data.payload?.message ?? "Preview runtime error.");
        setRendered(false);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [pushPreviewToChild]);

  if (variantCells.length <= 1) {
    return (
      <div
        className={cn(
          "flex flex-1 items-center justify-center p-6 text-muted-foreground text-xs",
          className,
        )}
      >
        This component has no variant exports to display.
      </div>
    );
  }

  if (showcaseQuery.isPending || workspacePreviewCssQuery.isPending) {
    return <ComponentPreviewLoadingSkeleton className="min-h-0 flex-1" />;
  }

  if (showcaseQuery.isError) {
    return (
      <div className={cn("p-4 text-destructive text-xs", className)}>
        {(showcaseQuery.error as Error)?.message ?? "Failed to build variant showcase."}
      </div>
    );
  }

  if (!showcaseQuery.data?.ok) {
    return (
      <div className={cn("space-y-2 p-4 text-destructive text-xs", className)}>
        <p>Variant showcase failed to compile.</p>
        <ul className="list-disc pl-4">
          {(showcaseQuery.data?.errors ?? []).map((error: string) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      className={cn("relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", className)}
      data-testid="autodsm-component-variants-grid"
    >
      {runtimeError ? (
        <div className="border-b border-destructive/25 bg-destructive/5 px-3 py-2 text-destructive text-xs">
          {runtimeError}
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1 overflow-auto">
        {!rendered && previewJavascript ? (
          <ComponentPreviewLoadingSkeleton overlay className="absolute inset-0" />
        ) : null}
        <iframe
          ref={iframeRef}
          title="Component variants preview"
          className="h-full min-h-[320px] w-full border-0"
          sandbox="allow-scripts allow-same-origin"
          src={previewRuntimeHref()}
        />
      </div>
    </div>
  );
}

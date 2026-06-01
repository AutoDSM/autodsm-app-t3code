"use client";

import type { ComponentPreviewManifest, EnvironmentId } from "@t3tools/contracts";
import { useQuery } from "@tanstack/react-query";
import type { JSX } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { COMPONENT_PREVIEW_RUNTIME_PATH } from "~/components/appSidebarLauncherChrome";
import { ComponentPreviewLoadingSkeleton } from "~/components/ComponentPreviewLoadingSkeleton";
import { ensureEnvironmentApi } from "~/environmentApi";
import { useTheme } from "~/hooks/useTheme";
import {
  hasPropVariants,
  listPropVariantCells,
  listVariantExportCells,
} from "~/lib/autoDsmComponentVariantFamily";
import {
  COMPONENT_PREVIEW_CHILD_READY,
  COMPONENT_PREVIEW_INIT,
  COMPONENT_PREVIEW_RENDERED,
  COMPONENT_PREVIEW_RUNTIME_ERROR,
  COMPONENT_PREVIEW_THEME,
} from "~/lib/componentPreviewMessages";
import { cn } from "~/lib/utils";

export interface AutoDsmComponentVariantsGridProps {
  readonly relativePath: string;
  readonly environmentId: EnvironmentId;
  readonly workspaceCwd: string;
  readonly manifest: ComponentPreviewManifest;
  /** Primary export rendered for prop-based variants. */
  readonly exportName: string;
  /** Base prop values (the Demo tab's controlled props) merged under each varied prop. */
  readonly baseProps?: Record<string, unknown>;
  readonly starterPrefixes?: readonly string[];
  readonly className?: string;
}

function previewRuntimeHref(): string {
  return new URL(COMPONENT_PREVIEW_RUNTIME_PATH, window.location.origin).href;
}

/**
 * Surface the most specific text available. A bare transport/protocol error
 * (e.g. the backend doesn't yet register this RPC — a stale desktop bundle)
 * often has no `.message`; fall back to its tag/name/stringified form so the
 * failure is diagnosable instead of a generic "failed to build".
 */
function describeShowcaseError(error: unknown): string {
  if (error && typeof error === "object") {
    const tagged = error as { message?: unknown; _tag?: unknown; name?: unknown };
    if (typeof tagged.message === "string" && tagged.message.trim().length > 0) {
      return tagged.message;
    }
    if (typeof tagged._tag === "string" && tagged._tag.trim().length > 0) {
      return `Failed to build variant showcase (${tagged._tag}).`;
    }
    if (typeof tagged.name === "string" && tagged.name.trim().length > 0) {
      return `Failed to build variant showcase (${tagged.name}).`;
    }
  }
  const text = String(error ?? "").trim();
  return text.length > 0 && text !== "[object Object]"
    ? `Failed to build variant showcase: ${text}`
    : "Failed to build variant showcase.";
}

export function AutoDsmComponentVariantsGrid(
  props: AutoDsmComponentVariantsGridProps,
): JSX.Element {
  const {
    relativePath,
    environmentId,
    workspaceCwd,
    manifest,
    exportName,
    baseProps = {},
    starterPrefixes = [],
    className,
  } = props;

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const childReadyRef = useRef(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const { resolvedTheme } = useTheme();

  // Prefer prop-based variants; fall back to named-export variants for files
  // that expose variants as separate exports.
  const propCells = hasPropVariants(manifest, exportName)
    ? listPropVariantCells(manifest, exportName, baseProps)
    : [];
  const exportCells = propCells.length > 0 ? [] : listVariantExportCells(manifest, starterPrefixes);
  const mode: "props" | "exports" | "none" =
    propCells.length > 0 ? "props" : exportCells.length > 1 ? "exports" : "none";

  const showcaseQuery = useQuery({
    queryKey: [
      "component-variant-showcase",
      mode,
      environmentId,
      workspaceCwd,
      relativePath,
      exportName,
      mode === "props"
        ? propCells.map((cell) => cell.propsJson).join("|")
        : exportCells.map((cell) => cell.exportName).join(","),
    ],
    enabled: mode !== "none",
    // Cache showcase builds so flipping back to a component's Variants tab is
    // instant. Keyed by mode + path + export + cells, so prop/variant changes
    // still refetch.
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      const api = ensureEnvironmentApi(environmentId);
      if (mode === "props") {
        return api.projects.buildComponentPropVariantShowcase({
          cwd: workspaceCwd,
          relativePath,
          exportName,
          cells: propCells,
        });
      }
      return api.projects.buildComponentVariantShowcase({
        cwd: workspaceCwd,
        relativePath,
        exports: exportCells.map((cell) => ({
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
          resolvedTheme,
          ...(workspaceStyleCss.trim().length > 0 ? { workspaceStyleCss } : {}),
        },
      },
      window.location.origin,
    );
  }, [previewJavascript, workspaceStyleCss, resolvedTheme]);

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

  // Live theme toggles after the showcase has mounted.
  useEffect(() => {
    if (!childReadyRef.current) {
      return;
    }
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) {
      return;
    }
    iframe.contentWindow.postMessage(
      { type: COMPONENT_PREVIEW_THEME, payload: { resolvedTheme } },
      window.location.origin,
    );
  }, [resolvedTheme]);

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

  if (mode === "none") {
    return (
      <div
        className={cn(
          "flex flex-1 items-center justify-center p-6 text-muted-foreground text-xs",
          className,
        )}
      >
        This component has no variants to display.
      </div>
    );
  }

  if (showcaseQuery.isPending || workspacePreviewCssQuery.isPending) {
    return <ComponentPreviewLoadingSkeleton className="min-h-0 flex-1" />;
  }

  if (showcaseQuery.isError) {
    return (
      <div className={cn("p-4 text-destructive text-xs", className)}>
        {describeShowcaseError(showcaseQuery.error)}
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
          className={cn(
            "h-full min-h-[320px] w-full border-0 transition-opacity",
            // Hide the prior showcase while the new one builds so it doesn't
            // flash beneath the opaque skeleton overlay.
            !rendered && previewJavascript ? "pointer-events-none opacity-0" : "opacity-100",
          )}
          sandbox="allow-scripts allow-same-origin"
          src={previewRuntimeHref()}
        />
      </div>
    </div>
  );
}

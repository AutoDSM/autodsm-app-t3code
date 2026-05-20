import type {
  AutoDsmRenderManifest,
  ComponentPreviewManifest,
  ComponentPreviewPropSpec,
  EnvironmentId,
} from "@t3tools/contracts";
import { useQuery } from "@tanstack/react-query";
import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { COMPONENT_PREVIEW_RUNTIME_PATH } from "~/components/appSidebarLauncherChrome";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { ComponentPreviewLoadingSkeleton } from "~/components/ComponentPreviewLoadingSkeleton";
import { cn } from "~/lib/utils";
import { ensureEnvironmentApi } from "~/environmentApi";
import {
  COMPONENT_PREVIEW_CHILD_READY,
  COMPONENT_PREVIEW_INIT,
  COMPONENT_PREVIEW_INTERACTION,
  COMPONENT_PREVIEW_RENDERED,
  COMPONENT_PREVIEW_RUNTIME_ERROR,
} from "~/lib/componentPreviewMessages";
import { randomUUID } from "~/lib/utils";
import { autodsmWorkspaceQueryKeys } from "~/lib/autodsmWorkspaceReactQuery";
import {
  resolveComponentPreviewNativeBounds,
  waitForComponentPreviewHostLayout,
} from "~/lib/componentPreviewNativeBounds";
import {
  isComponentPreviewOverlaySuppressed,
  subscribeComponentPreviewOverlaySuppression,
  useComponentPreviewOverlaySuppressed,
} from "~/lib/componentPreviewOverlaySuppression";
import { observeComponentPreviewLayoutSync } from "~/lib/observeComponentPreviewLayoutSync";
import {
  hideAndDetachComponentPreviewView,
  registerComponentPreviewView,
  unregisterComponentPreviewView,
} from "~/lib/componentPreviewViewRegistry";
import { normalizeSidebarComponentCatalogPath } from "~/lib/srcComponentsWorkspacePaths";

const MAX_RELATIVE_PREVIEW_PATH_CHARS = 512;

function findScrollableAncestor(element: HTMLElement | null): HTMLElement | null {
  let current = element?.parentElement ?? null;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    if (
      overflowY === "auto" ||
      overflowY === "scroll" ||
      overflowX === "auto" ||
      overflowX === "scroll"
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

export interface WebContentsViewProps {
  readonly relativePath: string | null;
  readonly environmentId?: EnvironmentId | null;
  readonly workspaceCwd?: string | null;
  /** Registers a function ChatView calls when sending to append structured preview context. */
  readonly registerPromptAppendix?: (getter: () => string | null) => void;
  /** Optional: pre-fill composer (e.g. quick actions). */
  readonly onInjectComposerText?: (text: string) => void;
  /** Product mode hides dev-only preview chrome (export picker, prop editor, quick prompts). */
  readonly variant?: "dev" | "product";
}

function pickInitialExport(manifest: ComponentPreviewManifest): string {
  const def = manifest.exports.find((ex) => ex.isDefault);
  if (def) return "default";
  const first = manifest.exports.find((ex) => ex.name !== "default");
  return first?.name ?? "default";
}

function propsForExport(
  manifest: ComponentPreviewManifest,
  exportNameValue: string,
): readonly ComponentPreviewPropSpec[] {
  return manifest.propsByExport.find((entry) => entry.exportName === exportNameValue)?.props ?? [];
}

function summarizePropSpecsForAppendix(specs: readonly ComponentPreviewPropSpec[]): string {
  if (specs.length === 0) {
    return "none";
  }
  return specs.map((spec) => `${spec.name}:${spec.kind}${spec.optional ? "?" : ""}`).join(", ");
}

function buildDefaultProps(specs: readonly ComponentPreviewPropSpec[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const spec of specs) {
    if (spec.defaultJson !== undefined) {
      try {
        out[spec.name] = JSON.parse(spec.defaultJson) as unknown;
        continue;
      } catch {
        /* fall through */
      }
    }
    if (spec.optional) {
      if (spec.kind === "enum" || spec.kind === "literalUnion") {
        const values = spec.enumValues ?? [];
        const preferred =
          values.find((value) => value === "default") ??
          values.find((value) => value === "contained") ??
          values[0];
        if (preferred !== undefined) {
          out[spec.name] = preferred;
        }
      }
      continue;
    }
    switch (spec.kind) {
      case "string":
        out[spec.name] = "";
        break;
      case "number":
        out[spec.name] = 0;
        break;
      case "boolean":
        out[spec.name] = false;
        break;
      case "enum":
      case "literalUnion":
        out[spec.name] = spec.enumValues?.[0] ?? "";
        break;
      case "reactNode":
        out[spec.name] = null;
        break;
      case "function":
        out[spec.name] = () => undefined;
        break;
      default:
        break;
    }
  }
  return out;
}

function previewRuntimeHref(): string {
  return new URL(COMPONENT_PREVIEW_RUNTIME_PATH, window.location.origin).href;
}

function bundleDepsReady(manifest: ComponentPreviewManifest, exportNameValue: string): boolean {
  return manifest.exports.some((ex) => ex.name === exportNameValue);
}

function manifestMatchesPath(
  manifest: ComponentPreviewManifest | undefined,
  relativePath: string | undefined,
): boolean {
  if (!manifest || !relativePath) {
    return false;
  }
  return (
    normalizeSidebarComponentCatalogPath(manifest.relativePath) ===
    normalizeSidebarComponentCatalogPath(relativePath)
  );
}

/**
 * Hybrid preview pane: prefers Electron {@link window.desktopBridge.attachComponentPreview} when implemented;
 * otherwise renders a sandboxed iframe pointed at {@link ComponentPreviewRuntimeApp}.
 */
export function WebContentsView(props: WebContentsViewProps): JSX.Element | null {
  const {
    relativePath,
    environmentId = null,
    workspaceCwd = null,
    registerPromptAppendix,
    onInjectComposerText,
    variant = "dev",
  } = props;

  const isProductVariant = variant === "product";

  const trimmed = relativePath?.trim();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewHostRef = useRef<HTMLDivElement>(null);
  const [interactionLog, setInteractionLog] = useState<string[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [propsRecord, setPropsRecord] = useState<Record<string, unknown>>({});
  const [exportName, setExportName] = useState<string>("default");
  const [nativeViewId] = useState(() => randomUUID());
  const childReadyRef = useRef(false);
  const [iframeRendered, setIframeRendered] = useState(false);
  const [nativePriming, setNativePriming] = useState(false);
  const [nativeAttached, setNativeAttached] = useState(false);
  const nativeAttachedRef = useRef(false);
  const [nativeAttachError, setNativeAttachError] = useState<string | null>(null);
  const nativeAttachGenerationRef = useRef(0);
  const renderedPathRef = useRef<string | null>(null);
  const [nativeRenderedPath, setNativeRenderedPath] = useState<string | null>(null);

  const overlaySuppressed = useComponentPreviewOverlaySuppressed();
  const overlaySuppressedRef = useRef(overlaySuppressed);
  overlaySuppressedRef.current = overlaySuppressed;
  const isIntersectingRef = useRef(true);

  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);

  const [previewCrash, setPreviewCrash] = useState<{
    readonly reason?: string;
    readonly exitCode?: number;
  } | null>(null);
  const [previewUnresponsive, setPreviewUnresponsive] = useState(false);

  const bridgeNative =
    typeof window !== "undefined" &&
    typeof window.desktopBridge?.attachComponentPreview === "function";

  const bridgeCapture =
    typeof window !== "undefined" &&
    typeof window.desktopBridge?.captureComponentPreview === "function";

  useEffect(() => {
    if (!bridgeNative) {
      return;
    }

    const unsubscribe = window.desktopBridge?.onComponentPreviewStatus?.((payload) => {
      if (payload.viewId === nativeViewId) {
        if (payload.status === "crashed") {
          const crashPayload: { reason?: string; exitCode?: number } = {};
          if (payload.reason !== undefined) {
            crashPayload.reason = payload.reason;
          }
          if (payload.exitCode !== undefined) {
            crashPayload.exitCode = payload.exitCode;
          }
          setPreviewCrash(crashPayload);
          void window.desktopBridge?.detachComponentPreview?.(nativeViewId);
        } else if (payload.status === "unresponsive") {
          setPreviewUnresponsive(true);
        }
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [bridgeNative, nativeViewId]);

  const analyzeEnabled =
    Boolean(trimmed && trimmed.length <= MAX_RELATIVE_PREVIEW_PATH_CHARS) &&
    workspaceCwd !== null &&
    workspaceCwd.length > 0 &&
    environmentId !== null;

  const productQueryOptions = isProductVariant ? { staleTime: 0 } : {};

  const manifestQuery = useQuery({
    queryKey: ["component-preview-manifest", environmentId, workspaceCwd, trimmed],
    enabled: analyzeEnabled && trimmed !== undefined && trimmed !== null,
    ...productQueryOptions,
    queryFn: async () => {
      const api = ensureEnvironmentApi(environmentId!);
      return api.projects.analyzeReactComponent({
        cwd: workspaceCwd!,
        relativePath: trimmed!,
      });
    },
  });

  const manifest = manifestQuery.data?.manifest;

  const normalizedCatalogPath = useMemo(
    () =>
      trimmed === undefined || trimmed === null
        ? null
        : normalizeSidebarComponentCatalogPath(trimmed),
    [trimmed],
  );

  const registryQuery = useQuery({
    queryKey: autodsmWorkspaceQueryKeys.componentRegistry(environmentId, workspaceCwd),
    enabled: analyzeEnabled,
    queryFn: async () => {
      const api = ensureEnvironmentApi(environmentId!);
      return api.autodsm.getComponentRegistry({ cwd: workspaceCwd! });
    },
  });

  const workspacePreviewCssQuery = useQuery({
    queryKey: ["autodsm", "workspace-preview-css", environmentId, workspaceCwd],
    enabled: analyzeEnabled && environmentId !== null && workspaceCwd !== null,
    staleTime: 30_000,
    queryFn: async () => {
      const api = ensureEnvironmentApi(environmentId!);
      return api.autodsm.getWorkspacePreviewCss({ cwd: workspaceCwd! });
    },
  });
  const workspaceStyleCss = workspacePreviewCssQuery.data?.css ?? "";

  const matchedRegistryEntry = useMemo(() => {
    if (!normalizedCatalogPath || !registryQuery.data) {
      return undefined;
    }
    return registryQuery.data.entries.find(
      (entry) => normalizeSidebarComponentCatalogPath(entry.relativePath) === normalizedCatalogPath,
    );
  }, [normalizedCatalogPath, registryQuery.data]);

  const stablePropsJson = useMemo(() => JSON.stringify(propsRecord), [propsRecord]);

  useEffect(() => {
    if (!manifest || !manifestMatchesPath(manifest, trimmed)) {
      return;
    }
    const nextExport = pickInitialExport(manifest);
    setExportName(nextExport);
    setPropsRecord(buildDefaultProps(propsForExport(manifest, nextExport)));
  }, [manifest, trimmed]);

  const legacyBundleQuery = useQuery({
    queryKey: ["component-preview-bundle", environmentId, workspaceCwd, trimmed, exportName],
    ...productQueryOptions,
    enabled:
      analyzeEnabled &&
      matchedRegistryEntry === undefined &&
      Boolean(
        trimmed && manifest && exportName.length > 0 && bundleDepsReady(manifest, exportName),
      ),
    queryFn: async () => {
      const api = ensureEnvironmentApi(environmentId!);
      return api.projects.buildComponentPreview({
        cwd: workspaceCwd!,
        relativePath: trimmed!,
        exportName,
      });
    },
  });

  const executePreviewQuery = useQuery({
    queryKey: [
      "component-preview-execute-render-plan",
      environmentId,
      workspaceCwd,
      matchedRegistryEntry?.componentId,
      trimmed,
      exportName,
      stablePropsJson,
    ],
    ...productQueryOptions,
    enabled:
      analyzeEnabled &&
      matchedRegistryEntry !== undefined &&
      Boolean(
        trimmed && manifest && exportName.length > 0 && bundleDepsReady(manifest, exportName),
      ),
    queryFn: async () => {
      const api = ensureEnvironmentApi(environmentId!);
      return api.autodsm.executeRenderPlan({
        cwd: workspaceCwd!,
        componentId: matchedRegistryEntry!.componentId,
        exportName,
        propsJson: stablePropsJson,
      });
    },
  });

  const renderManifest: AutoDsmRenderManifest | undefined = executePreviewQuery.data?.manifest;
  const legacyBundle = legacyBundleQuery.data;

  const compileErrors = useMemo(() => {
    if (matchedRegistryEntry !== undefined) {
      if (executePreviewQuery.isError) {
        return [(executePreviewQuery.error as Error)?.message ?? "executeRenderPlan failed"];
      }
      if (renderManifest && renderManifest.ok === false) {
        return renderManifest.errors;
      }
      return [];
    }
    if (legacyBundle && legacyBundle.ok === false) {
      return legacyBundle.errors;
    }
    return [];
  }, [
    executePreviewQuery.error,
    executePreviewQuery.isError,
    legacyBundle,
    matchedRegistryEntry,
    renderManifest,
  ]);

  const manifestReady = manifestMatchesPath(manifest, trimmed);

  const resolvedPreviewJavascript =
    executePreviewQuery.data?.bundledJavascript ??
    (legacyBundleQuery.data?.ok === true ? legacyBundleQuery.data.javascript : undefined);

  const previewJavascript =
    manifestReady && compileErrors.length === 0 ? resolvedPreviewJavascript : undefined;

  const compileWarnings = useMemo(() => {
    if (matchedRegistryEntry !== undefined) {
      return renderManifest?.warnings ?? [];
    }
    return legacyBundle?.warnings ?? [];
  }, [legacyBundle, matchedRegistryEntry, renderManifest]);

  const bundlePending =
    matchedRegistryEntry !== undefined
      ? executePreviewQuery.isPending ||
        (isProductVariant && executePreviewQuery.isFetching && !resolvedPreviewJavascript)
      : legacyBundleQuery.isPending ||
        (isProductVariant && legacyBundleQuery.isFetching && !resolvedPreviewJavascript);

  const analyzePending =
    analyzeEnabled &&
    !manifestReady &&
    (manifestQuery.isPending || (isProductVariant && manifestQuery.isFetching));

  const bundleReady =
    manifestReady &&
    Boolean(previewJavascript && previewJavascript.length > 0) &&
    compileErrors.length === 0;
  const bundleLoading =
    analyzeEnabled &&
    manifestReady &&
    !bundleReady &&
    (bundlePending ||
      (matchedRegistryEntry !== undefined
        ? executePreviewQuery.isFetching
        : legacyBundleQuery.isFetching));

  const bundleRpcFailed =
    matchedRegistryEntry !== undefined ? executePreviewQuery.isError : legacyBundleQuery.isError;

  useEffect(() => {
    childReadyRef.current = false;
    setIframeRendered(false);
    setNativePriming(false);
    setNativeAttached(false);
    nativeAttachedRef.current = false;
    setNativeAttachError(null);
    setNativeRenderedPath(null);
    renderedPathRef.current = null;
    setRuntimeError(null);
    setPreviewScreenshot(null);
  }, [trimmed, exportName, stablePropsJson]);

  const pushPreviewToChild = useCallback(() => {
    const iframe = iframeRef.current;
    const js = previewJavascript;
    if (!iframe?.contentWindow || !js || js.length === 0) return;
    try {
      iframe.contentWindow.postMessage(
        {
          type: COMPONENT_PREVIEW_INIT,
          payload: {
            javascript: js,
            propsJson: stablePropsJson,
            ...(workspaceStyleCss.trim().length > 0
              ? { workspaceStyleCss: workspaceStyleCss }
              : {}),
          },
        },
        window.location.origin,
      );
    } catch {
      setRuntimeError("Failed to post preview payload to iframe.");
    }
  }, [previewJavascript, stablePropsJson, workspaceStyleCss]);

  useEffect(() => {
    if (!previewJavascript || previewJavascript.length === 0) return;
    if (!childReadyRef.current) return;
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
        setIframeRendered(false);
        pushPreviewToChild();
      }
      if (data.type === COMPONENT_PREVIEW_RENDERED) {
        setIframeRendered(true);
        if (trimmed) {
          renderedPathRef.current = trimmed;
        }
      }
      if (data.type === COMPONENT_PREVIEW_RUNTIME_ERROR) {
        setRuntimeError(data.payload?.message ?? "Preview runtime error.");
        setIframeRendered(false);
      }
      if (data.type === COMPONENT_PREVIEW_INTERACTION) {
        setInteractionLog((prev) => [
          ...prev.slice(-40),
          `${new Date().toISOString()} ${JSON.stringify(data.payload)}`,
        ]);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [pushPreviewToChild]);

  useEffect(() => {
    if (!bridgeNative) {
      return;
    }
    registerComponentPreviewView(nativeViewId);
    return () => {
      unregisterComponentPreviewView(nativeViewId);
    };
  }, [bridgeNative, nativeViewId]);

  useEffect(() => {
    if (
      !bridgeNative ||
      !analyzeEnabled ||
      !manifestReady ||
      manifestQuery.isError ||
      previewCrash
    ) {
      return;
    }
    const el = previewHostRef.current;
    if (!el) {
      return;
    }

    let cancelled = false;
    let rafId: number | null = null;
    nativeAttachGenerationRef.current += 1;
    const attachGeneration = nativeAttachGenerationRef.current;
    const previewCell = el.closest<HTMLElement>('[data-slot="component-preview-cell"]');

    const measureBounds = () =>
      resolveComponentPreviewNativeBounds({
        element: el,
        isIntersecting: isIntersectingRef.current,
        suppressForOverlay: overlaySuppressedRef.current || isComponentPreviewOverlaySuppressed(),
        cellElement: previewCell,
      });

    const syncBounds = () => {
      if (!nativeAttachedRef.current) {
        return;
      }
      void window.desktopBridge?.setComponentPreviewBounds?.({
        viewId: nativeViewId,
        bounds: measureBounds(),
      });
    };

    const scheduleSyncBounds = () => {
      if (rafId !== null) {
        return;
      }
      rafId = requestAnimationFrame(() => {
        rafId = null;
        syncBounds();
      });
    };

    const unsubscribeOverlaySuppression = subscribeComponentPreviewOverlaySuppression(() => {
      scheduleSyncBounds();
    });

    const unobserveLayout = observeComponentPreviewLayoutSync({
      element: el,
      onSync: scheduleSyncBounds,
    });

    const scrollParent = findScrollableAncestor(el);
    const onScroll = () => {
      scheduleSyncBounds();
    };
    scrollParent?.addEventListener("scroll", onScroll, { passive: true });

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isIntersectingRef.current = entry?.isIntersecting ?? true;
        scheduleSyncBounds();
      },
      { threshold: [0, 0.01, 1] },
    );
    intersectionObserver.observe(el);

    void (async () => {
      await waitForComponentPreviewHostLayout({
        element: el,
        cellElement: previewCell,
      });
      if (cancelled || attachGeneration !== nativeAttachGenerationRef.current) {
        hideAndDetachComponentPreviewView(nativeViewId);
        return;
      }
      const attached = await window.desktopBridge?.attachComponentPreview?.({
        viewId: nativeViewId,
        url: previewRuntimeHref(),
        bounds: measureBounds(),
      });
      if (cancelled || attachGeneration !== nativeAttachGenerationRef.current) {
        hideAndDetachComponentPreviewView(nativeViewId);
        return;
      }
      if (!attached) {
        setNativeAttachError("Could not attach native component preview.");
        return;
      }
      nativeAttachedRef.current = true;
      setNativeAttached(true);
      setNativeAttachError(null);
      syncBounds();
    })();

    return () => {
      cancelled = true;
      nativeAttachGenerationRef.current += 1;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      unobserveLayout();
      scrollParent?.removeEventListener("scroll", onScroll);
      intersectionObserver.disconnect();
      unsubscribeOverlaySuppression();
      setNativeAttached(false);
      nativeAttachedRef.current = false;
      hideAndDetachComponentPreviewView(nativeViewId);
    };
  }, [
    analyzeEnabled,
    bridgeNative,
    manifestQuery.isError,
    manifestReady,
    nativeViewId,
    previewCrash,
  ]);

  useEffect(() => {
    if (!bridgeNative || !nativeAttached) {
      return;
    }
    const el = previewHostRef.current;
    if (!el) {
      return;
    }
    void window.desktopBridge?.setComponentPreviewBounds?.({
      viewId: nativeViewId,
      bounds: resolveComponentPreviewNativeBounds({
        element: el,
        isIntersecting: isIntersectingRef.current,
        suppressForOverlay: overlaySuppressed,
        cellElement: el.closest<HTMLElement>('[data-slot="component-preview-cell"]'),
      }),
    });
  }, [bridgeNative, nativeAttached, nativeViewId, overlaySuppressed]);

  useEffect(() => {
    if (!bridgeNative || !analyzeEnabled || !nativeAttached) {
      return;
    }
    const js = previewJavascript;
    if (js === undefined || js.length === 0) {
      return;
    }

    let cancelled = false;
    const primeGeneration = nativeAttachGenerationRef.current;
    setNativePriming(true);

    void (async () => {
      try {
        const primed = await window.desktopBridge?.primeComponentPreview?.({
          viewId: nativeViewId,
          javascript: js,
          propsJson: stablePropsJson,
          ...(workspaceStyleCss.trim().length > 0 ? { workspaceStyleCss } : {}),
        });
        if (
          !cancelled &&
          primeGeneration === nativeAttachGenerationRef.current &&
          primed !== false &&
          trimmed
        ) {
          renderedPathRef.current = trimmed;
          setNativeRenderedPath(trimmed);
        }
      } finally {
        if (!cancelled && primeGeneration === nativeAttachGenerationRef.current) {
          setNativePriming(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    analyzeEnabled,
    bridgeNative,
    nativeAttached,
    nativeViewId,
    previewJavascript,
    stablePropsJson,
    trimmed,
    workspaceStyleCss,
  ]);

  const propSpecs = useMemo(
    () => (manifest ? propsForExport(manifest, exportName) : []),
    [exportName, manifest],
  );

  const appendixGetter = useCallback(() => {
    if (!trimmed) {
      return null;
    }
    const cwdLine = workspaceCwd?.trim();
    const lines: string[] = [];
    if (cwdLine) {
      lines.push(`workspaceRoot: ${cwdLine}`);
    }
    lines.push(`componentRelativePath: ${trimmed}`);
    lines.push(`activeExport: ${exportName}`);
    if (manifest) {
      lines.push(`propManifest (${exportName}): ${summarizePropSpecsForAppendix(propSpecs)}`);
      lines.push(`exports: ${manifest.exports.map((ex) => ex.name).join(", ")}`);
      lines.push(`propsSnapshot: ${JSON.stringify(propsRecord, null, 2)}`);
    } else {
      lines.push("propManifest: (analysis unavailable)");
    }
    if (matchedRegistryEntry !== undefined) {
      lines.push(`registryComponentId: ${matchedRegistryEntry.componentId}`);
    }
    lines.push(
      "Editing scope: Change only this component file unless the user explicitly asks to edit other files or expand scope.",
    );
    if (runtimeError) {
      lines.push(`runtimeError: ${runtimeError}`);
    }
    if (compileErrors.length > 0) {
      lines.push(`compileErrors: ${compileErrors.join("; ")}`);
    }
    if (compileWarnings.length > 0) {
      lines.push(`compileWarnings: ${compileWarnings.join("; ")}`);
    }
    if (renderManifest !== undefined) {
      lines.push(`renderManifestId: ${renderManifest.id}`);
      lines.push(`renderManifestOk: ${renderManifest.ok}`);
      lines.push(`previewSessionId: ${renderManifest.previewSessionId ?? "n/a"}`);
      const diagPreview = renderManifest.diagnostics
        .slice(0, 12)
        .map((d) => `[${d.level}] ${d.source}: ${d.message}`);
      if (diagPreview.length > 0) {
        lines.push(`renderDiagnostics: ${diagPreview.join(" | ")}`);
      }
    }
    if (interactionLog.length > 0) {
      lines.push("interactions:", ...interactionLog.slice(-12));
    }
    return lines.join("\n");
  }, [
    compileErrors,
    compileWarnings,
    exportName,
    interactionLog,
    manifest,
    matchedRegistryEntry,
    propsRecord,
    propSpecs,
    renderManifest,
    runtimeError,
    trimmed,
    workspaceCwd,
  ]);

  useEffect(() => {
    registerPromptAppendix?.(appendixGetter);
    return () => registerPromptAppendix?.(() => null);
  }, [appendixGetter, registerPromptAppendix]);

  if (!trimmed || trimmed.length > MAX_RELATIVE_PREVIEW_PATH_CHARS) {
    return null;
  }

  const quick = (text: string) => onInjectComposerText?.(text);

  const showProductLoading =
    isProductVariant &&
    (analyzePending ||
      bundleLoading ||
      nativePriming ||
      (bridgeNative &&
        Boolean(previewJavascript && previewJavascript.length > 0) &&
        nativeRenderedPath !== trimmed) ||
      (!bridgeNative &&
        Boolean(previewJavascript && previewJavascript.length > 0) &&
        renderedPathRef.current !== trimmed &&
        !iframeRendered));

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex min-w-0 flex-col bg-background",
        isProductVariant
          ? "h-full min-h-[240px] min-w-0 w-full flex-1 overflow-hidden bg-transparent"
          : "min-h-[min(40vh,320px)] max-h-[50vh] shrink-0 md:h-full md:min-h-0 md:max-h-none md:w-[min(50%,42rem)] md:flex-1 md:overflow-hidden",
      )}
      data-testid="web-contents-view"
      data-slot="web-contents-view"
      data-component-path={trimmed}
      data-preview-variant={variant}
      aria-label="Component preview"
      role="region"
    >
      {!analyzeEnabled ? (
        <div className="border-border border-dashed p-3 text-muted-foreground text-xs">
          Connect a project workspace to preview components (cwd required).
        </div>
      ) : isProductVariant && analyzePending ? (
        <ComponentPreviewLoadingSkeleton className="min-h-0 flex-1" />
      ) : manifestQuery.isPending ? (
        <div className="p-3 text-muted-foreground text-xs">Analyzing component…</div>
      ) : manifestQuery.isError ? (
        <div className="space-y-2 border-b border-destructive/25 bg-destructive/5 p-3">
          <div className="font-medium text-destructive text-xs">Analyze failed</div>
          <div className="text-destructive text-xs">
            {(manifestQuery.error as Error)?.message ?? "Failed to analyze component."}
          </div>
          <div className="text-muted-foreground text-[10px] leading-snug">
            Fix syntax or export issues in this file, or confirm the path is inside the connected
            workspace. Preview bundling runs only after analysis succeeds.
          </div>
        </div>
      ) : (
        <>
          {!isProductVariant ? (
            <div className="flex flex-wrap items-center gap-2 border-border border-b px-2 py-1">
              <Label className="text-[10px] text-muted-foreground">Export</Label>
              <select
                className="max-w-[12rem] rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]"
                value={exportName}
                onChange={(event) => {
                  const next = event.target.value;
                  setExportName(next);
                  if (manifest) {
                    setPropsRecord(buildDefaultProps(propsForExport(manifest, next)));
                  }
                }}
              >
                {(manifest?.exports ?? []).map((ex) => (
                  <option key={ex.name} value={ex.name}>
                    {ex.isDefault ? `default (${ex.name})` : ex.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="h-6 text-[10px]"
                onClick={() =>
                  quick(
                    `Fix the component preview for \`${trimmed}\` (export \`${exportName}\`). Current runtime error: ${runtimeError ?? (compileErrors.length > 0 ? compileErrors.join("; ") : "none")}`,
                  )
                }
              >
                Prompt: fix preview
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="h-6 text-[10px]"
                onClick={() =>
                  quick(
                    `Improve this component: \`${trimmed}\` (\`${exportName}\`). Current props: \`${JSON.stringify(propsRecord)}\``,
                  )
                }
              >
                Prompt: change component
              </Button>
              {bridgeCapture ? (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="h-6 text-[10px]"
                  onClick={() => {
                    void (async () => {
                      try {
                        const shot = await window.desktopBridge?.captureComponentPreview?.({
                          viewId: nativeViewId,
                        });
                        setPreviewScreenshot(shot ?? null);
                      } catch {
                        setPreviewScreenshot(null);
                      }
                    })();
                  }}
                >
                  Screenshot
                </Button>
              ) : null}
            </div>
          ) : null}

          {!isProductVariant && propSpecs.length > 0 ? (
            <div className="max-h-40 overflow-y-auto border-border border-b px-2 py-2">
              <div className="mb-1 font-medium text-[10px] text-muted-foreground">Props</div>
              <div className="flex flex-col gap-2">
                {propSpecs.map((spec) => (
                  <PropControl
                    key={spec.name}
                    spec={spec}
                    value={propsRecord[spec.name]}
                    onChange={(next) =>
                      setPropsRecord((prev) => ({
                        ...prev,
                        [spec.name]: next,
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}

          {!isProductVariant && bundleRpcFailed ? (
            <div className="space-y-1 border-b border-destructive/25 bg-destructive/5 px-2 py-2 text-destructive text-[11px]">
              <div className="font-medium">Preview pipeline RPC failed</div>
              <div>
                {matchedRegistryEntry !== undefined
                  ? ((executePreviewQuery.error as Error)?.message ?? "executeRenderPlan failed.")
                  : ((legacyBundleQuery.error as Error)?.message ??
                    "buildComponentPreview failed.")}
              </div>
            </div>
          ) : null}

          {bundlePending && !isProductVariant ? (
            <div className="p-3 text-muted-foreground text-xs">Bundling preview…</div>
          ) : compileErrors.length > 0 ? (
            <div className="space-y-2 border-b border-destructive/30 bg-destructive/5 px-2 py-2">
              <div className="font-semibold text-destructive text-[11px]">Render failure card</div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-destructive text-[11px]">
                {compileErrors.join("\n")}
              </pre>
              {renderManifest?.diagnostics !== undefined &&
              renderManifest.diagnostics.length > 0 ? (
                <ul className="max-h-32 overflow-auto space-y-1 text-[10px] text-muted-foreground">
                  {renderManifest.diagnostics.slice(0, 24).map((row) => (
                    <li key={`${row.level}:${row.source}:${row.atMs}:${row.message}`}>
                      <span className="font-semibold text-foreground">[{row.level}]</span>{" "}
                      <span className="font-mono text-[10px]">{row.source}</span>: {row.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : compileWarnings.length > 0 && !isProductVariant ? (
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap border-b border-border/60 bg-muted/10 px-2 py-2 text-[10px] text-muted-foreground">
              {compileWarnings.join("\n")}
            </pre>
          ) : runtimeError || nativeAttachError ? (
            <div
              className={cn(
                "border-b border-destructive/40 bg-destructive/10 px-2 py-1 text-destructive",
                isProductVariant ? "text-xs" : "text-[11px]",
              )}
            >
              {runtimeError ?? nativeAttachError}
            </div>
          ) : null}

          {!isProductVariant && previewScreenshot ? (
            <div className="border-b border-border/60 bg-muted/10 px-2 py-2">
              <div className="mb-1 text-[10px] font-medium text-muted-foreground">Last capture</div>
              <img
                alt="Captured component preview"
                className="max-h-48 w-auto rounded-md border border-border/60 bg-background"
                src={previewScreenshot}
              />
            </div>
          ) : null}

          <div
            ref={previewHostRef}
            className={cn(
              "relative min-h-0 min-w-0 flex-1",
              isProductVariant ? "h-full min-h-0 w-full" : undefined,
            )}
          >
            {!bridgeNative ? (
              <iframe
                ref={iframeRef}
                title="Component preview"
                className="h-full min-h-[240px] w-full border-0"
                sandbox="allow-scripts"
                src={previewRuntimeHref()}
              />
            ) : isProductVariant ? (
              <div
                aria-hidden
                className="block h-full min-h-0 w-full bg-transparent"
                data-testid="component-preview-native-host"
              />
            ) : (
              <div
                aria-hidden
                className="h-full min-h-[240px] w-full bg-transparent"
                data-testid="component-preview-native-host"
              />
            )}
            {showProductLoading ? <ComponentPreviewLoadingSkeleton overlay /> : null}

            {previewCrash ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-card border rounded-lg m-4 shadow-sm z-50">
                <svg
                  className="w-12 h-12 text-destructive mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Preview process crashed
                </h3>
                <p className="text-xs text-muted-foreground mb-4 max-w-xs font-mono">
                  The preview helper process terminated unexpectedly (
                  {previewCrash.reason ?? "exit code"}: {previewCrash.exitCode ?? -1}).
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    setPreviewCrash(null);
                    setPreviewUnresponsive(false);
                    // Force re-attaching
                    nativeAttachGenerationRef.current += 1;
                    setNativeAttached(false);
                  }}
                >
                  Reload Preview
                </Button>
              </div>
            ) : null}

            {previewUnresponsive ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-card/90 backdrop-blur-[1px] border rounded-lg m-4 shadow-sm z-50">
                <h3 className="text-sm font-semibold text-foreground mb-1">Preview unresponsive</h3>
                <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                  The preview window is not responding to events.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPreviewCrash(null);
                    setPreviewUnresponsive(false);
                    // Force re-attaching
                    nativeAttachGenerationRef.current += 1;
                    setNativeAttached(false);
                  }}
                >
                  Attempt Reload
                </Button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function PropControl(input: {
  readonly spec: ComponentPreviewPropSpec;
  readonly value: unknown;
  readonly onChange: (next: unknown) => void;
}): JSX.Element {
  const { spec, value, onChange } = input;
  const label = `${spec.name}${spec.optional ? "" : "*"}`;

  if (spec.kind === "boolean") {
    return (
      <label className="flex items-center gap-2 text-[11px]">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{label}</span>
      </label>
    );
  }

  if (spec.kind === "number") {
    return (
      <label className="flex flex-col gap-0.5 text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <input
          type="number"
          className="rounded border border-border bg-background px-1 py-0.5 font-mono"
          value={typeof value === "number" ? value : Number(value ?? 0)}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </label>
    );
  }

  if (spec.kind === "enum" || spec.kind === "literalUnion") {
    const opts = spec.enumValues ?? [];
    return (
      <label className="flex flex-col gap-0.5 text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <select
          className="rounded border border-border bg-background px-1 py-0.5 font-mono"
          value={typeof value === "string" ? value : String(opts[0] ?? "")}
          onChange={(event) => onChange(event.target.value)}
        >
          {opts.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (
    spec.kind === "object" ||
    spec.kind === "array" ||
    spec.kind === "unsupported" ||
    spec.kind === "unknown"
  ) {
    const text =
      typeof value === "string"
        ? value
        : JSON.stringify(value ?? (spec.kind === "array" ? [] : {}), null, 2);
    return (
      <label className="flex flex-col gap-0.5 text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <textarea
          className="min-h-[48px] rounded border border-border bg-background px-1 py-0.5 font-mono"
          value={text}
          onChange={(event) => {
            try {
              onChange(JSON.parse(event.target.value) as unknown);
            } catch {
              onChange(event.target.value);
            }
          }}
        />
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-0.5 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="text"
        className="rounded border border-border bg-background px-1 py-0.5 font-mono"
        value={typeof value === "string" ? value : String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

import type {
  AutoDsmRenderManifest,
  ComponentPreviewExportKind,
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
import {
  ComponentPreviewLoadingSkeleton,
  type ComponentPreviewLoadingStage,
} from "~/components/ComponentPreviewLoadingSkeleton";
import { cn } from "~/lib/utils";
import { ensureEnvironmentApi } from "~/environmentApi";
import {
  COMPONENT_PREVIEW_CHILD_READY,
  COMPONENT_PREVIEW_INIT,
  COMPONENT_PREVIEW_INTERACTION,
  COMPONENT_PREVIEW_RENDERED,
  COMPONENT_PREVIEW_RUNTIME_ERROR,
  COMPONENT_PREVIEW_STATUS,
  type ComponentPreviewStatusPayload,
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
import {
  buildDefaultProps,
  ComponentPreviewPropControl,
  propsForExport,
  summarizePropSpecsForAppendix,
} from "~/lib/componentPreviewProps";
import { useStaleStagingCwdRecovery } from "~/hooks/useStaleStagingCwdRecovery";

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
  /** When set, props are controlled by the parent (product Demo tab). */
  readonly controlledProps?: Record<string, unknown>;
  /**
   * Optional initial named export to render. When provided, used in place
   * of {@link pickInitialExport}'s default selection. Passed in by the
   * per-component thread page so a click on "Floating Action Button —
   * Extended" actually renders `MuiFabExtended` and not `MuiFab`.
   * Must match a name in the analyzed component's `manifest.exports`;
   * silently falls back to `pickInitialExport` otherwise.
   */
  readonly initialExportName?: string;
}

const RENDERABLE_EXPORT_KINDS: ReadonlySet<ComponentPreviewExportKind> = new Set([
  "function",
  "forwardRef",
  "memo",
  "class",
]);

export function pickInitialExport(manifest: ComponentPreviewManifest): string {
  const def = manifest.exports.find((ex) => ex.isDefault);
  if (def) return "default";
  // Prefer exports the analyzer recognised as actual components. Without this
  // the picker can select a non-renderable value (e.g. an exported const, a
  // re-exported icon) that bundles to nothing.
  const firstRenderable = manifest.exports.find(
    (ex) => ex.name !== "default" && RENDERABLE_EXPORT_KINDS.has(ex.kind),
  );
  if (firstRenderable) return firstRenderable.name;
  const firstAny = manifest.exports.find((ex) => ex.name !== "default");
  return firstAny?.name ?? "default";
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
    initialExportName,
    controlledProps,
  } = props;

  const isProductVariant = variant === "product";
  const isControlledProps = controlledProps !== undefined;

  const trimmed = relativePath?.trim();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewHostRef = useRef<HTMLDivElement>(null);
  const [interactionLog, setInteractionLog] = useState<string[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [propsRecord, setPropsRecord] = useState<Record<string, unknown>>({});
  // Initialize from the caller-supplied export so the first render of bundleDepsReady
  // already sees the right name; otherwise the queries are briefly disabled and
  // can race their enabled flag against the manifest-load effect below.
  const [exportName, setExportName] = useState<string>(() => {
    const initial = initialExportName?.trim();
    return initial !== undefined && initial.length > 0 ? initial : "default";
  });
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

  // Track how long the current bundle/analyze has been in flight. Turns the
  // perceived "infinite spinner" into a visible elapsed counter so users (and
  // we) know whether the RPC is actually progressing.
  const [bundleStartedAtMs, setBundleStartedAtMs] = useState<number | null>(null);
  const [bundleElapsedMs, setBundleElapsedMs] = useState<number>(0);

  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);

  const [previewCrash, setPreviewCrash] = useState<{
    readonly reason?: string;
    readonly exitCode?: number;
  } | null>(null);
  const [previewUnresponsive, setPreviewUnresponsive] = useState(false);
  const [nativePrimeTimedOut, setNativePrimeTimedOut] = useState(false);

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
        } else if (payload.status === "prime-failed") {
          setRuntimeError(payload.message ?? "Native preview failed to receive INIT payload.");
          setNativePrimeTimedOut(true);
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

  const effectivePropsRecord = isControlledProps ? controlledProps : propsRecord;
  const stablePropsJson = useMemo(
    () => JSON.stringify(effectivePropsRecord),
    [effectivePropsRecord],
  );

  useEffect(() => {
    if (!manifest || !manifestMatchesPath(manifest, trimmed)) {
      return;
    }
    // Prefer the caller-supplied export (per-component thread routes pass
    // the agent's `exportName` so variant-specific agents render the right
    // variant). Fall back to pickInitialExport when the requested export
    // isn't analyzable (file's export surface drifted from the manifest).
    const requested = initialExportName?.trim();
    const requestedIsAvailable =
      requested !== undefined &&
      requested.length > 0 &&
      manifest.exports.some((ex) => ex.name === requested);
    const nextExport = requestedIsAvailable ? requested! : pickInitialExport(manifest);
    setExportName(nextExport);
    if (!isControlledProps) {
      setPropsRecord(buildDefaultProps(propsForExport(manifest, nextExport)));
    }
  }, [manifest, trimmed, initialExportName, isControlledProps]);

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

  // Auto-recover when the server rejects the cwd because it lives in the
  // staging directory. The frontend's project store may be holding a stale
  // staging path from a crashed workspace-creation flow; the hook detects
  // the rejection, refetches workspace history, and patches the store with
  // the FINAL systemPath so the queries below re-fire against the right cwd.
  // Identifies the project to heal via the failing `workspaceCwd` itself
  // rather than a separate persisted ref — the ref isn't populated on
  // direct thread-URL navigation, but the cwd is always in scope here.
  const firstStagingError = useMemo(() => {
    const candidates = [
      manifestQuery.error,
      registryQuery.error,
      legacyBundleQuery.error,
      executePreviewQuery.error,
    ];
    for (const candidate of candidates) {
      if (candidate instanceof Error && candidate.message.includes("staging directory")) {
        return candidate;
      }
    }
    return null;
  }, [
    manifestQuery.error,
    registryQuery.error,
    legacyBundleQuery.error,
    executePreviewQuery.error,
  ]);
  const staleStagingRecovery = useStaleStagingCwdRecovery({
    environmentId,
    workspaceCwd,
    error: firstStagingError,
  });

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

  // Use fetchStatus rather than isPending. In TanStack Query v5 a disabled query
  // reports isPending: true forever (no data, no error). That made the skeleton
  // hang whenever matchedRegistryEntry was undefined or bundleDepsReady false.
  // fetchStatus === "fetching" only when a request is genuinely in flight.
  const bundlePending =
    matchedRegistryEntry !== undefined
      ? executePreviewQuery.fetchStatus === "fetching" && !resolvedPreviewJavascript
      : legacyBundleQuery.fetchStatus === "fetching" && !resolvedPreviewJavascript;

  const analyzePending =
    analyzeEnabled && !manifestReady && manifestQuery.fetchStatus === "fetching";

  // While the registry RPC is in flight we don't yet know whether this component
  // will resolve to a design-system entry (executePreviewQuery) or a legacy bundle
  // (legacyBundleQuery). Treat that interval as "loading" so we keep showing the
  // skeleton instead of falling through to "Preview unavailable" prematurely.
  const registryPending =
    analyzeEnabled && registryQuery.fetchStatus === "fetching" && registryQuery.data === undefined;

  // Surface registry build gates. A skipped build (no scripts.build) is fine for
  // shadcn-style starters that don't need a pre-build step. Anything else means
  // we cannot reliably render and should tell the user instead of spinning.
  const registryGate = registryQuery.data?.gate ?? null;
  const registryStatus = registryQuery.data?.status;
  const registryHardFailed =
    registryStatus === "failed" ||
    (registryGate !== null && registryGate.code !== "workspace_build_skipped");

  // Drive the elapsed-time counter: start ticking when bundling begins, stop
  // when it ends. Without this users see an unmoving "Bundling preview…"
  // spinner and can't tell if the RPC is hung or just slow.
  useEffect(() => {
    if (bundlePending || analyzePending || registryPending) {
      if (bundleStartedAtMs === null) {
        setBundleStartedAtMs(Date.now());
        setBundleElapsedMs(0);
      }
      const id = window.setInterval(() => {
        if (bundleStartedAtMs !== null) {
          setBundleElapsedMs(Date.now() - bundleStartedAtMs);
        }
      }, 250);
      return () => window.clearInterval(id);
    }
    if (bundleStartedAtMs !== null) {
      setBundleStartedAtMs(null);
      setBundleElapsedMs(0);
    }
    return undefined;
  }, [bundlePending, analyzePending, registryPending, bundleStartedAtMs]);

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

  // When ANY HTML diagnostic banner needs to be visible (compile error,
  // runtime error, "export not found" amber, registry-still-indexing
  // fallback), the parent must temporarily collapse the native Electron
  // WebContentsView so the banner isn't covered by the OS-level composited
  // layer. Without this, users in Electron see only the native view's
  // "Waiting for component bundle…" placeholder while real errors hide
  // behind it. Compute the boolean here; the effect at the next step
  // toggles bounds when it flips.
  const exportMissingInManifest = manifest !== undefined && !bundleDepsReady(manifest, exportName);
  const shouldHideNativeView =
    bridgeNative &&
    !previewJavascript &&
    !bundlePending &&
    !analyzePending &&
    (compileErrors.length > 0 ||
      bundleRpcFailed ||
      runtimeError !== null ||
      nativePrimeTimedOut ||
      exportMissingInManifest ||
      manifestQuery.isError);

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
    setNativePrimeTimedOut(false);
  }, [trimmed, exportName, stablePropsJson]);

  useEffect(() => {
    if (!bridgeNative || !nativeAttached) {
      return;
    }
    if (!analyzeEnabled || !manifestReady || manifestQuery.isError || previewCrash) {
      return;
    }
    if (!previewJavascript || previewJavascript.length === 0) {
      return;
    }
    if (nativeRenderedPath === trimmed) {
      return;
    }
    if (nativePrimeTimedOut) {
      return;
    }

    const timeoutMs = 15_000;
    const id = window.setTimeout(() => {
      setNativePrimeTimedOut(true);
      setRuntimeError("Native preview did not acknowledge INIT (prime timeout).");
    }, timeoutMs);
    return () => window.clearTimeout(id);
  }, [
    analyzeEnabled,
    bridgeNative,
    manifestQuery.isError,
    manifestReady,
    nativeAttached,
    nativePrimeTimedOut,
    nativeRenderedPath,
    previewCrash,
    previewJavascript,
    trimmed,
  ]);

  // Toggle the native preview's screen bounds based on whether an HTML
  // diagnostic banner needs to be visible. Setting bounds to (0,0,0,0)
  // collapses the OS-composited native view, exposing the renderer DOM
  // underneath. When the banner clears, the native view re-attaches at
  // measured bounds via the existing syncBounds path.
  useEffect(() => {
    if (!bridgeNative || !nativeAttachedRef.current) return;
    if (shouldHideNativeView) {
      void window.desktopBridge?.setComponentPreviewBounds?.({
        viewId: nativeViewId,
        bounds: { x: 0, y: 0, width: 0, height: 0 },
      });
    }
    // When shouldHideNativeView flips back to false, the next render's
    // `syncBounds` (from the layout observer / scroll listener) restores
    // the real bounds — no explicit restore here.
  }, [bridgeNative, nativeViewId, shouldHideNativeView]);

  const pushPreviewToChild = useCallback(() => {
    const iframe = iframeRef.current;
    const js = previewJavascript;
    if (!iframe?.contentWindow || !js || js.length === 0) {
      // eslint-disable-next-line no-console
      console.info("[component-preview] push skipped", {
        hasIframe: Boolean(iframe?.contentWindow),
        hasJs: Boolean(js && js.length > 0),
      });
      return;
    }
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
      // eslint-disable-next-line no-console
      console.info("[component-preview] push success", { bytes: js.length });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[component-preview] push failed", err);
      setRuntimeError("Failed to post preview payload to iframe.");
    }
  }, [previewJavascript, stablePropsJson, workspaceStyleCss]);

  const pushStatusToChild = useCallback((payload: ComponentPreviewStatusPayload) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        { type: COMPONENT_PREVIEW_STATUS, payload },
        window.location.origin,
      );
    } catch {
      // Iframe may be navigating away; status messages are advisory.
    }
  }, []);

  // Surface bundle failures and the "exports unanalyzed" gap to the iframe so it
  // can replace the indefinite "Waiting for component bundle…" spinner with a
  // useful message. The parent already renders banner overlays for these states,
  // but the iframe runs in a separate document and otherwise has no signal.
  useEffect(() => {
    if (!childReadyRef.current) return;
    if (previewJavascript && previewJavascript.length > 0) return;
    if (compileErrors.length > 0) {
      pushStatusToChild({ phase: "bundle-error", message: compileErrors.join("\n") });
      return;
    }
    if (manifest && !bundleDepsReady(manifest, exportName)) {
      pushStatusToChild({ phase: "analyzing" });
      return;
    }
    // On the registry-matched path, executeRenderPlan boots a Vite sidecar
    // alongside the bundle. The sidecar's listen() takes seconds on a fresh
    // shadcn workspace; show specific copy once we've been waiting >2s so the
    // user knows what's actually slow.
    if (matchedRegistryEntry !== undefined && bundleElapsedMs > 2000) {
      pushStatusToChild({ phase: "sidecar-warmup" });
    }
  }, [
    compileErrors,
    manifest,
    exportName,
    previewJavascript,
    pushStatusToChild,
    matchedRegistryEntry,
    bundleElapsedMs,
  ]);

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
        // eslint-disable-next-line no-console
        console.info("[component-preview] child-ready received");
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
      registryPending ||
      bundleLoading ||
      nativePriming ||
      (bridgeNative &&
        Boolean(previewJavascript && previewJavascript.length > 0) &&
        nativeRenderedPath !== trimmed) ||
      (!bridgeNative &&
        Boolean(previewJavascript && previewJavascript.length > 0) &&
        renderedPathRef.current !== trimmed &&
        !iframeRendered));

  // Resolved-then-down to the "narrowest" stage so the skeleton label and
  // diagnostics reflect what the user is actually waiting on right now.
  const loadingStage: ComponentPreviewLoadingStage = analyzePending
    ? "analyze"
    : registryPending
      ? "registry"
      : bundleLoading
        ? "bundle"
        : "native-attach";

  const handlePreviewRetry = useCallback(() => {
    void manifestQuery.refetch();
    void registryQuery.refetch();
    if (matchedRegistryEntry !== undefined) {
      void executePreviewQuery.refetch();
    } else {
      void legacyBundleQuery.refetch();
    }
  }, [manifestQuery, registryQuery, executePreviewQuery, legacyBundleQuery, matchedRegistryEntry]);

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
        <div className="border-border border-dashed p-3 text-muted-foreground text-xs space-y-1">
          <p>Preview unavailable — one of the required inputs is missing:</p>
          <ul className="font-mono text-[10px] space-y-0.5 opacity-80">
            <li>
              relativePath: <code>{trimmed && trimmed.length > 0 ? trimmed : "(empty)"}</code>
            </li>
            <li>
              workspaceCwd:{" "}
              <code>{workspaceCwd && workspaceCwd.length > 0 ? workspaceCwd : "(null)"}</code>
            </li>
            <li>
              environmentId: <code>{environmentId ?? "(null)"}</code>
            </li>
          </ul>
        </div>
      ) : isProductVariant && analyzePending ? (
        <ComponentPreviewLoadingSkeleton
          className="min-h-0 flex-1"
          elapsedMs={bundleElapsedMs}
          stage="analyze"
          diagnosticText={appendixGetter() ?? undefined}
          onRetry={handlePreviewRetry}
        />
      ) : manifestQuery.isPending ? (
        <div className="p-3 text-muted-foreground text-xs">Analyzing component…</div>
      ) : manifestQuery.isError ? (
        firstStagingError !== null && staleStagingRecovery.status === "healing" ? (
          <div className="space-y-2 border-b border-amber-500/25 bg-amber-500/5 p-3">
            <div className="font-medium text-amber-700 text-xs dark:text-amber-300">
              Recovering workspace path…
            </div>
            <div className="text-muted-foreground text-[10px] leading-snug">
              The workspace store was pointing at the staging directory. Refreshing from
              workspace history.
            </div>
          </div>
        ) : firstStagingError !== null &&
          staleStagingRecovery.status === "no-matching-workspace" ? (
          <div className="space-y-2 border-b border-destructive/25 bg-destructive/5 p-3">
            <div className="font-medium text-destructive text-xs">Workspace not found</div>
            <div className="text-destructive text-xs">
              The active workspace isn&apos;t in your history anymore. Pick a workspace from the
              sidebar.
            </div>
          </div>
        ) : (
          <div className="space-y-2 border-b border-destructive/25 bg-destructive/5 p-3">
            <div className="font-medium text-destructive text-xs">Analyze failed</div>
            <div className="text-destructive text-xs">
              {(manifestQuery.error as Error)?.message ?? "Failed to analyze component."}
            </div>
            <div className="text-muted-foreground text-[10px] leading-snug">
              Fix syntax or export issues in this file, or confirm the path is inside the
              connected workspace. Preview bundling runs only after analysis succeeds.
            </div>
          </div>
        )
      ) : isProductVariant && registryHardFailed ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-6">
          <div className="max-w-lg space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-xs">
            <div className="space-y-1">
              <div className="font-semibold text-destructive text-sm">
                {registryGate?.code === "workspace_not_initialized"
                  ? "Workspace not initialized"
                  : registryGate?.code === "workspace_build_timed_out"
                    ? "Workspace build timed out"
                    : "Workspace build failed"}
              </div>
              <div className="text-destructive/90">
                {registryGate?.summary ??
                  "The design-system workspace could not be built; component previews are unavailable until it succeeds."}
              </div>
            </div>
            {registryGate?.commandDisplay ? (
              <div className="font-mono text-[10px] text-muted-foreground">
                $ {registryGate.commandDisplay}
                {registryGate.exitCode !== null ? ` → exit ${registryGate.exitCode}` : ""}
              </div>
            ) : null}
            {registryGate?.stderrTail ? (
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-background/60 p-2 font-mono text-[10px] text-muted-foreground">
                {registryGate.stderrTail}
              </pre>
            ) : null}
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => void registryQuery.refetch()}
                disabled={registryQuery.fetchStatus === "fetching"}
              >
                {registryQuery.fetchStatus === "fetching" ? "Retrying…" : "Retry build"}
              </Button>
              <span className="text-[10px] text-muted-foreground">
                Status: <code>{registryStatus ?? "unknown"}</code>
              </span>
            </div>
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
                  <ComponentPreviewPropControl
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
            data-debug-preview={JSON.stringify({
              // Surfaced as an attribute so blank-preview symptoms can be
              // diagnosed via DevTools — read the JSON to see exactly
              // which branch of the bundle pipeline produced undefined JS.
              matchedRegistryEntry: matchedRegistryEntry?.componentId ?? null,
              executePending: executePreviewQuery.isPending,
              executeError: (executePreviewQuery.error as Error | undefined)?.message ?? null,
              manifestOk: renderManifest?.ok ?? null,
              manifestErrorCount: renderManifest?.errors?.length ?? 0,
              legacyOk: legacyBundle?.ok ?? null,
              legacyErrorCount: legacyBundle?.errors?.length ?? 0,
              previewJsLength: previewJavascript?.length ?? 0,
              compileErrorCount: compileErrors.length,
              runtimeError,
              manifestReady,
              exportName,
            })}
          >
            {/*
              Always-on overlay banner — visible in BOTH dev and product
              variants. Renders ONLY when the iframe can't show a working
              preview, so the user is never left looking at a silent blank
              pane. Covers four states:
                1. Bundle is still pending → "Bundling preview…"
                2. Bundle returned compile/manifest errors → first 3 errors
                3. Runtime error from inside the iframe (e.g. emotion crash)
                4. Bundle is empty AND not pending AND no errors → registry
                   is still indexing or a silent edge case
              The existing per-variant error chrome above stays for the
              richer dev-only experience.
            */}
            {!previewJavascript ? (
              bundlePending ? (
                <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                  <div
                    className="size-5 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-foreground/70"
                    aria-hidden
                  />
                  <span>Bundling preview… {(bundleElapsedMs / 1000).toFixed(1)}s</span>
                  <span className="font-mono text-[10px] opacity-70">
                    {trimmed} · {exportName} ·{" "}
                    {matchedRegistryEntry ? "executeRenderPlan" : "buildComponentPreview"}
                  </span>
                  {bundleElapsedMs >= 8000 ? (
                    <span className="text-[10px] opacity-70 text-center px-4">
                      First bundle is slow; subsequent loads will be cached.
                    </span>
                  ) : null}
                  {bundleElapsedMs >= 20000 ? (
                    <span className="text-[10px] opacity-70 text-center px-4">
                      If this never finishes, run the smoke test from Settings → General.
                    </span>
                  ) : null}
                </div>
              ) : compileErrors.length > 0 || executePreviewQuery.isError ? (
                <div className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive shadow">
                  <p className="font-semibold">Preview failed to render</p>
                  <ul className="mt-1 space-y-0.5">
                    {compileErrors.slice(0, 3).map((err, i) => (
                      <li key={i} className="line-clamp-2 break-words">
                        {err}
                      </li>
                    ))}
                    {compileErrors.length === 0 && executePreviewQuery.isError ? (
                      <li className="line-clamp-2 break-words">
                        {(executePreviewQuery.error as Error)?.message ??
                          "executeRenderPlan failed"}
                      </li>
                    ) : null}
                  </ul>
                  {compileErrors.length > 3 ? (
                    <p className="mt-1 text-[0.65rem] opacity-70">
                      +{compileErrors.length - 3} more
                    </p>
                  ) : null}
                  <p className="mt-2 font-mono text-[10px] opacity-70">
                    {trimmed} · {exportName} ·{" "}
                    {matchedRegistryEntry ? "executeRenderPlan" : "buildComponentPreview"}
                  </p>
                </div>
              ) : runtimeError ? (
                <div className="pointer-events-auto absolute inset-x-3 top-3 z-10 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive shadow">
                  <p className="font-semibold">
                    {nativePrimeTimedOut ? "Preview timed out" : "Preview runtime error"}
                  </p>
                  <p className="mt-1 line-clamp-3 break-words">{runtimeError}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button size="xs" variant="outline" onClick={handlePreviewRetry}>
                      Retry preview
                    </Button>
                    <p className="font-mono text-[10px] opacity-70">
                      {trimmed} · {exportName}
                    </p>
                  </div>
                </div>
              ) : manifest && !bundleDepsReady(manifest, exportName) ? (
                // Failure mode A from the plan: scanner-emitted exportName doesn't
                // match anything analyzeReactComponent reported. Surface the
                // mismatch explicitly so the silent-blank case becomes obvious.
                <div className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 shadow dark:text-amber-300">
                  <p className="font-semibold">
                    Export <code>{exportName}</code> not found in this file
                  </p>
                  <p className="mt-1 break-words">
                    Available exports:{" "}
                    {manifest.exports.length === 0
                      ? "(none)"
                      : manifest.exports.map((ex) => ex.name).join(", ")}
                  </p>
                  {manifest.exports.length === 0 && manifest.diagnostics.length > 0 ? (
                    <ul className="mt-1 list-disc space-y-0.5 break-words pl-4 text-[11px] opacity-90">
                      {manifest.diagnostics.slice(0, 3).map((diagnostic, idx) => (
                        <li key={`${idx}-${diagnostic.slice(0, 16)}`}>
                          {diagnostic.length > 200 ? `${diagnostic.slice(0, 200)}…` : diagnostic}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="mt-2 font-mono text-[10px] opacity-70">
                    {trimmed} · {matchedRegistryEntry?.componentId ?? "(no registry match)"}
                  </p>
                </div>
              ) : manifestQuery.isPending || analyzePending ? null : (
                <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
                  <span>Preview unavailable — registry may still be indexing.</span>
                  <span className="font-mono text-[10px] opacity-70">
                    {trimmed} · {exportName} ·{" "}
                    {matchedRegistryEntry?.componentId ?? "(no registry match)"}
                  </span>
                </div>
              )
            ) : null}
            {!bridgeNative ? (
              <iframe
                ref={iframeRef}
                title="Component preview"
                className="h-full min-h-[240px] w-full border-0"
                // `allow-same-origin` is required because the parent/child use
                // strict `event.origin === window.location.origin` filters on
                // every postMessage. Without it, sandbox forces the iframe into
                // a unique opaque origin ("null") even though the src resolves
                // to the same origin as the parent — and the CHILD_READY
                // handshake gets dropped, leaving the iframe stuck on
                // "Waiting for component bundle…". Safe here: the iframe loads
                // its own runtime from the same origin and the bundled JS is
                // the user's own design-system code.
                sandbox="allow-scripts allow-same-origin"
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
            {showProductLoading ? (
              <ComponentPreviewLoadingSkeleton
                overlay
                elapsedMs={bundleElapsedMs}
                stage={loadingStage}
                diagnosticText={appendixGetter() ?? undefined}
                onRetry={handlePreviewRetry}
              />
            ) : null}

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

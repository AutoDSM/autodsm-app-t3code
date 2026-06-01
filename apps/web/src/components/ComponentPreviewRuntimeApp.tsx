import type { JSX } from "react";
import * as React from "react";
import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from "react";
import * as ReactDOM from "react-dom";
import * as ReactJsxDevRuntime from "react/jsx-dev-runtime";
import * as ReactJsxRuntime from "react/jsx-runtime";

import "~/componentPreviewInteractive.css";
import {
  COMPONENT_PREVIEW_CHILD_READY,
  COMPONENT_PREVIEW_INIT,
  COMPONENT_PREVIEW_INTERACTION,
  COMPONENT_PREVIEW_RENDERED,
  COMPONENT_PREVIEW_RUNTIME_ERROR,
  COMPONENT_PREVIEW_STATUS,
  COMPONENT_PREVIEW_THEME,
  type ComponentPreviewInitPayload,
  type ComponentPreviewStatusPayload,
  type ComponentPreviewTheme,
  type ComponentPreviewThemePayload,
} from "~/lib/componentPreviewMessages";

/** Toggle the `.dark` class so the iframe's theme tokens resolve for the active mode. */
function applyPreviewTheme(theme: ComponentPreviewTheme): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.classList.toggle("dark", theme === "dark");
}

const SLOW_BUNDLE_THRESHOLD_MS = 10_000;

// Publish the iframe's React to a known global so the preview bundle (which
// has react/react-dom/jsx-runtime externalised) can pull its hook
// implementations from the SAME React instance we're rendering with. Without
// this, the bundled component's `useState` call goes to a second React whose
// dispatcher is null and the iframe logs
// "Cannot read properties of null (reading 'useState')". Module-scope
// assignment runs before React mounts AND before any dynamic blob import
// resolves, so the order constraint is satisfied.
if (typeof globalThis !== "undefined") {
  (
    globalThis as typeof globalThis & {
      __T3_PREVIEW_REACT__?: Record<string, unknown>;
    }
  ).__T3_PREVIEW_REACT__ = {
    react: React,
    "react/jsx-runtime": ReactJsxRuntime,
    "react/jsx-dev-runtime": ReactJsxDevRuntime,
    "react-dom": ReactDOM,
  };
}

/**
 * Module-level buffer for INIT messages dispatched BEFORE React mounts and
 * attaches the real listener. In the Electron native-view path the main
 * process invokes `webContents.executeJavaScript("window.postMessage(...)")`
 * which can fire before this script has finished evaluating. Without the
 * buffer, the INIT lands in the event loop with no listener attached and the
 * preview pane stays stuck on the placeholder forever. The listener is
 * registered at module top-level (synchronously, before React even starts)
 * so the race window collapses to "did Electron run executeJavaScript before
 * this file's top-level code finished?" — which is effectively impossible
 * because the executeJavaScript can't run until the page's scripts have
 * loaded.
 */
const PRE_MOUNT_MESSAGE_BUFFER: MessageEvent[] = [];
if (typeof window !== "undefined") {
  const bufferUntilMount = (event: MessageEvent): void => {
    const data = event.data as { type?: string };
    if (data?.type === COMPONENT_PREVIEW_INIT) {
      PRE_MOUNT_MESSAGE_BUFFER.push(event);
    }
  };
  window.addEventListener("message", bufferUntilMount);
  // We intentionally never remove this listener — once React mounts and
  // installs its own listener, both fire for the same message, but the React
  // one is the one that updates state. The buffer is only drained on mount.
}

function PreviewErrorBoundary(props: { readonly children: ReactNode }): JSX.Element {
  return <PreviewErrorBoundaryInner>{props.children}</PreviewErrorBoundaryInner>;
}

class PreviewErrorBoundaryInner extends Component<
  { readonly children: ReactNode },
  { readonly error: Error | null }
> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    window.parent.postMessage(
      {
        type: COMPONENT_PREVIEW_RUNTIME_ERROR,
        payload: { message: error.message, componentStack: info.componentStack ?? "" },
      },
      window.location.origin,
    );
  }

  override render() {
    if (this.state.error) {
      return (
        <pre className="max-w-full whitespace-pre-wrap text-center text-destructive text-xs">
          {this.state.error.message}
        </pre>
      );
    }
    return this.props.children;
  }
}

/**
 * Standalone route loaded inside the preview iframe (or Electron WebContentsView).
 * Expects `postMessage` {@link COMPONENT_PREVIEW_INIT} from the parent shell.
 */
export function ComponentPreviewRuntimeApp(): JSX.Element {
  const [node, setNode] = useState<ReactNode>(null);
  const [status, setStatus] = useState<ComponentPreviewStatusPayload | null>(null);
  const [slowBundle, setSlowBundle] = useState(false);

  useEffect(() => {
    if (node !== null || status !== null) {
      return;
    }
    const handle = window.setTimeout(() => setSlowBundle(true), SLOW_BUNDLE_THRESHOLD_MS);
    return () => window.clearTimeout(handle);
  }, [node, status]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      const data = event.data as {
        type?: string;
        payload?:
          | ComponentPreviewInitPayload
          | ComponentPreviewStatusPayload
          | ComponentPreviewThemePayload;
      };
      if (!data || typeof data.type !== "string") {
        return;
      }
      if (data.type === COMPONENT_PREVIEW_THEME) {
        const themePayload = data.payload as ComponentPreviewThemePayload | undefined;
        if (themePayload) {
          applyPreviewTheme(themePayload.resolvedTheme);
        }
        return;
      }
      if (data.type === COMPONENT_PREVIEW_STATUS) {
        const statusPayload = data.payload as ComponentPreviewStatusPayload | undefined;
        if (statusPayload) {
          setStatus(statusPayload);
        }
        return;
      }
      if (data.type !== COMPONENT_PREVIEW_INIT || data.payload === undefined) {
        return;
      }
      // INIT supersedes any earlier status (the parent recovered).
      setStatus(null);

      const initPayload = data.payload as ComponentPreviewInitPayload;
      if (initPayload.resolvedTheme) {
        applyPreviewTheme(initPayload.resolvedTheme);
      }

      void (async () => {
        let phase:
          | "style-inject"
          | "props-parse"
          | "bundle-import"
          | "component-export"
          | "render"
          | "post-render"
          | "unknown" = "unknown";
        try {
          const { javascript, propsJson, workspaceStyleCss } = initPayload;
          if (workspaceStyleCss && workspaceStyleCss.trim().length > 0) {
            phase = "style-inject";
            let styleEl = document.getElementById("autodsm-workspace-tokens");
            if (!styleEl) {
              styleEl = document.createElement("style");
              styleEl.id = "autodsm-workspace-tokens";
              document.head.appendChild(styleEl);
            }
            styleEl.textContent = workspaceStyleCss;
          }
          phase = "props-parse";
          const propsUnknown = JSON.parse(propsJson) as Record<string, unknown>;
          phase = "bundle-import";
          const blob = new Blob([javascript], { type: "text/javascript" });
          const blobUrl = URL.createObjectURL(blob);
          const mod = (await import(/* @vite-ignore */ blobUrl)) as {
            default?: React.ComponentType<Record<string, unknown>>;
          };
          URL.revokeObjectURL(blobUrl);
          phase = "component-export";
          const Cmp = mod.default;
          if (typeof Cmp !== "function") {
            throw new Error("Preview bundle has no default component export.");
          }
          phase = "render";
          setNode(
            <PreviewErrorBoundary>
              <div
                className="preview-hit-target flex shrink-0 items-center justify-center"
                onPointerDownCapture={(e) => {
                  window.parent.postMessage(
                    {
                      type: COMPONENT_PREVIEW_INTERACTION,
                      payload: {
                        kind: "pointerdown",
                        targetTag: (e.target as HTMLElement)?.tagName ?? "",
                      },
                    },
                    window.location.origin,
                  );
                }}
              >
                <Cmp {...propsUnknown} />
              </div>
            </PreviewErrorBoundary>,
          );
          phase = "post-render";
          window.parent.postMessage({ type: COMPONENT_PREVIEW_RENDERED }, window.location.origin);
        } catch (unknownError: unknown) {
          const message =
            unknownError instanceof Error ? unknownError.message : String(unknownError);
          const phasedMessage = `[${phase}] ${message}`;
          setNode(
            <pre className="max-w-full whitespace-pre-wrap text-center text-destructive text-xs">
              {phasedMessage}
            </pre>,
          );
          window.parent.postMessage(
            { type: COMPONENT_PREVIEW_RUNTIME_ERROR, payload: { message: phasedMessage } },
            window.location.origin,
          );
        }
      })();
    };

    // Catch errors that escape the React tree — e.g. synchronous script
    // errors in the dynamically-imported bundle, emotion cache failures
    // when injecting into document.head, or unhandled async rejections
    // outside the `void (async () => …)` block above. Without these, a
    // top-level `throw` in the bundled module fires before React mounts
    // and leaves the iframe silently blank (the React error boundary
    // never sees it). Surfacing to the parent makes the Phase 2 banner
    // in WebContentsView render the actual error.
    const onWindowError = (event: ErrorEvent): void => {
      const message =
        event.message || (event.error instanceof Error ? event.error.message : "Unknown error");
      const source = event.filename ? ` (${event.filename}:${event.lineno})` : "";
      window.parent.postMessage(
        { type: COMPONENT_PREVIEW_RUNTIME_ERROR, payload: { message: `${message}${source}` } },
        window.location.origin,
      );
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unhandled promise rejection in preview bundle.";
      window.parent.postMessage(
        { type: COMPONENT_PREVIEW_RUNTIME_ERROR, payload: { message } },
        window.location.origin,
      );
    };

    window.addEventListener("message", onMessage);
    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    // Drain any INIT messages that arrived BEFORE this listener was attached
    // (race in the Electron native-view path where the main process can
    // executeJavaScript a postMessage before this React tree mounts).
    while (PRE_MOUNT_MESSAGE_BUFFER.length > 0) {
      const buffered = PRE_MOUNT_MESSAGE_BUFFER.shift();
      if (buffered) onMessage(buffered);
    }
    window.parent.postMessage({ type: COMPONENT_PREVIEW_CHILD_READY }, window.location.origin);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return (
    <div className="box-border flex min-h-svh w-full min-w-0 items-center justify-center bg-transparent p-2 text-foreground">
      {node ?? <PreviewPlaceholder status={status} slowBundle={slowBundle} />}
    </div>
  );
}

function PreviewPlaceholder(props: {
  readonly status: ComponentPreviewStatusPayload | null;
  readonly slowBundle: boolean;
}): JSX.Element {
  const { status, slowBundle } = props;

  if (status?.phase === "bundle-error") {
    return (
      <div
        role="alert"
        className="max-w-md rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
      >
        <p className="font-semibold">Preview bundle failed</p>
        {status.message ? (
          <p className="mt-1 whitespace-pre-wrap break-words opacity-90">{status.message}</p>
        ) : null}
      </div>
    );
  }

  const label =
    status?.phase === "analyzing"
      ? "Waiting for exports to be analyzed…"
      : status?.phase === "sidecar-warmup"
        ? "Starting preview server… (first run is slowest)"
        : slowBundle
          ? "Bundle taking longer than expected — check Workbench logs."
          : "Waiting for component bundle…";

  return (
    <div className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground/70">
      <div
        className="size-6 animate-spin rounded-full border-2 border-muted-foreground/40 border-t-foreground/70"
        aria-hidden
      />
      <p>{label}</p>
    </div>
  );
}

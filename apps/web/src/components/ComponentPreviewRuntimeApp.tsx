import type { JSX } from "react";
import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from "react";

import "~/componentPreviewInteractive.css";
import {
  COMPONENT_PREVIEW_CHILD_READY,
  COMPONENT_PREVIEW_INIT,
  COMPONENT_PREVIEW_INTERACTION,
  COMPONENT_PREVIEW_RENDERED,
  COMPONENT_PREVIEW_RUNTIME_ERROR,
  type ComponentPreviewInitPayload,
} from "~/lib/componentPreviewMessages";

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

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      const data = event.data as { type?: string; payload?: ComponentPreviewInitPayload };
      if (!data || data.type !== COMPONENT_PREVIEW_INIT || data.payload === undefined) {
        return;
      }

      const initPayload = data.payload;

      void (async () => {
        try {
          const { javascript, propsJson, workspaceStyleCss } = initPayload;
          if (workspaceStyleCss && workspaceStyleCss.trim().length > 0) {
            let styleEl = document.getElementById("autodsm-workspace-tokens");
            if (!styleEl) {
              styleEl = document.createElement("style");
              styleEl.id = "autodsm-workspace-tokens";
              document.head.appendChild(styleEl);
            }
            styleEl.textContent = workspaceStyleCss;
          }
          const propsUnknown = JSON.parse(propsJson) as Record<string, unknown>;
          const blob = new Blob([javascript], { type: "text/javascript" });
          const blobUrl = URL.createObjectURL(blob);
          const mod = (await import(/* @vite-ignore */ blobUrl)) as {
            default?: React.ComponentType<Record<string, unknown>>;
          };
          URL.revokeObjectURL(blobUrl);
          const Cmp = mod.default;
          if (typeof Cmp !== "function") {
            throw new Error("Preview bundle has no default component export.");
          }
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
          window.parent.postMessage({ type: COMPONENT_PREVIEW_RENDERED }, window.location.origin);
        } catch (unknownError: unknown) {
          const message =
            unknownError instanceof Error ? unknownError.message : String(unknownError);
          setNode(
            <pre className="max-w-full whitespace-pre-wrap text-center text-destructive text-xs">
              {message}
            </pre>,
          );
          window.parent.postMessage(
            { type: COMPONENT_PREVIEW_RUNTIME_ERROR, payload: { message } },
            window.location.origin,
          );
        }
      })();
    };

    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: COMPONENT_PREVIEW_CHILD_READY }, window.location.origin);
    return () => {
      window.removeEventListener("message", onMessage);
    };
  }, []);

  return (
    <div className="box-border flex min-h-svh w-full min-w-0 items-center justify-center bg-background p-2 text-foreground">
      {node}
    </div>
  );
}

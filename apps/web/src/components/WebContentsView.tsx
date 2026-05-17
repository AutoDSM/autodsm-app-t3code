import type { EnvironmentId } from "@t3tools/contracts";
import type { ComponentPreviewManifest, ComponentPreviewPropSpec } from "@t3tools/contracts";
import { useQuery } from "@tanstack/react-query";
import type { JSX } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { ensureEnvironmentApi } from "~/environmentApi";
import {
  COMPONENT_PREVIEW_CHILD_READY,
  COMPONENT_PREVIEW_INIT,
  COMPONENT_PREVIEW_INTERACTION,
  COMPONENT_PREVIEW_RUNTIME_ERROR,
} from "~/lib/componentPreviewMessages";
import { randomUUID } from "~/lib/utils";

const MAX_RELATIVE_PREVIEW_PATH_CHARS = 512;

export interface WebContentsViewProps {
  readonly relativePath: string | null;
  readonly environmentId?: EnvironmentId | null;
  readonly workspaceCwd?: string | null;
  /** Registers a function ChatView calls when sending to append structured preview context. */
  readonly registerPromptAppendix?: (getter: () => string | null) => void;
  /** Optional: pre-fill composer (e.g. quick actions). */
  readonly onInjectComposerText?: (text: string) => void;
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
  return new URL("/component-preview-runtime", window.location.origin).href;
}

function bundleDepsReady(manifest: ComponentPreviewManifest, exportNameValue: string): boolean {
  return manifest.exports.some((ex) => ex.name === exportNameValue);
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
  } = props;

  const trimmed = relativePath?.trim();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [interactionLog, setInteractionLog] = useState<string[]>([]);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [propsRecord, setPropsRecord] = useState<Record<string, unknown>>({});
  const [exportName, setExportName] = useState<string>("default");
  const [nativeViewId] = useState(() => randomUUID());
  const childReadyRef = useRef(false);

  const bridgeNative =
    typeof window !== "undefined" &&
    typeof window.desktopBridge?.attachComponentPreview === "function";

  const analyzeEnabled =
    Boolean(trimmed && trimmed.length <= MAX_RELATIVE_PREVIEW_PATH_CHARS) &&
    workspaceCwd !== null &&
    workspaceCwd.length > 0 &&
    environmentId !== null;

  const manifestQuery = useQuery({
    queryKey: ["component-preview-manifest", environmentId, workspaceCwd, trimmed],
    enabled: analyzeEnabled && trimmed !== undefined && trimmed !== null,
    queryFn: async () => {
      const api = ensureEnvironmentApi(environmentId!);
      return api.projects.analyzeReactComponent({
        cwd: workspaceCwd!,
        relativePath: trimmed!,
      });
    },
  });

  const manifest = manifestQuery.data?.manifest;

  useEffect(() => {
    if (!manifest) return;
    const nextExport = pickInitialExport(manifest);
    setExportName(nextExport);
    setPropsRecord(buildDefaultProps(propsForExport(manifest, nextExport)));
  }, [manifest]);

  const bundleQuery = useQuery({
    queryKey: ["component-preview-bundle", environmentId, workspaceCwd, trimmed, exportName],
    enabled:
      analyzeEnabled &&
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

  const bundle = bundleQuery.data;

  useEffect(() => {
    childReadyRef.current = false;
    setRuntimeError(null);
  }, [trimmed, exportName]);

  const pushPreviewToChild = useCallback(() => {
    const iframe = iframeRef.current;
    const js = bundle?.ok ? bundle.javascript : undefined;
    if (!iframe?.contentWindow || !js) return;
    try {
      iframe.contentWindow.postMessage(
        {
          type: COMPONENT_PREVIEW_INIT,
          payload: {
            javascript: js,
            propsJson: JSON.stringify(propsRecord),
          },
        },
        window.location.origin,
      );
    } catch {
      setRuntimeError("Failed to post preview payload to iframe.");
    }
  }, [bundle, propsRecord]);

  useEffect(() => {
    if (!bundle?.ok || !bundle.javascript) return;
    if (!childReadyRef.current) return;
    pushPreviewToChild();
  }, [bundle, pushPreviewToChild]);

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
      if (data.type === COMPONENT_PREVIEW_RUNTIME_ERROR) {
        setRuntimeError(data.payload?.message ?? "Preview runtime error.");
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
    if (!bridgeNative || !trimmed || !analyzeEnabled) return;
    const el = containerRef.current;
    if (!el) return;

    const rectFromEl = () => {
      const rect = el.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.max(0, Math.round(rect.width)),
        height: Math.max(0, Math.round(rect.height)),
      };
    };

    let cancelled = false;

    const syncBounds = () => {
      void window.desktopBridge?.setComponentPreviewBounds?.({
        viewId: nativeViewId,
        bounds: rectFromEl(),
      });
    };

    const observer = new ResizeObserver(() => syncBounds());
    observer.observe(el);
    syncBounds();

    void (async () => {
      const attached = await window.desktopBridge?.attachComponentPreview?.({
        viewId: nativeViewId,
        url: previewRuntimeHref(),
        bounds: rectFromEl(),
      });
      if (cancelled || !attached) return;
      const js = bundle?.javascript;
      if (bundle?.ok && js) {
        await window.desktopBridge?.primeComponentPreview?.({
          viewId: nativeViewId,
          javascript: js,
          propsJson: JSON.stringify(propsRecord),
        });
      }
    })();

    return () => {
      cancelled = true;
      observer.disconnect();
      void window.desktopBridge?.detachComponentPreview?.(nativeViewId);
    };
  }, [analyzeEnabled, bridgeNative, bundle, nativeViewId, propsRecord, trimmed]);

  const appendixGetter = useCallback(() => {
    if (!trimmed || !manifest) return null;
    const lines = [
      `componentPath: ${trimmed}`,
      `export: ${exportName}`,
      `props: ${JSON.stringify(propsRecord, null, 2)}`,
    ];
    if (runtimeError) {
      lines.push(`runtimeError: ${runtimeError}`);
    }
    if (bundle && !bundle.ok) {
      lines.push(`bundleErrors: ${bundle.errors.join("; ")}`);
    }
    if (interactionLog.length > 0) {
      lines.push("interactions:", ...interactionLog.slice(-12));
    }
    return lines.join("\n");
  }, [bundle, exportName, interactionLog, manifest, propsRecord, runtimeError, trimmed]);

  useEffect(() => {
    registerPromptAppendix?.(appendixGetter);
    return () => registerPromptAppendix?.(() => null);
  }, [appendixGetter, registerPromptAppendix]);

  const propSpecs = useMemo(
    () => (manifest ? propsForExport(manifest, exportName) : []),
    [exportName, manifest],
  );

  if (!trimmed || trimmed.length > MAX_RELATIVE_PREVIEW_PATH_CHARS) {
    return null;
  }

  const quick = (text: string) => onInjectComposerText?.(text);

  return (
    <div
      ref={containerRef}
      className="flex min-h-[40%] min-w-0 shrink-0 flex-col bg-background md:h-full md:min-h-0 md:w-[min(50%,42rem)] md:flex-1"
      data-testid="web-contents-view"
      data-slot="web-contents-view"
      data-component-path={trimmed}
      aria-label="Component preview"
      role="region"
    >
      {!analyzeEnabled ? (
        <div className="border-border border-dashed p-3 text-muted-foreground text-xs">
          Connect a project workspace to preview components (cwd required).
        </div>
      ) : manifestQuery.isPending ? (
        <div className="p-3 text-muted-foreground text-xs">Analyzing component…</div>
      ) : manifestQuery.isError ? (
        <div className="p-3 text-destructive text-xs">
          {(manifestQuery.error as Error)?.message ?? "Failed to analyze component."}
        </div>
      ) : (
        <>
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
                  `Fix the component preview for \`${trimmed}\` (export \`${exportName}\`). Current runtime error: ${runtimeError ?? bundle?.errors.join("; ") ?? "none"}`,
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
          </div>

          {propSpecs.length > 0 ? (
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

          {bundleQuery.isPending ? (
            <div className="p-3 text-muted-foreground text-xs">Bundling preview…</div>
          ) : bundle && !bundle.ok ? (
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap p-2 text-destructive text-[11px]">
              {bundle.errors.join("\n")}
              {bundle.warnings.length > 0 ? `\n\n${bundle.warnings.join("\n")}` : ""}
            </pre>
          ) : runtimeError ? (
            <div className="border-b border-destructive/40 bg-destructive/10 px-2 py-1 text-destructive text-[11px]">
              {runtimeError}
            </div>
          ) : null}

          <div className="relative min-h-0 min-w-0 flex-1">
            {!bridgeNative ? (
              <iframe
                ref={iframeRef}
                title="Component preview"
                className="h-full min-h-[240px] w-full border-0"
                sandbox="allow-scripts"
                src={previewRuntimeHref()}
              />
            ) : (
              <div className="flex h-full min-h-[240px] w-full items-center justify-center text-muted-foreground text-xs">
                Native preview host active — iframe disabled.
              </div>
            )}
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

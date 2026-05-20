import * as crypto from "node:crypto";

import * as Electron from "electron";

import { COMPONENT_PREVIEW_STATUS_CHANNEL } from "../ipc/channels.ts";

/** Must stay aligned with `apps/web/src/lib/componentPreviewMessages.ts`. */
export const COMPONENT_PREVIEW_INIT_MESSAGE_TYPE = "t3-component-preview:init";

export interface PreviewBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function clampPreviewBounds(
  bounds: PreviewBounds,
  contentSize: { readonly width: number; readonly height: number },
): PreviewBounds {
  const width = Math.max(0, bounds.width);
  const height = Math.max(0, bounds.height);
  const x = Math.max(0, bounds.x);
  const y = Math.max(0, bounds.y);
  const maxWidth = Math.max(0, contentSize.width - x);
  const maxHeight = Math.max(0, contentSize.height - y);
  return {
    x,
    y,
    width: Math.min(width, maxWidth),
    height: Math.min(height, maxHeight),
  };
}

function contentSizeForWindow(browserWindow: Electron.BrowserWindow): {
  readonly width: number;
  readonly height: number;
} {
  const bounds = browserWindow.getContentBounds();
  return { width: bounds.width, height: bounds.height };
}

type WebContentsViewInstance = {
  setBounds: (rect: Electron.Rectangle) => void;
  readonly webContents: Electron.WebContents;
};

type WebContentsViewCtor = new (opts?: {
  webPreferences?: Electron.WebPreferences;
}) => WebContentsViewInstance;

function resolveWebContentsViewCtor(): WebContentsViewCtor | undefined {
  return (Electron as unknown as { WebContentsView?: WebContentsViewCtor }).WebContentsView;
}

type PreviewRegistryEntry = {
  readonly view: WebContentsViewInstance;
  readonly owner: Electron.BrowserWindow;
};

const registry = new Map<string, PreviewRegistryEntry>();

function previewPartitionFor(viewId: string): string {
  const digest = crypto.createHash("sha256").update(viewId).digest("hex").slice(0, 24);
  return `persist:t3-component-preview-${digest}`;
}

function isLoopbackHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    return parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}

function isBrowserWindowAlive(browserWindow: Electron.BrowserWindow): boolean {
  return !browserWindow.isDestroyed();
}

function destroyPreviewEntry(viewId: string, entry: PreviewRegistryEntry): void {
  try {
    entry.view.webContents.removeAllListeners("will-navigate");
    entry.view.webContents.removeAllListeners("render-process-gone");
    entry.view.webContents.removeAllListeners("unresponsive");
    if (isBrowserWindowAlive(entry.owner)) {
      entry.owner.contentView.removeChildView(entry.view as unknown as Electron.View);
    }
    if (!entry.view.webContents.isDestroyed()) {
      entry.view.webContents.close();
    }
  } catch {
    // View may already be detached during rapid preview remounts or window teardown.
  } finally {
    registry.delete(viewId);
  }
}

export function isWebContentsViewPreviewSupported(): boolean {
  return resolveWebContentsViewCtor() !== undefined;
}

export function detachPreviewView(viewId: string): void {
  const entry = registry.get(viewId);
  if (!entry) {
    return;
  }
  destroyPreviewEntry(viewId, entry);
}

export function sweepPreviewViewsForWindow(browserWindow: Electron.BrowserWindow): void {
  for (const [viewId, entry] of registry.entries()) {
    if (entry.owner === browserWindow) {
      destroyPreviewEntry(viewId, entry);
    }
  }
}

export function detachAllPreviewViews(): void {
  for (const [viewId, entry] of registry.entries()) {
    destroyPreviewEntry(viewId, entry);
  }
}

export async function attachPreviewView(input: {
  readonly browserWindow: Electron.BrowserWindow;
  readonly viewId: string;
  readonly url: string;
  readonly bounds: PreviewBounds;
}): Promise<boolean> {
  const Ctor = resolveWebContentsViewCtor();
  if (!Ctor) {
    return false;
  }

  if (!isBrowserWindowAlive(input.browserWindow)) {
    return false;
  }

  const existing = registry.get(input.viewId);
  if (
    existing &&
    (!isBrowserWindowAlive(existing.owner) || existing.owner !== input.browserWindow)
  ) {
    destroyPreviewEntry(input.viewId, existing);
  }

  const partition = previewPartitionFor(input.viewId);
  Electron.session
    .fromPartition(partition)
    .setPermissionRequestHandler((_wc, _permission, callback) => callback(false));

  let entry = registry.get(input.viewId);
  if (!entry) {
    const view = new Ctor({
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        partition,
      },
    });
    entry = { view, owner: input.browserWindow };
    registry.set(input.viewId, entry);
    input.browserWindow.contentView.addChildView(view as unknown as Electron.View);

    view.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    view.webContents.removeAllListeners("will-navigate");
    view.webContents.on("will-navigate", (event, navigationUrl) => {
      if (!isLoopbackHttpUrl(navigationUrl)) {
        event.preventDefault();
      }
    });

    view.webContents.on("render-process-gone", (_event, details) => {
      if (isBrowserWindowAlive(input.browserWindow)) {
        input.browserWindow.webContents.send(COMPONENT_PREVIEW_STATUS_CHANNEL, {
          viewId: input.viewId,
          status: "crashed",
          reason: details.reason,
          exitCode: details.exitCode,
        });
      }
    });

    view.webContents.on("unresponsive", () => {
      if (isBrowserWindowAlive(input.browserWindow)) {
        input.browserWindow.webContents.send(COMPONENT_PREVIEW_STATUS_CHANNEL, {
          viewId: input.viewId,
          status: "unresponsive",
        });
      }
    });
  }

  entry.view.setBounds(clampPreviewBounds(input.bounds, contentSizeForWindow(input.browserWindow)));

  const webContents = entry.view.webContents;
  try {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        webContents.removeListener("did-finish-load", onFinish);
        webContents.removeListener("did-fail-load", onFail);
      };
      const onFinish = () => {
        cleanup();
        resolve();
      };
      const onFail = (_event: Electron.Event, code: number, desc: string) => {
        cleanup();
        reject(new Error(`Preview WebContentsView failed to load (${code}): ${desc}`));
      };

      if (!webContents.isLoading() && webContents.getURL() === input.url) {
        resolve();
        return;
      }

      webContents.once("did-finish-load", onFinish);
      webContents.once("did-fail-load", onFail);
      void webContents.loadURL(input.url);
    });
    return true;
  } catch {
    return false;
  }
}

export function setPreviewBounds(viewId: string, bounds: PreviewBounds): boolean {
  const entry = registry.get(viewId);
  if (!entry || !isBrowserWindowAlive(entry.owner)) {
    return false;
  }
  entry.view.setBounds(clampPreviewBounds(bounds, contentSizeForWindow(entry.owner)));
  return true;
}

export async function primePreviewView(
  viewId: string,
  javascript: string,
  propsJson: string,
  workspaceStyleCss?: string,
): Promise<boolean> {
  const entry = registry.get(viewId);
  if (!entry) {
    return false;
  }

  const payload = {
    javascript,
    propsJson,
    ...(workspaceStyleCss && workspaceStyleCss.trim().length > 0 ? { workspaceStyleCss } : {}),
  };

  const message = {
    type: COMPONENT_PREVIEW_INIT_MESSAGE_TYPE,
    payload,
  };

  await entry.view.webContents.executeJavaScript(
    `window.postMessage(${JSON.stringify(message)}, window.location.origin);`,
    true,
  );
  return true;
}

export async function capturePreviewView(viewId: string): Promise<string | null> {
  const entry = registry.get(viewId);
  if (!entry) {
    return null;
  }

  try {
    const image = await entry.view.webContents.capturePage();
    return image.toDataURL();
  } catch {
    return null;
  }
}

/** Test-only: reset module registry between unit tests. */
export function resetPreviewRegistryForTests(): void {
  detachAllPreviewViews();
}

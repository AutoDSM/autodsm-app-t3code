import * as crypto from "node:crypto";

import * as Electron from "electron";

/** Must stay aligned with `apps/web/src/lib/componentPreviewMessages.ts`. */
export const COMPONENT_PREVIEW_INIT_MESSAGE_TYPE = "t3-component-preview:init";

export interface PreviewBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
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

export function isWebContentsViewPreviewSupported(): boolean {
  return resolveWebContentsViewCtor() !== undefined;
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
  }

  entry.view.setBounds(input.bounds);

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

export function detachPreviewView(browserWindow: Electron.BrowserWindow, viewId: string): void {
  const entry = registry.get(viewId);
  if (!entry) {
    return;
  }
  registry.delete(viewId);
  entry.view.webContents.removeAllListeners("will-navigate");
  browserWindow.contentView.removeChildView(entry.view as unknown as Electron.View);
  entry.view.webContents.close();
}

export function setPreviewBounds(viewId: string, bounds: PreviewBounds): boolean {
  const entry = registry.get(viewId);
  if (!entry) {
    return false;
  }
  entry.view.setBounds(bounds);
  return true;
}

export async function primePreviewView(
  viewId: string,
  javascript: string,
  propsJson: string,
): Promise<boolean> {
  const entry = registry.get(viewId);
  if (!entry) {
    return false;
  }

  const message = {
    type: COMPONENT_PREVIEW_INIT_MESSAGE_TYPE,
    payload: { javascript, propsJson },
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

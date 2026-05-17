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

const registry = new Map<
  string,
  {
    readonly view: WebContentsViewInstance;
    readonly owner: Electron.BrowserWindow;
  }
>();

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

  let entry = registry.get(input.viewId);
  if (!entry) {
    const view = new Ctor({
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    entry = { view, owner: input.browserWindow };
    registry.set(input.viewId, entry);
    input.browserWindow.contentView.addChildView(view as unknown as Electron.View);
  }

  entry.view.setBounds(input.bounds);
  await entry.view.webContents.loadURL(input.url);
  await new Promise<void>((resolve, reject) => {
    const fail = (code: number, desc: string) => {
      reject(new Error(`Preview WebContentsView failed to load (${code}): ${desc}`));
    };
    entry!.view.webContents.once("did-finish-load", () => resolve());
    entry!.view.webContents.once("did-fail-load", (_event, code, desc) => fail(code, desc));
  });
  return true;
}

export function detachPreviewView(browserWindow: Electron.BrowserWindow, viewId: string): void {
  const entry = registry.get(viewId);
  if (!entry) {
    return;
  }
  registry.delete(viewId);
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

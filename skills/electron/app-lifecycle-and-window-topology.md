# App lifecycle and window topology

This file covers the Electron app startup/shutdown contract and how windows
and views are arranged in the AutoDSM desktop runtime.

Authoritative references:

- App module: https://www.electronjs.org/docs/latest/api/app
- BaseWindow: https://www.electronjs.org/docs/latest/api/base-window
- BrowserWindow: https://www.electronjs.org/docs/latest/api/browser-window
- WebContentsView: https://www.electronjs.org/docs/latest/api/web-contents-view

## App readiness

Do NOT touch any window, view, session, or `webContents` API before the app
is ready. Most APIs throw or silently misbehave if called too early.

```ts
import { app } from "electron";

await app.whenReady();
// Only now: create sessions, BaseWindow, WebContentsView, register protocols.
```

`WebContentsView` explicitly cannot be constructed until the app is ready.

## Standard lifecycle events

- `app.whenReady()` — primary entry point. Single source of truth for
  "app is alive". Prefer this over `app.on('ready', ...)`.
- `app.on('activate')` — macOS: re-open the main window when the dock icon
  is clicked and no windows are open. Create or show the main window here.
- `app.on('window-all-closed')` — quit on non-macOS; on macOS keep the
  process alive so the user can re-activate. Standard pattern:
  ```ts
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
  ```
- `app.on('before-quit')` / `app.on('will-quit')` — last chance to flush
  state and tear down child processes (sidecar Vite, server, workers).

## Single-instance lock

If only one AutoDSM window should exist per project at a time, take a single
instance lock at startup and route subsequent launches into the existing
window via `second-instance`:

```ts
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  return;
}
app.on("second-instance", (_event, argv) => {
  // focus existing window, optionally load a project from argv
});
```

## Window topology in AutoDSM

```
BaseWindow
└── contentView (root View)
    ├── WebContentsView "ui"        ← T3Code app shell
    └── WebContentsView "preview"   ← project sandbox (sibling, not child)
```

Notes:

- Use `BaseWindow` + `WebContentsView` rather than `BrowserWindow` when you
  need more than one `webContents` in a window. `BrowserWindow` is a
  convenience wrapper around the single-`webContents` case.
- Add child views with `win.contentView.addChildView(view)`.
- Sibling z-order is the insertion order; later additions paint on top.
  Use `contentView.removeChildView(view)` + re-add to reorder rather than
  relying on undocumented behavior.
- Each `WebContentsView` has its own `webContents` and its own session.

## No subclassing of built-ins

Built-in Electron classes (`BaseWindow`, `BrowserWindow`, `WebContentsView`,
`Session`, etc.) cannot be subclassed reliably. Wrap them with composition:

```ts
class PreviewController {
  constructor(
    private readonly view: WebContentsView,
    private readonly win: BaseWindow,
  ) {}
  // forward only the methods you intentionally want to expose
}
```

Do not extend; compose.

## Creating the windows

```ts
const win = new BaseWindow({ width: 1400, height: 900, show: false });

const ui = new WebContentsView({
  webPreferences: {
    preload: path.join(__dirname, "preload-ui.js"),
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    webSecurity: true,
  },
});

const preview = new WebContentsView({
  webPreferences: {
    preload: path.join(__dirname, "preload-preview.js"),
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    partition: `persist:preview-${projectId}`,
  },
});

win.contentView.addChildView(ui);
win.contentView.addChildView(preview);
win.show();
```

## Cleanup and destroy expectations

`WebContentsView` and its `webContents` consume non-trivial resources. Always
tear them down when the user closes a project or quits the app:

1. Remove from parent: `win.contentView.removeChildView(view)`.
2. Close webContents: `view.webContents.close()` (and `destroy()` if
   needed by the Electron version you target — verify against the official
   docs).
3. Drop your last reference so GC can collect.
4. Unregister any `webRequest` listeners tied to the per-project session.

On `before-quit`:

1. Stop sidecar Vite processes for every project.
2. Close the local server.
3. Tear down WebContentsViews in reverse creation order.
4. Then `app.quit()` resolves.

## Don'ts

- Don't open a `BrowserWindow` for the preview — you'd lose layout control
  and end up with a separate OS window.
- Don't try to share a `WebContents` between two `WebContentsView`s. The
  docs are explicit: a `WebContents` may only be presented in one
  `WebContentsView` at a time.
- Don't recreate the window on every project switch. Reuse the
  `WebContentsView` and call `loadURL` with the new sidecar URL — or
  recreate just the preview view if the partition must change.
- Don't gate window creation on async work that can fail silently. Surface
  errors and quit cleanly.

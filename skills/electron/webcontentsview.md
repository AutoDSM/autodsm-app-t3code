# WebContentsView — API usage and AutoDSM preview contract

`WebContentsView` is a `View` that displays a `WebContents`. It is the
correct primitive for hosting the AutoDSM preview as a sibling of the UI
view under the same `BaseWindow`.

Authoritative reference:
https://www.electronjs.org/docs/latest/api/web-contents-view

See `webcontentsview.html` for the visual layout and
`webcontentsview-layout-and-lifecycle.md` for bounds/visibility/devtools.

## Class facts (from the official docs)

- Main process only.
- Inherits from `View`. Emits events as an `EventEmitter`.
- Cannot be constructed before the app is ready.
- Constructor:
  ```ts
  new WebContentsView(options?: {
    webPreferences?: WebPreferences;
    webContents?: WebContents; // adopt an existing instance
  })
  ```
- `view.webContents` is readonly. Use it for `loadURL`, navigation events,
  `executeJavaScript`, `capturePage`, devtools, etc.
- A `WebContents` may only be presented in one `WebContentsView` at a time.
  Adopt-and-move is allowed; share is not.
- Add to a window: `win.contentView.addChildView(view)`.
- Lay out via `view.setBounds({ x, y, width, height })`.
- Built-in classes (including `WebContentsView`) cannot be subclassed.

## AutoDSM preview contract

The preview WebContentsView MUST satisfy ALL of the following:

1. **Topology** — sibling of the UI WebContentsView under the same
   `BaseWindow.contentView`. Never an `<iframe>` in the UI renderer.
2. **WebPreferences** — strict:
   - `contextIsolation: true`
   - `nodeIntegration: false`
   - `sandbox: true`
   - `webSecurity: true`
   - `allowRunningInsecureContent: false`
   - `experimentalFeatures: false`
   - `enableBlinkFeatures: ''` (no extras)
   - `preload`: a small, audited script that uses `contextBridge` only
3. **Session** — a dedicated, per-project partition such as
   `persist:preview-<projectId>`. Do not reuse the UI partition. Do not
   share state across projects.
4. **URL allowlist** — loads only loopback sidecar URLs of the form
   `http://127.0.0.1:<port>` (or `http://localhost:<port>` if necessary,
   but prefer `127.0.0.1` to avoid DNS surprises). Validate using URL
   parsing — never string prefix checks.
5. **Navigation** — `will-navigate` and `setWindowOpenHandler` both deny
   anything outside the loopback allowlist. Redirects through `webRequest`
   that leave loopback must be blocked.
6. **CSP** — main process installs a restrictive CSP via
   `webRequest.onHeadersReceived` for responses served to the preview
   partition.
7. **Permissions** — `session.setPermissionRequestHandler` denies everything
   by default; whitelist only what the preview demonstrably needs.
8. **Messaging** — prop/theme/variant changes arrive over a typed,
   schema-validated control channel (preload + `contextBridge` +
   `ipcMain.handle`/`webContents.send`). URL params are last resort.
9. **No secrets** — never inject env vars, tokens, or fs paths into the
   preview partition. Preview is treated as semi-trusted.
10. **No raw Electron APIs** — preload exposes a narrow object only. No
    `ipcRenderer`, no `remote`, no `require`.

## Construction example (pseudocode)

```ts
import { app, BaseWindow, WebContentsView, session } from "electron";
import path from "node:path";

await app.whenReady();

const win = new BaseWindow({ width: 1400, height: 900, show: false });

// UI view
const uiView = new WebContentsView({
  webPreferences: {
    preload: path.join(__dirname, "preload-ui.js"),
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    webSecurity: true,
    partition: "persist:ui",
  },
});

// Preview view (per project)
const previewPartition = `persist:preview-${projectId}`;
const previewSession = session.fromPartition(previewPartition);
hardenPreviewSession(previewSession); // CSP, perms, webRequest, etc.

const previewView = new WebContentsView({
  webPreferences: {
    preload: path.join(__dirname, "preload-preview.js"),
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
    enableBlinkFeatures: "",
    partition: previewPartition,
  },
});

win.contentView.addChildView(uiView);
win.contentView.addChildView(previewView);
win.show();

uiView.webContents.loadURL("app://ui/index.html"); // custom protocol
await previewView.webContents.loadURL(`http://127.0.0.1:${vitePort}/`);
```

## Adopting an existing WebContents

You may construct a `WebContentsView` from an existing `WebContents`:

```ts
const view = new WebContentsView({ webContents: existing });
```

Constraints:

- The `WebContents` must not already be hosted in another `WebContentsView`.
- After adoption, the old hosting view should be removed and dropped.
- This is rarely needed in AutoDSM — prefer recreating views over moving
  `webContents` between them.

## Events of interest

Wire these on `view.webContents` for the preview:

- `did-fail-load`, `render-process-gone`, `unresponsive`/`responsive` —
  reload or surface to the user.
- `will-navigate`, `will-redirect` — call `event.preventDefault()` for any
  non-loopback target.
- `did-finish-load` — emit a `preview:ready` message to the UI.
- `console-message` — optional logging hook; redact aggressively.
- `crashed` (older name)/`render-process-gone` (current) — restart strategy.

## Don'ts

- Don't subclass `WebContentsView`. Wrap with composition.
- Don't put the preview in a separate `BrowserWindow`. Sibling views in one
  `BaseWindow` is the contract.
- Don't reuse the UI partition for the preview.
- Don't `loadURL` from the UI renderer. Main owns navigation of the
  preview.
- Don't pass user-controlled strings into `loadURL` without URL-parse +
  allowlist validation.

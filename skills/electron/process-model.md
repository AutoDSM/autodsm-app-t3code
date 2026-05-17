# Process model — AutoDSM in Electron

Electron has two kinds of OS processes plus several intra-process JS contexts.
Getting the boundaries right is the most important thing you can do for
security and reliability in this codebase.

See also: `process-model.html` for the visual layout, and the official docs
at https://www.electronjs.org/docs/latest/tutorial/process-model.

## Processes and contexts

- **Main process** — one per Electron app. Node.js with full OS access.
  Owns app lifecycle, `BaseWindow`/`BrowserWindow`/`WebContentsView`
  creation, sessions, `protocol.handle`, `webRequest`, `ipcMain` handlers,
  and any privileged orchestration (spawning the sidecar Vite server,
  worker pool, file IO).

- **Renderer process** — one per `webContents`. Chromium. Runs the loaded
  HTML/JS in a web-page sandbox. In this repo there are at minimum two
  renderers: the T3Code UI renderer and the AutoDSM preview renderer.

- **Preload script** — runs in the renderer process _before_ the page,
  with `contextIsolation: true` it lives in a separate JS world from the
  page. The only place that may use Node primitives the page must not see.
  Exposed surface MUST go through `contextBridge.exposeInMainWorld(...)`.

- **Utility / worker processes** — optional. Use for heavy CPU work that
  must not block the main process (e.g. AST parsing, screenshot encoding).
  These are not the same as web `Worker`s inside a renderer.

## AutoDSM boundary diagram

```
┌──────────────────────────────────────────────────────────────────┐
│ Main process (Node, privileged)                                  │
│                                                                  │
│  app lifecycle ── BaseWindow ──┬── WebContentsView "ui"          │
│                                │     └─ preload(ui)              │
│                                └── WebContentsView "preview"     │
│                                      └─ preload(preview)         │
│                                                                  │
│  session("persist:ui")        session("persist:preview-<proj>")  │
│  protocol.handle("app://")    webRequest filter (loopback only)  │
│  ipcMain.handle("ui:*")       ipcMain.handle("preview:*")        │
│                                                                  │
│  ── spawns ──>  Local server (apps/server, ws + http)            │
│  ── spawns ──>  Sidecar Vite per project (127.0.0.1:<port>)      │
│  ── spawns ──>  Worker pool (utility processes, optional)        │
└──────────────────────────────────────────────────────────────────┘
```

The preview WebContentsView is a _sibling_ of the UI WebContentsView under
the same `BaseWindow`. It is never an `<iframe>` inside the UI renderer and
never shares a session partition with the UI.

## Responsibility split

| Concern                                                    | Where it lives                                 |
| ---------------------------------------------------------- | ---------------------------------------------- |
| Window/view creation, bounds, z-order, visibility          | Main                                           |
| Session partitions, permissions, webRequest filters        | Main                                           |
| URL whitelisting / navigation guards                       | Main (`will-navigate`, `setWindowOpenHandler`) |
| Sidecar Vite spawn, lifecycle, port allocation             | Main                                           |
| App router, UI state, layout placeholder math              | UI renderer                                    |
| Rendering the user's project                               | Preview renderer (sandboxed)                   |
| Privileged IO (fs, child_process, network beyond loopback) | Main only                                      |
| `nodeIntegration`, `remote`, raw `ipcRenderer`             | NEVER exposed to either renderer               |

## Communication directions

- UI renderer ↔ Main: IPC over `ipcRenderer.invoke` / `ipcMain.handle`,
  surface narrowed via `contextBridge`. UI sends placeholder bounds; main
  applies them to the preview view.
- Main → Preview renderer: typed control messages over a dedicated IPC
  channel exposed by the preview's preload. Used for prop/theme/variant
  changes — not URL reloads where avoidable.
- Preview renderer ↔ Main: very narrow surface — health, ready, runtime
  error reports. Validate `event.senderFrame` on every handler.
- UI renderer ↔ Preview renderer: NO direct channel. All cross-view
  messaging passes through the main process so it can be validated,
  rate-limited, and logged.
- Main ↔ Local server / sidecar Vite: HTTP/WS over loopback only.

## Why this matters

- A compromised preview must not be able to reach the UI's session, the
  app router, or the user's filesystem.
- A compromised UI must not be able to navigate the preview to arbitrary
  URLs or attach a debugger.
- All cross-process talk goes through schemas in `packages/contracts`-style
  contracts. No "just stringify it" channels.

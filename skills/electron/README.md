# skills/electron — routing guide

This skill pack is for agents modifying Electron-related code in this repo,
including the AutoDSM preview WebContentsView, main-process window topology,
preload scripts, IPC channels, sessions, navigation, and content security.

Before changing Electron code, load the relevant files below. Always
cross-check against the official Electron docs index — Electron APIs change
between majors, and this pack may lag.

## Where to start

Always read first:

- `official-docs-index.md` — canonical Electron docs URLs and how to use them.
- `process-model.md` (+ `process-model.html`) — main vs renderer vs preload vs
  WebContentsView boundaries as used in AutoDSM.
- `security-checklist.md` — non-negotiable do/don't list for Electron and
  AutoDSM preview surfaces.

## Routing by task

| If the task touches…                                                                          | Read                                                                                    |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Creating/showing the main desktop window, `app.whenReady()`, quit flow, multi-window topology | `app-lifecycle-and-window-topology.md`                                                  |
| Adding/removing/laying out the AutoDSM preview view, `BaseWindow.contentView`, sibling views  | `webcontentsview.md`, `webcontentsview-layout-and-lifecycle.md`, `webcontentsview.html` |
| `webContents.loadURL`, navigation events, `setWindowOpenHandler`, `will-navigate`, redirects  | `navigation-sessions-and-permissions.md`                                                |
| `session` partitions, permission handlers, `webRequest` filtering, cookies for preview        | `navigation-sessions-and-permissions.md`                                                |
| `preload` scripts, `contextBridge`, `ipcMain.handle`/`ipcRenderer.invoke`, message validation | `ipc-preload-and-context-bridge.md`                                                     |
| CSP headers, `protocol.handle`, custom schemes, `file://` avoidance, loopback sidecar URLs    | `protocols-csp-and-content-loading.md`                                                  |
| Tests for Electron code, Playwright/Spectron-style harnesses, devtools, debugging crashes     | `testing-debugging-and-devtools.md`                                                     |
| Anything affecting the preview's security posture                                             | `security-checklist.md` + the file above for the specific surface                       |

## AutoDSM-specific quick rules

- The AutoDSM preview MUST be a sibling `WebContentsView` of the T3Code UI
  view under the same `BaseWindow`. It is NEVER an iframe inside the UI
  renderer.
- The preview view loads only loopback sidecar Vite URLs of the form
  `http://127.0.0.1:<port>` for the selected project/workspace.
- The UI renderer reports placeholder bounds via IPC; the main process is the
  sole owner of `view.setBounds(...)` on the preview view.
- Prop, theme, and variant changes are pushed into the preview via typed,
  schema-validated IPC/postMessage channels — not by reloading with URL params
  where avoidable.
- Screenshots/automation use `webContents.capturePage()` and the CDP debugger
  only behind typed host commands. Never expose CDP to the UI renderer.

If anything below conflicts with the official Electron docs, the official
docs win and you should update this pack.

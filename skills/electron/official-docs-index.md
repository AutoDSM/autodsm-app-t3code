# Official Electron docs — index

Always verify against the official Electron docs before changing any Electron
API. The APIs evolve between majors and this skill pack may lag. Treat the
URLs below as the source of truth.

## Top-level

- Electron docs landing: https://www.electronjs.org/docs/latest/
  - Categories: Tutorial, Processes in Electron, Best Practices, Examples,
    Development, Distribution, Testing and Debugging, References.
  - Use this when you don't know which subdoc to read yet.

## Processes and lifecycle

- Process model overview: https://www.electronjs.org/docs/latest/tutorial/process-model
- `app` module (lifecycle, `whenReady`, `activate`, `window-all-closed`,
  `quit`): https://www.electronjs.org/docs/latest/api/app

## Windows and views

- `BaseWindow`: https://www.electronjs.org/docs/latest/api/base-window
- `BrowserWindow`: https://www.electronjs.org/docs/latest/api/browser-window
- `WebContentsView`: https://www.electronjs.org/docs/latest/api/web-contents-view
- `View` (base class): https://www.electronjs.org/docs/latest/api/view
- `webContents`: https://www.electronjs.org/docs/latest/api/web-contents

## Security and content

- Security best practices: https://www.electronjs.org/docs/latest/tutorial/security
- Context isolation: https://www.electronjs.org/docs/latest/tutorial/context-isolation
- Sandbox: https://www.electronjs.org/docs/latest/tutorial/sandbox
- Fuses (build-time hardening): https://www.electronjs.org/docs/latest/tutorial/fuses

## Renderer integration

- Preload scripts and IPC: https://www.electronjs.org/docs/latest/tutorial/ipc
- `contextBridge`: https://www.electronjs.org/docs/latest/api/context-bridge
- `ipcMain`: https://www.electronjs.org/docs/latest/api/ipc-main
- `ipcRenderer`: https://www.electronjs.org/docs/latest/api/ipc-renderer

## Navigation, sessions, permissions

- `session`: https://www.electronjs.org/docs/latest/api/session
- `webRequest`: https://www.electronjs.org/docs/latest/api/web-request
- Permission request handler: https://www.electronjs.org/docs/latest/tutorial/security#5-handle-session-permission-requests-from-remote-content
- `protocol`: https://www.electronjs.org/docs/latest/api/protocol

## Testing, debugging, devtools

- Testing: https://www.electronjs.org/docs/latest/tutorial/automated-testing
- Application debugging: https://www.electronjs.org/docs/latest/tutorial/application-debugging
- DevTools extensions: https://www.electronjs.org/docs/latest/tutorial/devtools-extension

## How to use this index

1. Identify the API you are about to touch (e.g. `WebContentsView.setBounds`).
2. Open the matching official page and read the current signature, options,
   and constraints.
3. If the skill pack contradicts the official docs, the official docs win.
   Open a follow-up to update this pack.
4. Be especially careful with anything marked Experimental or Deprecated in
   the official docs.

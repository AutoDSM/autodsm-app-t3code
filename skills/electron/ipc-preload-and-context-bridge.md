# IPC, preload, and contextBridge

Renderers in AutoDSM are sandboxed with `contextIsolation: true`. The only
way the page can talk to privileged code is through a preload script that
exposes a narrow, typed surface via `contextBridge`. Main-side handlers
must independently validate every call.

Authoritative references:

- https://www.electronjs.org/docs/latest/tutorial/ipc
- https://www.electronjs.org/docs/latest/api/context-bridge
- https://www.electronjs.org/docs/latest/api/ipc-main
- https://www.electronjs.org/docs/latest/api/ipc-renderer

## Preload contract

A preload script:

1. Runs in the renderer process before the page loads.
2. With `contextIsolation: true`, it has its own JS world separate from the
   page. Mutations to its world do not leak to the page and vice versa.
3. May `require` electron modules (`contextBridge`, `ipcRenderer`) under
   `sandbox: true` (sandboxed preloads have access to a limited subset —
   `contextBridge` and `ipcRenderer.invoke`/`send` are available; verify
   the current docs for the Electron major you target).
4. Must NOT expose `ipcRenderer` directly. Build named functions instead.

## Good preload pattern

```ts
// preload-ui.ts
import { contextBridge, ipcRenderer } from "electron";

const api = {
  reportPreviewBounds: (b: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.invoke("ui:reportPreviewBounds", b),
  openProject: (projectId: string) => ipcRenderer.invoke("ui:openProject", projectId),
  onPreviewState: (cb: (s: { status: "loading" | "ready" | "error"; error?: string }) => void) => {
    const handler = (_: unknown, msg: unknown) => cb(msg as never);
    ipcRenderer.on("ui:previewState", handler);
    return () => ipcRenderer.removeListener("ui:previewState", handler);
  },
};

contextBridge.exposeInMainWorld("t3code", api);
```

Properties of a good preload:

- Tiny — list every function. No generic `invoke(channel, ...args)`.
- Typed — TypeScript types match a schema package, and the schema is the
  source of truth, not free-form `any`.
- Bounded — `onX` returns an unsubscribe function so callers can clean up.
- No data leaks — never expose env vars, paths, or version numbers
  inadvertently.

## Bad preload patterns — never do

```ts
// 🚫 Exposes raw IPC — a compromised renderer can call ANYTHING
contextBridge.exposeInMainWorld("electron", { ipcRenderer });

// 🚫 Generic invoke — same problem
contextBridge.exposeInMainWorld("api", {
  invoke: (ch: string, ...a: unknown[]) => ipcRenderer.invoke(ch, ...a),
});

// 🚫 Function returning Node primitives the page can inspect/abuse
contextBridge.exposeInMainWorld("io", { fs: require("node:fs") });
```

## ipcMain handlers — validation rules

Every handler must:

1. Verify the sender frame: confirm origin/URL matches the expected view
   (UI vs preview).
2. Validate the payload against a schema. Reject (and log) on mismatch.
3. Enforce authorization: a preview-origin sender must not invoke
   UI-only commands and vice versa.
4. Be idempotent or naturally safe to retry — IPC may double-fire under
   reconnect logic.

```ts
import { ipcMain } from "electron";

ipcMain.handle("ui:reportPreviewBounds", (event, raw) => {
  if (!isUiFrame(event.senderFrame)) {
    throw new Error("forbidden");
  }
  const bounds = BoundsSchema.parse(raw); // schema-validated
  previewView.setBounds(clampToWindow(bounds, win.getContentBounds()));
});

function isUiFrame(frame: Electron.WebFrameMain | null): boolean {
  if (!frame) return false;
  const url = new URL(frame.url);
  return url.protocol === "app:" && url.hostname === "ui";
}
```

For the preview origin:

```ts
function isPreviewFrame(frame: Electron.WebFrameMain | null): boolean {
  if (!frame) return false;
  const url = new URL(frame.url);
  return (
    url.protocol === "http:" &&
    (url.hostname === "127.0.0.1" || url.hostname === "localhost") &&
    ALLOWED_SIDECAR_PORTS.has(Number(url.port))
  );
}
```

## Push from main → renderer

For control messages from main to the preview renderer, use
`webContents.send(channel, payload)` and have the preload subscribe via
`ipcRenderer.on` then re-expose as a typed callback. Validate payloads on
both sides.

For one-shot RPC the renderer initiates, prefer `invoke`/`handle` because
it gives you typed promise rejection.

For very high-throughput message streams, consider
`ipcRenderer.postMessage` + transferable `MessagePort` (see the Electron
IPC docs). Still validate on the receiving end.

## Schemas

Co-locate IPC schemas with the rest of the contracts in the repo
(`packages/contracts` style). Define a schema per channel and import the
same definition in main and preload. Treat the schema as the contract;
TypeScript types are derived.

## Common anti-patterns

- "Just stringify it and parse on the other side" — no schema, no audit
  trail. Don't.
- Channel name collisions like `app:*` for both UI and preview — namespace
  channels by origin (`ui:*`, `preview:*`).
- Leaking listeners — every `ipcRenderer.on` needs a removable handler.
- Using `event.sender.getURL()` alone for auth — `getURL()` can lag
  during navigations; also consult `senderFrame`.
- Trusting renderer-supplied bounds without clamping to the window. A
  malicious preview could push the view off-screen or over UI chrome.

# WebContentsView Preview Renderer

> Load this skill any time you are touching the preview lifecycle, window
> topology, preview IPC, screenshots, or anything that touches what the user
> sees in the preview pane.
>
> **Hard rule:** the preview is a _sibling `WebContentsView`_ under a
> `BaseWindow`. It is **not** an `<iframe>` inside the UI renderer. Earlier
> docs that say "iframe" describe the legacy AutoDSM prototype and are
> superseded.

## Why a sibling view, not an iframe

- **Process isolation by default.** A `WebContentsView` is a full
  `WebContents`; we get its own sandboxed renderer, its own preload, its own
  session/partition, its own crash recovery.
- **No DOM access from the UI renderer.** The UI renderer literally cannot
  reach into the preview's DOM. Cross-view comms go through main.
- **Independent navigation/CSP/webRequest filters.** We can apply preview-only
  network rules (loopback-only) without weakening the UI shell.
- **Better crash UX.** Preview crashes don't take the UI with them.

## Topology

```
BaseWindow (main process owns it)
├── WebContentsView "ui"          ← React UI, workbench, DiffPanel
└── WebContentsView "preview"     ← Loads 127.0.0.1 sidecar
```

The UI view and preview view are _siblings_. The UI view positions and resizes
the preview by sending bounds requests to main; main calls
`previewView.setBounds(...)`.

## `PreviewViewController` — the only handle

The main process exposes a `PreviewViewController` per project. The UI never
holds a `webContents` reference directly. The controller's public surface:

```ts
interface PreviewViewController {
  loadComponent(plan: RenderPlan): Promise<RenderManifestId>;
  setBounds(b: { x: number; y: number; width: number; height: number }): void;
  setPropsAndTheme(payload: PreviewPropsAndTheme): void;
  capture(opts: CaptureOptions): Promise<ScreenshotId>;
  dispatchInput(event: InputEvent): Promise<void>;
  diagnostics(): Diagnostics;
  dispose(): Promise<void>;
}
```

All inputs/outputs are typed schemas in `packages/contracts`. See
[`rpc-and-contracts.md`](../architecture/rpc-and-contracts.md).

## Implementation checklist

### Window/view setup

- Use `BaseWindow` (not `BrowserWindow`) when you need sibling views.
- Create both views with the security defaults from
  [`security-model.md`](../architecture/security-model.md). No exceptions.
- Use a **partition per project** for the preview view's session
  (`persist:autodsm-<projectId>`).
- Attach the controller's lifecycle to the project's lifecycle.

### Bounds IPC

- The UI renderer measures the slot where the preview should appear and sends
  a typed `preview:set-bounds` request.
- Main validates, clamps to window bounds, and calls `setBounds`.
- Resize requests are debounced in main, not in the renderer.

### `loadURL` to the sidecar

- The sidecar runtime binds on `127.0.0.1:<port>` in the 5180–5189 range.
- Always load via the **IP literal** `http://127.0.0.1:<port>/...`, never
  `localhost` (avoids hosts-file shenanigans on enterprise networks).
- Attach `did-fail-load` and `render-process-gone` handlers in the controller;
  surface as typed `Diagnostics` events to the UI.

### Sending props/theme

- Use `webContents.send('preview:state', payload)` with the schema
  `PreviewPropsAndTheme` validated _before_ send and _again_ in the preview
  preload before dispatching into the page.
- Do not send raw functions/closures. Props that need behavior are addressed
  via stable string ids the preview resolves through its own registry.

### Diagnostics

- The controller surfaces a `Diagnostics` stream: console output, runtime
  errors, navigation attempts, network denials, and load timing.
- Diagnostics are typed and scoped per project; never globally logged.

### Screenshots

- Use Chromium's CDP via the controller's `capture` method. Don't use
  `capturePage` directly from feature code.
- `CaptureOptions` carries viewport, DPR, theme, and clip. The pipeline writes
  a content-addressed blob; the artifact carries only an id (see
  `RenderManifest`).

## Common mistakes to avoid

- ❌ Creating a `BrowserView`. Use `WebContentsView`.
- ❌ Embedding the preview as an `<iframe>` in the UI renderer.
- ❌ Sharing a session between UI and preview.
- ❌ Reaching into the preview from the UI renderer through `postMessage`. Use
  the controller and typed RPC.
- ❌ Holding `webContents` references in renderer-side modules.
- ❌ Loading the sidecar via a non-loopback URL.
- ❌ Sending raw functions, `Date` objects, or class instances over IPC.

## Visual

See [webcontentsview-renderer.html](./webcontentsview-renderer.html) for the
view topology, controller surface, and message flow.

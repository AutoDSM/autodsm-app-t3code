# WebContentsView — layout, lifecycle, and devtools

This file covers bounds, resizing, z-order, visibility, devtools, crash
handling, and adoption limitations for `WebContentsView` in AutoDSM.

Authoritative reference:
https://www.electronjs.org/docs/latest/api/web-contents-view

## Bounds and resize

- Geometry is set with `view.setBounds({ x, y, width, height })`.
- Bounds are integers in DIPs (Device-Independent Pixels). Round before
  passing — fractional values are platform-dependent.
- The renderer NEVER calls `setBounds`. The UI renderer measures a
  placeholder element (e.g. the preview slot in the layout), reports the
  rect to main via IPC, and main applies it. This keeps the renderer
  unable to move the preview off-screen or over chrome it shouldn't cover.

```ts
// in UI renderer (via contextBridge exposed function)
const rect = previewSlot.getBoundingClientRect();
window.t3code.reportPreviewBounds({
  x: Math.round(rect.x),
  y: Math.round(rect.y),
  width: Math.round(rect.width),
  height: Math.round(rect.height),
});

// in main
ipcMain.handle("ui:reportPreviewBounds", (event, bounds) => {
  if (!isUiFrame(event.senderFrame)) return;
  const clamped = clampToWindow(bounds, win.getContentBounds());
  previewView.setBounds(clamped);
});
```

Window-resize handling lives in main: on `win.on('resize')`, ask the UI for
fresh bounds (or recompute from a layout contract if it is stable). Avoid
applying stale bounds during a resize storm — debounce or coalesce.

## Z-order and overlap

- Child views are painted in insertion order. The last added child is on
  top.
- To bring a view forward: `contentView.removeChildView(view)` then
  `contentView.addChildView(view)`.
- Two visible `WebContentsView`s should not overlap unless you deliberately
  intend to. Overlap costs paint and can confuse input routing.
- If you need transient overlay UI (toast, dropdown) over the preview,
  render it inside the UI view and arrange bounds so the UI view sits on
  top with a transparent region.

## Visibility and "hide"

There is no first-class hide flag. To hide a view:

- Move it off-screen (`setBounds({ x: -10000, y: -10000, width: 1, height: 1 })`), or
- Remove it from `contentView` and re-add when needed.

Removing fully suspends compositing for that view. Off-screen keeps it
warm and keeps timers, websockets, and devtools alive.

## DevTools

- `view.webContents.openDevTools({ mode: 'detach' })` — preferred for
  preview, so the devtools window is its own OS window.
- `view.webContents.openDevTools({ mode: 'right' })` works for the UI
  view in dev.
- Never ship devtools auto-open in production builds. Gate behind a build
  flag.
- DevTools is itself a web page — do not expose your preload there.

## Crash and reload

Listen on the `webContents`:

- `render-process-gone` (modern, replaces `crashed`) — log reason, then
  decide whether to reload the URL or recreate the view. Recreate if the
  partition needs to change.
- `unresponsive` / `responsive` — surface to the user; offer "Reload" /
  "Force Restart".
- `did-fail-load` — distinguish user-visible failures from racing
  sidecar-not-ready. For not-ready, wait for the sidecar's readiness
  signal and retry with backoff.

Restart strategy for the preview:

1. Stop accepting new control messages.
2. `webContents.reloadIgnoringCache()` — if same URL and same partition.
3. If state is corrupt, recreate the view: `removeChildView`, drop
   reference, build a new `WebContentsView` with the same partition.
4. Re-apply bounds.
5. Replay last known prop/theme/variant.

## Adoption limitations

A `WebContents` instance may only be hosted in one `WebContentsView` at a
time. Adopt-and-move:

```ts
const moved = new WebContentsView({ webContents: oldView.webContents });
oldWindow.contentView.removeChildView(oldView);
newWindow.contentView.addChildView(moved);
```

Constraints:

- Do not keep the old view around — drop the reference.
- Adopting does not change the existing `webContents` partition or its
  open documents; you are picking up the live tab and rehoming it.
- For AutoDSM, prefer recreating views over moving `webContents` between
  them. Adoption is mostly useful for advanced flows (e.g., promoting an
  in-preview popup into its own pane), which we do not currently support.

## Memory and leaks

- Every `WebContentsView` you create must be torn down on project close.
- Close `webContents` listeners (`removeAllListeners` on the ones you
  added) — listeners can hold the view alive.
- `webRequest` listeners attach to the session, not the view. If you
  create per-project listeners, remove them when the project session is
  discarded.
- After tear-down, verify no stray references in long-lived maps (project
  → view, projectId → bounds, etc.).

## Don'ts

- Don't drive bounds from the renderer directly.
- Don't animate bounds at 60fps from the renderer side; debounce or
  coalesce — main process IPC bursts are expensive.
- Don't toggle visibility by reloading URLs.
- Don't subclass. (Repeated, because tempting.)
- Don't share a `webContents` across views.

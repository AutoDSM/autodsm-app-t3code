# Interaction & Screenshots (CDP-driven)

> Load this skill when adding UI interaction primitives (hover, focus, type,
> click), pseudo-state testing, viewport/DPR/theme matrices, or anything that
> captures pixels from the preview.

## Why CDP

The preview is a `WebContentsView`; we have full Chrome DevTools Protocol
access via main. CDP gives us:

- Deterministic input dispatch (avoids React-synthetic-event quirks).
- Pseudo-state forcing (`:hover`, `:focus`, `:active`, `:visited`) without
  actually moving the mouse.
- Pixel-precise screenshots with clip + DPR.
- Page-level emulation (viewport, color scheme, reduced motion, locale).

Feature code never speaks CDP directly. It speaks to the `PreviewViewController`
which speaks to CDP. See
[`webcontentsview-renderer.md`](./webcontentsview-renderer.md).

## Input dispatch

`controller.dispatchInput(event)` accepts typed `InputEvent` values:

- `mouse.move | mouse.down | mouse.up | mouse.click | mouse.wheel`
- `keyboard.type | keyboard.down | keyboard.up`
- `touch.start | touch.move | touch.end`

Coordinates are in CSS pixels relative to the preview view. The controller
serializes them into CDP `Input.dispatchMouseEvent` / `Input.dispatchKeyEvent`.

### Patterns

- **Hover a target by test id:** the renderer asks the workbench for a
  test-id-to-rect map (computed inside the preview via the assertion harness),
  then dispatches a `mouse.move` to the rect's center.
- **Type into a field:** focus first (`mouse.click`), then `keyboard.type`.
  Do not assume IME-free input — pass the canonical string.

## Pseudo states

`Emulation.forcePseudoState` lets us pin `:hover`, `:focus`, `:focus-visible`,
`:active`, and `:visited` on a node selector. Use this for stable visual tests.

- Pseudo states are _per render_, not session-wide.
- Always clear them at the end of a render plan.
- Combine with `Emulation.setEmulatedMedia` for `prefers-color-scheme` matrices.

## Assertion harness

A tiny harness loaded by the sidecar exposes (over a typed channel):

- `queryByTestId(id) → { rect, role, ariaName }`
- `getAxeSnapshot() → AxeResults`
- `getComputedStyle(id) → CssSnapshot`

These are read-only signals consumed by the workbench and by the scan delta
pipeline. The harness does not allow arbitrary DOM mutation.

## Capture pipeline

`controller.capture(opts: CaptureOptions)` returns a `ScreenshotId`:

```ts
type CaptureOptions = {
  viewport: { width: number; height: number; dpr: number };
  clip?: { x: number; y: number; width: number; height: number };
  themeMatrix?: ("light" | "dark")[];
  motion?: "no-preference" | "reduce";
  // … see Schema for the full surface
};
```

- The pipeline writes a content-addressed PNG to disk and returns the id.
- `RenderManifest` references the id, never the blob.
- For matrices (multiple themes/viewports), the controller batches captures
  inside one preview load to avoid remount cost.

## Determinism rules for screenshots

- Pin fonts: the sidecar preloads a deterministic font set; missing fonts
  surface as a diagnostic, not silent substitution.
- Stub `Date.now()`/`Math.random()` for the capture (opt-in via the plan).
- Disable animations: `Emulation.setEmulatedMedia({ media: 'print' })` is
  _not_ used (changes layout); instead, inject `*{animation-duration:0!important}`
  via `Page.setUserStyleSheet`.
- Wait for `requestIdleCallback` + a stabilization frame before snap.

## Anti-patterns

- ❌ Driving the preview via `webContents.executeJavaScript` from feature code.
- ❌ Using `synth React events` instead of CDP input dispatch.
- ❌ Storing screenshot blobs in the manifest. Reference by id.
- ❌ Forcing pseudo states without clearing them.
- ❌ Capturing without a frame-stabilization wait — leads to flaky goldens.

## See also

- [`workflow/testing.md`](../workflow/testing.md) — golden screenshot tests.
- [`safe-runtime.md`](./safe-runtime.md) — preview determinism.

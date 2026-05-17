# Safe Runtime (Preview Bootstrap)

> Load this skill before changing anything inside the sidecar bootstrap, the
> preview's preload, error capture, HMR, or how component modules are cached.

## Goals

- **Faithful render.** The preview mounts the user's component as the user's
  app would.
- **Safe by construction.** A buggy or malicious user component must not be
  able to harm the host, exfiltrate data, or persist anything.
- **Deterministic.** Same `RenderPlan` ⇒ same `RenderManifest` (modulo time and
  randomness, which are stubbable).

## Bootstrap constraints

The sidecar's preview document loads under the CSP from
[`security-model.md`](../architecture/security-model.md). Inside the document:

- **No `eval`** of arbitrary host strings. Bootstrap only runs:
  - the user's compiled modules (resolved by Vite),
  - the provider pack composition,
  - the preview preload's typed bridge.
- **No Node APIs.** `nodeIntegration` is false in the preview view. Anything
  Node-ish goes through main.
- **No host fetch.** `webRequest` denies non-loopback. If a component fetches,
  the runtime intercepts the URL and returns a stubbed `Response` or a
  declared fixture from the workbench.
- **No clipboard reads of host data.** Clipboard APIs are stubbed.
- **No service workers / push.** CSP blocks; bootstrap also unregisters any
  rogue SW.

## Error capture

The preview owns three error surfaces:

1. **Synchronous render errors** — caught by a top-level `ErrorBoundary` that
   reports `{ kind: 'render-error', componentId, message, stack }` over
   `preview:diagnostics`.
2. **Async errors** — `window.onerror` + `window.onunhandledrejection` →
   diagnostics.
3. **Console** — `console.error`/`warn` mirrored to diagnostics (typed). The
   user's component can still log freely; we just observe.

Errors never throw into the host process; they are _artifacts_.

## Safe mode

Some component graphs misbehave on first mount (broken provider config, missing
peer deps). Safe mode boots with:

- All optional packs disabled.
- A minimal theme provider only.
- Network interception in "block + report" mode.

Safe mode is entered automatically after N consecutive render errors per
component id (default `N=3`) and exited explicitly by the user. It is also
selectable in the workbench for any render.

## Module cache

The preview keeps a **per-render module cache** so swapping props/theme does
not reload the world.

- Cache key: `(componentId, REP hash, sourceContentHash)`.
- Eviction: LRU with project-level memory ceiling.
- Invalidated on: source HMR update for any module in the dependency closure;
  REP change; explicit "reset preview" from the workbench.

Do not hand-roll caching inside individual packs. There is one cache.

## HMR behavior

- **Source edits** while a component is mounted: Vite HMR pushes the patch, the
  module cache invalidates the closure, the component remounts, and diagnostics
  carries a `kind: 'hmr-update'` event with the updated paths.
- **Prop/theme edits**: do **not** remount. They flow via `preview:state` and
  reach the live tree.
- **Pack changes**: full remount; the REP changed and the cache key changed
  with it.

## Determinism helpers

- `Date.now()` and `performance.now()` can be virtualized when the render plan
  asks for it (used by screenshot determinism).
- `Math.random()` can be seeded per render via a deterministic stub.
- These stubs are off by default; turn on per `RenderPlan` when needed.

## Anti-patterns

- ❌ Importing main-process modules into the sidecar.
- ❌ Reading env vars not on `envAllowlist` during bootstrap.
- ❌ Long-running `setInterval` loops at module top-level — wrap in effects.
- ❌ Mounting user components outside the pack composition function.
- ❌ Catching errors silently inside packs. Surface them to diagnostics.
- ❌ Bypassing the module cache from a pack to "fix" a stale state — fix the
  cache key.

## See also

- [`webcontentsview-renderer.md`](./webcontentsview-renderer.md) — host side of
  the preview.
- [`provider-packs.md`](./provider-packs.md) — pack composition order.
- [`interaction-and-screenshots.md`](./interaction-and-screenshots.md) — CDP
  inputs and capture pipeline.

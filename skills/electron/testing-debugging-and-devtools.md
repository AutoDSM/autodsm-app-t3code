# Testing, debugging, and devtools for Electron work

How to verify Electron/WebContentsView changes don't regress security or
reliability, and how to debug safely when things go wrong.

Authoritative references:

- Automated testing: https://www.electronjs.org/docs/latest/tutorial/automated-testing
- Application debugging: https://www.electronjs.org/docs/latest/tutorial/application-debugging
- DevTools extension: https://www.electronjs.org/docs/latest/tutorial/devtools-extension

## What tests must exist

Any PR that touches Electron main, preload, or the preview must include
tests at one or more of these levels.

### Unit tests (Vitest, in `apps/server`-style projects)

- IPC schema validation: every channel has a schema and a positive +
  negative test.
- URL allowlist helpers (`isLoopbackPreviewUrl`, `isUiAppUrl`, etc.):
  cover loopback, localhost, wrong port, wrong scheme, IDN/punycode,
  embedded credentials (`http://user:pass@127.0.0.1`), trailing dot,
  IPv6 loopback, surrogate-pair junk.
- Bounds clamping: zero/negative width, oversized rect, NaN, floats.
- Preload "exposed API surface" snapshot: a test asserts the exact set
  of keys exposed under `window.t3code` (or equivalent). Any addition
  must be intentional.

### Integration tests (Electron main)

Spin up the Electron app headless (Playwright with `_electron` launcher
or the equivalent). Verify:

- App ready → window opens → both views attach.
- Navigating the preview to a non-loopback URL is blocked.
- `window.open` from the preview returns a denied action.
- `setPermissionRequestHandler` denies a representative permission.
- CSP header is present on responses to the preview partition.
- Resize event flows: UI reports bounds → main applies → preview's
  `getBounds()` matches within rounding.
- Project switch tears down the preview and recreates it with the new
  partition.
- `render-process-gone` triggers the restart strategy and recovers.

### End-to-end (smoke)

A small set of e2e tests that exercise the user-visible behavior of the
preview: open a project, see it render, change a prop, see it update,
close it cleanly. Run on the same CI image as production.

## Test execution rules in this repo

- Run with `bun run test`. NEVER `bun test` (see `AGENTS.md`).
- `bun fmt`, `bun lint`, and `bun typecheck` must all pass.

## Debugging the main process

- Launch with `--inspect=9229` to attach a Node debugger to the main
  process. VS Code's "Attach to Node" works.
- For one-shot inspection, sprinkle `console.log` at the boundaries (IPC
  in/out, navigation gates) — but redact payloads.
- Crash logs: enable `crashReporter` in dev. The path to crash dumps is
  printed at startup; tail it during testing.

## Debugging renderers

- DevTools: `view.webContents.openDevTools({ mode: 'detach' })`. Detached
  is preferred for the preview so it doesn't reflow the UI.
- React DevTools / Redux DevTools extensions: install via
  `session.loadExtension` in dev only. Never ship.
- Performance traces: use the Performance tab. For preview-induced jank,
  also profile main with `--cpu-prof`.

## Debugging IPC

Add a thin "trace" wrapper around `ipcMain.handle` in dev:

```ts
const handle = (channel: string, h: (e: IpcMainInvokeEvent, raw: unknown) => unknown) =>
  ipcMain.handle(channel, async (event, raw) => {
    const id = Math.random().toString(36).slice(2, 8);
    log.debug("ipc-in", { channel, id, frame: event.senderFrame?.url });
    try {
      const r = await h(event, raw);
      log.debug("ipc-out", { channel, id, ok: true });
      return r;
    } catch (err) {
      log.warn("ipc-err", { channel, id, err: String(err) });
      throw err;
    }
  });
```

Strip payload bodies — they may contain user content. Log only sizes and
schema validation result.

## Debugging the preview safely

- Never enable the Chrome DevTools Protocol (CDP) on the preview unless
  there is a typed host command for the current task. Detach when done.
- `webContents.capturePage()` is fine for screenshots; it does not expose
  more than a PNG to the caller. Still gate behind a host command so the
  UI renderer can't spam screenshots.
- If you need to inspect a stuck preview, prefer:
  1. `openDevTools({ mode: 'detach' })`
  2. `webContents.reloadIgnoringCache()`
  3. Full view recreate.

## CI considerations

- Run Electron tests on the same OS family as production. macOS-only
  behaviors (e.g. `activate`) won't be covered by Linux runners.
- Cache the Electron binary between runs to keep CI cheap.
- Use a virtual display (`xvfb-run`) on Linux for renderer-attached
  tests.

## What "done" looks like

Before marking an Electron-touching PR as ready:

- [ ] `bun fmt`, `bun lint`, `bun typecheck` pass.
- [ ] `bun run test` passes locally and on CI.
- [ ] Security checklist (`security-checklist.md`) reviewed line-by-line.
- [ ] If any webPreferences changed, the change is explicit in the PR
      description with rationale.
- [ ] If any new IPC channel was added, it has a schema, a sender check,
      and at least one negative test.
- [ ] If any new navigation target is allowed, it has a unit test and
      passes the `will-navigate` gate.

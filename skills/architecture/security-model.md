# Security Model

> Load this skill before changing **any** of: window/view creation, preview
> bootstrap, IPC validators, navigation handlers, CSP, partitions, network
> filters, secret handling, or the sidecar runtime. These invariants are not
> defaults — they are contracts. Breaking one is a security regression.

## Electron invariants (non-negotiable)

All BrowserWindows, BaseWindows, and `WebContentsView`s in this app are created
with **these exact settings**:

```ts
webPreferences: {
  contextIsolation: true,     // isolate renderer from Node
  sandbox: true,              // full Chromium sandbox
  nodeIntegration: false,     // no Node in renderer
  webSecurity: true,          // CORS / same-origin enforced
  preload: <typed preload>,   // exposes window.<api>.* only
  // never: nodeIntegrationInWorker, nodeIntegrationInSubFrames, allowRunningInsecureContent
}
```

A code review **must reject** any PR that sets these differently for a "quick
fix." There is no quick fix — file an architectural change first.

## The preview is a sibling `WebContentsView`, not an iframe

- The UI renderer **does not** embed the preview as `<iframe>`. The preview is a
  _sibling_ child view under a `BaseWindow`. See
  [`rendering/webcontentsview-renderer.md`](../rendering/webcontentsview-renderer.md).
- The UI renderer cannot reach into the preview's DOM, can't postMessage to it
  directly, and must use the typed `PreviewViewController` API.
- The preview cannot reach the UI renderer's origin or its preload globals.

## Partition per project

Each opened project gets its own `Session.fromPartition('persist:autodsm-<projectId>')`.

- Cookies, storage, service workers, and caches are isolated per project.
- A bug in one project's preview cannot read another's data.
- When a project closes, its session is cleared.

## Navigation lockdown

For both the UI view and the preview view:

- `webContents.on('will-navigate', ...)`: deny unless `url.origin` is the
  expected origin (UI: `app://` or `file://` build origin; Preview:
  `http://127.0.0.1:<port>`).
- `setWindowOpenHandler(() => ({ action: 'deny' }))`. New windows are opened via
  the OS through `shell.openExternal` only after URL allowlist check.
- `webRequest.onBeforeRequest` for the preview session: **deny any request whose
  host is not `127.0.0.1` / `localhost` / `[::1]`** on the sidecar port range.
  This filter exists _in addition_ to webSecurity.

## CSP

The preview document served by the sidecar carries a strict CSP:

```
default-src 'none';
script-src  'self';
style-src   'self' 'unsafe-inline';   /* required by many CSS-in-JS providers */
img-src     'self' data: blob:;
font-src    'self' data:;
connect-src 'self';
frame-ancestors 'none';
```

The UI document has its own CSP that disallows `connect-src` to anything but
the local server (loopback) and explicitly listed provider endpoints.

## postMessage / IPC schema validation

- Every cross-process message passes through `effect/Schema` (or zod where it
  already exists) on **both ends**.
- Mismatches are logged and dropped — never thrown into UI code paths.
- A schema-less payload is a bug: add the schema to `packages/contracts` and
  validate at the boundary. See
  [`rpc-and-contracts.md`](./rpc-and-contracts.md).

## Secrets handling

- Secrets are resolved by a main-process `CredentialResolver`. The renderer
  never sees raw tokens; it receives a redacted reference.
- Secrets **never** enter the preview process. The sidecar bootstrap does not
  load env vars that match secret patterns (API keys, tokens, OAuth).
- Logs and crash reports are scrubbed. Stderr from spawned children is filtered
  through a redactor before being persisted.

## webRequest: deny non-loopback in preview

This is the _belt_ to webSecurity's _suspenders_. Concretely:

```ts
previewSession.webRequest.onBeforeRequest((details, cb) => {
  const u = new URL(details.url);
  const ok = u.hostname === "127.0.0.1" || u.hostname === "localhost" || u.hostname === "[::1]";
  cb({ cancel: !ok });
});
```

Any preview that needs an outbound HTTP request is _wrong by default_. If a
provider pack genuinely needs a fixture asset, mount it via the sidecar.

## What does _not_ belong in the preview

- No analytics SDKs.
- No service workers or push subscriptions.
- No clipboard reads of user data.
- No third-party scripts of any kind (CSP blocks; this is the doc).
- No file URLs from outside the project root.

## Test obligations

A PR that touches any of: window/view creation, preload, CSP, navigation
filters, partitions, or the sidecar bootstrap **must** include or update tests
in the preview-security suite. See
[`workflow/testing.md`](../workflow/testing.md).

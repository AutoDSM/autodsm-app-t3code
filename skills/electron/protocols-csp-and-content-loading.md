# Protocols, CSP, and content loading

How content gets into the UI and preview views, how custom protocols
replace `file://`, and how CSP is delivered.

Authoritative references:

- protocol: https://www.electronjs.org/docs/latest/api/protocol
- Security: https://www.electronjs.org/docs/latest/tutorial/security
- webRequest: https://www.electronjs.org/docs/latest/api/web-request

## Avoid file://

`file://` URLs grant origin equality across the whole filesystem and
disable many web platform protections. AutoDSM does not use `file://` for
the UI or the preview.

Instead:

- **UI bundle**: served via a custom `app://` scheme handled by
  `protocol.handle` in the main process.
- **Preview**: served by the sidecar Vite over loopback HTTP.

## Custom scheme for the UI

Register the scheme as privileged BEFORE `app.whenReady()`:

```ts
protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
  },
]);
```

Then implement the handler after ready:

```ts
await app.whenReady();
protocol.handle("app", async (request) => {
  const url = new URL(request.url);
  if (url.hostname !== "ui") return new Response("Not Found", { status: 404 });
  // Map url.pathname to a file inside the packaged UI bundle.
  const safeFsPath = resolveBundleAsset(url.pathname);
  if (!safeFsPath) return new Response("Forbidden", { status: 403 });
  return net.fetch(`file://${safeFsPath}`); // controlled, no user-controlled path
});
```

Notes:

- Validate `url.pathname` against an allowlist of bundled files. No `..`.
- Return correct `Content-Type` headers so the renderer parses correctly.
- Add CSP headers at this layer for the UI (see below).

## Loopback sidecar for the preview

The preview view loads `http://127.0.0.1:<port>` where `<port>` is the
sidecar Vite instance for the currently selected project. Rules:

- Port is allocated by the main process, never the renderer.
- Sidecar process must bind to `127.0.0.1` only — never `0.0.0.0`.
- Main keeps the live port → projectId map, and the preview session's
  `webRequest.onBeforeRequest` allowlist uses that port.
- On project switch:
  1. Stop sending control messages.
  2. Set new bounds (optional).
  3. `loadURL(new URL(...))` for the new sidecar URL after the new port is
     live and the webRequest allowlist is updated.
- On sidecar restart (HMR cycles): wait for ready signal, then
  `webContents.reloadIgnoringCache()`.

## Content Security Policy

CSP is a defense in depth — useful even though context isolation already
limits damage.

### Delivery

- Preferred: HTTP header `Content-Security-Policy` via
  `webRequest.onHeadersReceived` in the main process.
- Fallback (only for documents served on a scheme you can't intercept,
  i.e. truly `file://`): `<meta http-equiv="Content-Security-Policy">`.
- AutoDSM should always use the header form, because both the UI (custom
  scheme) and the preview (sidecar HTTP) go through webRequest.

### Example CSP for the UI

```text
default-src 'self' app://ui;
script-src 'self' app://ui;
connect-src 'self' app://ui ws://127.0.0.1:<server-port>;
img-src 'self' data: app://ui;
style-src 'self' 'unsafe-inline' app://ui;
object-src 'none';
base-uri 'none';
frame-ancestors 'none';
```

`'unsafe-inline'` for styles is a pragmatic compromise for many CSS-in-JS
setups; remove it if your build can.

### Example CSP for the preview

See `security-checklist.md`. Key constraints:

- `connect-src` includes the sidecar's HTTP and WS URLs only.
- `frame-ancestors 'none'` — no one may embed the preview.
- Avoid `unsafe-eval` even if Vite asks for it in dev — use the prod-style
  build for the preview, or pin a per-project nonce.

## Schemes summary

| Scheme                    | Used by                    | Notes                                                               |
| ------------------------- | -------------------------- | ------------------------------------------------------------------- |
| `app://` (custom)         | UI bundle                  | Standard + secure + fetch + CORS via `registerSchemesAsPrivileged`. |
| `http://127.0.0.1:<port>` | Preview ↔ sidecar Vite     | Loopback only; per-project port.                                    |
| `ws://127.0.0.1:<port>`   | UI ↔ apps/server WebSocket | Loopback only.                                                      |
| `file://`                 | NOT used                   | Replaced by `app://`.                                               |
| `chrome-devtools://`      | DevTools                   | Permit in dev only.                                                 |
| `data:` / `blob:`         | Limited assets             | Allowed in CSP only if essential.                                   |

## Don'ts

- Don't serve user-supplied paths through `protocol.handle` without
  validating against an allowlist of bundled assets.
- Don't enable a custom protocol with `bypassCSP: true`.
- Don't disable CSP "temporarily" to debug — narrow it instead.
- Don't put secrets in the URL (`?token=...`). Send via the typed control
  channel after load.
- Don't load the sidecar over a public interface. Loopback only.

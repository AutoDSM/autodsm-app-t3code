# Navigation, sessions, and permissions

This file covers `will-navigate`, `setWindowOpenHandler`, session
partitions, permission handlers, and `webRequest` filtering — the
gauntlet a navigation must run through before the preview can load
anything.

Authoritative references:

- Security: https://www.electronjs.org/docs/latest/tutorial/security
- session: https://www.electronjs.org/docs/latest/api/session
- webRequest: https://www.electronjs.org/docs/latest/api/web-request
- webContents: https://www.electronjs.org/docs/latest/api/web-contents

## Sessions and partitions

- Each `WebContentsView` is bound to a session via
  `webPreferences.partition`. With no partition it shares the default
  session — DO NOT do this for the preview.
- AutoDSM partition policy:
  - UI: `persist:ui` (single, app-wide)
  - Preview: `persist:preview-<projectId>` (one per project)
- Per-partition sessions get independent cookie jars, storage, service
  worker registry, and permission state. This is the isolation guarantee
  preview relies on.
- Configure the session immediately after `app.whenReady()` and before
  any view loads into it. Once a webContents has started loading,
  retroactive session changes are inconsistent.

```ts
const sess = session.fromPartition(`persist:preview-${projectId}`);
hardenPreviewSession(sess, { port });
```

## Hardening a preview session

```ts
function hardenPreviewSession(sess: Electron.Session, opts: { port: number }) {
  // Block non-loopback requests entirely
  sess.webRequest.onBeforeRequest((details, cb) => {
    const u = safeParse(details.url);
    const allowed =
      u &&
      (u.protocol === "http:" || u.protocol === "ws:") &&
      (u.hostname === "127.0.0.1" || u.hostname === "localhost") &&
      Number(u.port) === opts.port;
    cb({ cancel: !allowed });
  });

  // Inject restrictive CSP
  sess.webRequest.onHeadersReceived((details, cb) => {
    const base = `http://127.0.0.1:${opts.port}`;
    const csp = [
      `default-src 'self' ${base}`,
      `script-src 'self' ${base}`,
      `connect-src 'self' ${base} ws://127.0.0.1:${opts.port}`,
      `img-src 'self' data: ${base}`,
      `style-src 'self' 'unsafe-inline' ${base}`,
      `font-src 'self' data: ${base}`,
      `object-src 'none'`,
      `base-uri 'none'`,
      `frame-ancestors 'none'`,
    ].join("; ");
    cb({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
        "X-Content-Type-Options": ["nosniff"],
      },
    });
  });

  // Deny all permission requests by default
  sess.setPermissionRequestHandler((_wc, _perm, callback) => callback(false));
  sess.setPermissionCheckHandler(() => false);
}
```

`safeParse` is a `new URL(u)` wrapped in try/catch returning `null` on
failure. Never substring-match URLs.

## will-navigate

Attach to the preview's `webContents`:

```ts
previewView.webContents.on("will-navigate", (event, urlStr) => {
  const u = safeParse(urlStr);
  const ok =
    u &&
    u.protocol === "http:" &&
    (u.hostname === "127.0.0.1" || u.hostname === "localhost") &&
    Number(u.port) === opts.port;
  if (!ok) event.preventDefault();
});
```

Also handle `will-redirect` to catch server-side redirects that try to
escape loopback.

For the UI view, allow only the app's custom scheme:

```ts
uiView.webContents.on("will-navigate", (event, urlStr) => {
  const u = safeParse(urlStr);
  if (!u || u.protocol !== "app:") event.preventDefault();
});
```

## setWindowOpenHandler

By default deny:

```ts
previewView.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
uiView.webContents.setWindowOpenHandler(({ url }) => {
  // Only allow specific outbound links the user explicitly clicked.
  if (isAllowedOutbound(url)) {
    shell.openExternal(url); // open in default browser
    return { action: "deny" }; // never spawn an in-app window
  }
  return { action: "deny" };
});
```

Even when allowing, return `{ action: 'deny' }` and hand the URL to
`shell.openExternal` — do not let Electron spawn an in-app `BrowserWindow`
for arbitrary URLs.

## Permissions

Default-deny on the preview session. For the UI session, the same is
usually correct, since the UI shell does not need camera/mic/geolocation
to render T3Code.

```ts
sess.setPermissionRequestHandler((_wc, permission, cb) => {
  // Add named exceptions ONLY with a documented reason.
  cb(false);
});
sess.setPermissionCheckHandler(() => false);
```

If a project's preview legitimately needs (say) clipboard read, gate it
through the host UI: user toggles, persisted per project, validated on
every check.

## webRequest filtering details

- Register filters on the _session_, not the webContents. Filters apply to
  every webContents in that session.
- Use `urls: ['<all_urls>']` to receive every request.
- For the preview, the default action is BLOCK; explicitly ALLOW loopback
  to your sidecar's port set.
- Be careful with `data:` and `blob:` — most Vite setups can produce
  these; allow them only if needed and within CSP.

## Redirect attacks

If you allow `http://127.0.0.1:<port>` and the sidecar 302s to a public
URL, your `webRequest.onBeforeRequest` filter still sees the redirect
target. Block it there, and additionally listen to `will-redirect` on the
webContents to abort the navigation. Defense in depth.

## Don'ts

- Don't trust `did-navigate` for security gating — it fires _after_ the
  navigation. Gate at `will-navigate` / `webRequest`.
- Don't permit `file://` in the preview. If you must serve local files,
  use `protocol.handle` with a custom scheme and validate every path.
- Don't share permission handlers across partitions — copy intentionally,
  per session.
- Don't disable filters in dev/test. Run them everywhere so issues surface
  early.

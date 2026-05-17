# Electron + AutoDSM preview — security checklist

Treat this list as a hard gate on any PR that touches Electron code. If you
cannot tick every applicable item, the PR is not ready.

Authoritative reference: https://www.electronjs.org/docs/latest/tutorial/security

## Always

- [ ] Only load secure content. HTTPS for remote; custom protocols or
      loopback HTTP for local.
- [ ] `contextIsolation: true` in every renderer.
- [ ] `sandbox: true` in every renderer.
- [ ] `nodeIntegration: false` in every renderer.
- [ ] `webSecurity: true` (never disable).
- [ ] `allowRunningInsecureContent: false`.
- [ ] `experimentalFeatures: false`.
- [ ] `enableBlinkFeatures: ''` (no extras enabled).
- [ ] Preload exposes only narrow, typed APIs via `contextBridge`. Never
      `ipcRenderer`, never `remote`, never `require`.
- [ ] All `ipcMain.handle` handlers validate `event.senderFrame` (origin,
      URL, and frame identity).
- [ ] Schema-validate every IPC payload (use the same schema discipline as
      `packages/contracts`).
- [ ] `session.setPermissionRequestHandler` configured for every session
      that may load remote content. Deny by default.
- [ ] `setWindowOpenHandler` returns `{ action: 'deny' }` unless a specific
      allowed target is matched.
- [ ] `will-navigate` listener calls `event.preventDefault()` for any
      target outside the allowlist. Use `new URL(...)` parsing — never
      string prefix checks.
- [ ] No `shell.openExternal` with user-controlled URLs. If you must,
      validate scheme + host against an allowlist and confirm with the
      user.
- [ ] No `file://` for remote/untrusted content. Use `protocol.handle` to
      back custom schemes with controlled file reads.
- [ ] CSP is delivered via HTTP headers (`webRequest.onHeadersReceived`).
      Use the meta-tag form only for documents served over `file://`
      that you cannot intercept.
- [ ] Electron fuses considered/enabled for the production build
      (`runAsNode`, `enableCookieEncryption`, etc.). See the official
      fuses doc.

## AutoDSM preview-specific

- [ ] Preview is a sibling `WebContentsView`, never an `<iframe>` in the UI.
- [ ] Per-project session partition: `persist:preview-<projectId>`.
- [ ] Preview navigation is locked to loopback only: scheme `http`, host
      `127.0.0.1` (preferred) or `localhost`, port in the known sidecar
      set. URL-parse + allowlist; do NOT prefix-match.
- [ ] `webRequest.onBeforeRequest` on the preview session denies any
      request whose URL is not loopback (or `data:`/`blob:` where strictly
      necessary — prefer not).
- [ ] Restrictive CSP injected on every response to the preview partition.
      Example: `default-src 'self' http://127.0.0.1:<port>; script-src
'self' http://127.0.0.1:<port>; connect-src 'self'
http://127.0.0.1:<port> ws://127.0.0.1:<port>; img-src 'self' data:
http://127.0.0.1:<port>; style-src 'self' 'unsafe-inline'
http://127.0.0.1:<port>; object-src 'none'; base-uri 'none';
frame-ancestors 'none';` (tune per your Vite setup; avoid
      `unsafe-eval`).
- [ ] No secrets are placed in the preview partition: no env vars, no
      tokens, no fs paths, no project metadata beyond what is strictly
      needed to render.
- [ ] Prop/theme/variant changes are sent over a typed, schema-validated
      control channel — not via URL params where avoidable.
- [ ] Screenshot/automation paths (`webContents.capturePage`, CDP) are
      only reachable from main, behind typed host commands. The renderer
      cannot ask "attach a debugger".

## Pitfalls / never do

- [ ] Never set `nodeIntegration: true`, even "temporarily".
- [ ] Never set `contextIsolation: false`.
- [ ] Never `webSecurity: false` to fix a CORS issue. Fix CORS at the
      server.
- [ ] Never `shell.openExternal(userInput)`.
- [ ] Never expose raw `ipcRenderer` or arbitrary `invoke(channel, ...)`.
      Expose specific functions.
- [ ] Never trust `event.sender.getURL()` without also checking
      `event.senderFrame`.
- [ ] Never `loadURL` from the UI renderer for the preview view.
- [ ] Never share a session partition between projects.
- [ ] Never log full IPC payloads — they may contain user content.

## Review-time questions

For every Electron PR, ask:

1. Did webPreferences change anywhere? Re-check the "Always" list for that
   renderer.
2. Are there new IPC handlers? Confirm sender validation + schema.
3. Is there a new navigation, redirect, or window.open path? Confirm it
   is bound by allowlist and tests.
4. Is there a new external URL anywhere? Confirm scheme + host + port.
5. Does this expose new surface from preload? Re-derive the threat model.
6. Did anything new touch the preview partition? Re-read the AutoDSM
   preview-specific list.

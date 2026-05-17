# Remote & SSH (v1 Policy)

> Use this skill before touching Tailscale, SSH, or any path that lets the
> server be reached from somewhere other than the local machine. The
> shorthand: **for v1, the preview is local-only.** Remote access constrains
> what the server exposes, never what the preview is.

## Goals

- Local-first remains the _default_ posture.
- Remote access (where it exists) is for the **server's chat/UX surface**,
  not the preview render runtime.
- Nothing makes the user think their source code left their machine.

## What's allowed in v1

- **Local server bound to loopback**: the default. UI in another window of the
  same machine connects through `127.0.0.1`.
- **Documented remote access path** (Tailscale, SSH tunnel): exposes the
  _server WS_ only, with explicit user setup. This is the existing path
  documented in `REMOTE.md` and `.docs/remote-architecture.md` — treat those
  files as authoritative for capability.

## What's NOT allowed (v1)

- The sidecar runtime never binds non-loopback. Even with Tailscale enabled,
  the sidecar stays on `127.0.0.1`. The preview is not exposed remotely.
- The local server **does not** bind non-loopback by default. A remote path
  exists only when the user explicitly enables it.
- No "open to LAN" toggles. The two modes are loopback-only, and the
  documented tunnel.

## Constraints on the remote path

If a feature requires the server to be reachable over Tailscale/SSH:

- The remote endpoint **must require authentication** (a per-install token,
  not a static one). Token resolution flows through `CredentialResolver`.
- The remote session has the same CSP and same schema validation as a local
  session. There is no "trusted remote" mode.
- The preview is **disabled** for remote sessions in v1 unless and until we
  ship a hardened remote-render path. UI surfaces explain why.
- Logs and diagnostics on the remote path remain redacted; the redactor is
  unconditional.

## How to disable preview for remote sessions

The session manager tags each connection with a `transport` value:

- `local` — direct loopback, full feature set.
- `tunnel` — Tailscale / SSH / equivalent: feature flags constrain.

For `tunnel`:

- `PreviewViewController` is not constructed for that session.
- The workbench renders a "preview disabled over remote in v1" affordance.
- ChangeSet flow remains available (so an agent can propose changes), but
  apply requires confirmation in a local session.

## Settings exposed to the user

- A toggle to enable the tunnel path (default off).
- A read-only summary of what's exposed and what isn't.
- A "show me the listening sockets" diagnostic so the user can verify.

## Anti-patterns

- ❌ A flag that lets the sidecar bind to `0.0.0.0`.
- ❌ "Convenience" features that pinhole the loopback rule.
- ❌ Trusting `Origin` headers to gate remote access.
- ❌ Allowing preview screenshots to be served over the remote endpoint.

## See also

- `REMOTE.md` (repo root) — current remote architecture, authoritative for capability.
- `.docs/remote-architecture.md` — runtime details.
- [`architecture/security-model.md`](../architecture/security-model.md) —
  invariants that apply _regardless_ of transport.
- [`observability.md`](./observability.md) — redaction rules over any
  transport.

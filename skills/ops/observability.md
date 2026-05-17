# Observability

> Load this skill when adding logs, diagnostics surfaces, crash reporting, or
> telemetry. The single guiding rule: **observability defaults to local. Anything
> that leaves the user's machine is opt-in and visible.**

## Layers

| Layer             | What it is                                            | Default              | Where it lives                                             |
| ----------------- | ----------------------------------------------------- | -------------------- | ---------------------------------------------------------- |
| **Logs**          | Structured records of app activity                    | On, **local file**   | `~/Library/Logs/AutoDSM/` (mac) / OS-appropriate elsewhere |
| **Diagnostics**   | Per-project, in-app stream (preview/render/changeset) | On, in-memory + disk | App data dir, per project                                  |
| **Crash reports** | Native crashes + minidumps                            | **Off**              | Opt-in only                                                |
| **Telemetry**     | Aggregate usage metrics                               | **Off**              | Opt-in only                                                |

## Logs

- Structured (JSON line per event). No human paragraphs.
- **Redacted at source.** Tokens, OAuth payloads, prompts containing secrets,
  env vars not on the allowlist — none of these reach the log line. A central
  redactor is used; never `console.log` directly from code that could see secrets.
- Rotation: time + size based, with a hard cap. Old logs are deleted, not
  shipped anywhere.
- Per-process logger; main, server, worker, sidecar each carry a process tag.

## Diagnostics

- The preview surfaces a stream typed as `DiagnosticsEvent` (see
  [`rendering/webcontentsview-renderer.md`](../rendering/webcontentsview-renderer.md)).
- The render-runtime, scanner, indexer, and changeset services emit their own
  typed diagnostics streams.
- Diagnostics live **per project** and clear when the project closes (unless
  the user pins them for inspection).
- Diagnostics are _not_ logs; they are user-visible state. Don't conflate them.

## Crash reports

- Off by default.
- When the user opts in (per-machine setting), Electron crash reporter sends
  minidumps to a documented endpoint. The dump is scrubbed of paths under
  `$HOME` and of any open project root.
- Native dumps never carry source code. We do not include "context lines."
- The user can review the last N pending dumps in the settings UI before they
  upload.

## Telemetry

- Off by default.
- When opted in, telemetry is **counts and durations**, never content. No file
  contents, no prompts, no component names, no project paths.
- Events are listed and documented in-app — the user can see exactly what they
  agree to send.
- A per-event sampling rate keeps volume sane.

## What never leaves the machine, even opted in

- File contents from the user's repo.
- Prompts, model outputs, tool inputs/outputs.
- Branch names, commit SHAs, PR titles.
- Provider tokens.
- Anything matching the secret patterns in the redactor.

If a feature would need any of the above to be useful as a metric, **stop**:
either redesign the metric or accept that the feature doesn't get telemetry.

## Where to put new instrumentation

- A new typed diagnostics event? Add to the relevant service's diagnostics
  schema. Render it in the UI's diagnostics panel.
- A new log line? Use the existing logger; pick the right severity (`debug`,
  `info`, `warn`, `error`). No `console.*`.
- A new telemetry event? Land it as **opt-in by default**, with documentation
  in the in-app settings page.

## Anti-patterns

- ❌ `console.log` in shipping code.
- ❌ Embedding secrets in error messages or logs.
- ❌ Telemetry that records component names, paths, or content.
- ❌ Conflating diagnostics (user-visible) with logs (developer-visible).
- ❌ Adding a "verbose" log mode that disables the redactor.

## See also

- [`architecture/security-model.md`](../architecture/security-model.md) —
  secret handling at the boundary.
- [`remote-and-ssh.md`](./remote-and-ssh.md) — visibility rules over remote.

# Process Model

> Use this skill when adding a feature that spans more than one process, when
> deciding _where_ logic should live, or when reviewing a PR that touches the
> main process, server, or preview lifecycle.

## Processes and their jobs

```
┌────────────────────────────────────────────────────────────────────┐
│ Electron MAIN process (Node, privileged)                          │
│ ─────────────────────────────────────────────────────────────────  │
│ • BaseWindow + WebContentsViews (UI + Preview)                    │
│ • PreviewViewController per project                                │
│ • Worker pool (indexer, scanner, screenshot)                       │
│ • Session/provider supervision                                     │
│ • Git engine (spawn user's git)                                    │
│ • Settings store + Keychain                                        │
│ • RPC server (typed; effect/Schema)                                │
└────────────────────────────────────────────────────────────────────┘
   │ IPC (typed RPC)         │ webContents.send (preview channel)
   ▼                         ▼
┌──────────────────────────┐ ┌──────────────────────────────────────┐
│ UI RENDERER (Chromium)   │ │ PREVIEW WebContentsView (Chromium)  │
│ ───────────────────────  │ │ ──────────────────────────────────── │
│ • App shell, workbench   │ │ • Sidecar loaded via 127.0.0.1       │
│ • DiffPanel + Diff worker│ │ • Component bootstrap                │
│ • Conversation UX        │ │ • Provider stack (packs)             │
│ • Settings UI            │ │ • Capturer hooks (CDP)               │
│ • NO direct preview      │ │ • Sandboxed, isolated, no Node       │
│   webContents handle     │ │                                      │
└──────────────────────────┘ └──────────────────────────────────────┘
                                 ▲
                                 │ HTTP/WS (loopback only)
                                 │
┌──────────────────────────────────────────────────────────────────┐
│ LOCAL SERVER (Node, child / in-proc per runtime mode)            │
│ ────────────────────────────────────────────────────────────────  │
│ • WebSocket: NativeApi / orchestration events                    │
│ • Provider session manager (Codex app-server, Claude, etc.)      │
│ • Filesystem reads under project root                            │
│ • Bridges to long-running CLIs                                   │
└──────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ SIDECAR Vite RUNTIME (Node, per project)                         │
│ ────────────────────────────────────────────────────────────────  │
│ • Mounts user's component graph                                  │
│ • Loopback bind only (127.0.0.1:518x)                            │
│ • RenderEnvironmentProfile + ProviderPack stack                  │
│ • HMR for component edits during preview                         │
└──────────────────────────────────────────────────────────────────┘
```

## Responsibility boundaries (hard rules)

- **Main owns windows and child views.** Never create or move a
  `WebContentsView` from the renderer. The renderer requests bounds; the
  main process enforces them.
- **The UI renderer never holds a preview `webContents` handle.** All
  cross-view communication is `PreviewViewController` ↔ main ↔ renderer.
- **Domain logic does not live in IPC handlers.** IPC handlers parse, validate,
  call a typed service, and serialize the result. Logic lives in services in
  `apps/server/src/...` or main-process service files.
- **Workers are stateless callees.** Spawn a worker for indexer/scanner/screenshot
  work; pass it `RenderEnvironmentProfile` / `ProjectProfile` slices, never raw
  app singletons.
- **Sidecar runtime never accepts non-loopback requests.** Enforced in code,
  enforced in `webRequest` filters, enforced in tests.
- **Server is loopback by default.** Remote access goes through the documented
  remote path (see [`ops/remote-and-ssh.md`](../../skills/ops/remote-and-ssh.md)).

## Where to put new logic — decision flow

1. Does it touch the user's filesystem or shell out? → **main or server** service,
   never renderer.
2. Does it need to render or screenshot a component? → **render-runtime** service,
   driven via `PreviewViewController`.
3. Does it transform UI state from server events? → **UI renderer** with hooks
   that subscribe to typed channels.
4. Is it expensive and pure (parsing, AST walking, image diffing)? → **worker**.
5. Is it a long-lived provider session (Codex/Claude)? → **server**'s provider
   manager. Don't reinvent supervision in main.

If the answer crosses processes, see
[rpc-and-contracts.md](./rpc-and-contracts.md) for how to add the wire.

## Lifecycles to respect

- **App startup:** main creates BaseWindow → adds UI view → starts server →
  warms indexer worker. **Do not** create a preview view at startup; it is
  created when a project opens.
- **Project open:** main creates `PreviewViewController` for that project,
  starts a sidecar runtime on a free port in 5180–5189, attaches it to a
  partition-per-project session.
- **Project close:** controller tears down view, kills sidecar, releases port.
- **Crash recovery:** if the preview view crashes, main rebuilds it; the UI
  renderer is informed via a typed event and must not assume continuity.

## Visual

See [process-model.html](./process-model.html) for the full topology with IPC
channels and ownership boundaries.

# AGENTS.md

`CLAUDE.md` symlinks to this file — the top-level router for agents. It stays concise and
points into `skills/` for depth.

## Task Completion Requirements

- All of `bun fmt`, `bun lint`, and `bun typecheck` must pass before considering a task complete.
- NEVER run `bun test`. Always use `bun run test` (runs Vitest).

## Local dev pairing bypass

`bun run dev` and `bun run dev:server` inject `T3CODE_DEV_DISABLE_PAIRING=1` so **web loopback** sessions auto-authenticate via `POST /api/auth/dev-auto-bootstrap` — no `/pair` UI or manual startup token during substrate iteration. This is a **temporary testing convenience** for the T3 Code web client; production and remote pairing stay unchanged. Re-enable pairing locally with `T3CODE_DEV_DISABLE_PAIRING=0 bun run dev`.

The **AutoDSM desktop (Electron) product** does not use pairing UI or this bypass. Desktop auth is silent via `desktopBridge.getLocalEnvironmentBootstrap()` → `POST /api/auth/bootstrap` with the desktop-managed bootstrap token (`bun run dev:desktop` included).

## Canonical Rule

```txt
T3 Code is the engine. AutoDSM is the product.
```

T3 Code is the generic coding-agent substrate (desktop shell, provider/model plumbing, CLI
subprocess execution, event streaming, thread persistence, IPC/RPC, release plumbing).
**AutoDSM** is the product built on it: a local-first desktop workspace for creating,
customizing, reviewing, and shipping real React design systems. Consume and extend T3 Code
primitives; do not rewrite engine internals unless a minimal, documented substrate ask
requires it.

This repository is a VERY EARLY WIP — sweeping maintainability improvements are welcome.
When adding functionality, first check for shared logic to extract; duplicated logic is a
code smell. Prefer correctness and robustness over short-term convenience.

## AutoDSM v1 — The Loop

```txt
sign in / pass beta gate
→ create or open an isolated workspace
→ start from Modern Starter or fork shadcn/ui into ~/.autodsm/systems/<id>/
→ browse components grouped by Atomic Design
→ edit tokens or one component with component-scoped AI
→ preview through an invisible local Storybook server in a WebContentsView canvas
→ review ChangeSet hunks (approve / reject)
→ create a local PR record
→ publish a typed npm package under ~/.autodsm/exports/<system-id>-<version>/
```

Every change should strengthen this loop.

## Non-Negotiable Constraints

- **No production-repo writes in v1.** AutoDSM-owned source lives only under
  `~/.autodsm/systems/<id>/`; exports under `~/.autodsm/exports/`.
- **ChangeSet review is mandatory.** Every AI output becomes a reviewable `ChangeSet` with
  file/hunk diff approval before any commit or publish.
- **Per-component agent context.** Runs receive the active component, its conversation,
  active tokens, and library conventions — never a whole-repo dump.
- **Auth passthrough.** AutoDSM does not proxy or store model tokens; T3 Code spawns the
  user's local agent CLI (Codex-first in v1, Claude Code when stable).
- **Supabase limits.** Auth, beta gate, telemetry, feedback, and privacy-preserving publish
  stats only — never design-system source, tokens, stories, prompts, or conversations.
- **Sandboxed Electron preview.** The preview is a sibling `WebContentsView`, never an
  iframe; `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, typed and
  validated cross-process payloads, strict CSP, loopback-locked preview navigation.
- **v1 scope is fixed.** Modern Starter + shadcn/ui fork, local PR records, local package
  publishing. MUI/Chakra/Mantine forks, remote GitHub PRs, hosted registry, team sync, and
  DSM-1 are v1.1+ unless explicitly promoted.

## Canonical Vocabulary

Reuse these exact names — see `skills/product/autodsm-glossary.md` and
`skills/architecture/artifact-contracts.md` (canonical).

- **Artifacts:** `WorkspaceMetadata`, `BrandProfile`, `ComponentRegistry`,
  `ComponentConversation`, `Session`, `GenerationPlan`, `ChangeSet`, `PullRequest`,
  `ActivityEntry`, `PublishedExport`.
- **Services:** `WorkspaceService`, `ForkService`, `Indexer`, `TokenStore`,
  `StorybookOrchestrator`, `ComponentAgentBridge`, `ContextWriter`, `DiffService`,
  `PRService`, `PublishService`, `MetricsService`, `ActivityLog`, `TelemetryService`,
  `FeedbackService`.

AutoDSM artifact schemas live in `packages/contracts/src/autodsmArtifacts.ts`; server
domain services in `apps/server/src/autodsm/` and `apps/server/src/componentPreview/`; web
UI in `apps/web/src/components/autodsm/`.

## Skills — Read Before You Build

`skills/` is the focused agent instruction library. Load by task; keep everything aligned
with the v1 construction-workspace pivot. Start at `skills/README.md`, then:

| Task                                                       | Read                   |
| ---------------------------------------------------------- | ---------------------- |
| Product framing, scope, glossary                           | `skills/product/`      |
| Artifacts, RPC/contracts, process & security model         | `skills/architecture/` |
| Component-scoped agent runs, prompt budget, providers      | `skills/agent/`        |
| ChangeSet lifecycle, branch-per-session, diff review       | `skills/changeset/`    |
| Electron windows, preview `WebContentsView`, IPC, security | `skills/electron/`     |
| Storybook rendering, safe runtime, screenshots             | `skills/rendering/`    |
| Scanner, brand/usage drift detection                       | `skills/scan/`         |
| Logging, telemetry, remote/SSH posture                     | `skills/ops/`          |
| Coding conventions, PR conventions, testing                | `skills/workflow/`     |

## Docs vs. Current Code (Read This)

The doc set (`AUTODSM.md`, `skills/`, `docs/autodsm-target-state/`) describes the **target
state**. The code is mid-pivot — two known gaps:

- **Transport.** The docs describe a pure-Electron `ipcMain` + Zod model. The real
  architecture uses **WebSocket RPC via `packages/contracts/src/rpc.ts` with
  `effect/Schema`**. Read the docs' IPC/Zod guidance as logical-contract intent (typed,
  validated, schema-first, no untyped escape hatches), not literal API.
  `skills/workflow/coding-conventions.md` already reflects the WebSocket/Effect reality.
- **Artifacts.** The `autodsm.*` RPC namespace and `autodsmArtifacts.ts` still carry the
  pre-pivot scanner/render model (`ProjectProfile`, `PublishedSnapshot`,
  `RenderEnvironmentProfile`, `RenderManifest`, `ScanArtifact`, Vite sidecar). The doc
  vocabulary above (`WorkspaceMetadata`, `Session`, `PullRequest`, `PublishedExport`,
  `systems/<id>/`, Storybook) is the direction code migrates toward.

When docs and code disagree, the docs are the intended direction — surface the gap rather
than silently picking one side.

## Engine: Provider Runtime

T3 Code drives multiple coding agents. Drivers live in `apps/server/src/provider/Drivers/`
(`ClaudeDriver.ts`, `CodexDriver.ts`, `CursorDriver.ts`, `OpenCodeDriver.ts`); ACP-based
providers under `apps/server/src/provider/acp/`. Each driver starts its provider process
per session and streams structured events to the browser via WebSocket push.

- Session startup/resume and turn lifecycle: `apps/server/src/provider/Layers/`.
- Provider dispatch and lifecycle: `apps/server/src/provider/Services/`.
- The Codex `app-server` JSON-RPC client is `packages/effect-codex-app-server`; the ACP
  client is `packages/effect-acp`. Codex App Server docs:
  https://developers.openai.com/codex/sdk/#app-server
- Event-sourced command routing and projection: `apps/server/src/orchestration/`.
- WebSocket server routes RPC methods in `apps/server/src/ws.ts`; the web app consumes
  orchestration domain events on the `orchestration.domainEvent` push channel.

## Package Roles

- `apps/server`: Node.js WebSocket server. Serves the web app and manages provider sessions.
  Domain folders: `provider/`, `orchestration/`, `vcs/` + `git/` + `sourceControl/`,
  `auth/`, `checkpointing/`, and `autodsm/` + `componentPreview/`.
- `apps/web`: React/Vite UI. Owns session UX and client-side state; connects via WebSocket.
- `apps/desktop`: Electron shell embedding `apps/web` and hosting `WebContentsView`
  previews. Thin shell — domain logic lives in `apps/server`.
- `packages/contracts`: Shared `effect/Schema` schemas and TS contracts. Schema-only — no
  runtime logic.
- `packages/shared`: Shared runtime utilities for server and web. Explicit subpath exports
  (e.g. `@t3tools/shared/git`) — no barrel index.

## Conventions

Detail in `skills/workflow/`. In brief: Effect-first services on server/main; branded IDs
(`ChangeSetId`, not bare `string`); `kebab-case.ts` modules, `PascalCase.tsx` React
components; events named `<Domain>.<verb-past-tense>`; no `as any` and no untyped
cross-process payloads — anything crossing a process boundary gets a schema in
`packages/contracts`. Branches: `feat|fix|refactor|docs/<area>-<slug>`; agent session
branches are `autodsm/<thread-id>`.

## Roadmap

`.plans/21-autodsm-execution-roadmap.md` is the **active AutoDSM product plan** and
execution source of truth, kept in sync with `docs/autodsm-target-state/phases/roadmap.md`.
Plans `.plans/01`–`20` (plus git/provider/runtime plans) are T3 Code substrate
history/backlog — use them only when a substrate capability blocks AutoDSM.

Phases: **0** substrate audit & scaffold → **1** Supabase auth & beta gate → **2** workspace
& fork → **3** Storybook orchestration → **4** sidebar & navigation → **5** Home dashboard →
**6** Design Tokens → **7** Create Component → **8** Component Page → **9** diff & local PR →
**10** publish pipeline → **11** polish & hardening → **12** ship.

Promote durable roadmap decisions into `21-autodsm-execution-roadmap.md` (not scratch
plans), and log progress to `.plans/build-progress.md` after each phase.

## Where to Read First

`AUTODSM.md` → `.plans/README.md` → `.plans/21-autodsm-execution-roadmap.md` →
`docs/autodsm-target-state/README.md` → `skills/README.md`.

Reference implementations for protocol handling, UX flows, and operational safeguards:

- Open-source Codex repo: https://github.com/openai/codex
- Codex-Monitor (Tauri, feature-complete reference): https://github.com/Dimillian/CodexMonitor

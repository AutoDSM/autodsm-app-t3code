# Coding Agent Architecture

How a user request becomes agent work and reviewable changes. T3 Code is the engine; AutoDSM scopes it to one component.

## Canonical Rule

```txt
Commands are decided into immutable events. Events drive everything else.
```

The orchestration core is event-sourced: commands → events (append-only log) → projections + reactors. Never mutate a read model directly; emit an event and let projectors apply it.

## Turn Loop (request → reviewable change)

```
Browser ──WS──▶ ws.ts                         orchestration.dispatchCommand
                  │  apps/server/src/ws.ts
                  ▼
              Normalizer ─▶ decider.ts          command → event(s)
                  │           thread.turn.start ⇒ {thread.message-sent, thread.turn-start-requested}
                  ▼
              OrchestrationEngine.dispatch       validate invariants → eventStore.append() → eventPubSub.publish()
                  │           apps/server/src/orchestration/Layers/OrchestrationEngine.ts
                  ▼
        ┌─────────┴───────────────────────────────┐
        ▼                                           ▼
  ProjectionPipeline                       ProviderCommandReactor
  events → SQLite read models              turn-start-requested → spawn/resume provider session
                                                   │
                                                   ▼
                                          Provider adapter (Claude/Codex/Cursor/OpenCode)
                                          streams ProviderRuntimeEvents (text, tool calls, approvals)
                                                   │
                                                   ▼
                                          ProviderRuntimeIngestion → domain events
                                                   │
                                                   ▼
                                          CheckpointReactor (thread.turn-diff-completed)
                                          git diff → deriveChangeSetOpsAndHunks()
                                                   │
                                          ws.ts streams events back to the browser
```

## Key Components

- **Entry / transport** — `apps/server/src/ws.ts`. WebSocket RPC; `orchestration.dispatchCommand` is the single ingress for turn control. Subscriptions stream domain events back to the web app.
- **Decider** — `apps/server/src/orchestration/decider.ts`. Pure command → event mapping, gated by `commandInvariants.ts`. The only place command intent turns into facts.
- **Engine** — `apps/server/src/orchestration/Layers/OrchestrationEngine.ts`. Serializes commands through a queue, dedupes via command receipts, appends to the event store, publishes, and updates the in-memory read model.
- **Projections** — `apps/server/src/orchestration/Layers/ProjectionPipeline.ts` + `persistence/Layers/Projection*.ts`. Build SQLite read models (threads, messages, turns, sessions, activities, checkpoints, pending approvals). Rehydrate-from-snapshot + replay on restart.
- **Reactors** — `ProviderCommandReactor` (dispatches turns to providers), `CheckpointReactor` (captures diffs/hunks), `ProviderRuntimeIngestion` (provider events → domain events), `ThreadDeletionReactor`.

## Providers (the agent engines)

Provider-agnostic via a driver abstraction in `apps/server/src/provider/`. Adapters:

| Provider | Transport / SDK |
|---|---|
| Claude | `@anthropic-ai/claude-agent-sdk` (built-in `claude_code` system-prompt preset) |
| Codex | effect-codex-app-server JSON-RPC |
| Cursor | ACP (`effect-acp`) |
| OpenCode | `@opencode-ai/sdk` |

- Tools (bash, file read/edit/create/delete/rename, user questions) arrive as streamed `ProviderRuntimeEvent`s — there is no separate tool registry in this repo; the provider owns tool execution.
- Dangerous operations route through a **pending-approval** flow gated by the session `runtimeMode`: `approval-required` | `auto-accept-edits` | `full-access`.
- One model per provider instance, switched explicitly (live `setModel` / `setPermissionMode` on Claude). **No automatic cross-provider fallback or routing.**

## Models

Configured in `packages/contracts/src/model.ts`; selected via the `textGenerationModelSelection` server setting (`{ instanceId, model, options[] }`).

Defaults:

| Provider | Default model | Git/text-gen default |
|---|---|---|
| Codex | `gpt-5.4` | `gpt-5.4-mini` |
| Claude | `claude-sonnet-4-6` | `claude-haiku-4-5` |
| Cursor | `auto` | `composer-2` |
| OpenCode | `openai/gpt-5` | `openai/gpt-5` |

Per-model **option descriptors** (Claude):

- `effort` — `low | medium | high | xhigh | max | ultrathink`. `ultrathink` is **prompt-injected** (prepends `Ultrathink:`), not a CLI flag; the rest are flags.
- `fastMode` — Opus 4.6 only.
- `thinking` — Haiku 4.5 (`alwaysThinkingEnabled`).
- `contextWindow` — `200k` (default) or `1m`; `1m` appends `[1m]` to the API model id (`resolveClaudeApiModelId`).

Slug aliases (`MODEL_SLUG_ALIASES_BY_PROVIDER`) let users type `opus`, `sonnet`, `haiku`, `5.4`, etc. Legacy on-disk option shapes are tolerated and normalized to the canonical `{ id, value }[]` array on decode (migration 026).

## State & Reversibility

- **Event log** — append-only, sequence-ordered; command receipts prevent duplicate processing.
- **Read models** — SQLite projections; the source of truth for the UI.
- **Checkpoints** — each turn captures a git ref `refs/autodsm/<thread-id>/<turn-count>` (`checkpointing/Utils.ts`), so any turn is reversible.

## AutoDSM Layer (on top of the substrate)

- Agent context is **component-scoped**: active component + conversation + tokens only — never whole-repo dumps (see `agent/agent-context-assembly.md`).
- Per-run cwd is inside `~/.autodsm/systems/<id>/system/`; AutoDSM does not proxy provider tokens (see `agent/provider-driver-integration.md`).
- All AI output becomes a reviewable **ChangeSet**: `apps/server/src/autodsm/changeSetHunks.ts`.
  - `deriveChangeSetOpsAndHunks(diff)` parses the turn's unified diff into file ops + per-hunk records (`pending | approved | rejected | discarded`).
  - `reconstructFileWithDecisions(afterContent, hunks)` reverts rejected hunks from the already-written worktree file — base-file-free and deterministic.
  - See `changeset/changeset-lifecycle.md` and `changeset/diff-rendering.md`.

## Related Skills

- `agent/agent-context-assembly.md`, `agent/provider-driver-integration.md`, `agent/prompt-budget.md`
- `architecture/rpc-and-contracts.md`, `architecture/process-model.md`
- `changeset/changeset-lifecycle.md`, `changeset/diff-rendering.md`
